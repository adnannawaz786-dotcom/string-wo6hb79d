import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music, Shuffle, Repeat } from 'lucide-react';
import { Button } from './components/ui/button';
import { Slider } from './components/ui/slider';
import { Progress } from './components/ui/progress';
import { Card, CardContent } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { toast } from 'sonner';

interface Track {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
}

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array());

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const savedTracks = localStorage.getItem('mp3-player-tracks');
    if (savedTracks) {
      try {
        const parsedTracks = JSON.parse(savedTracks);
        setTracks(parsedTracks.map((track: any) => ({
          ...track,
          file: null,
          url: track.url
        })));
      } catch (error) {
        console.error('Error loading saved tracks:', error);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (tracks.length > 0) {
      const tracksToSave = tracks.map(({ file, ...track }) => track);
      localStorage.setItem('mp3-player-tracks', JSON.stringify(tracksToSave));
    }
  }, [tracks]);

  const setupAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        
        if (!sourceRef.current) {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    }
  };

  const updateVisualizerData = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      setAudioData(new Uint8Array(dataArrayRef.current));
    }
    animationRef.current = requestAnimationFrame(updateVisualizerData);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        
        audio.addEventListener('loadedmetadata', () => {
          const newTrack: Track = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name.replace(/\.[^/.]+$/, ''),
            file,
            url,
            duration: audio.duration
          };
          
          setTracks(prev => [...prev, newTrack]);
          toast.success(`Added "${newTrack.name}" to playlist`);
        });
      } else {
        toast.error(`"${file.name}" is not a valid audio file`);
      }
    });
    
    event.target.value = '';
  };

  const playTrack = (track: Track) => {
    if (audioRef.current) {
      if (currentTrack?.id !== track.id) {
        audioRef.current.src = track.url;
        setCurrentTrack(track);
      }
      
      setupAudioContext();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        updateVisualizerData();
      }).catch(error => {
        console.error('Error playing track:', error);
        toast.error('Failed to play track');
      });
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const togglePlayPause = () => {
    if (!currentTrack && tracks.length > 0) {
      playTrack(tracks[0]);
    } else if (isPlaying) {
      pauseTrack();
    } else if (currentTrack) {
      playTrack(currentTrack);
    }
  };

  const skipToNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    let nextIndex;
    
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = (currentIndex + 1) % tracks.length;
    }
    
    playTrack(tracks[nextIndex]);
  };

  const skipToPrevious = () => {
    if (!currentTrack || tracks.length === 0) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    let prevIndex;
    
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * tracks.length);
    } else {
      prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    }
    
    playTrack(tracks[prevIndex]);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'one' && currentTrack) {
      playTrack(currentTrack);
    } else if (repeatMode === 'all' || tracks.length > 1) {
      skipToNext();
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const backgroundVariants = {
    animate: {
      background: [
        'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)',
        'radial-gradient(circle at 60% 70%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 30% 30%, rgba(120, 219, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 90%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
        'radial-gradient(circle at 80% 20%, rgba(120, 219, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 60% 60%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)'
      ],
      transition: {
        duration: 8,
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-60"
        variants={backgroundVariants}
        animate="animate"
      />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <motion.h1
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold text-white mb-2"
                >
                  Glass Music Player
                </motion.h1>
                <p className="text-white/70">Experience your music with stunning visualizations</p>
              </div>

              {/* Visualizer */}
              <div className="mb-8 h-32 bg-black/20 rounded-lg backdrop-blur-sm border border-white/10 overflow-hidden flex items-end justify-center p-4">
                <div className="flex items-end space-x-1 h-full">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const height = audioData[i] ? (audioData[i] / 255) * 100 : Math.random() * 20;
                    return (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t"
                        style={{ height: `${height}%` }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Current Track Info */}
              <AnimatePresence mode="wait">
                {currentTrack ? (
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center mb-6"
                  >
                    <h2 className="text-2xl font-semibold text-white mb-2">{currentTrack.name}</h2>
                    <div className="flex items-center justify-center space-x-2 text-white/70">
                      <span>{formatTime(currentTime)}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{formatTime(duration)}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-6"
                  >
                    <Music className="w-16 h-16 text-white/50 mx-auto mb-4" />
                    <p className="text-white/70">Select a track to start playing</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress Bar */}
              <div className="mb-6">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                <Progress value={(currentTime / duration) * 100} className="mt-2 h-1" />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsShuffled(!isShuffled)}
                  className={`text-white hover:bg-white/20 ${isShuffled ? 'bg-white/20' : ''}`}
                >
                  <Shuffle className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipToPrevious}
                  className="text-white hover:bg-white/20"
                  disabled={tracks.length === 0}
                >
                  <SkipBack className="w-6 h-6" />
                </Button>
                
                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                  disabled={tracks.length === 0}
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipToNext}
                  className="text-white hover:bg-white/20"
                  disabled={tracks.length === 0}
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRepeatMode(repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none')}
                  className={`text-white hover:bg-white/20 ${repeatMode !== 'none' ? 'bg-white/20' : ''}`}
                >
                  <Repeat className="w-5 h-5" />
                </Button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center space-x-4 mb-6">
                <Volume2 className="w-5 h-5 text-white" />
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
                <span className="text-white/70 text-sm w-12">{volume}%</span>
              </div>

              {/* Upload Button */}
              <div className="text-center mb-6">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Music
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Playlist */}
              {tracks.length > 0 && (
                <Card className="backdrop-blur-sm bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Playlist ({tracks.length} tracks)</h3>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {tracks.map((track, index) => (
                          <motion.div
                            key={track.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                              currentTrack?.id === track.id
                                ? 'bg-white/20 border border-white/30'
                                : 'hover:bg-white/10'
                            }`}
                            onClick={() => playTrack(track)}
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium">{track.name}</p>
                              <p className="text-white/60 text-sm">{formatTime(track.duration)}</p>
                            </div>
                            {currentTrack?.id === track.id && isPlaying && (
                              <div className="flex space-x-1">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-1 h-4 bg-gradient-to-t from-purple-500 to-pink-500 rounded"
                                    animate={{
                                      height: ['16px', '8px', '16px'],
                                    }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      delay: i * 0.2,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
        preload="metadata"
      />
    </div>
  );
};

export default App;