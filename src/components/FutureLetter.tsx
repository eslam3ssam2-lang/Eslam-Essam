import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';
import { RichTextDisplay } from './RichTextContent.tsx';

type EnvelopeStep = 'closed' | 'flap' | 'sliding' | 'unfolding' | 'bloomed';

interface ButterflySpec {
  id: string;
  wingLight: string;
  wingDark: string;
  accent: string;
  flightClass: string;
  delayMs: number;
  size: number;
  topPercent: number;
}

const BUTTERFLIES: ButterflySpec[] = [
  {
    id: 'bf-1',
    wingLight: '#F6A9BE',
    wingDark: '#D36B88',
    accent: '#FFF5F8',
    flightClass: 'animate-butterfly-drift-a',
    delayMs: 120,
    size: 42,
    topPercent: 18,
  },
  {
    id: 'bf-2',
    wingLight: '#9CC7EC',
    wingDark: '#5B8EC4',
    accent: '#F0F7FF',
    flightClass: 'animate-butterfly-drift-b',
    delayMs: 650,
    size: 38,
    topPercent: 30,
  },
  {
    id: 'bf-3',
    wingLight: '#F8CE96',
    wingDark: '#D59148',
    accent: '#FFF8EB',
    flightClass: 'animate-butterfly-drift-c',
    delayMs: 1100,
    size: 36,
    topPercent: 12,
  },
  {
    id: 'bf-4',
    wingLight: '#C8AEEB',
    wingDark: '#8D69C4',
    accent: '#F7F2FF',
    flightClass: 'animate-butterfly-drift-a',
    delayMs: 2600,
    size: 36,
    topPercent: 58,
  },
  {
    id: 'bf-5',
    wingLight: '#9FD6BC',
    wingDark: '#599C7E',
    accent: '#F1FBF6',
    flightClass: 'animate-butterfly-drift-b',
    delayMs: 3400,
    size: 40,
    topPercent: 64,
  },
  {
    id: 'bf-6',
    wingLight: '#F3B4C6',
    wingDark: '#C96D89',
    accent: '#FFF5F8',
    flightClass: 'animate-butterfly-drift-c',
    delayMs: 4600,
    size: 34,
    topPercent: 24,
  },
];

function ButterflySvg({
  wingLight,
  wingDark,
  accent,
  size,
}: {
  wingLight: string;
  wingDark: string;
  accent: string;
  size: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="drop-shadow-[0_4px_8px_rgba(88,54,48,0.18)]"
    >
      <g className="animate-butterfly-wing-l">
        <path
          d="M39 38 C28 16, 6 12, 8 30 C9 42, 24 44, 39 40 Z"
          fill={wingLight}
          stroke={wingDark}
          strokeWidth="1.2"
        />
        <path
          d="M39 42 C25 43, 14 53, 19 64 C24 72, 36 60, 39 44 Z"
          fill={wingDark}
          fillOpacity="0.88"
        />
        <circle cx="21" cy="27" r="3" fill={accent} fillOpacity="0.85" />
        <circle cx="26" cy="54" r="2" fill={accent} fillOpacity="0.75" />
      </g>
      <g className="animate-butterfly-wing-r">
        <path
          d="M41 38 C52 16, 74 12, 72 30 C71 42, 56 44, 41 40 Z"
          fill={wingLight}
          stroke={wingDark}
          strokeWidth="1.2"
        />
        <path
          d="M41 42 C55 43, 66 53, 61 64 C56 72, 44 60, 41 44 Z"
          fill={wingDark}
          fillOpacity="0.88"
        />
        <circle cx="59" cy="27" r="3" fill={accent} fillOpacity="0.85" />
        <circle cx="54" cy="54" r="2" fill={accent} fillOpacity="0.75" />
      </g>
      <ellipse cx="40" cy="43" rx="2.1" ry="11" fill="#4A3631" />
      <path d="M39 33 C36 26, 32 23, 29 22" stroke="#4A3631" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M41 33 C44 26, 48 23, 51 22" stroke="#4A3631" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function BloomingFloralCluster({
  bloomed,
  delayMs = 0,
  mirror = false,
  className = '',
  palette = 'rose',
}: {
  bloomed: boolean;
  delayMs?: number;
  mirror?: boolean;
  className?: string;
  palette?: 'rose' | 'lavender' | 'peach';
}) {
  const mainPetal =
    palette === 'lavender' ? '#E2B7BF' : palette === 'peach' ? '#E5C48F' : '#D9A5AE';
  const innerPetal =
    palette === 'lavender' ? '#8A4D61' : palette === 'peach' ? '#C5A46D' : '#713F50';
  const accentBlossom =
    palette === 'lavender' ? '#FBF5EC' : palette === 'peach' ? '#FBF5EC' : '#F5EBDD';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none transition-all duration-[1400ms] ease-out ${className}`}
      style={{
        transitionDelay: bloomed ? `${delayMs}ms` : '0ms',
        opacity: bloomed ? 1 : 0,
        transform: bloomed
          ? `scale(1) rotate(0deg) ${mirror ? 'scaleX(-1)' : ''}`
          : `scale(0.18) rotate(-18deg) ${mirror ? 'scaleX(-1)' : ''}`,
      }}
    >
      <svg
        viewBox="0 0 220 220"
        className="h-full w-full animate-flower-sway drop-shadow-[0_10px_22px_rgba(41,35,41,0.12)]"
        fill="none"
      >
        <path
          d="M20 200 C54 156, 86 112, 134 54"
          stroke="#6F8A6C"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M44 176 C22 152, 24 128, 48 122 C60 144, 56 164, 44 176 Z"
          fill="#89A482"
          fillOpacity="0.88"
        />
        <path
          d="M68 156 C96 156, 114 136, 108 116 C86 118, 72 134, 68 156 Z"
          fill="#708D6C"
          fillOpacity="0.9"
        />
        <path
          d="M92 114 C68 96, 68 72, 92 64 C106 82, 102 102, 92 114 Z"
          fill="#96AF8E"
          fillOpacity="0.85"
        />
        <path
          d="M114 96 C142 98, 160 82, 156 62 C134 62, 120 76, 114 96 Z"
          fill="#7D9877"
          fillOpacity="0.85"
        />
        <path
          d="M64 168 C94 178, 130 176, 166 154"
          stroke="#C5A46D"
          strokeWidth="1.6"
          strokeDasharray="2 2"
        />
        <circle cx="144" cy="166" r="5" fill="#C5A46D" />
        <circle cx="166" cy="154" r="4.5" fill="#C5A46D" />
        <circle cx="122" cy="172" r="4" fill="#DFC393" />

        <g transform="translate(86, 110)">
          <ellipse cx="0" cy="-24" rx="20" ry="24" fill={mainPetal} />
          <ellipse cx="22" cy="-8" rx="22" ry="19" transform="rotate(32 22 -8)" fill={mainPetal} />
          <ellipse cx="-22" cy="-8" rx="22" ry="19" transform="rotate(-32 -22 -8)" fill={mainPetal} />
          <ellipse cx="16" cy="18" rx="21" ry="18" transform="rotate(18 16 18)" fill={innerPetal} />
          <ellipse cx="-16" cy="18" rx="21" ry="18" transform="rotate(-18 -16 18)" fill={innerPetal} />
          <circle cx="0" cy="0" r="17" fill={accentBlossom} />
          <circle cx="0" cy="0" r="10" fill={innerPetal} fillOpacity="0.65" />
          <circle cx="0" cy="0" r="5.5" fill="#C5A46D" />
        </g>

        <g transform="translate(148, 62)">
          <ellipse cx="0" cy="-14" rx="9" ry="13" fill={accentBlossom} stroke={innerPetal} strokeWidth="0.8" />
          <ellipse cx="14" cy="0" rx="13" ry="9" fill={accentBlossom} stroke={innerPetal} strokeWidth="0.8" />
          <ellipse cx="0" cy="14" rx="9" ry="13" fill={accentBlossom} stroke={innerPetal} strokeWidth="0.8" />
          <ellipse cx="-14" cy="0" rx="13" ry="9" fill={accentBlossom} stroke={innerPetal} strokeWidth="0.8" />
          <circle cx="0" cy="0" r="6" fill="#C5A46D" />
        </g>

        <g transform="translate(46, 108)">
          <circle cx="0" cy="-10" r="6" fill="#FBF5EC" />
          <circle cx="9.5" cy="-3" r="6" fill="#FBF5EC" />
          <circle cx="6" cy="8" r="6" fill="#FBF5EC" />
          <circle cx="-6" cy="8" r="6" fill="#FBF5EC" />
          <circle cx="-9.5" cy="-3" r="6" fill="#FBF5EC" />
          <circle cx="0" cy="0" r="5" fill="#C5A46D" />
        </g>
      </svg>
    </div>
  );
}

export function FutureLetter({
  edition,
  lang,
}: {
  edition: BirthdayEdition;
  lang: Language;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const petalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const bloomLevelRef = useRef(0);

  const [step, setStep] = useState<EnvelopeStep>('closed');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const { playChime, unlockAudio } = useAudio();
  const tLetter = UI_STRINGS[lang].letter;
  const tEnv = UI_STRINGS[lang].envelope;
  const heading = pickChapterCopy(edition.chapterCopy?.letter, { kicker: tLetter.kicker, title: tLetter.title }, lang);
  const envInstruction = pickText(edition.envelopePrompt?.instruction, lang) || tEnv.instruction;
  const envTapPrompt = pickText(edition.envelopePrompt?.tapPrompt, lang) || tEnv.tapPrompt;

  const recipientName = pickText(edition.recipientName, lang);
  const letterHeadline =
    pickText(edition.futureLetter.title, lang) ||
    `${tEnv.dear} ${recipientName}`;
  const letterBody =
    pickText(edition.futureLetter.body, lang) ||
    pickText(edition.welcomeMessage, lang);
  const senderName =
    pickText(edition.futureLetter.sender, lang) ||
    pickText(edition.gift.sender, lang) ||
    pickText(edition.magazine?.lettersPage?.signature, lang);
  const monogram = (recipientName.trim()[0] || 'B').toUpperCase();

  const clearScheduled = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => clearScheduled, [clearScheduled]);

  const handleOpenEnvelope = useCallback(() => {
    if (step !== 'closed') return;
    unlockAudio();
    playChime();
    bloomLevelRef.current = 1;

    if (reducedMotion) {
      setStep('bloomed');
      return;
    }

    setStep('flap');
    timersRef.current.push(
      window.setTimeout(() => setStep('sliding'), 520),
      window.setTimeout(() => setStep('unfolding'), 1250),
      window.setTimeout(() => setStep('bloomed'), 2000),
    );
  }, [playChime, reducedMotion, step, unlockAudio]);

  const handleReseal = useCallback(() => {
    clearScheduled();
    bloomLevelRef.current = 0;
    setStep('closed');
  }, [clearScheduled]);

  // Scoped Floating Petals Canvas Engine inside Chapter IX stage
  useEffect(() => {
    const canvas = petalCanvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = stage.clientWidth || 720;
    let height = stage.clientHeight || 560;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    interface Petal {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vrot: number;
      rx: number;
      ry: number;
      color: string;
      alpha: number;
      swayOffset: number;
    }

    const palette = ['#D9A5AE', '#C48391', '#F5EBDD', '#E8C5CC', '#DFC39B'];
    let petals: Petal[] = [];

    const makePetal = (randomY: boolean): Petal => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -18 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 20,
      vy: 22 + Math.random() * 34,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 1.6,
      rx: 4.5 + Math.random() * 5,
      ry: 2.6 + Math.random() * 3.2,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.45 + Math.random() * 0.42,
      swayOffset: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      width = stage.clientWidth || 720;
      height = stage.clientHeight || 560;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 640 ? 22 : 38;
      petals = Array.from({ length: count }, () => makePetal(true));
    };

    resize();

    if (reducedMotion) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    let rafId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.008, (now - last) / 1000));
      last = now;

      ctx.clearRect(0, 0, width, height);

      const activeRatio = bloomLevelRef.current === 1 ? 1 : 0.14;
      const activeCount = Math.floor(petals.length * activeRatio);

      for (let i = 0; i < activeCount; i++) {
        const p = petals[i];
        p.x += (p.vx + Math.sin(now * 0.0014 + p.swayOffset) * 20) * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;

        if (p.y > height + 20) {
          petals[i] = makePetal(false);
        }
        if (p.x < -24) p.x = width + 18;
        if (p.x > width + 24) p.x = -18;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(frame);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(stage);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [reducedMotion]);

  const isOpened = step !== 'closed';
  const flapOpen = step !== 'closed';
  const letterSlid = step === 'sliding' || step === 'unfolding' || step === 'bloomed';
  const letterUnfolded = step === 'unfolding' || step === 'bloomed';
  const flowersBloomed = step === 'unfolding' || step === 'bloomed';

  const envelopeTranslateClass = useMemo(() => {
    if (letterUnfolded) {
      return 'translate-y-24 sm:translate-y-28 scale-[0.72] opacity-0 pointer-events-none h-0 overflow-hidden';
    }
    if (letterSlid) {
      return 'translate-y-16 sm:translate-y-20 scale-95 opacity-95';
    }
    return 'translate-y-0 scale-100 opacity-100';
  }, [letterSlid, letterUnfolded]);

  return (
    <section
      id="section-letter"
      className="bg-[#292329] text-[#F5EBDD] py-16 sm:py-24 border-b border-[#C5A46D]/20"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{heading.kicker}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-5xl text-balance">
            {heading.title}
          </h2>
        </div>

        {/* Interactive Vintage Cream Envelope & Blooming Letter Stage */}
        <div
          ref={stageRef}
          className="relative mt-10 flex min-h-[540px] sm:min-h-[620px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#C5A46D]/45 px-4 py-12 sm:px-10 sm:py-16 shadow-2xl select-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 42%, #FBF5EC 0%, #F5EBDD 54%, #E8D6BE 100%)',
          }}
        >
          {/* Vintage Cream Paper Grain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                'radial-gradient(rgba(41, 35, 41, 0.065) 1px, transparent 0), radial-gradient(rgba(113, 63, 80, 0.045) 1px, transparent 0)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px',
            }}
          />

          {/* Botanical Margin Etching Frame */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 660"
            preserveAspectRatio="none"
            className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-[1600ms] ${
              flowersBloomed ? 'opacity-30' : 'opacity-[0.12]'
            }`}
          >
            <rect
              x="20"
              y="20"
              width="960"
              height="620"
              rx="14"
              fill="none"
              stroke="#C5A46D"
              strokeWidth="1.2"
            />
            <rect
              x="28"
              y="28"
              width="944"
              height="604"
              rx="10"
              fill="none"
              stroke="#D4B888"
              strokeWidth="0.7"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Scoped Floating Petals Layer */}
          <canvas
            ref={petalCanvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          />

          {/* Gradual Blooming Corner Botanical Clusters */}
          <BloomingFloralCluster
            bloomed={flowersBloomed}
            delayMs={80}
            palette="rose"
            className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-6 z-20 h-36 w-36 sm:h-52 sm:w-52 md:h-60 md:w-60"
          />
          <BloomingFloralCluster
            bloomed={flowersBloomed}
            delayMs={300}
            mirror
            palette="lavender"
            className="absolute -bottom-6 -right-6 sm:-bottom-8 sm:-right-6 z-20 h-36 w-36 sm:h-52 sm:w-52 md:h-60 md:w-60"
          />
          <BloomingFloralCluster
            bloomed={flowersBloomed}
            delayMs={520}
            palette="peach"
            className="absolute -top-8 -left-8 sm:-top-10 sm:-left-8 z-20 h-32 w-32 sm:h-48 sm:w-48 rotate-90 opacity-90"
          />
          <BloomingFloralCluster
            bloomed={flowersBloomed}
            delayMs={740}
            mirror
            palette="rose"
            className="absolute -top-8 -right-8 sm:-top-10 sm:-right-8 z-20 h-32 w-32 sm:h-48 sm:w-48 -rotate-90 opacity-90"
          />

          {/* Flying Colorful Butterflies */}
          {flowersBloomed && !reducedMotion && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {BUTTERFLIES.map((bf) => (
                <div
                  key={bf.id}
                  className={`absolute left-0 ${bf.flightClass}`}
                  style={{
                    top: `${bf.topPercent}%`,
                    animationDelay: `${bf.delayMs}ms`,
                    opacity: 0,
                  }}
                >
                  <ButterflySvg
                    wingLight={bf.wingLight}
                    wingDark={bf.wingDark}
                    accent={bf.accent}
                    size={bf.size}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Closed Instruction Prompt */}
          {!letterUnfolded && (
            <div
              className={`relative z-30 mb-7 text-center transition-all duration-700 ${
                isOpened
                  ? 'opacity-0 -translate-y-3 pointer-events-none'
                  : 'opacity-100 translate-y-0'
              }`}
            >
              <p className="font-display text-2xl sm:text-3xl font-semibold tracking-wide text-[#292329] text-balance">
                {envInstruction}
              </p>
              <p className="mt-1.5 text-xs tracking-[0.14em] uppercase text-[#713F50]">
                {envTapPrompt}
              </p>
            </div>
          )}

          {/* Physical 3D Sealed Vintage Envelope */}
          <div
            className={`relative z-30 transition-all duration-[850ms] ease-out ${envelopeTranslateClass} ${
              !isOpened ? 'animate-float-slow' : ''
            }`}
            style={{ perspective: '1200px' }}
          >
            <button
              type="button"
              onClick={handleOpenEnvelope}
              disabled={isOpened}
              aria-label={`${tEnv.instruction} — ${tEnv.tapPrompt}`}
              className={`group relative block w-[264px] sm:w-[324px] aspect-[1.42/1] text-start transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#713F50] ${
                !isOpened
                  ? 'cursor-pointer hover:-translate-y-1.5 hover:scale-[1.025] active:scale-[0.98]'
                  : 'cursor-default'
              }`}
            >
              <div
                aria-hidden="true"
                className="absolute -inset-x-3 -bottom-4 h-9 rounded-full bg-[#292329]/20 blur-xl transition-transform duration-300 group-hover:scale-105"
              />

              <div
                className="relative h-full w-full overflow-visible rounded-[10px] border border-[#C5A46D]/55 shadow-[0_20px_48px_-14px_rgba(41,35,41,0.28)]"
                style={{
                  background: 'linear-gradient(155deg, #FBF5EC 0%, #EFE1CE 100%)',
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-1.5 rounded-[7px] border border-[#C5A46D]/35 opacity-85"
                  style={{
                    background: 'radial-gradient(circle at 50% 25%, #E9D7BE 0%, #DFC8A8 100%)',
                  }}
                />

                {/* Emerging Letter Sheet inside Envelope Pocket */}
                <div
                  aria-hidden={!letterSlid}
                  className={`absolute inset-x-3 top-2 bottom-3 rounded-[6px] border border-[#C5A46D]/55 bg-[#FBF5EC] shadow-md transition-all duration-[850ms] ease-out ${
                    letterUnfolded
                      ? 'opacity-0 scale-105 -translate-y-44'
                      : letterSlid
                        ? 'z-20 -translate-y-[66%] scale-[1.03] opacity-100'
                        : 'z-10 translate-y-1 scale-95 opacity-95'
                  }`}
                >
                  <div className="flex h-full flex-col items-center justify-start px-4 pt-4 text-center">
                    <div className="mb-2 h-[1px] w-16 bg-[#C5A46D]/55" />
                    <p className="max-w-full truncate font-display text-sm sm:text-base font-semibold text-[#713F50]">
                      {tEnv.dear} {recipientName}
                    </p>
                    <p className="mt-1 text-[10px] tracking-[0.16em] uppercase text-[#713F50]/80">
                      {tEnv.birthdayWishTag}
                    </p>
                  </div>
                </div>

                {/* Front Envelope Pocket Flaps */}
                <svg
                  viewBox="0 0 332 234"
                  className="pointer-events-none relative z-20 h-full w-full rounded-[10px]"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="ch9LeftFlap" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FAF3E6" />
                      <stop offset="100%" stopColor="#EAD9C0" />
                    </linearGradient>
                    <linearGradient id="ch9RightFlap" x1="1" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F8EEE0" />
                      <stop offset="100%" stopColor="#E9D6BB" />
                    </linearGradient>
                    <linearGradient id="ch9BottomFlap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBF5EC" />
                      <stop offset="100%" stopColor="#EFE0CA" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,0 166,128 0,234" fill="url(#ch9LeftFlap)" stroke="#C5A46D" strokeOpacity="0.65" strokeWidth="1" />
                  <polygon points="332,0 166,128 332,234" fill="url(#ch9RightFlap)" stroke="#C5A46D" strokeOpacity="0.65" strokeWidth="1" />
                  <polygon points="0,234 166,112 332,234" fill="url(#ch9BottomFlap)" stroke="#C5A46D" strokeOpacity="0.65" strokeWidth="1.2" />
                  <path d="M18 214 C26 202, 40 198, 52 204" stroke="#C5A46D" strokeWidth="1.2" fill="none" opacity="0.7" />
                  <circle cx="24" cy="206" r="2.2" fill="#D9A5AE" opacity="0.8" />
                  <path d="M314 214 C306 202, 292 198, 280 204" stroke="#C5A46D" strokeWidth="1.2" fill="none" opacity="0.7" />
                  <circle cx="308" cy="206" r="2.2" fill="#D9A5AE" opacity="0.8" />
                </svg>

                {/* Top Hinged Flap (3D rotateX open) */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[58%] transition-transform duration-[700ms] ease-in-out ${
                    flapOpen ? 'z-0' : 'z-30'
                  }`}
                  style={{
                    transformOrigin: 'top center',
                    transformStyle: 'preserve-3d',
                    transform: flapOpen ? 'rotateX(176deg)' : 'rotateX(0deg)',
                  }}
                >
                  <svg
                    viewBox="0 0 332 136"
                    className="absolute inset-0 h-full w-full drop-shadow-[0_4px_10px_rgba(41,35,41,0.12)]"
                    preserveAspectRatio="none"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <defs>
                      <linearGradient id="ch9TopFlap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FBF5EC" />
                        <stop offset="100%" stopColor="#EFE0C9" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,4 C0,1.5 2,0 5,0 L327,0 C330,0 332,1.5 332,4 L173,129 C169,132 163,132 159,129 Z"
                      fill="url(#ch9TopFlap)"
                      stroke="#C5A46D"
                      strokeOpacity="0.65"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M22,8 L166,118 L310,8"
                      fill="none"
                      stroke="#C5A46D"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                  </svg>

                  <svg
                    viewBox="0 0 332 136"
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateX(180deg)',
                    }}
                  >
                    <path
                      d="M0,4 L332,4 L173,129 C169,132 163,132 159,129 Z"
                      fill="#F2E2CC"
                      stroke="#C5A46D"
                      strokeOpacity="0.6"
                      strokeWidth="1"
                    />
                    <circle cx="110" cy="40" r="5" fill="#D9A5AE" fillOpacity="0.6" />
                    <circle cx="222" cy="40" r="5" fill="#D9A5AE" fillOpacity="0.6" />
                    <circle cx="166" cy="72" r="6" fill="#C5A46D" fillOpacity="0.5" />
                  </svg>
                </div>

                {/* Deep Burgundy Wax Seal */}
                <div
                  className={`absolute left-1/2 top-[52%] z-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                    flapOpen ? 'scale-125 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
                  }`}
                >
                  <div
                    className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-[0_6px_16px_rgba(41,35,41,0.38)] ring-2 ring-[#C5A46D]/55 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background:
                        'radial-gradient(circle at 32% 30%, #9E5269 0%, #713F50 60%, #4E2735 100%)',
                    }}
                  >
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#F5EBDD]/45">
                      <span className="font-display text-lg sm:text-xl font-bold text-[#F5EBDD] drop-shadow-sm">
                        {monogram}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Unfolded Personalized Vintage Birthday Letter Card */}
          {letterSlid && (
            <div
              className={`relative z-40 flex w-full items-center justify-center transition-all duration-[900ms] ease-out ${
                letterUnfolded
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 translate-y-12 scale-[0.78] pointer-events-none h-0 overflow-hidden'
              }`}
              style={{ perspective: '1400px' }}
            >
              <article
                className="relative w-full max-w-[540px] overflow-hidden rounded-xl border border-[#C5A46D]/55 bg-[#FBF5EC] p-6 sm:p-10 text-center shadow-[0_28px_64px_-18px_rgba(41,35,41,0.28)] transition-transform duration-[900ms] ease-out"
                style={{
                  transformOrigin: 'bottom center',
                  transform: letterUnfolded ? 'rotateX(0deg)' : 'rotateX(-44deg)',
                  backgroundImage:
                    'radial-gradient(circle at 50% 0%, rgba(217,165,174,0.16) 0%, transparent 55%), linear-gradient(180deg, #FBF5EC 0%, #F5EBDD 100%)',
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-3 rounded-lg border border-[#C5A46D]/40"
                />

                {/* Recipient Portrait Vignette */}
                <div className="relative mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-full border-2 border-[#C5A46D] bg-[#F5EBDD] shadow-md">
                  {edition.heroImageUrl && !photoError ? (
                    <img
                      src={edition.heroImageUrl}
                      alt={recipientName}
                      referrerPolicy="no-referrer"
                      onError={() => setPhotoError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-[#713F50]">
                      {monogram}
                    </div>
                  )}
                </div>

                <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-[#713F50]/85">
                  {tEnv.birthdayWishTag}
                  {edition.age > 0 ? ` · ${edition.age}` : ''}
                </p>

                <h3 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#292329] text-balance">
                  {letterHeadline}
                </h3>

                <div className="mx-auto my-3.5 h-[1px] w-20 bg-gradient-to-r from-transparent via-[#C5A46D] to-transparent" />

                <div className="mx-auto max-w-[44ch] text-sm sm:text-base text-[#292329]/90 text-start sm:text-center">
                  <RichTextDisplay text={letterBody} />
                </div>

                {senderName && (
                  <p className="mt-5 font-display text-base sm:text-lg italic text-[#713F50]">
                    — {senderName}
                  </p>
                )}

                <div className="mt-6 flex justify-center border-t border-[#C5A46D]/40 pt-4">
                  <button
                    type="button"
                    onClick={handleReseal}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#713F50] transition-colors hover:bg-[#F5EBDD] hover:text-[#5B303F] min-h-[36px]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{tLetter.sealEnvelope}</span>
                  </button>
                </div>
              </article>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
