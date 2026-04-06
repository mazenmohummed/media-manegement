"use client";

import React from "react";

interface Client {
  id: string;
  clientName: string;
}

interface ProjectIdentitySidebarProps {
  clients: Client[];
  clientId: string;
  setClientId: (id: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  projectStory: string;
  setProjectStory: (story: string) => void;
  cloudLink: string;
  setCloudLink: (link: string) => void;
  departments: string[];
  selectedTasks: Record<string, any>;
  toggleTask: (dept: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function ProjectIdentitySidebar({
  clients,
  clientId,
  setClientId,
  projectName,
  setProjectName,
  projectStory,
  setProjectStory,
  cloudLink,
  setCloudLink,
  departments,
  selectedTasks,
  toggleTask,
  handleSubmit,
  isSubmitting,
}: ProjectIdentitySidebarProps) {
  return (
    <div className="lg:col-span-4 space-y-6">
      <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm sticky top-8">
        <div className="space-y-4 mb-8">
          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
            Identity & Cloud
          </label>
          
          <select
            className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-bold border-2 border-transparent focus:border-blue-600 transition-all"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="" disabled>SELECT CLIENT</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.clientName}</option>
            ))}
          </select>

          <input 
            placeholder="Project Name" 
            className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all" 
            value={projectName} 
            onChange={e => setProjectName(e.target.value)} 
          />
          
          <textarea 
            placeholder="Project Story / Brief..." 
            rows={4}
            className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all resize-none" 
            value={projectStory} 
            onChange={e => setProjectStory(e.target.value)} 
          />

          <input 
            placeholder="Cloud Assets Link (Drive/Dropbox)" 
            className="w-full p-4 rounded-2xl bg-muted/50 outline-none text-sm font-medium border-2 border-transparent focus:border-blue-600 transition-all" 
            value={cloudLink} 
            onChange={e => setCloudLink(e.target.value)} 
          />
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-[10px] font-black uppercase text-muted-foreground mb-4 tracking-widest">
            Enable Departments
          </p>
          <div className="flex flex-wrap gap-2">
            {departments.map(dept => (
              <button 
                key={dept} 
                type="button" 
                onClick={() => toggleTask(dept)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                  selectedTasks[dept] 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className={`w-full mt-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3
            ${isSubmitting 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-foreground text-background hover:bg-blue-600 hover:text-white"
            }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              Syncing with Prisma...
            </>
          ) : (
            "Initialize Production"
          )}
        </button>
      </div>
    </div>
  );
}