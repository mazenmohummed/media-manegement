// components/projects/ReviewLinkDialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ReviewLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: string;
  assetCount: number;
}

export function ReviewLinkDialog({ open, onOpenChange, link, assetCount }: ReviewLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy link');
      }
      textArea.remove();
    }
  };

  const handleOpenReview = () => {
    window.open(link, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-xl flex items-center gap-2">
            🎉 Review Link Generated
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-zinc-400">
            Share this link with your client to get feedback on <strong className="text-zinc-200">{assetCount}</strong> asset(s).
          </p>
          
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
            <code className="text-xs text-zinc-300 break-all select-all">
              {link}
            </code>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              onClick={handleOpenReview}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Review
            </Button>
          </div>
          
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Link expires in 30 days</span>
            <span>Max 10 views</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}