"use client";

import React, { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import moment from "moment";

export default function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");

  const [showRentalModal, setShowRentalModal] = useState(false);
  const [rentalData, setRentalData] = useState({ itemName: "", cost: "" });

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = () => {
    fetch(`/api/tasks/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setTask(data);
        setLoading(false);
      });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
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
        const added = await res.json();
        setTask((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), added],
        }));
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addRental = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rentalData),
      });
      if (res.ok) {
        setShowRentalModal(false);
        setRentalData({ itemName: "", cost: "" });
        fetchTask();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center font-black animate-pulse uppercase tracking-widest">
        Accessing Production Node...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 bg-background min-h-screen relative">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-border pb-6">
        <button
          onClick={() => router.back()}
          className="text-[10px] font-black uppercase hover:underline opacity-50"
        >
          ← Back to Console
        </button>
        <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/20">
          {task.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          <form
            onSubmit={handleUpdate}
            className="space-y-6 bg-card border border-border p-8 rounded-[2.5rem] shadow-sm"
          >
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                {task.taskType}
              </h1>
              <p className="text-blue-600 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
                {task.project?.projectName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase">
                  Progress {task.progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={task.progress}
                  onChange={(e) => setTask({ ...task, progress: e.target.value })}
                  className="w-full accent-blue-600 cursor-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase">
                  Node Status
                </label>
                <select
                  value={task.status}
                  onChange={(e) => setTask({ ...task, status: e.target.value })}
                  className="w-full bg-muted border-none rounded-xl p-3 text-xs font-black uppercase outline-none"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">Active</option>
                  <option value="COMPLETED">Finished</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">
                Production Scope
              </label>
              <textarea
                className="w-full bg-muted border-none rounded-[1.5rem] p-4 text-sm font-medium min-h-[100px] outline-none"
                value={task.description || ""}
                onChange={(e) => setTask({ ...task, description: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-foreground text-background rounded-2xl font-black uppercase text-[10px] tracking-widest hover:invert transition-all"
            >
              {saving ? "Syncing..." : "Commit Update"}
            </button>
          </form>

          {/* CHAT / COMMENTS BOX */}
          <section className="bg-card border border-border rounded-[2.5rem] overflow-hidden flex flex-col h-[450px]">
            <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="text-[10px] font-black uppercase tracking-widest">
                Live Feedback Stream
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {task.comments?.map((c: any) => (
                <div key={c.id} className="flex flex-col gap-1 max-w-[80%]">
                  <span className="text-[8px] font-black uppercase text-blue-600">
                    {c.author?.name || "Mazen"}
                  </span>
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-none text-xs font-medium">
                    {c.text}
                  </div>
                  <span className="text-[7px] font-bold text-muted-foreground">
                    {moment(c.createdAt).fromNow()}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted/50 border-t border-border flex gap-2">
              <input
                type="text"
                placeholder="Update node status..."
                className="flex-1 bg-background border-none rounded-xl px-4 py-2 text-xs font-bold outline-none"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()}
              />
              <button
                onClick={postComment}
                className="bg-blue-600 text-white px-4 rounded-xl text-[10px] font-black uppercase"
              >
                Send
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* PROJECT RESOURCES */}
          <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">
              Project Core
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black uppercase opacity-60 mb-1">
                  Project Story
                </p>
                <p className="text-xs font-bold italic line-clamp-4">
                  "{task.project?.projectStory || "No story defined."}"
                </p>
              </div>
              
              {/* UTILIZED ASSETS REPLACING PRIMARY CLOUD */}
              <div>
                <p className="text-[10px] font-black uppercase text-white mb-3 tracking-widest opacity-80">Utilized Assets</p>
                <div className="flex flex-wrap gap-2">
                  {task.assets?.map((asset: any) => (
                    <span key={asset.id} className="px-3 py-1 bg-white/20 text-white text-[10px] font-bold rounded-lg border border-white/30">
                      {asset.assetName}
                    </span>
                  ))}
                  {(!task.assets || task.assets.length === 0) && (
                    <p className="text-[10px] italic opacity-50 uppercase font-black">No internal assets assigned.</p>
                  )}
                </div>
              </div>

              {task.project?.cloudLink && (
                <a
                  href={task.project.cloudLink}
                  target="_blank"
                  className="block w-full bg-white/10 hover:bg-white/20 text-center py-3 rounded-xl text-[10px] font-black uppercase transition-all border border-white/10"
                >
                  Project Cloud ↗
                </a>
              )}
            </div>
          </div>

          {/* FINANCIALS */}
          <div className="bg-foreground text-background p-8 rounded-[2.5rem] shadow-xl space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">
              Financial Protocol
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black opacity-60 uppercase">Gross Revenue</p>
                <p className="text-2xl font-black">${task.grossRevenue}</p>
              </div>
              <div className="pt-4 border-t border-background/10">
                <p className="text-[8px] font-black opacity-60 uppercase">Net Potential (at {task.margin}%)</p>
                <p className="text-2xl font-black text-emerald-400">
                  ${(task.grossRevenue * (task.margin / 100)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* RENTALS */}
          <div className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                External Rentals
              </h3>
              <button
                onClick={() => setShowRentalModal(true)}
                className="text-[18px] font-black text-blue-600 hover:scale-125 transition-transform"
              >
                +
              </button>
            </div>
            <div className="space-y-3">
              {task.externalRentals?.length > 0 ? (
                task.externalRentals.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center bg-muted/50 p-4 rounded-2xl border border-border/50"
                  >
                    <span className="text-[10px] font-bold uppercase">{r.itemName}</span>
                    <span className="text-xs font-black text-emerald-600">${r.cost}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-black uppercase opacity-30 text-center py-4">No external assets</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RENTAL MODAL OVERLAY */}
      {showRentalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <h2 className="text-xl font-black uppercase italic">Provision Asset</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name (e.g. Sony A7IV)"
                className="w-full bg-muted p-4 rounded-2xl text-xs font-bold outline-none"
                value={rentalData.itemName}
                onChange={(e) => setRentalData({ ...rentalData, itemName: e.target.value })}
              />
              <input
                type="number"
                placeholder="Cost ($)"
                className="w-full bg-muted p-4 rounded-2xl text-xs font-bold outline-none"
                value={rentalData.cost}
                onChange={(e) => setRentalData({ ...rentalData, cost: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRentalModal(false)}
                className="flex-1 py-4 text-[10px] font-black uppercase opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addRental}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/30"
              >
                Commit Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}