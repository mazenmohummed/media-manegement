"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import moment from "moment";
import { TaskForm } from "@/components/main/task/task-details";
import { FeedbackStream } from "@/components/main/task/feedback-stream";
import { DeploymentSession } from "@/components/main/task/deployment-session";
import { FinancialProtocol } from "@/components/main/task/financial-protocol";
import { DeploymentHistory } from "@/components/main/task/deployment-history";
import { ProjectCore } from "@/components/main/task/project-core";
import { ExternalExpenses,  } from "@/components/main/task/external-expeses";
import { TodoList } from "@/components/main/task/TodoList";
import { useSession } from "next-auth/react";
import { ExpenseModal } from "@/components/main/task/expense-modal";

// --- HELPERS ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
}


export default function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const taskIdFromUrl = unwrappedParams.id;
  const id = unwrappedParams.id;
  const router = useRouter();

 
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [geoStatus, setGeoStatus] = useState<{distance: number, radius: number, name: string} | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0); 


  const [showRentalModal, setShowRentalModal] = useState(false);
  const [rentalData, setRentalData] = useState({ itemName: "", cost: "", category: "RENTAL", description: "" });

  const totalTodos = task?.todos?.length || 0;
  const completedTodos = task?.todos?.filter((t: any) => t.completed).length || 0;
  const calculatedProgress = useMemo(() => {
  if (totalTodos > 0) {
    return Math.min(100, Math.max(0, Math.round((completedTodos / totalTodos) * 100)));
  }
  // 1. Fix the fallback inside the function
  return Math.min(100, Math.max(0, task?.progress || 0));
  
// 2. Fix the dependency array here:
}, [totalTodos, completedTodos, task?.progress]);
  useEffect(() => {
    if (id) fetchTask();
  }, [id]);

  useEffect(() => {
  const onFocus = () => fetchTask();
  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
}, [id]);

  
useEffect(() => {
  if (!task || !currentUser?.id) return; // Wait for both task and session

  let interval: NodeJS.Timeout;

  const activeLog = task?.attendanceLogs?.find(
  (log: any) => log.userId === currentUser?.id && !log.checkOutTime
);

  if (activeLog) {
    setIsWorking(true);
    const calculateElapsed = () => {
      const startTime = new Date(activeLog.checkInTime).getTime();
      const secondsElapsed = Math.floor((Date.now() - startTime) / 1000);
      setActiveSeconds(Math.max(0, secondsElapsed));
    };
    calculateElapsed(); 
    interval = setInterval(calculateElapsed, 1000);
  } else {
    if (!saving) {
      setIsWorking(false);
      setActiveSeconds(0);
    }
  }

  return () => clearInterval(interval);
}, [task?.attendanceLogs, currentUser?.id, saving]);// Watch specific property


  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error("Node unreachable");
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error("Transmission Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Inside TaskDetailsPage.tsx



const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  try {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...task, 
        progress: parseInt(task.progress),
        // Ensure assigneeIds is sent as the array Prisma expects
        assigneeIds: task.assigneeIds 
      }),
    });
    fetchTask();
  } catch (err) { 
    console.error("Sync Error:", err); 
  } finally { 
    setSaving(false); 
  }
};

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        fetchTask();
      }
    } catch (err) { console.error(err); }
  };

const handleDeleteExpense = async (expenseId: string, cost: number) => {
  setSaving(true);
  try {
    const res = await fetch(`/api/tasks/${id}/expenses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId }),
    });
    if (res.ok) await fetchTask();
  } catch (err) {
    console.error("Delete expense error:", err);
  } finally {
    setSaving(false);
  }
};

  const toggleWorkSession = async () => {
  if (!navigator.geolocation) return alert("Geolocation not supported.");
  if (!task) return; 
  
  setSaving(true);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: uLat, longitude: uLng } = pos.coords;

      // 1. HANDLE STOP ACTION
      if (isWorking) {
        console.log("Initiating STOP action...");
        await executeSessionUpdate("STOP", uLat, uLng);
        return; // Exit here
      }

      // 2. HANDLE START ACTION
      console.log("Initiating START logic...");
      
      const tLat = task.latitude ? parseFloat(task.latitude) : NaN;
      const tLng = task.longitude ? parseFloat(task.longitude) : NaN;
      const aLat = task.agency?.latitude ? parseFloat(task.agency.latitude) : NaN;
      const aLng = task.agency?.longitude ? parseFloat(task.agency.longitude) : NaN;

      let isWithinRange = false;
      let activeLocationName = "Remote/Field";
      let activeDistance = 0;
      let activeRadius = 200;

      // Check Task Site
      if (!isNaN(tLat) && !isNaN(tLng)) {
        const tRad = parseFloat(task.radius) || 200;
        activeDistance = getDistance(uLat, uLng, tLat, tLng);
        if (activeDistance <= tRad) {
          isWithinRange = true;
          activeLocationName = task.locationName || "Task Site";
          activeRadius = tRad;
        }
      }

      // Check Agency (if not in task site)
      if (!isWithinRange && !isNaN(aLat) && !isNaN(aLng)) {
        const aRad = parseFloat(task.agency.radius) || 100;
        const distToAgency = getDistance(uLat, uLng, aLat, aLng);
        if (distToAgency <= aRad) {
          isWithinRange = true;
          activeLocationName = "Agency Office";
          activeDistance = distToAgency;
          activeRadius = aRad;
        }
      }

      setGeoStatus({ distance: activeDistance, radius: activeRadius, name: activeLocationName });

      // Protocol Enforcement
      const userType = task.assignees?.find((u: any) => u.id === currentUser?.id)?.userType || "FREELANCER";
      const isStaff = userType === "FULL_TIME" || userType === "PART_TIME";
      const hasDefinedTargets = !isNaN(tLat) || !isNaN(aLat);

      if (hasDefinedTargets && (isStaff || !isNaN(tLat)) && !isWithinRange) {
        setSaving(false);
        const distMsg = activeDistance ? `${Math.round(activeDistance)}m` : "an unknown distance";
        return alert(`Access Denied: You are ${distMsg} away from authorized zones.`);
      }

      // Only START if we haven't exited from a STOP
      await executeSessionUpdate("START", uLat, uLng);
    },
    (error) => {
      setSaving(false);
      alert(error.code === 1 ? "Please enable GPS permissions." : "GPS Timeout. Try again.");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

  const executeSessionUpdate = async (action: "START" | "STOP", lat: number, lng: number) => {
  try {
    const res = await fetch(`/api/tasks/${id}/work-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, lat, lng }),
    });

    if (res.ok) {
      if (action === "STOP") {
        setActiveSeconds(0);
        setGeoStatus(null);
      }
      await fetchTask(); // ← re-fetch so attendanceLogs updates and useEffect drives isWorking correctly
    } else {
      const errData = await res.json();
      alert(errData.error || "Session update failed");
    }
  } catch (err) {
    console.error("Network Error:", err);
  } finally {
    setSaving(false);
  }
};

  if (loading) return (
  <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest">
    Accessing Production Node...
  </div>
  );

  if (!task) return (
    <div className="p-20 text-center font-bold uppercase">Task not found.</div>
  );

  
  
  



  // Total Hours Calculation (Summing all completed logs + active session)
  const historicalSeconds = (task.attendanceLogs || []).reduce((acc: number, log: any) => {
    if (log.checkOutTime) {
      return acc + (new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime()) / 1000;
    }
    return acc;
  }, 0);

  const totalElapsedSeconds = historicalSeconds + activeSeconds;
  const formattedTotalHours = (totalElapsedSeconds / 3600).toFixed(2);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 bg-background min-h-screen relative">
  {/* TOP BAR */}
  <div className="flex justify-between items-center border-b border-border pb-6">
    <button onClick={() => router.back()} className="text-[10px] font-black uppercase hover:underline opacity-50">
      ← Back to Console
    </button>
    {/* The background color logic for the status badge */}
  <span className={`text-[10px] font-black uppercase text-white px-4 py-1.5 rounded-full shadow-lg 
    ${task.status === "ACTIVE" ? "bg-emerald-500 shadow-emerald-500/20" : "bg-blue-600 shadow-blue-500/20"}`}>
    {task.status}
  </span>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    {/* LEFT SIDE: MAIN CONTROLS (2/3 width) */}
    <div className="lg:col-span-2 space-y-8">
      {/* UPDATE FORM */}
      <TaskForm 
            task={task} 
            setTask={setTask} 
            saving={saving} 
            calculatedProgress={calculatedProgress}
            totalTodos={totalTodos}
            completedTodos={completedTodos}
            handleUpdate={async (e: any) => {
              e.preventDefault();
              setSaving(true);
              await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
              });
              fetchTask();
              setSaving(false);
            }}
          />


          <TodoList 
            taskId={id} 
            todos={task.todos || []} 
            onUpdate={fetchTask}
            onCommit={() => handleUpdate({ preventDefault: () => {} } as any)} 
          />

          

      {/* FEEDBACK STREAM */}
      <FeedbackStream 
    comments={task.comments}
    newComment={newComment}
    setNewComment={setNewComment}
    postComment={postComment}
  />
    </div>

    {/* RIGHT SIDE: PROTOCOLS & DATA (1/3 width) */}
    <div className="space-y-6">
      {/* RESOURCE UTILIZATION */}
      <div className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-sm space-y-8">
        <div className="flex justify-between items-center border-b border-background/10 pb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Resource Utilization</h3>
          <span className="text-[9px] font-black uppercase tracking-wider bg-background text-foreground px-2 py-0.5 rounded">
            Schedule Info
          </span>
        </div>

        {/* TIMELINE METRICS */}
        <div className="grid grid-cols-2 gap-4 border-b border-background/10 pb-6">
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-wider mb-1">Production Start</p>
            <p className="text-xs font-black uppercase">
              {task.startDate ? moment(task.startDate).format("MMM DD, YYYY") : "N/A"}
            </p>
            <p className="text-[10px] opacity-70 font-mono">
              {task.startDate ? moment(task.startDate).format("hh:mm A") : "--:--"}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-wider mb-1">Production End</p>
            <p className="text-xs font-black uppercase">
              {task.endDate ? moment(task.endDate).format("MMM DD, YYYY") : "N/A"}
            </p>
            <p className="text-[10px] opacity-70 font-mono">
              {task.endDate ? moment(task.endDate).format("hh:mm A") : "--:--"}
            </p>
          </div>
        </div>

        {/* LABOR METRICS */}
        <div className="flex justify-between items-end pt-2">
          <div>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-wider">Aggregated Labor</p>
            <p className="text-4xl font-black">{formattedTotalHours}<span className="text-sm ml-1">HRS</span></p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black opacity-60 uppercase tracking-wider">Session Count</p>
            <p className="text-xl font-black">{task.attendanceLogs?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* DEPLOYMENT SESSION */}
      <DeploymentSession 
    isWorking={isWorking}
    actualHours={task.actualHours}
    activeSeconds={activeSeconds}
    saving={saving}
    geoStatus={geoStatus}
    toggleWorkSession={toggleWorkSession}
  />

      {/* DEPLOYMENT HISTORY */}
      <DeploymentHistory logs={task.attendanceLogs} />

      {/* PROJECT CORE */}
      <ProjectCore project={task.project} assets={task.assets} />

      {/* FINANCIAL PROTOCOL */}
      <FinancialProtocol 
        internalCost={task.internalCost}
        margin={task.margin} 
        marginAmount={task.marginAmount}
        totalInvoice={task.totalInvoice}
        taskNetProfit={task.taskNetProfit}
        realCost={task.realCost}
        taskExpenses={task.taskExpenses || []}
        

      />

      {/* EXTERNAL RENTALS */}
      <ExternalExpenses 
            expenses={task.taskExpenses} 
            onAddClick={() => setShowRentalModal(true)} 
            onDeleteExpense={handleDeleteExpense}
          />
            
          
          {showRentalModal && (
            <ExpenseModal
              isOpen={showRentalModal}
              onClose={() => setShowRentalModal(false)}
              saving={saving}
              onSave={async (data) => {
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/tasks/${id}/expenses`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...data, cost: parseFloat(data.cost) }),
                    });
                    
                    if (res.ok) {
                      setShowRentalModal(false);
                      // This triggers the re-fetch of the Task, 
                      // which now contains the updated totalValue, taskNetProfit, and realCost
                      await fetchTask(); 
                    }
                  } catch (err) {
                    console.error("Expense Sync Error:", err);
                  } finally {
                    setSaving(false);
                  }
                }}
            />
          )}

    </div>

  </div>
</div>
  );
}