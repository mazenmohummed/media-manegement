// components/production/ProductionAssetUploader.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileVideo, FileAudio, File, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

interface ProductionAssetUploaderProps {
  projectId: string;
  conceptId: string;
  assetId: string;
  assetType: string;
  onUploadComplete?: (versionId: string, fileUrl: string) => void;
  onUploadError?: (error: string) => void;
}

interface UploadChunk {
  partNumber: number;
  etag: string;
  size: number;
}

interface UploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'retrying';
  error?: string;
  retryCount?: number;
}

interface UploadCheckpoint {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  assetId: string;
  conceptId: string;
  projectId: string;
  versionId: string;
  uploadId: string;
  uploadUrl: string;
  uploadedParts: UploadChunk[];
  totalChunks: number;
  uploadedBytes: number;
  lastUpdated: number;
}

export function ProductionAssetUploader({
  projectId,
  conceptId,
  assetId,
  assetType,
  onUploadComplete,
  onUploadError,
}: ProductionAssetUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress>({
    uploaded: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    remainingTime: 0,
    status: 'idle',
  });
  const [uploadSession, setUploadSession] = useState<{ uploadId: string; versionId: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [chunkSize] = useState(5 * 1024 * 1024); // 5MB chunks
  const [uploadedParts, setUploadedParts] = useState<UploadChunk[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [checkpointFileId, setCheckpointFileId] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const maxRetries = 3;
  const baseRetryDelay = 2000; // 2 seconds
  const checkpointKey = 'production_upload_checkpoint';

  // ─── Checkpoint Management ──────────────────────────────────────────────

  const saveCheckpoint = useCallback(() => {
    if (!file || !uploadSession) return;

    const checkpoint: UploadCheckpoint = {
      fileId: `${file.name}-${file.size}-${file.lastModified}`,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      assetId: assetId,
      conceptId: conceptId,
      projectId: projectId,
      versionId: uploadSession.versionId,
      uploadId: uploadSession.uploadId,
      uploadUrl: '', // We'll get this from the server on resume
      uploadedParts: uploadedParts,
      totalChunks: Math.ceil(file.size / chunkSize),
      uploadedBytes: uploadedParts.reduce((acc, p) => acc + p.size, 0),
      lastUpdated: Date.now(),
    };

    try {
      localStorage.setItem(checkpointKey, JSON.stringify(checkpoint));
      setCheckpointFileId(checkpoint.fileId);
    } catch (error) {
      console.warn('Failed to save checkpoint:', error);
    }
  }, [file, uploadSession, uploadedParts, chunkSize, assetId, conceptId, projectId]);

  const loadCheckpoint = useCallback((): UploadCheckpoint | null => {
    try {
      const stored = localStorage.getItem(checkpointKey);
      if (!stored) return null;
      
      const checkpoint: UploadCheckpoint = JSON.parse(stored);
      
      // Check if checkpoint is still valid (less than 24 hours old)
      if (Date.now() - checkpoint.lastUpdated > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(checkpointKey);
        return null;
      }
      
      return checkpoint;
    } catch (error) {
      console.warn('Failed to load checkpoint:', error);
      return null;
    }
  }, []);

  const clearCheckpoint = useCallback(() => {
    try {
      localStorage.removeItem(checkpointKey);
      setCheckpointFileId(null);
    } catch (error) {
      console.warn('Failed to clear checkpoint:', error);
    }
  }, []);

  // ─── Retry Logic ──────────────────────────────────────────────────────────

  const calculateRetryDelay = (attempt: number): number => {
    // Exponential backoff: 2s, 4s, 8s, 16s...
    return baseRetryDelay * Math.pow(2, attempt - 1);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const uploadWithRetry = useCallback(async (
    url: string,
    formData: FormData,
    chunkIndex: number,
    attempt: number = 1
  ): Promise<{ etag: string; success: boolean }> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      if (response.ok) {
        let etag = '';
        try {
          const data = await response.json();
          etag = data.etag || '';
        } catch {
          etag = response.headers.get('ETag') || '';
        }
        return { etag, success: true };
      }

      // If we get a 5xx error or network error, retry
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Server error: ${response.status}`);
      }

      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    } catch (error: any) {
      // Don't retry on abort
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        throw error;
      }

      // Check if we've exceeded max retries
      if (attempt >= maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Calculate delay with exponential backoff
      const delay = calculateRetryDelay(attempt);
      
      // Update progress to show retry status
      setProgress(prev => ({
        ...prev,
        status: 'retrying',
        retryCount: attempt,
      }));

      toast.loading(`Retrying upload... (Attempt ${attempt + 1}/${maxRetries})`);

      // Wait before retrying
      await wait(delay);

      // Retry with incremented attempt
      return uploadWithRetry(url, formData, chunkIndex, attempt + 1);
    }
  }, [maxRetries]);

  // ─── Resume Upload ───────────────────────────────────────────────────────

  const resumeUpload = useCallback(async (checkpoint: UploadCheckpoint) => {
    setIsUploading(true);
    setProgress(prev => ({ ...prev, status: 'uploading' }));

    try {
      // Validate checkpoint matches current file
      if (!file) {
        toast.error('File not selected. Please select the file again.');
        return;
      }

      if (checkpoint.fileId !== `${file.name}-${file.size}-${file.lastModified}`) {
        toast.error('File mismatch. Please start a new upload.');
        clearCheckpoint();
        return;
      }

      // Get fresh upload URL from server
      const resumeResponse = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/upload/resume`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: checkpoint.uploadId,
            versionId: checkpoint.versionId,
          }),
        }
      );

      if (!resumeResponse.ok) {
        const error = await resumeResponse.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to resume upload');
      }

      const { uploadUrl, versionId } = await resumeResponse.json();
      
      setUploadSession({ 
        uploadId: checkpoint.uploadId, 
        versionId: versionId || checkpoint.versionId 
      });
      
      setUploadedParts(checkpoint.uploadedParts);

      const totalChunks = checkpoint.totalChunks;
      const startTime = Date.now();
      let uploadedBytes = checkpoint.uploadedBytes;

      // Resume from last completed chunk
      const startChunk = checkpoint.uploadedParts.length;

      for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('partNumber', String(chunkIndex + 1));
        formData.append('uploadId', checkpoint.uploadId);

        const { etag, success } = await uploadWithRetry(
          uploadUrl,
          formData,
          chunkIndex
        );

        if (!success) {
          throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
        }

        const newPart: UploadChunk = {
          partNumber: chunkIndex + 1,
          etag: etag,
          size: end - start,
        };

        setUploadedParts(prev => [...prev, newPart]);

        uploadedBytes += end - start;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
        const remainingBytes = file.size - uploadedBytes;
        const remainingTime = speed > 0 ? remainingBytes / speed : 0;

        setProgress({
          uploaded: uploadedBytes,
          total: file.size,
          percentage: (uploadedBytes / file.size) * 100,
          speed: speed,
          remainingTime: remainingTime,
          status: 'uploading',
          retryCount: 0,
        });

        // Save checkpoint after each chunk
        saveCheckpoint();

        // Update session progress
        try {
          await fetch(
            `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/upload`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uploadId: checkpoint.uploadId,
                completedParts: uploadedParts.length + 1,
                totalParts: totalChunks,
                key: `agencies/${assetId}/versions/${versionId}/${checkpoint.uploadId}_${file.name}`,
              }),
            }
          );
        } catch {
          // Ignore progress update errors
        }
      }

      // Complete upload
      const allParts = [...uploadedParts];
      const completeResponse = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/upload`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: checkpoint.uploadId,
            completedParts: allParts.length,
            totalParts: totalChunks,
            key: `agencies/${assetId}/versions/${versionId}/${checkpoint.uploadId}_${file.name}`,
            eTag: allParts.map(c => c.etag).join(','),
            isComplete: true,
          }),
        }
      );

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete upload');
      }

      const completeData = await completeResponse.json();

      setProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
      clearCheckpoint();
      toast.success('Upload completed successfully!');

      if (onUploadComplete) {
        onUploadComplete(versionId, completeData.fileUrl || completeData.url || '');
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        setProgress(prev => ({ ...prev, status: 'idle' }));
        toast.success('Upload cancelled');
        return;
      }

      console.error('Upload error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        error: error.message || 'Upload failed',
      }));
      toast.error(error.message || 'Upload failed');
      if (onUploadError) {
        onUploadError(error.message || 'Upload failed');
      }
    } finally {
      setIsUploading(false);
    }
  }, [file, assetId, conceptId, projectId, chunkSize, saveCheckpoint, clearCheckpoint, uploadWithRetry, onUploadComplete, onUploadError]);

  // ─── Check for Existing Checkpoint ──────────────────────────────────────

  useEffect(() => {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      setShowResumePrompt(true);
      setCheckpointFileId(checkpoint.fileId);
    }
  }, []);

  // ─── Dropzone ──────────────────────────────────────────────────────────────

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress({
        uploaded: 0,
        total: selectedFile.size,
        percentage: 0,
        speed: 0,
        remainingTime: 0,
        status: 'idle',
      });
      setUploadedParts([]);
      clearCheckpoint();
    }
  }, [clearCheckpoint]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: isUploading,
  });

  // ─── Upload Control ──────────────────────────────────────────────────────

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setProgress(prev => ({ ...prev, status: 'idle' }));
    clearCheckpoint();
    toast.success('Upload cancelled');
  };

  const handleResume = async () => {
    const checkpoint = loadCheckpoint();
    if (!checkpoint) {
      setShowResumePrompt(false);
      return;
    }
    setShowResumePrompt(false);
    await resumeUpload(checkpoint);
  };

  const handleNewUpload = () => {
    setShowResumePrompt(false);
    clearCheckpoint();
    setFile(null);
    setUploadedParts([]);
    setProgress({
      uploaded: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      status: 'idle',
    });
  };

  const startUpload = async () => {
    if (!file) return;

    // Check for existing checkpoint
    const checkpoint = loadCheckpoint();
    if (checkpoint && checkpoint.fileId === `${file.name}-${file.size}-${file.lastModified}`) {
      setShowResumePrompt(true);
      return;
    }

    clearCheckpoint();
    await performUpload();
  };

  const performUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(prev => ({ ...prev, status: 'uploading' }));

    try {
      // Initiate upload
      const initResponse = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            createVersion: true,
          }),
        }
      );

      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initiate upload');
      }

      const { uploadId, uploadUrl, versionId, sessionId } = await initResponse.json();
      setUploadSession({ uploadId, versionId });

      // Upload in chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      let uploadedBytes = 0;
      const startTime = Date.now();
      const chunks: UploadChunk[] = [];

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('partNumber', String(chunkIndex + 1));
        formData.append('uploadId', uploadId);

        const { etag, success } = await uploadWithRetry(
          uploadUrl,
          formData,
          chunkIndex
        );

        if (!success) {
          throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
        }

        chunks.push({
          partNumber: chunkIndex + 1,
          etag: etag,
          size: end - start,
        });

        setUploadedParts(chunks);

        uploadedBytes += end - start;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
        const remainingBytes = file.size - uploadedBytes;
        const remainingTime = speed > 0 ? remainingBytes / speed : 0;

        setProgress({
          uploaded: uploadedBytes,
          total: file.size,
          percentage: (uploadedBytes / file.size) * 100,
          speed: speed,
          remainingTime: remainingTime,
          status: 'uploading',
          retryCount: 0,
        });

        // Save checkpoint after each chunk
        saveCheckpoint();

        // Update session progress
        try {
          await fetch(
            `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/upload`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uploadId,
                completedParts: chunks.length,
                totalParts: totalChunks,
                key: `agencies/${assetId}/versions/${versionId}/${uploadId}_${file.name}`,
              }),
            }
          );
        } catch {
          // Ignore progress update errors
        }
      }

      // Complete upload
      const completeResponse = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets/${assetId}/upload`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            completedParts: chunks.length,
            totalParts: totalChunks,
            key: `agencies/${assetId}/versions/${versionId}/${uploadId}_${file.name}`,
            eTag: chunks.map(c => c.etag).join(','),
            isComplete: true,
          }),
        }
      );

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete upload');
      }

      const completeData = await completeResponse.json();

      setProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
      clearCheckpoint();

      toast.success('File uploaded successfully!');

      if (onUploadComplete) {
        onUploadComplete(versionId, completeData.fileUrl || completeData.url || '');
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        setProgress(prev => ({ ...prev, status: 'idle' }));
        clearCheckpoint();
        toast.success('Upload cancelled');
        return;
      }

      console.error('Upload error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        error: error.message || 'Upload failed',
      }));
      toast.error(error.message || 'Upload failed');
      if (onUploadError) {
        onUploadError(error.message || 'Upload failed');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getFileIcon = () => {
    if (!file) return <File className="w-8 h-8 text-zinc-400" />;
    if (file.type.startsWith('video/')) return <FileVideo className="w-8 h-8 text-blue-400" />;
    if (file.type.startsWith('audio/')) return <FileAudio className="w-8 h-8 text-emerald-400" />;
    return <File className="w-8 h-8 text-zinc-400" />;
  };

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      VIDEO: 'Video',
      AUDIO: 'Audio',
      RAW_FOOTAGE: 'Raw Footage',
      PROXY_FOOTAGE: 'Proxy Footage',
      EXPORT_MASTER: 'Export Master',
      EXPORT_HIGH_RES: 'High-Res Export',
      EXPORT_WEB: 'Web Export',
      AUDIO_RAW: 'Raw Audio',
      AUDIO_MIX: 'Audio Mix',
      AUDIO_MASTER: 'Audio Master',
      MOTION_GRAPHICS: 'Motion Graphics',
      VFX: 'Visual Effects',
      COLOR_GRADE: 'Color Grade',
      SUBTITLES: 'Subtitles',
    };
    return labels[type] || type;
  };

  const getMaxFileSize = (type: string) => {
    const maxSizes: Record<string, string> = {
      RAW_FOOTAGE: '50GB',
      EXPORT_MASTER: '20GB',
      EXPORT_HIGH_RES: '10GB',
      VIDEO: '10GB',
      MOTION_GRAPHICS: '10GB',
      VFX: '10GB',
      AUDIO_RAW: '5GB',
      AUDIO_MASTER: '5GB',
    };
    return maxSizes[type] || '5GB';
  };

  const getStatusMessage = () => {
    if (progress.status === 'retrying') {
      return `Retrying upload... (Attempt ${(progress.retryCount || 0) + 1}/${maxRetries})`;
    }
    if (progress.status === 'failed') {
      return 'Upload failed';
    }
    if (progress.status === 'completed') {
      return 'Upload complete!';
    }
    if (progress.status === 'uploading') {
      return 'Uploading...';
    }
    return '';
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
      {/* Resume Prompt Modal */}
      {showResumePrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Resume Upload?</h3>
                <p className="text-sm text-zinc-400">We found a partial upload that can be resumed</p>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-zinc-300">
                {checkpointFileId ? `File: ${checkpointFileId}` : 'Unknown file'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Uploaded: {formatFileSize(loadCheckpoint()?.uploadedBytes || 0)} / {formatFileSize(loadCheckpoint()?.fileSize || 0)}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleResume}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button
                onClick={handleNewUpload}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Start New
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Upload Production Asset</h3>
          <p className="text-xs text-zinc-400">Type: {getAssetTypeLabel(assetType)}</p>
        </div>
        {['RAW_FOOTAGE', 'EXPORT_MASTER', 'EXPORT_HIGH_RES'].includes(assetType) && (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            Large File Supported (up to {getMaxFileSize(assetType)})
          </Badge>
        )}
      </div>

      {/* Dropzone */}
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500/50 bg-blue-500/5'
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-zinc-400" />
            <p className="text-sm text-zinc-300">
              {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-zinc-500">
              Maximum file size: {getMaxFileSize(assetType)}
            </p>
            {['RAW_FOOTAGE', 'EXPORT_MASTER'].includes(assetType) && (
              <p className="text-xs text-zinc-500">
                Supports resumable uploads for large files
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-4 p-3 bg-zinc-900/50 rounded-lg">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{file.name}</p>
              <p className="text-xs text-zinc-400">{formatFileSize(file.size)}</p>
              {uploadedParts.length > 0 && (
                <p className="text-xs text-green-400 mt-0.5">
                  Resumable: {formatFileSize(uploadedParts.reduce((acc, p) => acc + p.size, 0))} uploaded
                </p>
              )}
            </div>
            {!isUploading && progress.status !== 'completed' && (
              <button
                onClick={() => {
                  setFile(null);
                  clearCheckpoint();
                }}
                className="p-1 hover:bg-zinc-700 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress */}
          {progress.status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{getStatusMessage()}</span>
                <span>{progress.percentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={progress.percentage} 
                className={`h-2 ${progress.status === 'retrying' ? 'bg-amber-500/20' : ''}`}
              />
              {progress.status === 'uploading' && (
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatFileSize(progress.uploaded)} / {formatFileSize(progress.total)}</span>
                  <span>
                    {formatFileSize(progress.speed)}/s • {formatTime(progress.remainingTime)} remaining
                  </span>
                </div>
              )}
              {progress.status === 'retrying' && (
                <div className="flex items-center justify-between text-xs text-amber-400">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Retrying...
                  </span>
                  <span>Attempt {(progress.retryCount || 0) + 1}/{maxRetries}</span>
                </div>
              )}
              {progress.status === 'failed' && progress.error && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {progress.error}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isUploading && progress.status === 'idle' && (
              <Button
                onClick={startUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            )}
            {isUploading && (
              <Button
                onClick={cancelUpload}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Upload
              </Button>
            )}
            {progress.status === 'completed' && (
              <Button
                onClick={() => {
                  setFile(null);
                  setProgress({ uploaded: 0, total: 0, percentage: 0, speed: 0, remainingTime: 0, status: 'idle' });
                  setUploadedParts([]);
                  setUploadSession(null);
                  clearCheckpoint();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Done
              </Button>
            )}
            {progress.status === 'failed' && (
              <Button
                onClick={startUpload}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}