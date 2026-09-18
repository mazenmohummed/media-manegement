// components/milestones/ConceptsList.tsx
'use client';

import Link from 'next/link';
import { Lightbulb, Unlink, Loader2, Plus, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConceptItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assets: { id: string }[];
  createdAt: string;
  taskId: string | null;
  milestoneId: string | null;
}

interface ConceptsListProps {
  concepts: ConceptItem[];
  milestoneId: string;
  onUnlinkConcept: (conceptId: string) => Promise<void>;
  unlinking: string | null;
  onOpenLinkDialog: () => void;
}

export function ConceptsList({ 
  concepts, 
  milestoneId, 
  onUnlinkConcept, 
  unlinking,
  onOpenLinkDialog 
}: ConceptsListProps) {
  if (!concepts || concepts.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
        <Lightbulb className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 font-medium">No concepts yet.</p>
        <p className="text-xs text-zinc-600 mt-1">Create a new concept or link an existing one from the project.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {concepts.map((concept) => (
        <ConceptCard 
          key={concept.id} 
          concept={concept} 
          onUnlinkConcept={onUnlinkConcept}
          unlinking={unlinking}
        />
      ))}
    </div>
  );
}

function ConceptCard({ 
  concept, 
  onUnlinkConcept, 
  unlinking 
}: { 
  concept: ConceptItem; 
  onUnlinkConcept: (conceptId: string) => Promise<void>;
  unlinking: string | null;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group">
      <div className="flex items-start justify-between">
        <Link
          href={`/dashboard/concepts/${concept.id}`}
          className="flex-1 min-w-0"
        >
          <h3 className="font-medium text-zinc-200 group-hover:text-zinc-100">
            {concept.name}
          </h3>
          {concept.description && (
            <p className="text-sm text-zinc-400 line-clamp-2">{concept.description}</p>
          )}
        </Link>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Badge className={`text-[9px] ${
            concept.status === 'APPROVED'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : concept.status === 'IN_REVIEW'
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
          }`}>
            {concept.status}
          </Badge>
          <Button
            onClick={() => onUnlinkConcept(concept.id)}
            disabled={unlinking === concept.id}
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            title="Unlink from milestone"
          >
            {unlinking === concept.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Unlink className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-500 flex items-center gap-3">
        <span>{concept.assets?.length || 0} assets</span>
        <span>•</span>
        <span>{new Date(concept.createdAt).toLocaleDateString()}</span>
        {concept.taskId && (
          <>
            <span>•</span>
            <span className="text-blue-400">Linked to task</span>
          </>
        )}
      </div>
    </div>
  );
}