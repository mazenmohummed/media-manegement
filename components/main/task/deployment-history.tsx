// components/main/task/deployment-history.tsx
"use client";

import { useState } from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Assuming you use lucide-react

interface AttendanceLog {
  id: string;
  checkInTime: string;
  checkOutTime?: string;
  user?: {
    name: string;
  };
}

interface DeploymentHistoryProps {
  logs: AttendanceLog[];
}

export const DeploymentHistory = ({ logs }: DeploymentHistoryProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination Logic
  const totalPages = Math.ceil((logs?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = logs?.slice(startIndex, startIndex + itemsPerPage) || [];

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="bg-card border border-border p-8 rounded-[2.5rem] space-y-6 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Deployment History
        </h3>
        {totalPages > 1 && (
          <span className="text-[8px] font-black text-muted-foreground/50">
            PAGE {currentPage} / {totalPages}
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {currentLogs.length > 0 ? (
          currentLogs.map((log) => (
            <div key={log.id} className="border-l-4 border-blue-500 bg-muted/20 p-3 rounded-r-xl">
              <div className="flex justify-between items-center">
                <span className="font-black text-[10px] uppercase">
                  {log.user?.name || "Unknown User"}
                </span>
                <span
                  className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                    log.checkOutTime
                      ? "bg-muted-foreground/10 text-muted-foreground"
                      : "bg-emerald-500 text-white animate-pulse"
                  }`}
                >
                  {log.checkOutTime ? "COMPLETED" : "LIVE"}
                </span>
              </div>
              <div className="text-[9px] opacity-70 font-mono mt-1">
                {moment(log.checkInTime).format("DD MMM · HH:mm")} -{" "}
                {log.checkOutTime ? moment(log.checkOutTime).format("HH:mm") : "..."}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 opacity-30 text-[10px] font-black uppercase">
            No history recorded
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-full hover:bg-muted disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-5 h-5 rounded-md text-[8px] font-black transition-all ${
                  currentPage === page 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full hover:bg-muted disabled:opacity-20 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};