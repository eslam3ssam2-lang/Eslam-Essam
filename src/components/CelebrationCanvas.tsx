import { useEffect, useRef } from 'react';

export type CelebrationBurstType = 'confetti' | 'fireworks';

const BURST_EVENT = 'atelier-celebration-burst';

export function triggerCelebrationBurst(type: CelebrationBurstType): void {
  window.dispatchEvent(new CustomEvent<CelebrationBurstType>(BURST_EVENT, { detail: type }));
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vr: number;
  kind: 'confetti' | 'spark' | 'petal';
}

interface AmbientStar {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

const PALETTE = ['#C5A46D', '#D9A5AE', '#F5EBDD', '#713F50', '#E2C694'];

export function CelebrationCanvas({
  starsEnabled,
  petalsEnabled,
}: {
  starsEnabled: boolean;
  petalsEnabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<AmbientStar[]>([]);
  const petalsEnabledRef = useRef(petalsEnabled);
  const starsEnabledRef = useRef(starsEnabled);

  useEffect(() => {
    petalsEnabledRef.current = petalsEnabled;
  }, [petalsEnabled]);

  useEffect(() => {
    starsEnabledRef.current = starsEnabled;
  }, [starsEnabled]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      starsRef.current = Array.from({ length: 44 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
      }));
    };

    resize();
    window.addEventListener('resize', resize);

    const spawnBurst = (type: CelebrationBurstType) => {
      if (prefersReducedMotion) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (type === 'confetti') {
        for (let i = 0; i < 85; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
          const speed = 5 + Math.random() * 8;
          particlesRef.current.push({
            x: w * (0.25 + Math.random() * 0.5),
            y: h * 0.65,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 5 + Math.random() * 5,
            color: PALETTE[i % PALETTE.length],
            alpha: 1,
            decay: 0.008 + Math.random() * 0.006,
            rotation: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.18,
            kind: 'confetti',
          });
        }
      } else {
        for (let b = 0; b < 3; b++) {
          const cx = w * (0.2 + Math.random() * 0.6);
          const cy = h * (0.18 + Math.random() * 0.32);
          const baseColor = PALETTE[b % PALETTE.length];
          for (let i = 0; i < 42; i++) {
            const angle = (Math.PI * 2 * i) / 42 + Math.random() * 0.1;
            const speed = 1.8 + Math.random() * 4.5;
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2.2 + Math.random() * 2.2,
              color: i % 3 === 0 ? '#F5EBDD' : baseColor,
              alpha: 1,
              decay: 0.012 + Math.random() * 0.008,
              rotation: 0,
              vr: 0,
              kind: 'spark',
            });
          }
        }
      }
      if (particlesRef.current.length > 350) {
        particlesRef.current = particlesRef.current.slice(-350);
      }
    };

    const onBurst = (e: Event) => {
      const custom = e as CustomEvent<CelebrationBurstType>;
      spawnBurst(custom.detail || 'confetti');
    };
    window.addEventListener(BURST_EVENT, onBurst);

    let rafId = 0;
    let tickCount = 0;

    const render = () => {
      tickCount += 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (starsEnabledRef.current && !prefersReducedMotion) {
        for (const s of starsRef.current) {
          s.phase += s.speed;
          const opacity = 0.12 + (Math.sin(s.phase) + 1) * 0.18;
          ctx.fillStyle = `rgba(197, 164, 109, ${opacity.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (petalsEnabledRef.current && !prefersReducedMotion && tickCount % 16 === 0 && particlesRef.current.length < 180) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: -12,
          vx: (Math.random() - 0.5) * 0.9,
          vy: 1.1 + Math.random() * 1.1,
          size: 5 + Math.random() * 4,
          color: Math.random() > 0.35 ? '#D9A5AE' : '#C5A46D',
          alpha: 0.72,
          decay: 0.0018,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.04,
          kind: 'petal',
        });
      }

      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind === 'confetti') {
          p.vy += 0.14;
          p.vx *= 0.99;
        } else if (p.kind === 'spark') {
          p.vy += 0.045;
          p.vx *= 0.97;
        } else {
          p.vx += Math.sin(tickCount * 0.03 + p.rotation) * 0.015;
        }
        p.rotation += p.vr;
        p.alpha -= p.decay;

        if (p.alpha > 0.02 && p.y < h + 30) {
          nextParticles.push(p);
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          if (p.kind === 'confetti') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
          } else if (p.kind === 'petal') {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      particlesRef.current = nextParticles;
      rafId = window.requestAnimationFrame(render);
    };

    if (!prefersReducedMotion) {
      rafId = window.requestAnimationFrame(render);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener(BURST_EVENT, onBurst);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-30 pointer-events-none"
    />
  );
}
