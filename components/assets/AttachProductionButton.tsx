// components/assets/AttachProductionButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Upload, ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AttachProductionButtonProps {
  assetId: string;
  conceptId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function AttachProductionButton({
  assetId,
  conceptId,
  assetName,
  onSuccess,
}: AttachProductionButtonProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    await handleUpload(selectedFile);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    try {
      // First upload file to storage (simplified - adjust based on your storage setup)
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || 'Failed to upload file');
      }
      
      const { fileUrl } = await uploadRes.json();

      // Attach as production asset
      const attachRes = await fetch(`/api/assets/${assetId}/attach-production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          name: file.name,
          type: file.type,
          conceptId,
        }),
      });

      const data = await attachRes.json();

      if (!attachRes.ok) {
        if (attachRes.status === 403 && data.type === 'APPROVAL_REQUIRED') {
          toast.error(
            `⚠️ ${data.error}\n\n${data.details}`,
            { duration: 8000 }
          );
        } else {
          throw new Error(data.error || 'Failed to attach production asset');
        }
        return;
      }

      toast.success(`Production version attached to "${assetName}"`);
      onSuccess?.();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach production asset');
    } finally {
      setUploading(false);
      setFile(null);
      // Reset file input
      const input = document.getElementById('production-file-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <input
        id="production-file-input"
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
      />
      <Button
        onClick={() => document.getElementById('production-file-input')?.click()}
        disabled={uploading}
        variant="outline"
        size="sm"
        className="border-emerald-600/30 text-emerald-400 hover:bg-emerald-950/20"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-1.5" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-1.5" />
            Attach Production Asset
          </>
        )}
      </Button>
      <button
        type="button"
        onClick={async () => {
          try {
            const res = await fetch(`/api/concepts/${conceptId}/approval-status`);
            if (res.ok) {
              const data = await res.json();
              if (data.canProceed) {
                toast.success('✅ Concept is approved and ready for production!');
              } else {
                toast.error(
                  `❌ Cannot attach production asset:\n${data.errors.join('\n')}`,
                  { duration: 8000 }
                );
              }
            }
          } catch (err) {
            toast.error('Failed to check approval status');
          }
        }}
        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors"
        title="Check approval status"
      >
        <ShieldAlert className="w-4 h-4" />
      </button>
    </div>
  );
}