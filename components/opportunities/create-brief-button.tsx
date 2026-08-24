// components/opportunities/create-brief-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";

interface CreateBriefButtonProps {
  opportunityId: string;
}

export function CreateBriefButton({ opportunityId }: CreateBriefButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleQuickCreate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/creative-brief`, {
        method: "POST",
      });
      const res = await response.json();

      if (res.success && res.projectId) {
        router.push(`/dashboard/projects/${res.projectId}`);
        router.refresh();
      } else {
        alert(res.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleQuickCreate}
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