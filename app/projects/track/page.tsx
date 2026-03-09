"use client";

import React, { useState, useMemo } from "react";

// --- TYPES ---
type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";

interface UpdateComment {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
}

interface TaskTracking {
  status: TaskStatus;
  actualStartTime?: string;
  actualEndTime?: string;
  comments: UpdateComment[];
}

// Extending your existing ServiceDetail
interface ManagedService extends TaskTracking {
  id: string; // The service name (e.g., "Video")
  assignees: string[];
  plannedStart: string;
  plannedEnd: string;
}

export default function ProjectManagementPage() {
  // In a real app, you'd fetch this via params.id
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [newComment, setNewComment] = useState("");

  // Mocking the "Active Project" state
  const [project, setProject] = useState({
    name: "Luxury Resort Campaign",
    client: "Fanadir Bay",
    services: {
      Video: {
        status: "IN_PROGRESS",
        assignees: ["Mazen", "Ahmed"],
        plannedStart: "2026-03-10",
        plannedEnd: "2026-03-15",
        actualStartTime: "2026-03-10T09:00",
        comments: [
          { id: "1", author: "Mazen", text: "Gear prepped and on-site.", timestamp: new Date() }
        ]
      },
      Design: {
        status: "BACKLOG",
        assignees: ["Sarah"],
        plannedStart: "2026-03-12",
        plannedEnd: "2026-03-20",
        comments: []
      }
    } as Record<string, any>
  });

  // --- HANDLERS ---
  const addComment = (serviceKey: string) => {
    if (!newComment.trim()) return;
    const comment: UpdateComment = {
      id: Date.now().toString(),
      author: "Lead Dev", // This would be the logged-in user
      text: newComment,
      timestamp: new Date()
    };

    setProject(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [serviceKey]: {
          ...prev.services[serviceKey],
          comments: [comment, ...prev.services[serviceKey].comments]
        }
      }
    }));
    setNewComment("");
  };

  const updateStatus = (serviceKey: string, status: TaskStatus) => {
    setProject(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [serviceKey]: {
          ...prev.services[serviceKey],
          status,
          ...(status === "IN_PROGRESS" && !prev.services[serviceKey].actualStartTime 
              ? { actualStartTime: new Date().toISOString() } : {}),
          ...(status === "COMPLETED" ? { actualEndTime: new Date().toISOString() } : {})
        }
      }
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-8 bg-background min-h-screen text-foreground space-y-10">
      {/* HEADER */}
      <header className="border-b border-border pb-8 flex justify-between items-end">
        <div>
          <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Project Control Room</p>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">{project.name}</h1>
          <p className="text-muted-foreground font-bold text-sm mt-2">Client: {project.client}</p>
        </div>
        <div className="flex gap-2">
          {Object.keys(project.services).map(s => (
            <button 
              key={s} 
              onClick={() => setActiveTab(s)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === s ? "bg-foreground text-background" : "bg-card border-border hover:border-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: WORK ORDER DETAILS */}
        <div className="lg:col-span-7 space-y-8">
          {activeTab !== "Overview" && (
            <div className="bg-card border border-border rounded-[2.5rem] p-10 space-y-8 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tight">{activeTab} Deployment</h2>
                  <div className="flex gap-2 mt-4">
                    {project.services[activeTab].assignees.map((a: string) => (
                      <span key={a} className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg italic">@{a}</span>
                    ))}
                  </div>
                </div>
                
                {/* STATUS PICKER */}
                <select 
                  value={project.services[activeTab].status}
                  onChange={(e) => updateStatus(activeTab, e.target.value as TaskStatus)}
                  className="bg-muted px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none border-r-8 border-transparent"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Under Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* TIMELINE TRACKING CARDS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-muted/30 rounded-3xl border border-border">
                  <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Target Deadline</p>
                  <p className="text-sm font-bold">{project.services[activeTab].plannedEnd}</p>
                </div>
                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Actual Start</p>
                  <p className="text-sm font-mono font-bold">
                    {project.services[activeTab].actualStartTime 
                      ? new Date(project.services[activeTab].actualStartTime).toLocaleString() 
                      : "Pending Start"}
                  </p>
                </div>
              </div>

              {/* LOGS / COMMENTS SECTION */}
              <div className="space-y-6 pt-6 border-t border-border">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activity Timeline</h3>
                
                <div className="flex gap-4">
                  <input 
                    placeholder="Update status or add notes..."
                    className="flex-1 bg-muted/50 border-none p-4 rounded-2xl text-sm outline-none focus:ring-2 ring-blue-500/20"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment(activeTab)}
                  />
                  <button 
                    onClick={() => addComment(activeTab)}
                    className="bg-foreground text-background px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Post
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {project.services[activeTab].comments.map((c: UpdateComment) => (
                    <div key={c.id} className="p-6 bg-card border border-border rounded-3xl relative overflow-hidden group">
                      <div className="absolute left-0 top-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{c.author}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{c.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: PROJECT VITALS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-foreground text-background p-10 rounded-[2.5rem] shadow-xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-8">Production Health</h2>
            <div className="space-y-10">
              {Object.entries(project.services).map(([name, data]) => (
                <div key={name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xl font-black uppercase italic tracking-tighter">{name}</span>
                    <span className="text-[9px] font-black uppercase opacity-60">{data.status}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ 
                        width: data.status === "COMPLETED" ? "100%" : 
                               data.status === "REVIEW" ? "75%" : 
                               data.status === "IN_PROGRESS" ? "30%" : "5%" 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card border border-border p-8 rounded-[2.5rem]">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Quick Actions</h3>
             <button className="w-full text-left p-4 rounded-2xl hover:bg-muted transition-colors text-sm font-bold border border-border mb-2">📂 Open Shared Drive</button>
             <button className="w-full text-left p-4 rounded-2xl hover:bg-muted transition-colors text-sm font-bold border border-border">📄 Export Final Ledger</button>
          </div>
        </div>
      </div>
    </div>
  );
}