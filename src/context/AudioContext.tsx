import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AudioTrack } from '../types/birthday.ts';

interface AudioContextValue {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  activeTrackId: string;
  tracks: AudioTrack[];
  setTracksConfig: (tracks: AudioTrack[], defaultTrackId: string) => void;
  startMusic: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  selectTrack: (trackId: string) => void;
  playMemoryClip: (url: string, clipId: string) => void;
  stopMemoryClip: () => void;
  activeClipId: string | null;
  playChime: () => void;
  playWheelTick: () => void;
  playFanfare: () => void;
  playCountdownBeat: (step: 3 | 2 | 1 | 'pause' | 'burst') => void;
  unlockAudio: () => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

const PRESET_SCALES: Record<'nocturne' | 'waltz' | 'celesta', number[]> = {
  nocturne: [261.63, 311.13, 392.0, 466.16, 523.25, 466.16, 392.0, 311.13],
  waltz: [293.66, 369.99, 440.0, 587.33, 440.0, 369.99, 329.63, 440.0],
  celesta: [329.63, 415.3, 493.88, 659.25, 587.33, 493.88, 415.3, 329.63],
};

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.55);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const webAudioRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const stepIndexRef = useRef(0);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const clipAudioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingBeforeClipRef = useRef(false);

  const ensureWebAudio = useCallback(() => {
    if (!webAudioRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const gain = ctx.createGain();
      gain.gain.value = isMuted ? 0 : volume * 0.28;
      gain.connect(ctx.destination);
      webAudioRef.current = ctx;
      masterGainRef.current = gain;
    }
    if (webAudioRef.current.state === 'suspended') {
      void webAudioRef.current.resume();
    }
    return webAudioRef.current;
  }, [isMuted, volume]);

  useEffect(() => {
    if (masterGainRef.current && webAudioRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        isMuted ? 0 : volume * 0.28,
        webAudioRef.current.currentTime,
        0.08,
      );
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = isMuted ? 0 : volume;
    }
    if (clipAudioRef.current) {
      clipAudioRef.current.volume = isMuted ? 0 : Math.min(1, volume + 0.15);
    }
  }, [isMuted, volume]);

  const stopSynthLoop = useCallback(() => {
    if (synthTimerRef.current !== null) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  const stopHtmlAudio = useCallback(() => {
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
      htmlAudioRef.current = null;
    }
  }, []);

  const playNote = useCallback(
    (freq: number, duration = 1.6, type: OscillatorType = 'sine', gainScale = 0.22) => {
      if (isMuted) return;
      const ctx = ensureWebAudio();
      if (!masterGainRef.current) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(gainScale, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(env);
      env.connect(masterGainRef.current);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    },
    [ensureWebAudio, isMuted],
  );

  const startActiveTrack = useCallback(
    (track: AudioTrack | undefined) => {
      stopSynthLoop();
      stopHtmlAudio();
      if (!track) return;

      if (track.sourceType === 'url' && track.url) {
        const audio = new Audio(track.url);
        audio.loop = true;
        audio.volume = isMuted ? 0 : volume;
        htmlAudioRef.current = audio;
        void audio.play().catch(() => {
          // Ignore browser play rejection before interaction
        });
        return;
      }

      const preset = track.preset || 'nocturne';
      const scale = PRESET_SCALES[preset] || PRESET_SCALES.nocturne;
      const intervalMs = preset === 'waltz' ? 540 : preset === 'celesta' ? 680 : 760;

      const triggerStep = () => {
        const idx = stepIndexRef.current % scale.length;
        const root = scale[idx];
        playNote(root, 1.8, 'triangle', 0.16);
        if (idx % 2 === 0) {
          playNote(root * 1.5, 2.2, 'sine', 0.08);
        }
        stepIndexRef.current += 1;
      };

      triggerStep();
      synthTimerRef.current = window.setInterval(triggerStep, intervalMs);
    },
    [isMuted, playNote, stopHtmlAudio, stopSynthLoop, volume],
  );

  useEffect(() => {
    if (!isPlaying) {
      stopSynthLoop();
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
      return;
    }
    const track = tracks.find((t) => t.id === activeTrackId) || tracks[0];
    startActiveTrack(track);
    return () => {
      stopSynthLoop();
    };
  }, [activeTrackId, isPlaying, startActiveTrack, stopSynthLoop, tracks]);

  useEffect(() => {
    return () => {
      stopSynthLoop();
      stopHtmlAudio();
      if (clipAudioRef.current) {
        clipAudioRef.current.pause();
      }
    };
  }, [stopHtmlAudio, stopSynthLoop]);

  const setTracksConfig = useCallback((nextTracks: AudioTrack[], defaultTrackId: string) => {
    setTracks(nextTracks);
    setActiveTrackId((prev) => {
      if (prev && nextTracks.some((t) => t.id === prev)) return prev;
      return nextTracks.some((t) => t.id === defaultTrackId)
        ? defaultTrackId
        : nextTracks[0]?.id || '';
    });
  }, []);

  const unlockAudio = useCallback(() => {
    try {
      ensureWebAudio();
    } catch {
      // Ignore if AudioContext cannot initialize yet
    }
  }, [ensureWebAudio]);

  const startMusic = useCallback(() => {
    ensureWebAudio();
    setIsPlaying(true);
  }, [ensureWebAudio]);

  const togglePlay = useCallback(() => {
    ensureWebAudio();
    setIsPlaying((prev) => !prev);
  }, [ensureWebAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.min(1, Math.max(0, v)));
  }, []);

  const selectTrack = useCallback(
    (trackId: string) => {
      setActiveTrackId(trackId);
      if (isPlaying) {
        const track = tracks.find((t) => t.id === trackId);
        startActiveTrack(track);
      }
    },
    [isPlaying, startActiveTrack, tracks],
  );

  const stopMemoryClip = useCallback(() => {
    if (clipAudioRef.current) {
      clipAudioRef.current.pause();
      clipAudioRef.current = null;
    }
    setActiveClipId(null);
    if (wasPlayingBeforeClipRef.current) {
      wasPlayingBeforeClipRef.current = false;
      setIsPlaying(true);
    }
  }, []);

  const playMemoryClip = useCallback(
    (url: string, clipId: string) => {
      if (activeClipId === clipId) {
        stopMemoryClip();
        return;
      }
      if (clipAudioRef.current) {
        clipAudioRef.current.pause();
      }
      if (isPlaying) {
        wasPlayingBeforeClipRef.current = true;
        setIsPlaying(false);
      }
      const clip = new Audio(url);
      clip.volume = isMuted ? 0 : Math.min(1, volume + 0.15);
      clip.onended = () => {
        stopMemoryClip();
      };
      clipAudioRef.current = clip;
      setActiveClipId(clipId);
      void clip.play().catch(() => {
        setActiveClipId(null);
      });
    },
    [activeClipId, isMuted, isPlaying, stopMemoryClip, volume],
  );

  const playChime = useCallback(() => {
    if (isMuted) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      window.setTimeout(() => playNote(f, 0.9, 'sine', 0.2), idx * 90);
    });
  }, [isMuted, playNote]);

  const playWheelTick = useCallback(() => {
    if (isMuted) return;
    playNote(880, 0.06, 'triangle', 0.14);
  }, [isMuted, playNote]);

  const playFanfare = useCallback(() => {
    if (isMuted) return;
    [392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      window.setTimeout(() => playNote(f, 1.3, 'triangle', 0.22), idx * 110);
    });
  }, [isMuted, playNote]);

  const playCountdownBeat = useCallback(
    (step: 3 | 2 | 1 | 'pause' | 'burst') => {
      if (isMuted) return;
      try {
        const ctx = ensureWebAudio();
        if (!masterGainRef.current || ctx.state !== 'running') return;
        const now = ctx.currentTime;

        if (step === 'pause') {
          // 2-second dramatic suspense riser before the burst
          const riser = ctx.createOscillator();
          const riserEnv = ctx.createGain();
          riser.type = 'triangle';
          riser.frequency.setValueAtTime(110, now);
          riser.frequency.exponentialRampToValueAtTime(329.63, now + 1.85);
          riserEnv.gain.setValueAtTime(0.0001, now);
          riserEnv.gain.exponentialRampToValueAtTime(0.18, now + 1.65);
          riserEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);
          riser.connect(riserEnv);
          riserEnv.connect(masterGainRef.current);
          riser.start(now);
          riser.stop(now + 2.0);

          // Single deep anticipation pulse midway through the pause
          const sub = ctx.createOscillator();
          const subEnv = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(62, now + 0.85);
          sub.frequency.exponentialRampToValueAtTime(28, now + 1.45);
          subEnv.gain.setValueAtTime(0.0001, now + 0.85);
          subEnv.gain.exponentialRampToValueAtTime(0.28, now + 0.9);
          subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);
          sub.connect(subEnv);
          subEnv.connect(masterGainRef.current);
          sub.start(now + 0.85);
          sub.stop(now + 1.6);
          return;
        }

        if (step === 'burst') {
          // Deep impact drop + radiant pink light explosion chord swell
          const impact = ctx.createOscillator();
          const impactEnv = ctx.createGain();
          impact.type = 'sine';
          impact.frequency.setValueAtTime(104, now);
          impact.frequency.exponentialRampToValueAtTime(28, now + 0.85);
          impactEnv.gain.setValueAtTime(0.0001, now);
          impactEnv.gain.exponentialRampToValueAtTime(0.42, now + 0.025);
          impactEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
          impact.connect(impactEnv);
          impactEnv.connect(masterGainRef.current);
          impact.start(now);
          impact.stop(now + 1.0);

          [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = idx < 2 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now);
            env.gain.setValueAtTime(0.0001, now);
            env.gain.exponentialRampToValueAtTime(0.2, now + 0.06 + idx * 0.025);
            env.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);
            osc.connect(env);
            env.connect(masterGainRef.current!);
            osc.start(now);
            osc.stop(now + 1.9);
          });
          return;
        }

        // Deep cinematic sub-bass boom + slow double heartbeat pulse across each 3s digit
        const boom = ctx.createOscillator();
        const boomEnv = ctx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(86, now);
        boom.frequency.exponentialRampToValueAtTime(26, now + 0.9);
        boomEnv.gain.setValueAtTime(0.0001, now);
        boomEnv.gain.exponentialRampToValueAtTime(0.38, now + 0.03);
        boomEnv.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
        boom.connect(boomEnv);
        boomEnv.connect(masterGainRef.current);
        boom.start(now);
        boom.stop(now + 1.1);

        const thump = (delay: number, startFreq: number, peakGain: number) => {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(startFreq, now + delay);
          osc.frequency.exponentialRampToValueAtTime(28, now + delay + 0.24);
          env.gain.setValueAtTime(0.0001, now + delay);
          env.gain.exponentialRampToValueAtTime(peakGain, now + delay + 0.03);
          env.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.34);
          osc.connect(env);
          env.connect(masterGainRef.current!);
          osc.start(now + delay);
          osc.stop(now + delay + 0.36);
        };

        thump(0, 68, 0.32);
        thump(0.28, 56, 0.22);
        thump(1.45, 62, 0.16);

        // Resonant rising harmonic tone sustaining through the 3-second hold
        const baseFreq = step === 3 ? 293.66 : step === 2 ? 349.23 : 440.0;
        [baseFreq, baseFreq * 2].forEach((freq, idx) => {
          const chime = ctx.createOscillator();
          const chimeEnv = ctx.createGain();
          chime.type = idx === 0 ? 'triangle' : 'sine';
          chime.frequency.setValueAtTime(freq, now);
          chimeEnv.gain.setValueAtTime(0.0001, now);
          chimeEnv.gain.exponentialRampToValueAtTime(idx === 0 ? 0.11 : 0.08, now + 0.08);
          chimeEnv.gain.exponentialRampToValueAtTime(0.0001, now + 2.25);
          chime.connect(chimeEnv);
          chimeEnv.connect(masterGainRef.current!);
          chime.start(now);
          chime.stop(now + 2.3);
        });
      } catch {
        // Ignore if browser blocks audio prior to user gesture
      }
    },
    [ensureWebAudio, isMuted],
  );

  return (
    <AudioCtx.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        activeTrackId,
        tracks,
        setTracksConfig,
        startMusic,
        togglePlay,
        toggleMute,
        setVolume,
        selectTrack,
        playMemoryClip,
        stopMemoryClip,
        activeClipId,
        playChime,
        playWheelTick,
        playFanfare,
        playCountdownBeat,
        unlockAudio,
      }}
    >
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error('useAudio must be used inside AudioProvider');
  }
  return ctx;
}
