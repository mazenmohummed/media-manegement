// components/main/task/project-core.tsx

interface Asset {
  id: string;
  assetName: string;
}

interface Project {
  projectStory?: string;
  cloudLink?: string;
}

interface ProjectCoreProps {
  project?: Project;
  assets?: Asset[];
}

export const ProjectCore = ({ project, assets }: ProjectCoreProps) => {
  return (
    <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">
        Project Core
      </h3>
      
      <p className="text-xs font-bold italic line-clamp-4">
        "{project?.projectStory || "No story defined."}"
      </p>

      <div>
        <p className="text-[10px] font-black uppercase text-white mb-3 tracking-widest opacity-80">
          Utilized Assets
        </p>
        <div className="flex flex-wrap gap-2">
          {assets && assets.length > 0 ? (
            assets.map((asset) => (
              <span
                key={asset.id}
                className="px-3 py-1 bg-white/20 text-white text-[10px] font-bold rounded-lg border border-white/30"
              >
                {asset.assetName}
              </span>
            ))
          ) : (
            <span className="text-[9px] opacity-50 uppercase font-black">No assets assigned</span>
          )}
        </div>
      </div>

      {project?.cloudLink && (
        <a
          href={project.cloudLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-white/10 hover:bg-white/20 text-center py-3 rounded-xl text-[10px] font-black uppercase transition-all border border-white/10"
        >
          Project Cloud ↗
        </a>
      )}
    </div>
  );
};