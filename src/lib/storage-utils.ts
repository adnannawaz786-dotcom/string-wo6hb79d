/**
 * LocalStorage management utilities for MP3 player
 * Handles audio file storage, metadata, playlists, and user preferences
 */

export interface StoredAudioFile {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
  type: string;
  uploadedAt: string;
  lastPlayed?: string;
  playCount: number;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
  };
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: string[]; // Array of audio file IDs
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
}

export interface PlayerSettings {
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  visualizerEnabled: boolean;
  visualizerType: 'bars' | 'wave' | 'circle';
  theme: 'light' | 'dark' | 'system';
  crossfadeDuration: number;
  autoPlay: boolean;
}

export interface PlayerState {
  currentTrackId?: string;
  currentPlaylistId?: string;
  position: number;
  isPlaying: boolean;
  queue: string[];
  queueIndex: number;
  lastUpdated: string;
}

// Storage keys
const STORAGE_KEYS = {
  AUDIO_FILES: 'mp3_player_audio_files',
  PLAYLISTS: 'mp3_player_playlists',
  SETTINGS: 'mp3_player_settings',
  PLAYER_STATE: 'mp3_player_state',
  UPLOAD_HISTORY: 'mp3_player_upload_history',
} as const;

// Default settings
const DEFAULT_SETTINGS: PlayerSettings = {
  volume: 0.8,
  shuffle: false,
  repeat: 'none',
  visualizerEnabled: true,
  visualizerType: 'bars',
  theme: 'system',
  crossfadeDuration: 3,
  autoPlay: false,
};

// Default player state
const DEFAULT_PLAYER_STATE: PlayerState = {
  position: 0,
  isPlaying: false,
  queue: [],
  queueIndex: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = (): { used: number; available: number; percentage: number } => {
  if (!isStorageAvailable()) {
    return { used: 0, available: 0, percentage: 0 };
  }

  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length;
    }
  }

  // Approximate available storage (5MB typical limit)
  const available = 5 * 1024 * 1024; // 5MB in bytes
  const percentage = Math.min((used / available) * 100, 100);

  return { used, available, percentage };
};

/**
 * Audio Files Storage
 */
export const audioFileStorage = {
  getAll: (): StoredAudioFile[] => {
    if (!isStorageAvailable()) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIO_FILES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load audio files:', error);
      return [];
    }
  },

  get: (id: string): StoredAudioFile | null => {
    const files = audioFileStorage.getAll();
    return files.find(file => file.id === id) || null;
  },

  save: (file: StoredAudioFile): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      const files = audioFileStorage.getAll();
      const existingIndex = files.findIndex(f => f.id === file.id);
      
      if (existingIndex >= 0) {
        files[existingIndex] = file;
      } else {
        files.push(file);
      }

      localStorage.setItem(STORAGE_KEYS.AUDIO_FILES, JSON.stringify(files));
      return true;
    } catch (error) {
      console.error('Failed to save audio file:', error);
      return false;
    }
  },

  remove: (id: string): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      const files = audioFileStorage.getAll();
      const filtered = files.filter(file => {
        if (file.id === id && file.url.startsWith('blob:')) {
          // Revoke blob URL to free memory
          URL.revokeObjectURL(file.url);
        }
        return file.id !== id;
      });

      localStorage.setItem(STORAGE_KEYS.AUDIO_FILES, JSON.stringify(filtered));
      
      // Remove from all playlists
      const playlists = playlistStorage.getAll();
      playlists.forEach(playlist => {
        if (playlist.tracks.includes(id)) {
          playlistStorage.removeTrack(playlist.id, id);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to remove audio file:', error);
      return false;
    }
  },

  clear: (): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      // Revoke all blob URLs
      const files = audioFileStorage.getAll();
      files.forEach(file => {
        if (file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });

      localStorage.removeItem(STORAGE_KEYS.AUDIO_FILES);
      return true;
    } catch (error) {
      console.error('Failed to clear audio files:', error);
      return false;
    }
  },

  updatePlayCount: (id: string): boolean => {
    const file = audioFileStorage.get(id);
    if (!file) return false;

    file.playCount += 1;
    file.lastPlayed = new Date().toISOString();
    return audioFileStorage.save(file);
  },
};

/**
 * Playlist Storage
 */
export const playlistStorage = {
  getAll: (): Playlist[] => {
    if (!isStorageAvailable()) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load playlists:', error);
      return [];
    }
  },

  get: (id: string): Playlist | null => {
    const playlists = playlistStorage.getAll();
    return playlists.find(playlist => playlist.id === id) || null;
  },

  save: (playlist: Playlist): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      const playlists = playlistStorage.getAll();
      const existingIndex = playlists.findIndex(p => p.id === playlist.id);
      
      playlist.updatedAt = new Date().toISOString();
      
      if (existingIndex >= 0) {
        playlists[existingIndex] = playlist;
      } else {
        playlists.push(playlist);
      }

      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      return true;
    } catch (error) {
      console.error('Failed to save playlist:', error);
      return false;
    }
  },

  remove: (id: string): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      const playlists = playlistStorage.getAll();
      const filtered = playlists.filter(playlist => playlist.id !== id);
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to remove playlist:', error);
      return false;
    }
  },

  addTrack: (playlistId: string, trackId: string): boolean => {
    const playlist = playlistStorage.get(playlistId);
    if (!playlist) return false;

    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      return playlistStorage.save(playlist);
    }
    return true;
  },

  removeTrack: (playlistId: string, trackId: string): boolean => {
    const playlist = playlistStorage.get(playlistId);
    if (!playlist) return false;

    playlist.tracks = playlist.tracks.filter(id => id !== trackId);
    return playlistStorage.save(playlist);
  },

  reorderTracks: (playlistId: string, tracks: string[]): boolean => {
    const playlist = playlistStorage.get(playlistId);
    if (!playlist) return false;

    playlist.tracks = tracks;
    return playlistStorage.save(playlist);
  },
};

/**
 * Settings Storage
 */
export const settingsStorage = {
  get: (): PlayerSettings => {
    if (!isStorageAvailable()) return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  save: (settings: Partial<PlayerSettings>): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      const current = settingsStorage.get();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  },

  reset: (): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  },
};

/**
 * Player State Storage
 */
export const playerStateStorage = {
  get: (): PlayerState => {
    if (!isStorageAvailable()) return DEFAULT_PLAYER_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
      return stored ? { ...DEFAULT_PLAYER_STATE, ...JSON.parse(stored) } : DEFAULT_PLAYER_STATE;
    } catch (error) {
      console.error('Failed to load player state:', error);
      return DEFAULT_PLAYER_STATE;
    }
  },

  save: (state: Partial<PlayerState>): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      const current = playerStateStorage.get();
      const updated = { ...current, ...state, lastUpdated: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Failed to save player state:', error);
      return false;
    }
  },

  clear: (): boolean => {
    if (!isStorageAvailable()) return false;
    try {
      localStorage.removeItem(STORAGE_KEYS.PLAYER_STATE);
      return true;
    } catch (error) {
      console.error('Failed to clear player state:', error);
      return false;
    }
  },
};

/**
 * Export/Import functionality
 */
export const dataExport = {
  exportData: (): string => {
    const data = {
      audioFiles: audioFileStorage.getAll(),
      playlists: playlistStorage.getAll(),
      settings: settingsStorage.get(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.audioFiles) {
        localStorage.setItem(STORAGE_KEYS.AUDIO_FILES, JSON.stringify(data.audioFiles));
      }
      
      if (data.playlists) {
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(data.playlists));
      }
      
      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  },
};

/**
 * Storage cleanup utilities
 */
export const storageCleanup = {
  removeOrphanedTracks: (): number => {
    const files = audioFileStorage.getAll();
    const fileIds = new Set(files.map(f => f.id));
    const playlists = playlistStorage.getAll();
    let removedCount = 0;

    playlists.forEach(playlist => {
      const originalLength = playlist.tracks.length;
      playlist.tracks = playlist.tracks.filter(trackId => fileIds.has(trackId));
      
      if (playlist.tracks.length !== originalLength) {
        playlistStorage.save(playlist);
        removedCount += originalLength - playlist.tracks.length;
      }
    });

    return removedCount;
  },

  clearExpiredBlobs: (): number => {
    const files = audioFileStorage.getAll();
    let removedCount = 0;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      if (file.url.startsWith('blob:') && new Date(file.uploadedAt) < oneWeekAgo) {
        audioFileStorage.remove(file.id);
        removedCount++;
      }
    });

    return removedCount;
  },
};