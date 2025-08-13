import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface VisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  className?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  audioElement,
  isPlaying,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [visualizerType, setVisualizerType] = useState<'bars' | 'wave' | 'circular'>('bars');

  const initializeAudioContext = useCallback(async () => {
    if (!audioElement || isInitialized) return;

    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Create source and connect
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      // Create data array
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }, [audioElement, isInitialized]);

  const drawBars = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const width = canvas.width;
    const height = canvas.height;
    const barCount = 64;
    const barWidth = width / barCount;
    
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.8)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');
    
    ctx.fillStyle = gradient;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;
      
      // Draw bar with rounded corners effect
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      
      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      ctx.shadowBlur = 0;
    }
  }, []);

  const drawWave = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient for wave
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.8)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    
    const sliceWidth = width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    // Add glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawCircular = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    
    ctx.clearRect(0, 0, width, height);
    
    const barCount = 64;
    const angleStep = (Math.PI * 2) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = (dataArray[i] / 255) * radius * 0.8;
      const angle = i * angleStep;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      
      // Add glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, []);

  const draw = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    switch (visualizerType) {
      case 'bars':
        drawBars(canvas, ctx, dataArrayRef.current);
        break;
      case 'wave':
        drawWave(canvas, ctx, dataArrayRef.current);
        break;
      case 'circular':
        drawCircular(canvas, ctx, dataArrayRef.current);
        break;
    }
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw);
    }
  }, [isPlaying, visualizerType, drawBars, drawWave, drawCircular]);

  const handleResize = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    if (audioElement && !isInitialized) {
      const handleCanPlay = () => {
        initializeAudioContext();
      };
      
      if (audioElement.readyState >= 3) {
        initializeAudioContext();
      } else {
        audioElement.addEventListener('canplay', handleCanPlay);
        return () => audioElement.removeEventListener('canplay', handleCanPlay);
      }
    }
  }, [audioElement, isInitialized, initializeAudioContext]);

  useEffect(() => {
    if (isPlaying && isInitialized) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      draw();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isInitialized, draw]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <motion.div
      className={`relative w-full h-full ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Visualizer Type Selector */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex gap-2 p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
          {(['bars', 'wave', 'circular'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setVisualizerType(type)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                visualizerType === type
                  ? 'bg-blue-500/80 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20"
          animate={{
            scale: isPlaying ? [1, 1.1, 1] : 1,
            opacity: isPlaying ? [0.3, 0.6, 0.3] : 0.3,
          }}
          transition={{
            duration: 2,
            repeat: isPlaying ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        
        {/* Animated particles */}
        {isPlaying && (
          <div className="absolute inset-0">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/30 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                }}
                animate={{
                  y: [null, Math.random() * window.innerHeight],
                  x: [null, Math.random() * window.innerWidth],
                  scale: [1, 0.5, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* No Audio Message */}
      {!audioElement && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/60">
            <div className="text-lg font-medium mb-2">No Audio Loaded</div>
            <div className="text-sm">Upload an audio file to see the visualizer</div>
          </div>
        </div>
      )}

      {/* Audio Context Suspended Message */}
      {audioElement && !isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/60">
            <div className="text-lg font-medium mb-2">Initializing Audio</div>
            <div className="text-sm">Setting up audio visualization...</div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Visualizer;