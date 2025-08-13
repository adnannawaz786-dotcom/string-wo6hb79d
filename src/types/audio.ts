// Audio file metadata interface
export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre?: string;
  year?: number;
  artwork?: string;
  bitrate?: number;
  sampleRate?: number;
  fileSize: number;
  format: string;
}

// Audio track interface for playlist management
export interface AudioTrack {
  id: string;
  file: File;
  metadata: AudioMetadata;
  url: string;
  waveform?: number[];
  addedAt: Date;
  lastPlayed?: Date;
  playCount: number;
  favorite: boolean;
  tags: string[];
}

// Playlist interface
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: AudioTrack[];
  createdAt: Date;
  updatedAt: Date;
  artwork?: string;
  isDefault: boolean;
  totalDuration: number;
  trackCount: number;
}

// Audio player state interface
export interface PlayerState {
  currentTrack: AudioTrack | null;
  currentPlaylist: Playlist | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
}

// Audio visualizer data interface
export interface VisualizerData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  averageFrequency: number;
  peakFrequency: number;
  rms: number;
  timestamp: number;
}

// Audio processor configuration
export interface AudioProcessorConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
  sampleRate: number;
  bufferSize: number;
}

// Audio effects interface
export interface AudioEffects {
  equalizer: EqualizerSettings;
  reverb: ReverbSettings;
  compressor: CompressorSettings;
  enabled: boolean;
}

// Equalizer settings
export interface EqualizerSettings {
  enabled: boolean;
  presetName: string;
  bands: EqualizerBand[];
  preAmp: number;
}

// Equalizer band
export interface EqualizerBand {
  frequency: number;
  gain: number;
  q: number;
}

// Reverb settings
export interface ReverbSettings {
  enabled: boolean;
  roomSize: number;
  damping: number;
  wetLevel: number;
  dryLevel: number;
  width: number;
}

// Compressor settings
export interface CompressorSettings {
  enabled: boolean;
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}

// Player settings interface
export interface PlayerSettings {
  theme: 'light' | 'dark' | 'system';
  visualizerType: VisualizerType;
  visualizerSensitivity: number;
  autoPlay: boolean;
  gaplessPlayback: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  scrobbleEnabled: boolean;
  keyboardShortcuts: boolean;
  notifications: NotificationSettings;
  audioEffects: AudioEffects;
}

// Notification settings
export interface NotificationSettings {
  trackChange: boolean;
  playbackErrors: boolean;
  importComplete: boolean;
  lowStorage: boolean;
}

// Upload progress interface
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

// Audio file validation result
export interface AudioValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Partial<AudioMetadata>;
}

// Validation error interface
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  field?: string;
}

// Validation warning interface
export interface ValidationWarning {
  type: ValidationWarningType;
  message: string;
  field?: string;
}

// Storage statistics interface
export interface StorageStats {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  trackCount: number;
  playlistCount: number;
  storageQuota: number;
  isQuotaExceeded: boolean;
}

// Waveform data interface
export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

// Audio context state
export interface AudioContextState {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  gainNode: GainNode | null;
  source: AudioBufferSourceNode | null;
  isInitialized: boolean;
  sampleRate: number;
}

// Enums for type safety
export enum RepeatMode {
  OFF = 'off',
  ONE = 'one',
  ALL = 'all'
}

export enum VisualizerType {
  BARS = 'bars',
  CIRCULAR = 'circular',
  WAVEFORM = 'waveform',
  SPECTRUM = 'spectrum',
  PARTICLES = 'particles'
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ValidationErrorType {
  INVALID_FORMAT = 'invalid_format',
  FILE_TOO_LARGE = 'file_too_large',
  CORRUPTED_FILE = 'corrupted_file',
  UNSUPPORTED_CODEC = 'unsupported_codec',
  MISSING_METADATA = 'missing_metadata',
  DUPLICATE_FILE = 'duplicate_file'
}

export enum ValidationWarningType {
  LOW_QUALITY = 'low_quality',
  MISSING_ARTWORK = 'missing_artwork',
  INCOMPLETE_METADATA = 'incomplete_metadata',
  LARGE_FILE_SIZE = 'large_file_size'
}

export enum PlaybackState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LOADING = 'loading',
  BUFFERING = 'buffering',
  ERROR = 'error'
}

// Event types for audio player
export type AudioPlayerEvent = 
  | 'play'
  | 'pause'
  | 'stop'
  | 'ended'
  | 'timeupdate'
  | 'loadstart'
  | 'loadeddata'
  | 'canplay'
  | 'canplaythrough'
  | 'error'
  | 'volumechange'
  | 'ratechange'
  | 'seeked'
  | 'seeking';

// Audio format types
export type AudioFormat = 
  | 'mp3'
  | 'wav'
  | 'flac'
  | 'ogg'
  | 'aac'
  | 'm4a'
  | 'wma'
  | 'opus';

// Supported MIME types
export type AudioMimeType = 
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/flac'
  | 'audio/ogg'
  | 'audio/aac'
  | 'audio/mp4'
  | 'audio/x-ms-wma'
  | 'audio/opus';