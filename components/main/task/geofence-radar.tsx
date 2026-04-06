// components/main/task/geofence-radar.tsx

interface GeofenceRadarProps {
  distance: number;
  radius: number;
  locationName: string;
}

export const GeofenceRadar = ({ 
  distance, 
  radius, 
  locationName 
}: GeofenceRadarProps) => {
  const isInside = distance <= radius;
  const percentage = Math.min((distance / (radius * 2)) * 100, 100);

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
          Proximity: {locationName}
        </span>
        <span 
          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            isInside 
              ? 'bg-emerald-500/20 text-emerald-500' 
              : 'bg-red-500/20 text-red-500'
          }`}
        >
          {isInside ? "IN RANGE" : "OUT OF RANGE"}
        </span>
      </div>

      <div className="relative h-2 bg-background rounded-full overflow-hidden border border-border">
        <div 
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            isInside ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.max(0, 100 - percentage)}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-[9px] font-bold uppercase opacity-50">
        <span>{Math.round(distance)}m Away</span>
        <span>Target: {radius}m</span>
      </div>
    </div>
  );
};
