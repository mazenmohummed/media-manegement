// app/dashboard/creative-assets/new/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  X,
  Upload,
  FileText,
  Image,
  Video,
  Music,
  File,
  Film,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { getProductionStages } from '@/lib/validations/production-assets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Concept {
  id: string;
  name: string;
  status: string;
  projectId: string;
}

interface Project {
  id: string;
  projectName: string;
  client: {
    id: string;
    clientName: string;
  };
}

// ─── Asset Type Options ────────────────────────────────────────────────────

const ASSET_TYPES = [
  { value: 'MOODBOARD', label: 'Moodboard', icon: Image },
  { value: 'STORYBOARD', label: 'Storyboard', icon: Image },
  { value: 'SCRIPT', label: 'Script', icon: FileText },
  { value: 'COPY', label: 'Copy', icon: FileText },
  { value: 'MOCKUP', label: 'Mockup', icon: Image },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'IMAGE', label: 'Image', icon: Image },
  { value: 'AUDIO', label: 'Audio', icon: Music },
  { value: 'DOCUMENT', label: 'Document', icon: File },
  { value: 'RAW_FOOTAGE', label: 'Raw Footage', icon: Film },
  { value: 'PROXY_FOOTAGE', label: 'Proxy Footage', icon: Film },
  { value: 'EXPORT_MASTER', label: 'Export Master', icon: Video },
  { value: 'EXPORT_HIGH_RES', label: 'High-Res Export', icon: Video },
  { value: 'EXPORT_WEB', label: 'Web Export', icon: Video },
  { value: 'AUDIO_RAW', label: 'Raw Audio', icon: Music },
  { value: 'AUDIO_MIX', label: 'Audio Mix', icon: Music },
  { value: 'AUDIO_MASTER', label: 'Audio Master', icon: Music },
  { value: 'MOTION_GRAPHICS', label: 'Motion Graphics', icon: Film },
  { value: 'VFX', label: 'VFX', icon: Film },
  { value: 'COLOR_GRADE', label: 'Color Grade', icon: Image },
  { value: 'SUBTITLES', label: 'Subtitles', icon: FileText },
  { value: 'OTHER', label: 'Other', icon: File },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function NewCreativeAssetPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State ──────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    productionStage: '',
    projectId: '',
    conceptId: '',
    clientAccessible: false,
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // ─── Duplicate name check ──────────────────────────────────────────────
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      fetchConcepts(formData.projectId);
    } else {
      setConcepts([]);
    }
  }, [formData.projectId]);

  // ─── Check for duplicate name ───────────────────────────────────────────
  useEffect(() => {
    const checkDuplicateName = async () => {
      const name = formData.name.trim();
      const conceptId = formData.conceptId;
      
      // Don't check if name is empty or no concept selected
      if (!name || !conceptId) {
        setDuplicateWarning(null);
        return;
      }

      setCheckingName(true);
      try {
        const response = await fetch(
          `/api/creative-assets/check-duplicate?name=${encodeURIComponent(name)}&conceptId=${conceptId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setDuplicateWarning(
              `⚠️ An asset named "${name}" already exists in this concept. It will be saved as "${data.suggestedName || name}"`
            );
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch (error) {
        // Silently fail - don't block the user
        console.error('Error checking duplicate name:', error);
      } finally {
        setCheckingName(false);
      }
    };

    // Debounce the check
    const timer = setTimeout(checkDuplicateName, 500);
    return () => clearTimeout(timer);
  }, [formData.name, formData.conceptId]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch projects (${response.status})`);
      }
      
      const data = await response.json();
      
      let projectsArray = [];
      if (Array.isArray(data)) {
        projectsArray = data;
      } else if (data.projects && Array.isArray(data.projects)) {
        projectsArray = data.projects;
      } else if (data.data && Array.isArray(data.data)) {
        projectsArray = data.data;
      } else {
        console.warn('Unexpected projects response format:', data);
        projectsArray = [];
      }
      
      setProjects(projectsArray);
      
      if (projectsArray.length === 0) {
        setFetchError('No projects found. Please create a project first.');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to load projects');
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchConcepts = async (projectId: string) => {
    setLoadingConcepts(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/concepts`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch concepts');
      }
      const data = await response.json();
      
      let conceptsArray = [];
      if (Array.isArray(data)) {
        conceptsArray = data;
      } else if (data.concepts && Array.isArray(data.concepts)) {
        conceptsArray = data.concepts;
      } else if (data.data && Array.isArray(data.data)) {
        conceptsArray = data.data;
      } else {
        conceptsArray = [];
      }
      
      setConcepts(conceptsArray);
      
      if (conceptsArray.length === 1) {
        setFormData(prev => ({ ...prev, conceptId: conceptsArray[0].id }));
      }
    } catch (error) {
      console.error('Error fetching concepts:', error);
      toast.error('Failed to load concepts');
      setConcepts([]);
    } finally {
      setLoadingConcepts(false);
    }
  };

  // ─── Form Handlers ──────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadProgress(0);
      setUploadComplete(false);
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Asset type is required';
    }
    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }
    if (!formData.conceptId) {
      newErrors.conceptId = 'Concept is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    // If there's a duplicate warning, show confirmation dialog
    if (duplicateWarning) {
      setShowConfirmDialog(true);
      return;
    }

    await performSubmit();
  };

  const performSubmit = async () => {
    setShowConfirmDialog(false);
    setSaving(true);

    try {
      console.log('📤 Submitting form data:', {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        productionStage: formData.productionStage || null,
        conceptId: formData.conceptId,
        clientAccessible: formData.clientAccessible,
      });

      const response = await fetch('/api/creative-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          productionStage: formData.productionStage || null,
          conceptId: formData.conceptId,
          clientAccessible: formData.clientAccessible,
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error || 'Failed to create asset');
      }

      const asset = await response.json();
      console.log('✅ Asset created:', asset);

      // Make sure we have an ID
      if (!asset.id) {
        console.error('❌ No asset ID returned:', asset);
        throw new Error('Asset created but no ID returned');
      }

      // Show success message
      if (asset.wasRenamed) {
        toast.success(`Asset created as "${asset.name}" (original name "${asset.originalName}" was taken)`);
      } else {
        toast.success('Asset created successfully!');
      }

      // Upload file if selected
      let fileUploaded = false;
      if (selectedFile) {
        try {
          await uploadVersion(asset.id, selectedFile);
          fileUploaded = true;
        } catch (uploadError) {
          console.error('❌ Upload error:', uploadError);
          toast.error('Asset created but file upload failed. You can upload a file later.');
          // Still redirect
          setTimeout(() => {
            router.push(`/dashboard/creative-assets/${asset.id}`);
          }, 500);
          setSaving(false);
          return;
        }
      }

      // Redirect to asset detail page
      console.log('🔄 Redirecting to:', `/dashboard/creative-assets/${asset.id}`);
      setSaving(false);
      setTimeout(() => {
        router.push(`/dashboard/creative-assets/${asset.id}`);
      }, 500);

    } catch (error: any) {
      console.error('❌ Error creating asset:', error);
      toast.error(error.message || 'Failed to create asset');
      setSaving(false);
    }
  };

  const uploadVersion = async (assetId: string, file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/creative-assets/${assetId}/versions`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const result = await response.json();
      
      if (result.storage) {
        console.log('Storage status:', result.storage);
        if (result.storage.isNearLimit) {
          toast.error(`⚠️ Storage is ${result.storage.percentageUsed.toFixed(1)}% full`, {
            duration: 5000,
          });
        }
        if (result.warning) {
          toast.error(`⚠️ ${result.warning}`, {
            duration: 5000,
          });
        }
        if (result.storage.isFull) {
          toast.error('⚠️ Cloud storage is full. Files will be stored locally only.', {
            duration: 6000,
          });
        }
      }

      setUploadComplete(true);
      setUploadProgress(100);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const getFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const productionStages = getProductionStages();

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ─── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/creative-assets"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Creative Assets
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300 font-medium">New Asset</span>
      </nav>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Create New Asset</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Upload a new creative asset and add it to a concept
          </p>
        </div>
        <Link href="/dashboard/creative-assets">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </Link>
      </div>

      {/* ─── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Basic Information</h2>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Asset Name <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter asset name"
                className={`bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500 ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : ''
                } ${duplicateWarning ? 'border-amber-500 focus:ring-amber-500' : ''}`}
              />
              {checkingName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin" />
                </div>
              )}
            </div>
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name}</p>
            )}
            {duplicateWarning && !errors.name && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">{duplicateWarning}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Describe the asset..."
              rows={3}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500 resize-none"
            />
          </div>

          {/* Type & Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-zinc-300">
                Asset Type <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger
                  className={`bg-zinc-800/50 border-zinc-700 text-zinc-100 ${
                    errors.type ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                >
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {ASSET_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        className="text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-zinc-400" />
                          {type.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-red-400">{errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productionStage" className="text-zinc-300">
                Production Stage
              </Label>
              <Select
                value={formData.productionStage}
                onValueChange={(value) =>
                  handleSelectChange('productionStage', value)
                }
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select production stage (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {productionStages.map((stage) => (
                    <SelectItem
                      key={stage.value}
                      value={stage.value}
                      className="text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700"
                    >
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Project & Concept */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Context</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="projectId" className="text-zinc-300">
                Project <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => handleSelectChange('projectId', value)}
                disabled={loadingProjects}
              >
                <SelectTrigger
                  className={`bg-zinc-800/50 border-zinc-700 text-zinc-100 ${
                    errors.projectId ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                >
                  <SelectValue
                    placeholder={
                      loadingProjects 
                        ? 'Loading projects...' 
                        : fetchError 
                        ? 'Error loading projects' 
                        : 'Select project'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {fetchError ? (
                    <div className="px-2 py-4 text-sm text-red-400 text-center">
                      {fetchError}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-blue-400 hover:text-blue-300"
                        onClick={fetchProjects}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-zinc-500 text-center">
                      No projects found
                      <Link
                        href="/dashboard/projects/new"
                        className="block mt-2 text-blue-400 hover:text-blue-300"
                      >
                        <Plus className="w-3 h-3 inline mr-1" />
                        Create a project first
                      </Link>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id}
                        className="text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700"
                      >
                        {project.projectName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-xs text-red-400">{errors.projectId}</p>
              )}
            </div>

            {/* Concept */}
            <div className="space-y-2">
              <Label htmlFor="conceptId" className="text-zinc-300">
                Concept <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.conceptId}
                onValueChange={(value) => handleSelectChange('conceptId', value)}
                disabled={!formData.projectId || loadingConcepts || loadingProjects}
              >
                <SelectTrigger
                  className={`bg-zinc-800/50 border-zinc-700 text-zinc-100 ${
                    errors.conceptId ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                >
                  <SelectValue
                    placeholder={
                      loadingProjects
                        ? 'Loading projects...'
                        : !formData.projectId
                        ? 'Select a project first'
                        : loadingConcepts
                        ? 'Loading concepts...'
                        : 'Select concept'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {concepts.length === 0 && formData.projectId ? (
                    <div className="px-2 py-4 text-sm text-zinc-500 text-center">
                      No concepts found for this project
                      <Link
                        href={`/dashboard/projects/${formData.projectId}/concepts/new`}
                        className="block mt-2 text-blue-400 hover:text-blue-300"
                      >
                        <Plus className="w-3 h-3 inline mr-1" />
                        Create a concept first
                      </Link>
                    </div>
                  ) : (
                    concepts.map((concept) => (
                      <SelectItem
                        key={concept.id}
                        value={concept.id}
                        className="text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700"
                      >
                        {concept.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.conceptId && (
                <p className="text-xs text-red-400">{errors.conceptId}</p>
              )}
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">File Upload</h2>
          <p className="text-xs text-zinc-500">
            Upload a file for the first version of this asset
          </p>

          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
              <p className="text-sm text-zinc-300">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supported formats: Images, Video, Audio, Documents
              </p>
            </div>
          ) : (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-zinc-900 rounded-lg shrink-0">
                    <File className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {getFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-zinc-500 text-right">
                    {uploadProgress}%
                  </p>
                </div>
              )}

              {uploadComplete && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Upload complete
                </div>
              )}
            </div>
          )}
        </div>

        {/* Client Access */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Access</h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="clientAccessible"
              checked={formData.clientAccessible}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  clientAccessible: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
            <Label htmlFor="clientAccessible" className="text-zinc-300 cursor-pointer">
              Make asset accessible to client
            </Label>
          </div>
          <p className="text-xs text-zinc-500">
            When enabled, clients can view and download this asset via a shareable link
          </p>
        </div>

        {/* ─── Actions ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
          <Button
            type="submit"
            disabled={saving || loadingProjects}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Asset
              </>
            )}
          </Button>
          <Link href="/dashboard/creative-assets">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
          </Link>

          {errors.file && (
            <p className="text-xs text-red-400 ml-auto">{errors.file}</p>
          )}
        </div>
      </form>

      {/* ─── Confirmation Dialog ──────────────────────────────────────────── */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Duplicate Asset Name
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-zinc-300">
              An asset named <span className="font-semibold text-zinc-100">"{formData.name}"</span> already exists in this concept.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-sm text-amber-400">
                It will be saved as <span className="font-semibold">"{formData.name} (2)"</span>
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              Do you want to continue?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={performSubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as "{formData.name} (2)"
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}