// components/task-details/TaskForm.tsx
export const TaskForm = ({ task, setTask, saving, handleUpdate, calculatedProgress, completedTodos, totalTodos }: any) => {

  // Helper to toggle IDs in the array
  const toggleAssignee = (userId: string) => {
    const currentIds = task.assigneeIds || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((id: string) => id !== userId)
      : [...currentIds, userId];
    
    setTask({ ...task, assigneeIds: newIds });
  };
  
  return (
  <form onSubmit={handleUpdate} className="space-y-6 bg-card border border-border p-8 rounded-[2.5rem] shadow-sm">
    <div>
      <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{task.taskType}</h1>
      <p className="text-blue-600 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">{task.project?.projectName}</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-[10px] font-black text-muted-foreground uppercase">System Progress</label>
          <span className="text-[10px] font-black text-blue-600">{calculatedProgress}%</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden w-full">
        <div className="absolute inset-y-0 left-0 h-full bg-blue-600 transition-all duration-1000 ease-in-out z-10" 
            style={{ 
            width: `${Number(calculatedProgress) || 0}%`,
            minWidth: calculatedProgress > 0 ? '4px' : '0' 
            }}
        />
        </div>
        <p className="text-[8px] font-bold opacity-50 uppercase mt-1">
          {totalTodos > 0 ? `Based on ${completedTodos}/${totalTodos} milestones` : "Manual override active"}
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase">Priority Level</label>
        <select 
          value={task.priority} 
          onChange={(e) => setTask({ ...task, priority: e.target.value })} 
          className={`w-full border-none rounded-xl p-3 text-xs font-black uppercase outline-none ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-muted'}`}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase">Node Status</label>
        <select value={task.status} onChange={(e) => setTask({ ...task, status: e.target.value })} className="w-full bg-muted border-none rounded-xl p-3 text-xs font-black uppercase outline-none">
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">In progress</option>
          <option value="COMPLETED">Finished</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
    </div>

    <div className="space-y-3 pt-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          Deployment Personnel (Nodes)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {task.agency?.users?.map((user: any) => {
            const isSelected = task.assigneeIds?.includes(user.id);
            return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleAssignee(user.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isSelected 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "bg-muted border-transparent text-foreground opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex flex-col items-start gap-1 min-w-0">
                    <span className="text-[10px] font-black uppercase truncate">{user.name}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : user.userType === "FREELANCER"
                        ? "bg-orange-100 text-orange-600"
                        : user.userType === "FULL_TIME"
                        ? "bg-emerald-100 text-emerald-700"
                        : user.userType === "PART_TIME"
                        ? "bg-blue-100 text-blue-700"
                        : user.userType === "INTERN"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.userType === "FULL_TIME" ? "Full Time"
                        : user.userType === "PART_TIME" ? "Part Time"
                        : user.userType === "INTERN" ? "Intern"
                        : "Freelancer"}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0 ml-2" />
                  )}
                </button>
            );
          })}
        </div>
        <p className="text-[8px] font-bold opacity-50 uppercase mt-1">
          {task.assigneeIds?.length || 0} Members assigned to this production node
        </p>
      </div>

    {task.latitude && task.longitude && (
      <div className="bg-card border border-border p-6 rounded-[2rem] shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Target Coordinates: {task.locationName || "Site"}</h3>
        {/* Fixed the template literal bug here */}
        <a href={`https://www.google.com/maps?q=${task.latitude},${task.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[14px] font-bold text-blue-500 underline mt-1 block hover:text-blue-700 transition-colors">
          VIEW ON GOOGLE MAPS ↗
        </a>
      </div>
    )}

    <div className="space-y-2">
      <label className="text-[10px] font-black text-muted-foreground uppercase">Production Scope</label>
      <textarea className="w-full bg-muted border-none rounded-[1.5rem] p-4 text-sm font-medium min-h-[100px] outline-none" value={task.description || ""} onChange={(e) => setTask({ ...task, description: e.target.value })} />
    </div>
    <button type="submit" disabled={saving} className="w-full py-4 bg-foreground text-background rounded-2xl font-black uppercase text-[10px] tracking-widest hover:invert transition-all">
      {saving ? "Syncing..." : "Commit Update"}
    </button>
  </form>
)};