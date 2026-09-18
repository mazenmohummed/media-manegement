// lib/validations/production-assets.ts

export const PRODUCTION_ASSET_CONFIG = {
  VIDEO: {
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/mpeg',
      'video/ogg',
      'video/3gpp',
      'video/3gpp2',
    ],
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    requiresThumbnail: true,
    requiresDuration: true,
    allowedExtensions: ['.mp4', '.mov', '.avi', '.webm', '.mpeg', '.ogv'],
  },
  AUDIO: {
    allowedMimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/flac',
      'audio/aac',
      'audio/aiff',
      'audio/midi',
    ],
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    requiresDuration: true,
    requiresAudioChannels: true,
    allowedExtensions: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.aiff', '.midi'],
  },
  RAW_FOOTAGE: {
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/mpeg',
      'video/ogg',
    ],
    maxSize: 50 * 1024 * 1024 * 1024, // 50GB
    requiresThumbnail: false,
    requiresDuration: true,
    requiresCameraMetadata: true,
    allowedExtensions: ['.mov', '.mp4', '.mxf', '.r3d', '.arx', '.dng', '.cin'],
  },
  PROXY_FOOTAGE: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    requiresThumbnail: true,
    requiresDuration: true,
    allowedExtensions: ['.mp4', '.mov', '.webm'],
  },
  EXPORT_MASTER: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime'],
    maxSize: 20 * 1024 * 1024 * 1024, // 20GB
    requiresThumbnail: true,
    requiresDuration: true,
    requiresCodec: true,
    requiresBitrate: true,
    allowedExtensions: ['.mov', '.mp4'],
  },
  EXPORT_HIGH_RES: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime'],
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    requiresThumbnail: true,
    requiresDuration: true,
    requiresResolution: true,
    allowedExtensions: ['.mov', '.mp4'],
  },
  EXPORT_WEB: {
    allowedMimeTypes: ['video/mp4', 'video/webm'],
    maxSize: 1 * 1024 * 1024 * 1024, // 1GB
    requiresThumbnail: true,
    requiresDuration: true,
    allowedExtensions: ['.mp4', '.webm'],
  },
  AUDIO_RAW: {
    allowedMimeTypes: ['audio/wav', 'audio/aiff', 'audio/flac'],
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    requiresDuration: true,
    requiresAudioChannels: true,
    allowedExtensions: ['.wav', '.aiff', '.flac'],
  },
  AUDIO_MIX: {
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/aac'],
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    requiresDuration: true,
    requiresAudioChannels: true,
    allowedExtensions: ['.mp3', '.wav', '.aac'],
  },
  AUDIO_MASTER: {
    allowedMimeTypes: ['audio/wav', 'audio/flac', 'audio/aiff'],
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    requiresDuration: true,
    requiresAudioChannels: true,
    allowedExtensions: ['.wav', '.flac', '.aiff'],
  },
  MOTION_GRAPHICS: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    requiresThumbnail: true,
    requiresDuration: true,
    requiresResolution: true,
    allowedExtensions: ['.mov', '.mp4', '.webm'],
  },
  VFX: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxSize: 20 * 1024 * 1024 * 1024, // 20GB
    requiresThumbnail: true,
    requiresDuration: true,
    requiresResolution: true,
    allowedExtensions: ['.mov', '.mp4', '.webm'],
  },
  COLOR_GRADE: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime'],
    maxSize: 10 * 1024 * 1024 * 1024, // 10GB
    requiresThumbnail: true,
    requiresDuration: true,
    requiresResolution: true,
    allowedExtensions: ['.mov', '.mp4'],
  },
  SUBTITLES: {
    allowedMimeTypes: ['text/vtt', 'text/plain', 'application/ttml+xml', 'application/x-subrip'],
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.vtt', '.srt', '.ttml', '.sbv'],
  },
  // Fallback for OTHER type
  OTHER: {
    allowedMimeTypes: ['*/*'],
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: [],
  },
};

// ✅ PRODUCTION STAGE CONFIG - Added
export const PRODUCTION_STAGE_CONFIG: Record<string, {
  allowedTypes: string[];
  requiresApproval: boolean;
  requiresClientReview: boolean;
  nextStage?: string;
  prevStage?: string;
  label: string;
  description: string;
  order: number;
  color: string;
}> = {
  'pre-production': {
    allowedTypes: ['MOODBOARD', 'STORYBOARD', 'SCRIPT', 'COPY', 'MOCKUP'],
    requiresApproval: false,
    requiresClientReview: false,
    nextStage: 'shooting',
    label: 'Pre-Production',
    description: 'Planning, storyboarding, script development, and concept visualization',
    order: 0,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  'shooting': {
    allowedTypes: ['RAW_FOOTAGE', 'PROXY_FOOTAGE', 'VIDEO'],
    requiresApproval: true,
    requiresClientReview: true,
    nextStage: 'editing',
    prevStage: 'pre-production',
    label: 'Shooting',
    description: 'Principal photography, raw footage capture, and proxy generation',
    order: 1,
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  'editing': {
    allowedTypes: ['VIDEO', 'EXPORT_MASTER', 'EXPORT_HIGH_RES', 'EXPORT_WEB', 'AUDIO_MIX'],
    requiresApproval: true,
    requiresClientReview: true,
    nextStage: 'color_grading',
    prevStage: 'shooting',
    label: 'Editing',
    description: 'Rough cut, fine cut, and assembly of the project',
    order: 2,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  'color_grading': {
    allowedTypes: ['COLOR_GRADE', 'VIDEO', 'EXPORT_MASTER'],
    requiresApproval: true,
    requiresClientReview: true,
    nextStage: 'sound_design',
    prevStage: 'editing',
    label: 'Color Grading',
    description: 'Color correction, grading, and finishing',
    order: 3,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  'sound_design': {
    allowedTypes: ['AUDIO_RAW', 'AUDIO_MIX', 'AUDIO_MASTER', 'AUDIO'],
    requiresApproval: true,
    requiresClientReview: true,
    nextStage: 'motion_graphics',
    prevStage: 'color_grading',
    label: 'Sound Design',
    description: 'Sound effects, foley, ADR, and audio mixing',
    order: 4,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  'motion_graphics': {
    allowedTypes: ['MOTION_GRAPHICS', 'VFX', 'VIDEO', 'EXPORT_MASTER'],
    requiresApproval: true,
    requiresClientReview: true,
    nextStage: 'vfx',
    prevStage: 'sound_design',
    label: 'Motion Graphics',
    description: 'Motion graphics, titles, and visual enhancements',
    order: 5,
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  'vfx': {
    allowedTypes: ['VFX', 'VIDEO', 'EXPORT_MASTER'],
    requiresApproval: true,
    requiresClientReview: true,
    nextStage: 'final_delivery',
    prevStage: 'motion_graphics',
    label: 'VFX',
    description: 'Visual effects, compositing, and advanced graphics',
    order: 6,
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  'final_delivery': {
    allowedTypes: ['EXPORT_MASTER', 'EXPORT_HIGH_RES', 'EXPORT_WEB', 'AUDIO_MASTER', 'SUBTITLES'],
    requiresApproval: true,
    requiresClientReview: true,
    prevStage: 'vfx',
    label: 'Final Delivery',
    description: 'Final export, delivery formats, and client handoff',
    order: 7,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
};

// ✅ Helper functions for production stages
export function validateAssetForStage(assetType: string, stage: string): { valid: boolean; error?: string } {
  const stageConfig = PRODUCTION_STAGE_CONFIG[stage];
  if (!stageConfig) {
    return { valid: false, error: `Unknown production stage: ${stage}` };
  }

  if (!stageConfig.allowedTypes.includes(assetType)) {
    return {
      valid: false,
      error: `Asset type "${assetType}" is not allowed in "${stageConfig.label}". Allowed: ${stageConfig.allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

export function getStageConfig(stage: string) {
  return PRODUCTION_STAGE_CONFIG[stage] || null;
}

export function getNextStage(currentStage: string): string | null {
  const config = PRODUCTION_STAGE_CONFIG[currentStage];
  return config?.nextStage || null;
}

export function getPrevStage(currentStage: string): string | null {
  const config = PRODUCTION_STAGE_CONFIG[currentStage];
  return config?.prevStage || null;
}

export function getAllowedAssetTypesForStage(stage: string): string[] {
  const config = PRODUCTION_STAGE_CONFIG[stage];
  return config?.allowedTypes || [];
}

export function canAssetTransition(
  assetType: string,
  fromStage: string,
  toStage: string
): { canTransition: boolean; reason?: string } {
  const fromConfig = PRODUCTION_STAGE_CONFIG[fromStage];
  const toConfig = PRODUCTION_STAGE_CONFIG[toStage];

  if (!fromConfig || !toConfig) {
    return { canTransition: false, reason: 'Invalid stage' };
  }

  // Check if the asset type is allowed in the target stage
  if (!toConfig.allowedTypes.includes(assetType)) {
    return {
      canTransition: false,
      reason: `Asset type "${assetType}" is not allowed in "${toConfig.label}"`,
    };
  }

  // Check if the transition is sequential (can't skip stages)
  const fromOrder = fromConfig.order;
  const toOrder = toConfig.order;
  
  if (toOrder > fromOrder + 1) {
    return {
      canTransition: false,
      reason: `Cannot skip stages. Must go through ${getStageNameByOrder(fromOrder + 1)} first`,
    };
  }

  if (toOrder < fromOrder) {
    return {
      canTransition: false,
      reason: 'Cannot move backwards in production stage',
    };
  }

  // Check if the target stage requires approval and the asset is approved
  if (toConfig.requiresApproval && fromConfig.requiresApproval) {
    // This will be checked by the calling function with the actual approval status
    // We just return true here and let the caller handle approval checks
    return { canTransition: true };
  }

  return { canTransition: true };
}

function getStageNameByOrder(order: number): string | null {
  for (const [stage, config] of Object.entries(PRODUCTION_STAGE_CONFIG)) {
    if (config.order === order) {
      return config.label;
    }
  }
  return null;
}

// ✅ Validation function
export function validateProductionAsset(
  type: string,
  file: File
): { valid: boolean; error?: string } {
  // Get config for the asset type, fallback to OTHER
  const config =
    PRODUCTION_ASSET_CONFIG[type as keyof typeof PRODUCTION_ASSET_CONFIG] ||
    PRODUCTION_ASSET_CONFIG.OTHER;

  // If config has no allowed types or allows all, skip MIME validation
  if (config.allowedMimeTypes.length > 0 && config.allowedMimeTypes[0] !== '*/*') {
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed for "${type}". Allowed: ${config.allowedMimeTypes.join(', ')}`,
      };
    }
  }

  // Validate file size
  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / 1024 / 1024;
    const fileSizeMB = file.size / 1024 / 1024;
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum (${maxSizeMB.toFixed(2)}MB) for "${type}"`,
    };
  }

  // Validate extension if provided
  if (config.allowedExtensions && config.allowedExtensions.length > 0) {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = config.allowedExtensions.some(ext =>
      fileName.endsWith(ext)
    );
    if (!hasValidExtension) {
      return {
        valid: false,
        error: `File extension is not allowed for "${type}". Allowed: ${config.allowedExtensions.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

export function getProductionAssetConfig(type: string) {
  return (
    PRODUCTION_ASSET_CONFIG[type as keyof typeof PRODUCTION_ASSET_CONFIG] ||
    PRODUCTION_ASSET_CONFIG.OTHER
  );
}

export function getMaxFileSize(type: string): number {
  const config = getProductionAssetConfig(type);
  return config.maxSize;
}

export function getAllowedMimeTypes(type: string): string[] {
  const config = getProductionAssetConfig(type);
  return config.allowedMimeTypes;
}

// ✅ Get all available production stages as an array for dropdowns
export function getProductionStages(): Array<{
  value: string;
  label: string;
  description: string;
  order: number;
  color: string;
}> {
  return Object.entries(PRODUCTION_STAGE_CONFIG)
    .map(([key, config]) => ({
      value: key,
      label: config.label,
      description: config.description,
      order: config.order,
      color: config.color,
    }))
    .sort((a, b) => a.order - b.order);
}

// ✅ Check if a stage requires approval
export function stageRequiresApproval(stage: string): boolean {
  const config = PRODUCTION_STAGE_CONFIG[stage];
  return config?.requiresApproval || false;
}

// ✅ Check if a stage requires client review
export function stageRequiresClientReview(stage: string): boolean {
  const config = PRODUCTION_STAGE_CONFIG[stage];
  return config?.requiresClientReview || false;
}

// ✅ Get the stage label
export function getStageLabel(stage: string): string {
  const config = PRODUCTION_STAGE_CONFIG[stage];
  return config?.label || stage;
}

// ✅ Validate that an asset's type matches its current production stage
export function validateAssetTypeForStage(assetType: string, stage: string): boolean {
  const config = PRODUCTION_STAGE_CONFIG[stage];
  if (!config) return false;
  return config.allowedTypes.includes(assetType);
}