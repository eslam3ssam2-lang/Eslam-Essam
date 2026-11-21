import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';

interface CinematicBirthdayIntroProps {
  edition: BirthdayEdition;
  lang: Language;
  ready: boolean;
  previewMode?: boolean;
  onChangeLang: (next: Language) => void;
  onComplete: () => void;
}

type IntroPhase =
  | 'black'
  | 'count3'
  | 'count2'
  | 'count1'
  | 'pause'
  | 'burst'
  | 'happy'
  | 'birthday'
  | 'name'
  | 'exit';

function hasArabicChars(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

interface RevealWordProps {
  text: string;
  visible: boolean;
  reducedMotion: boolean;
  staggerMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

function RevealWord({
  text,
  visible,
  reducedMotion,
  staggerMs = 85,
  className = '',
  style,
}: RevealWordProps) {
  const isArabic = hasArabicChars(text);

  if (isArabic || reducedMotion) {
    const tokens = isArabic ? text.split(/\s+/).filter(Boolean) : [text];
    return (
      <span className={className} style={style}>
        {tokens.map((tok, idx) => (
          <span
            key={`${tok}-${idx}`}
            className={`inline-block transition-all duration-700 ease-out ${
              visible
                ? 'opacity-100 translate-y-0 scale-100 blur-0'
                : 'opacity-0 translate-y-3 scale-95 blur-[6px]'
            } ${idx < tokens.length - 1 ? 'me-[0.3em]' : ''}`}
            style={{
              transitionDelay: visible && !reducedMotion ? `${idx * 160}ms` : '0ms',
            }}
          >
            {tok}
          </span>
        ))}
      </span>
    );
  }

  const chars = Array.from(text);
  return (
    <span className={className} style={style} aria-label={text}>
      {chars.map((ch, idx) => {
        if (ch === ' ') {
          return (
            <span key={`sp-${idx}`} className="inline-block w-[0.32em]" aria-hidden="true">
              {' '}
            </span>
          );
        }
        return (
          <span
            key={`${ch}-${idx}`}
            aria-hidden="true"
            className={`inline-block transition-all duration-500 ease-out ${
              visible
                ? 'opacity-100 translate-y-0 scale-100 blur-0'
                : 'opacity-0 translate-y-4 scale-75 blur-[8px]'
            }`}
            style={{
              transitionDelay: visible ? `${idx * staggerMs}ms` : '0ms',
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

export function CinematicBirthdayIntro({
  edition,
  lang,
  ready,
  previewMode = false,
  onChangeLang,
  onComplete,
}: CinematicBirthdayIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const rainActiveRef = useRef(false);
  const burstTriggerRef = useRef(false);
  const tensionStageRef = useRef(0);

  const [phase, setPhase] = useState<IntroPhase>('black');
  const [reducedMotion, setReducedMotion] = useState(false);

  const { playCountdownBeat, unlockAudio } = useAudio();
  const playBeatRef = useRef(playCountdownBeat);
  playBeatRef.current = playCountdownBeat;
  const t = UI_STRINGS[lang].intro;
  const recipientName = pickText(edition.recipientName, lang);

  const { lineOne, lineTwo } = useMemo(() => {
    const raw = pickText(edition.appearance.introLeadText, lang).trim() || t.defaultLead;
    if (lang === 'en') {
      if (raw.toUpperCase() === 'HAPPY') {
        return { lineOne: 'HAPPY', lineTwo: 'BIRTHDAY' };
      }
      const words = raw.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return { lineOne: words[0], lineTwo: words.slice(1).join(' ') };
      }
      return { lineOne: raw, lineTwo: 'BIRTHDAY' };
    } else {
      if (raw === 'عيد سعيد') {
        return { lineOne: 'عيد ميلاد', lineTwo: 'سعيد' };
      }
      const words = raw.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return { lineOne: words.slice(0, -1).join(' '), lineTwo: words[words.length - 1] };
      }
      return { lineOne: raw, lineTwo: 'سعيد' };
    }
  }, [edition.appearance.introLeadText, lang, t.defaultLead]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Lock background scroll while full-screen intro is active (skip in embedded previewMode)
  useEffect(() => {
    if (previewMode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [previewMode]);

  const triggerExit = useCallback(
    (fast = false) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setPhase('exit');
      window.setTimeout(() => {
        onComplete();
      }, fast ? 420 : 850);
    },
    [onComplete],
  );

  // Sync canvas flags with current intro phase
  useEffect(() => {
    if (phase === 'black') {
      tensionStageRef.current = 0;
      rainActiveRef.current = false;
    } else if (phase === 'count3') {
      tensionStageRef.current = 1;
      rainActiveRef.current = false;
    } else if (phase === 'count2') {
      tensionStageRef.current = 2;
      rainActiveRef.current = false;
    } else if (phase === 'count1') {
      tensionStageRef.current = 3;
      rainActiveRef.current = false;
    } else if (phase === 'pause') {
      tensionStageRef.current = 4;
      rainActiveRef.current = false;
    } else if (phase === 'burst') {
      tensionStageRef.current = 5;
      burstTriggerRef.current = true;
      rainActiveRef.current = true;
    } else {
      tensionStageRef.current = 5;
      rainActiveRef.current = true;
    }
  }, [phase]);

  // Master Choreography Timeline (~11s countdown + dramatic pause):
  // Pure Black (0.2s) -> 3 (3.0s) -> 2 (3.0s) -> 1 (3.0s) -> Dramatic Pause (2.0s)
  // -> Powerful Pink Burst + Matrix Rain -> HAPPY -> BIRTHDAY -> Name -> Exit
  useEffect(() => {
    if (!ready) return;

    if (!previewMode && edition.appearance.effects.intro === false) {
      completedRef.current = true;
      onComplete();
      return;
    }

    const countdownEnabled = edition.appearance.countdownEnabled !== false;
    const totalSec = Math.min(20, Math.max(3, edition.appearance.countdownDurationSec ?? 11));
    const digitMs = Math.round((totalSec * 1000 * 3) / 11);
    const pauseMs = Math.round((totalSec * 1000 * 2) / 11);

    if (!countdownEnabled) {
      const timers = [
        window.setTimeout(() => {
          setPhase('burst');
          playBeatRef.current('burst');
        }, 120),
        window.setTimeout(() => setPhase('happy'), 800),
        window.setTimeout(() => setPhase('birthday'), 1700),
        window.setTimeout(() => setPhase('name'), 2900),
        window.setTimeout(() => triggerExit(false), 6200),
      ];
      return () => timers.forEach((id) => window.clearTimeout(id));
    }

    const t2 = 200 + digitMs;
    const t1 = t2 + digitMs;
    const tPause = t1 + digitMs;
    const tBurst = tPause + pauseMs;

    if (reducedMotion) {
      setPhase('count3');
      playBeatRef.current(3);
      const timers = [
        window.setTimeout(() => {
          setPhase('count2');
          playBeatRef.current(2);
        }, digitMs),
        window.setTimeout(() => {
          setPhase('count1');
          playBeatRef.current(1);
        }, digitMs * 2),
        window.setTimeout(() => {
          setPhase('pause');
          playBeatRef.current('pause');
        }, digitMs * 3),
        window.setTimeout(() => {
          setPhase('burst');
          playBeatRef.current('burst');
        }, digitMs * 3 + pauseMs),
        window.setTimeout(() => setPhase('happy'), digitMs * 3 + pauseMs + 400),
        window.setTimeout(() => setPhase('birthday'), digitMs * 3 + pauseMs + 1000),
        window.setTimeout(() => setPhase('name'), digitMs * 3 + pauseMs + 1800),
        window.setTimeout(() => triggerExit(false), digitMs * 3 + pauseMs + 4200),
      ];
      return () => timers.forEach((id) => window.clearTimeout(id));
    }

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setPhase('count3');
        playBeatRef.current(3);
      }, 200),
    );
    timers.push(
      window.setTimeout(() => {
        setPhase('count2');
        playBeatRef.current(2);
      }, t2),
    );
    timers.push(
      window.setTimeout(() => {
        setPhase('count1');
        playBeatRef.current(1);
      }, t1),
    );
    timers.push(
      window.setTimeout(() => {
        setPhase('pause');
        playBeatRef.current('pause');
      }, tPause),
    );
    timers.push(
      window.setTimeout(() => {
        setPhase('burst');
        playBeatRef.current('burst');
      }, tBurst),
    );
    timers.push(window.setTimeout(() => setPhase('happy'), tBurst + 850));
    timers.push(window.setTimeout(() => setPhase('birthday'), tBurst + 1850));
    timers.push(window.setTimeout(() => setPhase('name'), tBurst + 3300));
    timers.push(window.setTimeout(() => triggerExit(false), tBurst + 6400));

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [
    edition.appearance.countdownDurationSec,
    edition.appearance.countdownEnabled,
    edition.appearance.effects.intro,
    onComplete,
    previewMode,
    ready,
    reducedMotion,
    triggerExit,
  ]);

  // Escape shortcut to skip intro
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerExit(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerExit]);

  // Character pool for Matrix rain + particle explosion glyphs
  const glyphChars = useMemo(() => {
    const cleanName = recipientName.replace(/\s+/g, '');
    const base =
      lang === 'ar'
        ? 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي♥★✦✧♪♡01'
        : 'HAPPYBIRTHDAYCELBRTE01★♥✦✧♪♡';
    return Array.from(base + cleanName);
  }, [lang, recipientName]);

  // Unified Pure-Black Canvas Engine: Explosion Particles + Long Pink Matrix Streams
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let fontSize = width < 640 ? 14 : width < 1024 ? 16 : 18;
    let colWidth = Math.round(fontSize * 1.02);
    let cols = Math.min(160, Math.max(22, Math.ceil(width / colWidth)));

    interface RainStream {
      headRow: number;
      speed: number;
      trailLength: number;
      isForeground: boolean;
      glyphSeed: number;
      gapRows: number;
      spawnedNext: boolean;
    }

    interface AmbientParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      phaseOffset: number;
      color: string;
    }

    interface BurstParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      decay: number;
      color: string;
      glyph?: string;
    }

    let columns: RainStream[][] = [];
    let particles: BurstParticle[] = [];
    let embers: AmbientParticle[] = [];

    const createEmber = (w: number, h: number): AmbientParticle => {
      const palette = ['#D9A5AE', '#E87EA1', '#C45A7C', '#F5EBDD', '#F4B8C6'];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 14,
        vy: -(8 + Math.random() * 20),
        size: 1.1 + Math.random() * 2.5,
        alpha: 0.25 + Math.random() * 0.65,
        phaseOffset: Math.random() * Math.PI * 2,
        color: palette[Math.floor(Math.random() * palette.length)],
      };
    };

    const pickTrailLength = (maxRows: number, seed: number): number => {
      const bucket = (seed * 37 + Math.floor(Math.random() * 100)) % 100;
      if (bucket < 36) {
        return Math.max(20, Math.round(maxRows * (0.74 + Math.random() * 0.24)));
      }
      if (bucket < 76) {
        return Math.max(12, Math.round(maxRows * (0.38 + Math.random() * 0.28)));
      }
      return Math.max(7, Math.round(maxRows * (0.16 + Math.random() * 0.16)));
    };

    const createStream = (
      maxRows: number,
      seed: number,
      isForeground: boolean,
      initialHead: number,
    ): RainStream => ({
      headRow: initialHead,
      speed: 10 + Math.random() * 13.5,
      trailLength: pickTrailLength(maxRows, seed),
      isForeground,
      glyphSeed: Math.floor(Math.random() * 10000),
      gapRows: 8 + Math.floor(Math.random() * 18),
      spawnedNext: false,
    });

    const setupStreams = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      fontSize = width < 640 ? 14 : width < 1024 ? 16 : 18;
      colWidth = Math.round(fontSize * 1.02);
      cols = Math.min(160, Math.max(22, Math.ceil(width / colWidth)));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maxRows = Math.max(24, Math.ceil(height / fontSize));
      // Stagger initial heads near the very top so streams cascade downward dynamically from the burst moment
      columns = Array.from({ length: cols }, (_, i) => {
        const isFg = i % 4 !== 0;
        const initialHead =
          i % 3 === 0 ? Math.random() * 10 : -Math.random() * 8;
        return [createStream(maxRows, i, isFg, initialHead)];
      });

      const maxEmbers = width < 640 ? 64 : 104;
      embers = Array.from({ length: maxEmbers }, () => createEmber(width, height));
    };

    const spawnBurstExplosion = () => {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const palette = ['#FFF2F6', '#E87EA1', '#D9A5AE', '#C45A7C', '#F5EBDD'];
      const count = width < 640 ? 130 : 185;

      particles = Array.from({ length: count }, (_, idx) => {
        const angle = (Math.PI * 2 * idx) / count + (Math.random() - 0.5) * 0.28;
        const speed = 220 + Math.random() * (Math.max(width, height) * 0.65);
        const useGlyph = idx % 4 === 0;
        return {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.8 + Math.random() * 3.8,
          alpha: 1,
          decay: 0.65 + Math.random() * 0.65,
          color: palette[idx % palette.length],
          glyph: useGlyph ? glyphChars[idx % glyphChars.length] : undefined,
        };
      });
    };

    setupStreams();

    const drawStream = (
      stream: RainStream,
      colIndex: number,
      maxRows: number,
      tickBucket: number,
    ) => {
      const x = colIndex * colWidth + colWidth * 0.5;
      const headInt = Math.floor(stream.headRow);
      const len = stream.trailLength;
      const baseAlpha = stream.isForeground ? 0.96 : 0.48;

      for (let offset = 0; offset < len; offset++) {
        const row = headInt - offset;
        if (row < 0) break;
        if (row > maxRows) continue;

        const shimmer =
          offset <= 1 || (row + stream.glyphSeed + tickBucket) % 17 === 0
            ? Math.floor(tickBucket / 2)
            : 0;
        const glyphIdx = Math.abs(
          (row * 17 + colIndex * 31 + stream.glyphSeed + shimmer) % glyphChars.length,
        );
        const glyph = glyphChars[glyphIdx];
        const yPx = row * fontSize + fontSize * 0.85;
        const norm = offset / len;

        if (offset === 0) {
          ctx.globalAlpha = baseAlpha;
          ctx.fillStyle = stream.isForeground ? '#FFF2F6' : '#F4B8C6';
          ctx.shadowColor = '#E87EA1';
          ctx.shadowBlur = stream.isForeground ? 14 : 6;
          ctx.fillText(glyph, x, yPx);
        } else if (offset <= 2) {
          ctx.globalAlpha = baseAlpha * 0.94;
          ctx.fillStyle = '#E87EA1';
          ctx.shadowColor = '#C45A7C';
          ctx.shadowBlur = stream.isForeground ? 8 : 3;
          ctx.fillText(glyph, x, yPx);
        } else {
          ctx.shadowBlur = 0;
          const fade = norm < 0.68 ? 1 - norm * 0.32 : 1 - (norm - 0.68) * 2.55;
          ctx.globalAlpha = Math.max(0.06, baseAlpha * fade);
          ctx.fillStyle =
            norm < 0.35 ? '#D9A5AE' : norm < 0.72 ? '#C45A7C' : '#713F50';
          ctx.fillText(glyph, x, yPx);
        }
      }
      ctx.shadowBlur = 0;
    };

    if (reducedMotion) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const stage = tensionStageRef.current;

      // Gradually increasing radial background tension & floating pink embers during countdown + pause
      if (stage >= 1 && stage <= 4) {
        const cx = width * 0.5;
        const cy = height * 0.5;
        const intensity = stage === 1 ? 0.14 : stage === 2 ? 0.24 : stage === 3 ? 0.36 : 0.44;
        const radius =
          Math.max(width, height) * (stage === 4 ? 0.34 : 0.42 + stage * 0.06);
        const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        aura.addColorStop(0, `rgba(217, 165, 174, ${intensity})`);
        aura.addColorStop(0.45, `rgba(113, 63, 80, ${intensity * 0.48})`);
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, width, height);

        const activeFraction = stage === 1 ? 0.26 : stage === 2 ? 0.48 : stage === 3 ? 0.76 : 1;
        const activeCount = Math.floor(embers.length * activeFraction);
        const speedMult = stage === 1 ? 0.75 : stage === 2 ? 1.05 : stage === 3 ? 1.4 : 2.1;

        for (let e = 0; e < activeCount; e++) {
          const ember = embers[e];
          if (stage === 4) {
            // Pull floating energy particles gently inward toward center core during the 2-second pause
            const dx = cx - ember.x;
            const dy = cy - ember.y;
            const dist = Math.hypot(dx, dy) || 1;
            ember.x += (dx / dist) * 58 * dt + ember.vx * 0.35 * dt;
            ember.y += (dy / dist) * 58 * dt + ember.vy * 0.35 * dt;
          } else {
            ember.x += ember.vx * speedMult * dt + Math.sin(now * 0.0014 + ember.phaseOffset) * 10 * dt;
            ember.y += ember.vy * speedMult * dt;
          }

          if (ember.y < -12) ember.y = height + 12;
          if (ember.y > height + 12) ember.y = -12;
          if (ember.x < -12) ember.x = width + 12;
          if (ember.x > width + 12) ember.x = -12;

          const pulse = 0.55 + 0.45 * Math.sin(now * 0.004 + ember.phaseOffset);
          ctx.globalAlpha = Math.min(0.95, ember.alpha * (0.45 + stage * 0.16) * pulse);
          ctx.fillStyle = ember.color;
          ctx.shadowColor = '#E87EA1';
          ctx.shadowBlur = 8 + stage * 3;
          ctx.beginPath();
          ctx.arc(ember.x, ember.y, ember.size * (1 + stage * 0.08), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      if (burstTriggerRef.current) {
        burstTriggerRef.current = false;
        spawnBurstExplosion();
      }

      // Draw Matrix rain ONLY after countdown finishes and burst starts
      if (rainActiveRef.current) {
        ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", "Cairo", monospace`;
        ctx.textAlign = 'center';

        const maxRows = Math.max(24, Math.ceil(height / fontSize)) + 1;
        const tickBucket = Math.floor(now / 110);

        for (let i = 0; i < columns.length; i++) {
          const colStreams = columns[i];
          for (let s = colStreams.length - 1; s >= 0; s--) {
            const stream = colStreams[s];
            drawStream(stream, i, maxRows, tickBucket);
            stream.headRow += stream.speed * dt;

            const tailRow = stream.headRow - stream.trailLength;
            if (!stream.spawnedNext && tailRow > stream.gapRows && colStreams.length < 2) {
              stream.spawnedNext = true;
              colStreams.push(createStream(maxRows, i + tickBucket + s, stream.isForeground, 0));
            }
            if (tailRow > maxRows + 2) {
              colStreams.splice(s, 1);
            }
          }
          if (colStreams.length === 0) {
            colStreams.push(createStream(maxRows, i + tickBucket, i % 4 !== 0, 0));
          }
        }
      }

      // Draw pink radial explosion sparks & glowing glyphs
      if (particles.length > 0) {
        ctx.font = `700 ${Math.round(fontSize * 0.9)}px "Plus Jakarta Sans", monospace`;
        ctx.textAlign = 'center';
        for (let p = particles.length - 1; p >= 0; p--) {
          const part = particles[p];
          part.x += part.vx * dt;
          part.y += part.vy * dt;
          part.vx *= 0.955;
          part.vy *= 0.955;
          part.alpha -= part.decay * dt;

          if (part.alpha <= 0.02) {
            particles.splice(p, 1);
            continue;
          }

          ctx.globalAlpha = Math.max(0, part.alpha);
          ctx.fillStyle = part.color;
          ctx.shadowColor = '#E87EA1';
          ctx.shadowBlur = 12;

          if (part.glyph) {
            ctx.fillText(part.glyph, part.x, part.y);
          } else {
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(renderFrame);

    let resizeTimer = 0;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => setupStreams(), 120);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [glyphChars, reducedMotion]);

  const countdownNum =
    phase === 'count3' ? 3 : phase === 'count2' ? 2 : phase === 'count1' ? 1 : null;
  const isPause = phase === 'pause';
  const isBurst = phase === 'burst';
  const isGreetingStage =
    phase === 'happy' || phase === 'birthday' || phase === 'name' || phase === 'exit';
  const showHappy = isGreetingStage;
  const showBirthday = phase === 'birthday' || phase === 'name' || phase === 'exit';
  const showName = phase === 'name' || phase === 'exit';
  const isExiting = phase === 'exit';

  return (
    <div
      role="dialog"
      aria-modal={!previewMode}
      aria-label={`${lineOne} ${lineTwo} ${recipientName}`}
      onPointerDown={unlockAudio}
      className={`${previewMode ? 'absolute min-h-[520px]' : 'fixed'} inset-0 z-[80] flex items-center justify-center bg-black overflow-hidden select-none transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Unified Canvas: Pure Black Countdown + Floating Particles -> Powerful Pink Burst -> Falling Matrix Rain */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Progressive Background Tension Aura during 3 -> 2 -> 1 -> Pause */}
      {(countdownNum !== null || isPause) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            background:
              countdownNum === 3
                ? 'radial-gradient(circle at center, rgba(217,165,174,0.12) 0%, rgba(0,0,0,0.88) 55%, #000000 100%)'
                : countdownNum === 2
                  ? 'radial-gradient(circle at center, rgba(232,126,161,0.20) 0%, rgba(0,0,0,0.84) 60%, #000000 100%)'
                  : countdownNum === 1
                    ? 'radial-gradient(circle at center, rgba(232,126,161,0.30) 0%, rgba(18,8,12,0.82) 62%, #000000 100%)'
                    : 'radial-gradient(circle at center, rgba(217,165,174,0.24) 0%, rgba(0,0,0,0.92) 48%, #000000 100%)',
          }}
        />
      )}

      {/* Soft Center Radial Scrim behind Matrix Rain for crisp readability */}
      {isGreetingStage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.44) 48%, rgba(0,0,0,0.10) 100%)',
          }}
        />
      )}

      {/* Powerful Pink Light Burst after the 2-second Dramatic Pause */}
      {isBurst && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            className="animate-burst-flash h-[520px] w-[520px] sm:h-[780px] sm:w-[780px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,245,248,1) 0%, rgba(232,126,161,0.88) 28%, rgba(196,90,124,0.42) 56%, transparent 78%)',
            }}
          />
        </div>
      )}

      {/* Top Bar Controls: Bilingual Switch + Skip Intro */}
      <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-6 z-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-[#D9A5AE]/40 bg-black/75 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
              lang === 'en'
                ? 'bg-[#D9A5AE] text-black font-semibold'
                : 'text-[#F5EBDD]/85 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('ar')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
              lang === 'ar'
                ? 'bg-[#D9A5AE] text-black font-semibold'
                : 'text-[#F5EBDD]/85 hover:text-white'
            }`}
          >
            العربية
          </button>
        </div>

        <button
          type="button"
          onClick={() => triggerExit(true)}
          className="rounded-lg border border-[#D9A5AE]/45 bg-black/75 px-4 py-2 text-xs font-medium text-[#F5EBDD] backdrop-blur-sm transition-colors hover:border-[#E87EA1] hover:bg-[#713F50]/45 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9A5AE] whitespace-nowrap shrink-0 min-h-[44px]"
        >
          {t.skipIntro}
        </button>
      </div>

      {/* Phase 1–3: Slow 3-Second Glowing Neon-Pink Numerals (3 -> 2 -> 1) */}
      {countdownNum !== null && (
        <div
          key={`countdown-${countdownNum}`}
          className="relative z-10 flex items-center justify-center"
        >
          {/* Expanding Slow Shockwave Glow Ring */}
          <div
            aria-hidden="true"
            className="animate-shockwave-ring pointer-events-none absolute h-48 w-48 sm:h-72 sm:w-72 rounded-full border-2 border-[#D9A5AE]/70"
            style={{
              boxShadow:
                countdownNum === 1
                  ? '0 0 56px rgba(232, 126, 161, 0.92)'
                  : '0 0 38px rgba(217, 165, 174, 0.72)',
            }}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute h-52 w-52 sm:h-72 sm:w-72 rounded-full blur-3xl transition-all duration-1000 ${
              countdownNum === 3
                ? 'bg-[#C45A7C]/25'
                : countdownNum === 2
                  ? 'bg-[#E87EA1]/35 scale-110'
                  : 'bg-[#E87EA1]/48 scale-125'
            }`}
          />
          <span
            className="animate-countdown-digit font-display text-[7.5rem] sm:text-[11rem] md:text-[13.5rem] font-extrabold leading-none tabular-nums"
            style={{
              color: '#FFF2F6',
              textShadow:
                countdownNum === 1
                  ? '0 0 24px rgba(244, 184, 198, 1), 0 0 58px rgba(232, 126, 161, 0.96), 0 0 120px rgba(196, 90, 124, 0.78)'
                  : '0 0 18px rgba(244, 184, 198, 0.98), 0 0 46px rgba(232, 126, 161, 0.9), 0 0 96px rgba(196, 90, 124, 0.62)',
            }}
          >
            {countdownNum}
          </span>
        </div>
      )}

      {/* Phase 4: 2-Second Dramatic Anticipation Pause after Number 1 */}
      {isPause && (
        <div
          aria-hidden="true"
          className="relative z-10 flex items-center justify-center"
        >
          <div
            className="animate-tension-core h-36 w-36 sm:h-52 sm:w-52 rounded-full bg-[#E87EA1]/35 blur-2xl"
            style={{
              boxShadow: '0 0 80px rgba(232, 126, 161, 0.8)',
            }}
          />
          <div
            className="animate-tension-core absolute h-12 w-12 sm:h-16 sm:w-16 rounded-full border border-[#F4B8C6]/75 bg-[#D9A5AE]/25 blur-sm"
          />
        </div>
      )}

      {/* Phase 7–8: Center Stage "HAPPY" -> "BIRTHDAY" -> Personalized Name Underneath */}
      {isGreetingStage && (
        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center justify-center px-5 text-center">
          {/* Ambient Neon Pink Center Halo */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute h-56 w-[min(90vw,640px)] rounded-full blur-3xl transition-all duration-700 ${
              showName
                ? 'scale-110 bg-[#E87EA1]/24 opacity-95'
                : 'scale-100 bg-[#C45A7C]/18 opacity-85'
            }`}
          />

          {/* Line 1 & Line 2: "HAPPY" followed by "BIRTHDAY" */}
          <h1 className="relative flex flex-col items-center justify-center gap-1 sm:gap-2">
            <RevealWord
              text={lineOne}
              visible={showHappy}
              reducedMotion={reducedMotion}
              staggerMs={95}
              className={`font-extrabold leading-[1.05] text-balance ${
                lang === 'ar'
                  ? 'font-display text-4xl sm:text-6xl md:text-7xl tracking-normal'
                  : 'text-5xl sm:text-7xl md:text-8xl tracking-[0.22em]'
              }`}
              style={{
                color: '#FFF2F6',
                textShadow:
                  '0 0 10px rgba(244, 184, 198, 0.95), 0 0 28px rgba(232, 126, 161, 0.85), 0 0 64px rgba(196, 90, 124, 0.55)',
              }}
            />

            <RevealWord
              text={lineTwo}
              visible={showBirthday}
              reducedMotion={reducedMotion}
              staggerMs={80}
              className={`font-extrabold leading-[1.08] text-balance ${
                lang === 'ar'
                  ? 'font-display text-4xl sm:text-6xl md:text-7xl tracking-normal'
                  : 'text-4xl sm:text-7xl md:text-8xl tracking-[0.18em]'
              }`}
              style={{
                color: '#F4B8C6',
                textShadow:
                  '0 0 10px rgba(217, 165, 174, 0.95), 0 0 28px rgba(232, 126, 161, 0.85), 0 0 64px rgba(196, 90, 124, 0.55)',
              }}
            />
          </h1>

          {/* Glowing Horizontal Accent Divider */}
          <div
            aria-hidden="true"
            className={`my-5 sm:my-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#D9A5AE] to-transparent transition-all duration-700 ease-out ${
              showName ? 'w-44 sm:w-72 opacity-90' : 'w-6 opacity-0'
            }`}
            style={{
              boxShadow: '0 0 18px rgba(232, 126, 161, 0.95)',
            }}
          />

          {/* Birthday Person's Personalized Name Underneath "HAPPY BIRTHDAY" */}
          <div
            className={`flex flex-col items-center justify-center transition-all duration-700 ease-out ${
              showName
                ? 'opacity-100 translate-y-0 scale-100 blur-0'
                : 'opacity-0 translate-y-4 scale-95 blur-[6px] pointer-events-none'
            }`}
          >
            <h2
              className="font-display text-3xl font-bold leading-[1.18] sm:text-5xl md:text-6xl text-balance px-2"
              style={{
                color: '#FFF2F6',
                textShadow:
                  '0 0 12px rgba(244, 184, 198, 0.95), 0 0 34px rgba(232, 126, 161, 0.82), 0 0 76px rgba(196, 90, 124, 0.55)',
              }}
            >
              <RevealWord
                text={recipientName}
                visible={showName}
                reducedMotion={reducedMotion}
                staggerMs={55}
              />
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
