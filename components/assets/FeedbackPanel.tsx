'use client';

import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface FeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => Promise<void>;
  assetName?: string;
  versionNumber?: number;
  isSubmitting?: boolean;
}

export function FeedbackPanel({
  isOpen,
  onClose,
  onSubmit,
  assetName,
  versionNumber,
  isSubmitting = false,
}: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      // You might want to show a toast here
      return;
    }
    await onSubmit(feedback.trim());
    setFeedback('');
  };

  const handleClose = () => {
    setFeedback('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Request Revisions</h2>
              <p className="text-xs text-zinc-500">
                {assetName && versionNumber
                  ? `Provide feedback for "${assetName}" (Version ${versionNumber})`
                  : 'Provide feedback for this version'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Feedback <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe what needs to be revised..."
              rows={4}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !feedback.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}