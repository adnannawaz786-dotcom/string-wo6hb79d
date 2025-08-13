import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Upload,
  List,
  Shuffle,
  MoreVertical,
  Download,
  Heart,
  HeartOff
} from 'lucide-react';

interface Track {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
  favorite: boolean;
  addedAt: Date;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}

interface PlaylistManagerProps {
  currentTrack?: Track | null;
  isPlaying?: boolean;
  onTrackSelect?: (track: Track) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({
  currentTrack,
  isPlaying = false,
  onTrackSelect,
  onPlay,
  onPause
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = () => {
    const saved = localStorage.getItem('mp3-player-playlists');
    if (saved) {
      const parsed = JSON.parse(saved);
      const playlistsWithDates = parsed.map((playlist: any) => ({
        ...playlist,
        createdAt: new Date(playlist.createdAt),
        updatedAt: new Date(playlist.updatedAt),
        tracks: playlist.tracks.map((track: any) => ({
          ...track,
          addedAt: new Date(track.addedAt)
        }))
      }));
      setPlaylists(playlistsWithDates);
      if (playlistsWithDates.length > 0 && !activePlaylist) {
        setActivePlaylist(playlistsWithDates[0].id);
      }
    }
  };

  const savePlaylists = (updatedPlaylists: Playlist[]) => {
    localStorage.setItem('mp3-player-playlists', JSON.stringify(updatedPlaylists));
    setPlaylists(updatedPlaylists);
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      tracks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedPlaylists = [...playlists, newPlaylist];
    savePlaylists(updatedPlaylists);
    setActivePlaylist(newPlaylist.id);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  const deletePlaylist = (playlistId: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
    savePlaylists(updatedPlaylists);
    if (activePlaylist === playlistId) {
      setActivePlaylist(updatedPlaylists.length > 0 ? updatedPlaylists[0].id : null);
    }
  };

  const renamePlaylist = (playlistId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId 
        ? { ...p, name: newName.trim(), updatedAt: new Date() }
        : p
    );
    savePlaylists(updatedPlaylists);
    setEditingPlaylist(null);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !activePlaylist) return;

    const currentPlaylist = playlists.find(p => p.id === activePlaylist);
    if (!currentPlaylist) return;

    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            const track: Track = {
              id: Date.now().toString() + i,
              name: file.name.replace(/\.[^/.]+$/, ''),
              file,
              url,
              duration: audio.duration,
              favorite: false,
              addedAt: new Date()
            };
            newTracks.push(track);
            resolve(void 0);
          });
        });
      }
    }

    const updatedPlaylists = playlists.map(p => 
      p.id === activePlaylist 
        ? { ...p, tracks: [...p.tracks, ...newTracks], updatedAt: new Date() }
        : p
    );
    savePlaylists(updatedPlaylists);
    setShowUpload(false);
  };

  const removeTrack = (playlistId: string, trackId: string) => {
    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId 
        ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId), updatedAt: new Date() }
        : p
    );
    savePlaylists(updatedPlaylists);
  };

  const toggleFavorite = (playlistId: string, trackId: string) => {
    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId 
        ? {
            ...p, 
            tracks: p.tracks.map(t => 
              t.id === trackId ? { ...t, favorite: !t.favorite } : t
            ),
            updatedAt: new Date()
          }
        : p
    );
    savePlaylists(updatedPlaylists);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activePlaylistData = playlists.find(p => p.id === activePlaylist);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Playlists</h2>
          </div>
          <button
            onClick={() => setIsCreatingPlaylist(true)}
            className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Playlist Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => setActivePlaylist(playlist.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activePlaylist === playlist.id
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/30'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {editingPlaylist === playlist.id ? (
                <input
                  type="text"
                  defaultValue={playlist.name}
                  className="bg-transparent border-none outline-none text-sm w-20"
                  onBlur={(e) => renamePlaylist(playlist.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renamePlaylist(playlist.id, e.currentTarget.value);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span className="text-sm">{playlist.name}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Create Playlist Form */}
      <AnimatePresence>
        {isCreatingPlaylist && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 bg-white/5 border-b border-white/10"
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 outline-none focus:border-purple-400/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createPlaylist();
                  if (e.key === 'Escape') setIsCreatingPlaylist(false);
                }}
                autoFocus
              />
              <button
                onClick={createPlaylist}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Content */}
      <div className="flex-1 overflow-hidden">
        {activePlaylistData ? (
          <div className="h-full flex flex-col">
            {/* Playlist Actions */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {activePlaylistData.tracks.length} tracks
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUpload(true)}
                    className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingPlaylist(activePlaylistData.id)}
                    className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePlaylist(activePlaylistData.id)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto">
              {activePlaylistData.tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <List className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg mb-2">No tracks yet</p>
                  <p className="text-sm">Upload some music to get started</p>
                </div>
              ) : (
                <div className="p-2">
                  {activePlaylistData.tracks.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
                        currentTrack?.id === track.id ? 'bg-purple-500/20 border border-purple-400/30' : ''
                      }`}
                      onClick={() => onTrackSelect?.(track)}
                    >
                      <div className="flex-shrink-0">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPause?.();
                            }}
                            className="p-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentTrack?.id === track.id) {
                                onPlay?.();
                              } else {
                                onTrackSelect?.(track);
                              }
                            }}
                            className="p-2 rounded-full bg-white/10 text-white hover:bg-purple-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{track.name}</h4>
                        <p className="text-sm text-gray-400">{formatDuration(track.duration)}</p>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(activePlaylistData.id, track.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            track.favorite ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-red-400'
                          }`}
                        >
                          {track.favorite ? <Heart className="w-4 h-4 fill-current" /> : <HeartOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTrack(activePlaylistData.id, track.id);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Music className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">No playlists</p>
            <p className="text-sm">Create your first playlist to start</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Upload Music</h3>
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="w-full p-4 border-2 border-dashed border-white/30 rounded-lg text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              />
              <p className="text-sm text-gray-400 mt-2">
                Select multiple MP3 files to add to your playlist
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export { PlaylistManager };
export default PlaylistManager;