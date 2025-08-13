export interface AudioMetadata {
  title: string;
  artist: string;
  duration: number;
  size: number;
  format: string;
  bitrate?: number;
  sampleRate?: number;
}

export interface AudioTrack {
  id: string;
  file: File;
  url: string;
  metadata: AudioMetadata;
  waveformData?: number[];
  frequencyData?: Uint8Array;
}

export interface VisualizationData {
  frequencyData: Uint8Array;
  waveformData: Float32Array;
  analyser: AnalyserNode;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private waveformData: Float32Array | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Float32Array(this.analyser.fftSize);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  connectAudioElement(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || !this.analyser) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      if (!this.source) {
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }
    } catch (error) {
      console.error('Failed to connect audio element:', error);
    }
  }

  getVisualizationData(): VisualizationData | null {
    if (!this.analyser || !this.frequencyData || !this.waveformData) return null;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.waveformData);

    return {
      frequencyData: new Uint8Array(this.frequencyData),
      waveformData: new Float32Array(this.waveformData),
      analyser: this.analyser
    };
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.frequencyData) return null;
    this.analyser.getByteFrequencyData(this.frequencyData);
    return new Uint8Array(this.frequencyData);
  }

  getWaveformData(): Float32Array | null {
    if (!this.analyser || !this.waveformData) return null;
    this.analyser.getFloatTimeDomainData(this.waveformData);
    return new Float32Array(this.waveformData);
  }

  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }

  destroy(): void {
    this.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
    this.frequencyData = null;
    this.waveformData = null;
  }
}

export const extractAudioMetadata = async (file: File): Promise<AudioMetadata> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const metadata: AudioMetadata = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        duration: audio.duration,
        size: file.size,
        format: file.type || 'audio/mpeg',
        bitrate: undefined,
        sampleRate: undefined
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });

    audio.src = url;
  });
};

export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const validateAudioFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (!validTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/)) {
    return { valid: false, error: 'Unsupported audio format' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large (max 100MB)' };
  }
  
  return { valid: true };
};

export const createAudioTrack = async (file: File): Promise<AudioTrack> => {
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const metadata = await extractAudioMetadata(file);
  const url = URL.createObjectURL(file);
  
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    file,
    url,
    metadata,
    waveformData: undefined,
    frequencyData: undefined
  };
};

export const generateWaveformData = async (audioBuffer: AudioBuffer): Promise<number[]> => {
  const channelData = audioBuffer.getChannelData(0);
  const samples = 200;
  const blockSize = Math.floor(channelData.length / samples);
  const waveformData: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[i * blockSize + j]);
    }
    waveformData.push(sum / blockSize);
  }
  
  const max = Math.max(...waveformData);
  return waveformData.map(value => max > 0 ? value / max : 0);
};

export const decodeAudioFile = async (file: File): Promise<AudioBuffer> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
};

export const normalizeFrequencyData = (data: Uint8Array): number[] => {
  return Array.from(data).map(value => value / 255);
};

export const getAverageFrequency = (frequencyData: Uint8Array): number => {
  if (frequencyData.length === 0) return 0;
  
  const sum = Array.from(frequencyData).reduce((acc, value) => acc + value, 0);
  return sum / frequencyData.length;
};

export const getBassLevel = (frequencyData: Uint8Array): number => {
  if (frequencyData.length === 0) return 0;
  
  const bassRange = Math.floor(frequencyData.length * 0.1);
  let sum = 0;
  
  for (let i = 0; i < bassRange; i++) {
    sum += frequencyData[i];
  }
  
  return sum / bassRange / 255;
};

export const getTrebleLevel = (frequencyData: Uint8Array): number => {
  if (frequencyData.length === 0) return 0;
  
  const trebleStart = Math.floor(frequencyData.length * 0.7);
  let sum = 0;
  let count = 0;
  
  for (let i = trebleStart; i < frequencyData.length; i++) {
    sum += frequencyData[i];
    count++;
  }
  
  return count > 0 ? sum / count / 255 : 0;
};

export const smoothFrequencyData = (data: Uint8Array, smoothing: number = 0.8): Uint8Array => {
  const smoothed = new Uint8Array(data.length);
  smoothed[0] = data[0];
  
  for (let i = 1; i < data.length; i++) {
    smoothed[i] = Math.floor(smoothed[i - 1] * smoothing + data[i] * (1 - smoothing));
  }
  
  return smoothed;
};

export const createAudioProcessor = (): AudioProcessor => {
  return new AudioProcessor();
};