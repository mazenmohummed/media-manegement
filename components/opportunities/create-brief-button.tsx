// components/opportunities/create-brief-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2, FileText } from "lucide-react";

interface CreateBriefButtonProps {
  opportunityId: string;
  opportunityName?: string;
  agencyId?: string;
  variant?: "quick" | "standard";
}

export function CreateBriefButton({ 
  opportunityId, 
  opportunityName,
  agencyId,
  variant = "quick" 
}: CreateBriefButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleQuickCreate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/creative-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunityName,
          agencyId,
        }),
      });
      
      const res = await response.json();

      if (res.success && res.projectId) {
        router.push(`/dashboard/projects/${res.projectId}`);
        router.refresh();
      } else {
        alert(res.error || "Something went wrong.");
      }
    } catch (err) {
      console.error("Failed to create creative brief:", err);
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardCreate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          opportunityName,
          agencyId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create brief");
      }

      const data = await response.json();
      router.push(`/dashboard/briefs/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create brief:", error);
      alert("Failed to create brief. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = variant === "quick" ? handleQuickCreate : handleStandardCreate;

  if (variant === "standard") {
    return (
      <Button
        onClick={handleClick}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs border-zinc-700 text-zinc-200 hover:bg-zinc-800"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        Create Brief
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size="sm"
      className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs font-medium"
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Wand2 className="w-3.5 h-3.5 text-purple-200" />
      )}
      Quick-Create Creative Brief
    </Button>
  );
}