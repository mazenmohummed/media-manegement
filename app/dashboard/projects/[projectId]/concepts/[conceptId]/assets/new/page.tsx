'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  File,
  Image,
  Video,
  Music,
  FileText,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AssetType = 'MOODBOARD' | 'STORYBOARD' | 'SCRIPT' | 'COPY' | 'MOCKUP' | 'VIDEO' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'OTHER';

const assetTypeOptions: { value: AssetType; label: string; icon: React.ReactNode }[] = [
  { value: 'MOODBOARD', label: 'Moodboard', icon: <Image className="w-4 h-4" /> },
  { value: 'STORYBOARD', label: 'Storyboard', icon: <Image className="w-4 h-4" /> },
  { value: 'SCRIPT', label: 'Script', icon: <FileText className="w-4 h-4" /> },
  { value: 'COPY', label: 'Copy', icon: <FileText className="w-4 h-4" /> },
  { value: 'MOCKUP', label: 'Mockup', icon: <Image className="w-4 h-4" /> },
  { value: 'VIDEO', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { value: 'IMAGE', label: 'Image', icon: <Image className="w-4 h-4" /> },
  { value: 'AUDIO', label: 'Audio', icon: <Music className="w-4 h-4" /> },
  { value: 'DOCUMENT', label: 'Document', icon: <File className="w-4 h-4" /> },
  { value: 'OTHER', label: 'Other', icon: <File className="w-4 h-4" /> },
];

export default function NewAssetPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  const conceptId = params?.conceptId as string;

  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('IMAGE');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(droppedFile);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('type', type);
      formData.append('file', file);

      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/assets`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload asset');
      }

      toast.success('Asset uploaded successfully');
      router.push(`/dashboard/projects/${projectId}/concepts/${conceptId}?tab=assets`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload asset');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/dashboard/projects"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Project
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}?tab=concepts`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Concepts
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <Link
          href={`/dashboard/projects/${projectId}/concepts/${conceptId}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Concept
        </Link>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <span className="text-zinc-300 font-medium">Add Asset</span>
      </nav>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Upload className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Add Creative Asset</h1>
            <p className="text-xs text-zinc-500">Upload a new asset to this concept</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Asset Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Asset Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                placeholder="e.g., Final Logo Design, Moodboard V2"
                required
              />
            </div>

            {/* Asset Type */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Asset Type <span className="text-red-400">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                {assetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                File <span className="text-red-400">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-700 hover:border-zinc-600'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                />

                {file ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Preview"
                          className="max-h-32 rounded-lg object-contain"
                        />
                      ) : (
                        <div className="p-4 bg-zinc-800/50 rounded-lg">
                          <File className="w-8 h-8 text-zinc-400" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                        <p className="text-xs text-zinc-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Badge className="mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">
                          {file.type || 'Unknown type'}
                        </Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-10 w-10 text-zinc-600" />
                    <p className="text-sm text-zinc-400">
                      Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-zinc-500">
                      Supports: Images, Videos, Audio, PDF, Documents (Max 50MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-800">
            <Link
              href={`/dashboard/projects/${projectId}/concepts/${conceptId}?tab=assets`}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Asset
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}