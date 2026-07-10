// Inside components/main/attendance/TaskSessionList.tsx
export const TaskSessionList = ({ sessions }: { sessions: any[] }) => {
  return (
    <div className="p-4 rounded-2xl border bg-card">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Today's Task Sessions</h4>
      <div className="space-y-3">
        {sessions.map((session) => (
        <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
            <div>
            <p className="text-sm font-bold">{session.projectName}</p>
            {/* Display Assigned User */}
            <p className="text-[10px] text-muted-foreground uppercase">
                Assigned to: <span className="font-bold text-foreground">{session.userName}</span>
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase">
                {session.taskType}
            </p>
            </div>
            <div className="text-right">
            <span className="block text-xs font-black">{session.totalDuration?.toFixed(2)} hrs</span>
            </div>
        </div>
        ))}
      </div>
    </div>
  );
};