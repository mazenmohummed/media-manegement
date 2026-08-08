"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteOpportunityButtonProps {
  opportunityId: string;
  opportunityName: string;
}

export function DeleteOpportunityButton({
  opportunityId,
  opportunityName,
}: DeleteOpportunityButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete opportunity");
      }

      setOpen(false);
      router.push("/dashboard/opportunities");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Delete
      </Button>

      <Dialog open={open} onOpenChange={(next) => !isDeleting && setOpen(next)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4.5 h-4.5" />
              Delete Opportunity
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              This will permanently delete{" "}
              <span className="font-semibold text-zinc-200">
                {opportunityName}
              </span>
              , including its personas, competitors, products, and strategic
              notes. Linked proposals will not be deletable while this
              opportunity is removed if they reference it. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
              className="text-zinc-300 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Opportunity"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}