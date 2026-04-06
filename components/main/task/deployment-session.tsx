// components/main/task/deployment-session.tsx
 // Assume you moved the radar here too

import { GeofenceRadar } from "./geofence-radar";

interface DeploymentSessionProps {
  isWorking: boolean;
  actualHours: number;
  activeSeconds: number;
  saving: boolean;
  geoStatus: any;
  toggleWorkSession: () => void;
}

export const DeploymentSession = ({ 
  isWorking, 
  actualHours, 
  activeSeconds, 
  saving, 
  geoStatus, 
  toggleWorkSession 
}: DeploymentSessionProps) => {

    const totalLiveHours = (actualHours || 0) + (activeSeconds / 3600);
  return (
    <div className={`p-8 rounded-[2.5rem] shadow-xl border-2 transition-all ${isWorking ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-card border-border'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Deployment Session</h3>
          <p className="text-2xl font-black mt-1">
            <span>{totalLiveHours.toFixed(4)}</span>
            <span className="text-xs opacity-60 ml-2">HRS TOTAL</span>
          </p>
          {isWorking && (
            <p className="text-[10px] font-mono mt-1 bg-white/20 inline-block px-2 py-0.5 rounded">
              LIVE: {new Date(activeSeconds * 1000).toISOString().substr(11, 8)}
            </p>
          )}
        </div>
        <div className={`w-3 h-3 rounded-full ${isWorking ? 'bg-white animate-ping' : 'bg-muted'}`} />
      </div>
      
      {geoStatus && !isWorking && (
        <GeofenceRadar distance={geoStatus.distance} radius={geoStatus.radius} locationName={geoStatus.name} />
      )}

      <button 
        onClick={toggleWorkSession} 
        disabled={saving} 
        className={`w-full mt-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isWorking ? 'bg-white text-emerald-600' : 'bg-foreground text-background'}`}
      >
        {saving ? "Verifying GPS..." : isWorking ? "Finish Work Session" : "Start Work Session"}
      </button>
    </div>
  );
};