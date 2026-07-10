"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { TaskForm }          from "@/components/main/task/task-details";
import { FeedbackStream }    from "@/components/main/task/feedback-stream";
import { DeploymentSession } from "@/components/main/task/deployment-session";
import { FinancialProtocol } from "@/components/main/task/financial-protocol";
import { DeploymentHistory } from "@/components/main/task/deployment-history";
import { ProjectCore }       from "@/components/main/task/project-core";
import { ExternalExpenses }  from "@/components/main/task/external-expeses";
import { TodoList }          from "@/components/main/task/TodoList";
import { ExpenseModal }      from "@/components/main/task/expense-modal";
import { useSession }        from "next-auth/react";

// ─── Haversine distance (metres) ──────────────────────────────────────────────

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R  = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a  =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaskDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [task,            setTask]            = useState<any>(null);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [newComment,      setNewComment]      = useState("");
  const [showRentalModal, setShowRentalModal] = useState(false);

  // ── Working state driven by TaskSession, not AttendanceLog ───────────────
  const [isWorking,     setIsWorking]     = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [geoStatus,     setGeoStatus]     = useState<{
    distance: number; radius: number; name: string;
  } | null>(null);

  // ── Progress from todos ───────────────────────────────────────────────────
  const totalTodos     = task?.todos?.length ?? 0;
  const completedTodos = task?.todos?.filter((t: any) => t.completed).length ?? 0;
  const calculatedProgress = useMemo(() => {
    if (totalTodos > 0) {
      return Math.min(100, Math.round((completedTodos / totalTodos) * 100));
    }
    return Math.min(100, Math.max(0, task?.progress ?? 0));
  }, [totalTodos, completedTodos, task?.progress]);

  // ── Fetch task ────────────────────────────────────────────────────────────
  const fetchTask = async () => {
    try {
      const res  = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error("unreachable");
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchTask(); }, [id]);

  // Re-fetch on window focus (keeps page fresh after switching tabs)
  useEffect(() => {
    const onFocus = () => fetchTask();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [id]);

  // ── Drive isWorking + timer from taskSessions ─────────────────────────────
  useEffect(() => {
    if (!task || !currentUser?.id) return;

    // Find an open TaskSession for this user (endTime null/missing)
    const openSession = (task.taskSessions ?? []).find(
      (s: any) => s.userId === currentUser.id && !s.endTime
    );

    let interval: NodeJS.Timeout;

    if (openSession) {
      setIsWorking(true);
      const tick = () => {
        const elapsed = Math.floor(
          (Date.now() - new Date(openSession.startTime).getTime()) / 1000
        );
        setActiveSeconds(Math.max(0, elapsed));
      };
      tick();
      interval = setInterval(tick, 1000);
    } else {
      if (!saving) {
        setIsWorking(false);
        setActiveSeconds(0);
      }
    }

    return () => clearInterval(interval);
  }, [task?.taskSessions, currentUser?.id, saving]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/tasks/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...task,
          progress:   parseInt(task.progress),
          assigneeIds: task.assigneeIds,
        }),
      });
      fetchTask();
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setSaving(false);
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${id}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: newComment }),
      });
      if (res.ok) { setNewComment(""); fetchTask(); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${id}/expenses`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ expenseId }),
      });
      if (res.ok) await fetchTask();
    } catch (err) {
      console.error("Delete expense error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Geofence + session toggle ─────────────────────────────────────────────

  const toggleWorkSession = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    if (!task) return;

    setSaving(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: uLat, longitude: uLng } = pos.coords;

        // STOP — no geo check needed
        if (isWorking) {
          await executeSessionUpdate("STOP", uLat, uLng);
          return;
        }

        // START — geo validation
        const tLat = task.latitude  ? parseFloat(task.latitude)  : NaN;
        const tLng = task.longitude ? parseFloat(task.longitude) : NaN;
        const aLat = task.agency?.latitude  ? parseFloat(task.agency.latitude)  : NaN;
        const aLng = task.agency?.longitude ? parseFloat(task.agency.longitude) : NaN;

        let isWithinRange      = false;
        let activeLocationName = "Remote/Field";
        let activeDistance     = 0;
        let activeRadius       = 200;

        if (!isNaN(tLat) && !isNaN(tLng)) {
          const tRad = parseFloat(task.radius) || 200;
          activeDistance = getDistance(uLat, uLng, tLat, tLng);
          if (activeDistance <= tRad) {
            isWithinRange      = true;
            activeLocationName = task.locationName || "Task Site";
            activeRadius       = tRad;
          }
        }

        if (!isWithinRange && !isNaN(aLat) && !isNaN(aLng)) {
          const aRad        = parseFloat(task.agency.radius) || 100;
          const distToAgency = getDistance(uLat, uLng, aLat, aLng);
          if (distToAgency <= aRad) {
            isWithinRange      = true;
            activeLocationName = "Agency Office";
            activeDistance     = distToAgency;
            activeRadius       = aRad;
          }
        }

        setGeoStatus({
          distance:     activeDistance,
          radius:       activeRadius,
          name:         activeLocationName,
        });

        const userType  = task.assignees?.find((u: any) => u.id === currentUser?.id)?.userType ?? "FREELANCER";
        const isStaff   = userType === "FULL_TIME" || userType === "PART_TIME";
        const hasTargets = !isNaN(tLat) || !isNaN(aLat);

        if (hasTargets && (isStaff || !isNaN(tLat)) && !isWithinRange) {
          setSaving(false);
          const distMsg = activeDistance ? `${Math.round(activeDistance)}m` : "an unknown distance";
          return alert(`Access Denied: You are ${distMsg} from authorized zones.`);
        }

        await executeSessionUpdate("START", uLat, uLng);
      },
      (err) => {
        setSaving(false);
        alert(err.code === 1 ? "Please enable GPS permissions." : "GPS timeout. Try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const executeSessionUpdate = async (
    action: "START" | "STOP",
    lat: number,
    lng: number
  ) => {
    try {
      const res = await fetch(`/api/tasks/${id}/work-session`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, lat, lng }),
      });
      if (res.ok) {
        if (action === "STOP") { setActiveSeconds(0); setGeoStatus(null); }
        await fetchTask(); // taskSessions refreshed → useEffect drives isWorking
      } else {
        const err = await res.json();
        alert(err.error || "Session update failed");
      }
    } catch (err) {
      console.error("Network error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Computed hours ────────────────────────────────────────────────────────

  // Historical: sum of completed TaskSession durations for this user
  const historicalHours = (task?.taskSessions ?? []).reduce(
    (acc: number, s: any) => acc + (s.endTime ? (s.totalDuration ?? 0) : 0),
    0
  );
  const totalElapsedHours  = historicalHours + activeSeconds / 3600;
  const formattedTotalHours = totalElapsedHours.toFixed(2);

  // Session count shown in the UI (all sessions, not just for current user)
  const sessionCount = task?.taskSessions?.length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest">
        Accessing Production Node...
      </div>
    );
  }
  if (!task) {
    return <div className="p-20 text-center font-bold uppercase">Task not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 bg-background min-h-screen relative">

      {/* TOP BAR */}
      <div className="flex justify-between items-center border-b border-border pb-6">
        <button
          onClick={() => router.back()}
          className="text-[10px] font-black uppercase hover:underline opacity-50"
        >
          ← Back to Console
        </button>
        <span
          className={`text-[10px] font-black uppercase text-white px-4 py-1.5 rounded-full shadow-lg ${
            task.status === "ACTIVE"
              ? "bg-emerald-500 shadow-emerald-500/20"
              : "bg-blue-600 shadow-blue-500/20"
          }`}
        >
          {task.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT: main controls ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
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
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(task),
              });
              fetchTask();
              setSaving(false);
            }}
          />

          <TodoList
            taskId={id}
            todos={task.todos ?? []}
            onUpdate={fetchTask}
            onCommit={() => handleUpdate({ preventDefault: () => {} } as any)}
          />

          <FeedbackStream
            comments={task.comments}
            newComment={newComment}
            setNewComment={setNewComment}
            postComment={postComment}
          />
        </div>

        {/* ── RIGHT: protocols & data ──────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Resource utilization panel */}
          <div className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-sm space-y-8">
            <div className="flex justify-between items-center border-b border-background/10 pb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Resource Utilization
              </h3>
              <span className="text-[9px] font-black uppercase tracking-wider bg-background text-foreground px-2 py-0.5 rounded">
                Schedule Info
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-background/10 pb-6">
              {[
                { label: "Production Start", date: task.startDate },
                { label: "Production End",   date: task.endDate },
              ].map(({ label, date }) => (
                <div key={label}>
                  <p className="text-[8px] font-black opacity-60 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xs font-black uppercase">
                    {date ? moment(date).format("MMM DD, YYYY") : "N/A"}
                  </p>
                  <p className="text-[10px] opacity-70 font-mono">
                    {date ? moment(date).format("hh:mm A") : "--:--"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end pt-2">
              <div>
                <p className="text-[8px] font-black opacity-60 uppercase tracking-wider">
                  Aggregated Labor
                </p>
                <p className="text-4xl font-black">
                  {formattedTotalHours}
                  <span className="text-sm ml-1">HRS</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black opacity-60 uppercase tracking-wider">
                  Session Count
                </p>
                <p className="text-xl font-black">{sessionCount}</p>
              </div>
            </div>
          </div>

          {/* Deployment session button */}
          <DeploymentSession
            isWorking={isWorking}
            actualHours={task.actualHours}
            activeSeconds={activeSeconds}
            saving={saving}
            geoStatus={geoStatus}
            toggleWorkSession={toggleWorkSession}
          />

          {/* Session history — now from taskSessions */}
          <DeploymentHistory logs={task.taskSessions} />

          <ProjectCore project={task.project} assets={task.assets} />

          <FinancialProtocol
            internalCost={task.internalCost}
            margin={task.margin}
            marginAmount={task.marginAmount}
            totalInvoice={task.totalInvoice}
            taskNetProfit={task.taskNetProfit}
            realCost={task.realCost}
            taskExpenses={task.taskExpenses ?? []}
          />

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
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ ...data, cost: parseFloat(data.cost) }),
                  });
                  if (res.ok) { setShowRentalModal(false); await fetchTask(); }
                } catch (err) {
                  console.error("Expense sync error:", err);
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