import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { DEFAULT_EDITION } from '../data/defaultExperience.ts';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type {
  BirthdayEdition,
  Language,
  MagazineColorTheme,
  MagazineConfig,
  MagazineCustomPage,
} from '../types/birthday.ts';
import { RichTextDisplay } from './RichTextContent.tsx';

interface BirthdayMagazineProps {
  edition: BirthdayEdition;
  lang: Language;
  overrideMagazine?: MagazineConfig;
  compactPreview?: boolean;
  awaitingCompletion?: boolean;
  featuresUnlocked?: boolean;
  onFinishMagazine?: () => void;
}

interface ThemeTokens {
  paperBg: string;
  paperAltBg: string;
  ink: string;
  mutedInk: string;
  accent: string;
  accentText: string;
  border: string;
  coverBg: string;
  coverInk: string;
  qrDark: string;
  qrLight: string;
  edgeCream: string;
  edgeShadow: string;
}

const MAGAZINE_THEMES: Record<MagazineColorTheme, ThemeTokens> = {
  'ivory-gold': {
    paperBg: '#F5EBDD',
    paperAltBg: '#EFE2CF',
    ink: '#292329',
    mutedInk: '#5C4F57',
    accent: '#C5A46D',
    accentText: '#713F50',
    border: 'rgba(197, 164, 109, 0.45)',
    coverBg: '#292329',
    coverInk: '#F5EBDD',
    qrDark: '#292329',
    qrLight: '#F5EBDD',
    edgeCream: '#EDE0CE',
    edgeShadow: '#C7B59D',
  },
  'midnight-rose': {
    paperBg: '#292329',
    paperAltBg: '#1E191E',
    ink: '#F5EBDD',
    mutedInk: '#D9A5AE',
    accent: '#D9A5AE',
    accentText: '#D9A5AE',
    border: 'rgba(217, 165, 174, 0.35)',
    coverBg: '#1E191E',
    coverInk: '#F5EBDD',
    qrDark: '#292329',
    qrLight: '#F5EBDD',
    edgeCream: '#3B323B',
    edgeShadow: '#1B161B',
  },
  'royal-cream': {
    paperBg: '#FBF5EC',
    paperAltBg: '#F5EBDD',
    ink: '#292329',
    mutedInk: '#713F50',
    accent: '#713F50',
    accentText: '#713F50',
    border: 'rgba(113, 63, 80, 0.32)',
    coverBg: '#713F50',
    coverInk: '#F5EBDD',
    qrDark: '#713F50',
    qrLight: '#FBF5EC',
    edgeCream: '#EDE1D0',
    edgeShadow: '#C7B6A2',
  },
  'rose-editorial': {
    paperBg: '#F8ECEE',
    paperAltBg: '#F2DFE4',
    ink: '#292329',
    mutedInk: '#713F50',
    accent: '#D9A5AE',
    accentText: '#713F50',
    border: 'rgba(217, 165, 174, 0.42)',
    coverBg: '#3D232D',
    coverInk: '#F5EBDD',
    qrDark: '#292329',
    qrLight: '#F8ECEE',
    edgeCream: '#EEDCE0',
    edgeShadow: '#C8AEB5',
  },
};

// Subtle inline SVG paper grain data URI (no external network requests)
const PAPER_GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function BirthdayMagazine({
  edition,
  lang,
  overrideMagazine,
  compactPreview = false,
  awaitingCompletion = false,
  featuresUnlocked = true,
  onFinishMagazine,
}: BirthdayMagazineProps) {
  const mag: MagazineConfig = overrideMagazine || edition.magazine || DEFAULT_EDITION.magazine!;
  const theme = MAGAZINE_THEMES[mag.colorTheme] || MAGAZINE_THEMES['ivory-gold'];
  const t = UI_STRINGS[lang].magazine;
  const copy = pickChapterCopy(
    edition.chapterCopy?.magazine,
    { kicker: t.kicker, title: t.title, subtitle: t.subtitle },
    lang,
  );
  const isRtl = lang === 'ar';

  const { activeClipId, playMemoryClip, playChime, isPlaying, togglePlay } = useAudio();

  const customPagesMap = useMemo(() => {
    const map = new Map<string, MagazineCustomPage>();
    for (const cp of mag.customPages || []) {
      map.set(cp.id, cp);
    }
    return map;
  }, [mag.customPages]);

  const pagesList = useMemo(() => {
    const validStandard = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    const rawOrder =
      Array.isArray(mag.pageOrder) && mag.pageOrder.length > 0
        ? mag.pageOrder
        : ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

    const filtered: string[] = [];
    for (const key of rawOrder) {
      if ((validStandard.has(key) || customPagesMap.has(key)) && !filtered.includes(key)) {
        filtered.push(key);
      }
    }
    for (const cid of customPagesMap.keys()) {
      if (!filtered.includes(cid)) {
        const backIdx = filtered.indexOf('p8');
        if (backIdx >= 0) filtered.splice(backIdx, 0, cid);
        else filtered.push(cid);
      }
    }
    for (const std of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']) {
      if (!filtered.includes(std)) {
        filtered.push(std);
      }
    }
    if (filtered.length % 2 === 1) {
      const backIdx = filtered.indexOf('p8');
      if (backIdx >= 0) filtered.splice(backIdx, 0, '__blank');
      else filtered.push('__blank');
    }
    return filtered;
  }, [customPagesMap, mag.pageOrder]);

  const sheetCount = Math.max(4, Math.ceil(pagesList.length / 2));
  const maxMobilePos = Math.max(7, pagesList.length - 1);

  // Continuous floating-point book positions:
  // Desktop: 0.0 (Front Cover) .. sheetCount (Back Cover), with double-sided physical sheets
  // Mobile: 0.0 (Page 1) .. maxMobilePos (Back Cover), single-page physical book turning
  const [desktopPos, setDesktopPos] = useState(0);
  const [mobilePos, setMobilePos] = useState(0);
  const [hasReachedBackCover, setHasReachedBackCover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTilt, setHoverTilt] = useState({ rx: 3.5, ry: 0 });
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [customQrUrls, setCustomQrUrls] = useState<Record<string, string>>({});
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const sectionRef = useRef<HTMLElement | null>(null);
  const desktopBookRef = useRef<HTMLDivElement | null>(null);
  const mobileBookRef = useRef<HTMLDivElement | null>(null);

  const desktopPosRef = useRef(0);
  const mobilePosRef = useRef(0);
  const desktopAnimRef = useRef<number | null>(null);
  const mobileAnimRef = useRef<number | null>(null);
  const isDesktopAnimatingRef = useRef(false);
  const isMobileAnimatingRef = useRef(false);

  const dragRef = useRef<{
    mode: 'desktop' | 'mobile';
    pointerId: number;
    startX: number;
    lastX: number;
    lastTime: number;
    velocityX: number;
    startPos: number;
    direction: 1 | -1; // +1 turning forward, -1 turning backward
    hasMoved: boolean;
    pageWidth: number;
    sideClicked: 'forward' | 'backward';
  } | null>(null);

  useEffect(() => {
    desktopPosRef.current = desktopPos;
  }, [desktopPos]);

  useEffect(() => {
    mobilePosRef.current = mobilePos;
  }, [mobilePos]);

  useEffect(() => {
    if (!mag.musicPage.showQr || !mag.musicPage.qrUrl) {
      setQrDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(mag.musicPage.qrUrl, {
      margin: 1,
      width: 150,
      color: {
        dark: theme.qrDark,
        light: theme.qrLight,
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [mag.musicPage.qrUrl, mag.musicPage.showQr, theme.qrDark, theme.qrLight]);

  useEffect(() => {
    const qrTargets = (mag.customPages || []).filter((p) => p.showQr && p.qrUrl);
    if (qrTargets.length === 0) {
      setCustomQrUrls({});
      return;
    }
    let active = true;
    Promise.all(
      qrTargets.map(async (cp) => {
        try {
          const url = await QRCode.toDataURL(cp.qrUrl!, {
            margin: 1,
            width: 140,
            color: { dark: theme.qrDark, light: theme.qrLight },
          });
          return [cp.id, url] as const;
        } catch {
          return [cp.id, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const [id, url] of pairs) {
        if (url) next[id] = url;
      }
      setCustomQrUrls(next);
    });
    return () => {
      active = false;
    };
  }, [mag.customPages, theme.qrDark, theme.qrLight]);

  useEffect(() => {
    setDesktopPos((p) => clamp(p, 0, sheetCount));
    setMobilePos((p) => clamp(p, 0, maxMobilePos));
  }, [maxMobilePos, sheetCount]);

  useEffect(() => {
    return () => {
      if (desktopAnimRef.current) cancelAnimationFrame(desktopAnimRef.current);
      if (mobileAnimRef.current) cancelAnimationFrame(mobileAnimRef.current);
    };
  }, []);

  const prefersReducedMotion = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const animateDesktopTo = useCallback(
    (rawTarget: number, durationMs = 640) => {
      const target = clamp(Math.round(rawTarget), 0, sheetCount);
      const start = desktopPosRef.current;

      if (desktopAnimRef.current) {
        cancelAnimationFrame(desktopAnimRef.current);
        desktopAnimRef.current = null;
      }

      if (prefersReducedMotion() || Math.abs(target - start) < 0.002) {
        desktopPosRef.current = target;
        setDesktopPos(target);
        isDesktopAnimatingRef.current = false;
        return;
      }

      isDesktopAnimatingRef.current = true;
      const startTime = performance.now();
      const distance = Math.abs(target - start);
      const scaledDuration = Math.max(240, Math.min(820, durationMs * Math.max(0.45, Math.min(1.25, distance))));

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const p = clamp(elapsed / scaledDuration, 0, 1);
        // Smooth physical paper deceleration curve
        const eased = 1 - Math.pow(1 - p, 3);
        const nextPos = start + (target - start) * eased;
        desktopPosRef.current = nextPos;
        setDesktopPos(nextPos);
        if (p < 1) {
          desktopAnimRef.current = requestAnimationFrame(tick);
        } else {
          desktopPosRef.current = target;
          setDesktopPos(target);
          isDesktopAnimatingRef.current = false;
          desktopAnimRef.current = null;
        }
      };

      desktopAnimRef.current = requestAnimationFrame(tick);
    },
    [prefersReducedMotion, sheetCount],
  );

  const animateMobileTo = useCallback(
    (rawTarget: number, durationMs = 540) => {
      const target = clamp(Math.round(rawTarget), 0, maxMobilePos);
      const start = mobilePosRef.current;

      if (mobileAnimRef.current) {
        cancelAnimationFrame(mobileAnimRef.current);
        mobileAnimRef.current = null;
      }

      if (prefersReducedMotion() || Math.abs(target - start) < 0.002) {
        mobilePosRef.current = target;
        setMobilePos(target);
        isMobileAnimatingRef.current = false;
        return;
      }

      isMobileAnimatingRef.current = true;
      const startTime = performance.now();
      const distance = Math.abs(target - start);
      const scaledDuration = Math.max(220, Math.min(720, durationMs * Math.max(0.45, Math.min(1.2, distance))));

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const p = clamp(elapsed / scaledDuration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const nextPos = start + (target - start) * eased;
        mobilePosRef.current = nextPos;
        setMobilePos(nextPos);
        if (p < 1) {
          mobileAnimRef.current = requestAnimationFrame(tick);
        } else {
          mobilePosRef.current = target;
          setMobilePos(target);
          isMobileAnimatingRef.current = false;
          mobileAnimRef.current = null;
        }
      };

      mobileAnimRef.current = requestAnimationFrame(tick);
    },
    [maxMobilePos, prefersReducedMotion],
  );

  const goDesktopNext = useCallback(() => {
    if (isDesktopAnimatingRef.current || dragRef.current) return;
    const current = Math.round(desktopPosRef.current);
    if (current >= sheetCount) return;
    animateDesktopTo(current + 1);
  }, [animateDesktopTo, sheetCount]);

  const goDesktopPrev = useCallback(() => {
    if (isDesktopAnimatingRef.current || dragRef.current) return;
    const current = Math.round(desktopPosRef.current);
    if (current <= 0) return;
    animateDesktopTo(current - 1);
  }, [animateDesktopTo]);

  const jumpDesktopSpread = useCallback(
    (targetSpread: number) => {
      if (isDesktopAnimatingRef.current || dragRef.current) return;
      const current = Math.round(desktopPosRef.current);
      if (current === targetSpread) return;
      animateDesktopTo(targetSpread, Math.abs(targetSpread - current) > 1 ? 760 : 620);
    },
    [animateDesktopTo],
  );

  const goMobileNext = useCallback(() => {
    if (isMobileAnimatingRef.current || dragRef.current) return;
    const current = Math.round(mobilePosRef.current);
    if (current >= maxMobilePos) return;
    animateMobileTo(current + 1);
  }, [animateMobileTo, maxMobilePos]);

  const goMobilePrev = useCallback(() => {
    if (isMobileAnimatingRef.current || dragRef.current) return;
    const current = Math.round(mobilePosRef.current);
    if (current <= 0) return;
    animateMobileTo(current - 1);
  }, [animateMobileTo]);

  // Keyboard arrow navigation when magazine is visible on screen (or focused)
  const handleKeyNavigation = useCallback(
    (key: string) => {
      const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
      if (key === 'ArrowRight') {
        if (isRtl) {
          if (isMobileViewport) goMobilePrev();
          else goDesktopPrev();
        } else {
          if (isMobileViewport) goMobileNext();
          else goDesktopNext();
        }
        return true;
      }
      if (key === 'ArrowLeft') {
        if (isRtl) {
          if (isMobileViewport) goMobileNext();
          else goDesktopNext();
        } else {
          if (isMobileViewport) goMobilePrev();
          else goDesktopPrev();
        }
        return true;
      }
      if (key === 'Home') {
        if (isMobileViewport) animateMobileTo(0);
        else animateDesktopTo(0);
        return true;
      }
      if (key === 'End') {
        if (isMobileViewport) animateMobileTo(maxMobilePos);
        else animateDesktopTo(sheetCount);
        return true;
      }
      return false;
    },
    [animateDesktopTo, animateMobileTo, goDesktopNext, goDesktopPrev, goMobileNext, goMobilePrev, isRtl, maxMobilePos, sheetCount],
  );

  useEffect(() => {
    if (compactPreview) return;
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable)
      ) {
        return;
      }
      // Only handle global arrow keys if magazine section is prominently in view
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;
      if (!inView) return;
      if (handleKeyNavigation(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [compactPreview, handleKeyNavigation]);

  // Unified pointer drag / click physics for both Desktop and Mobile books
  const beginBookPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: 'desktop' | 'mobile',
    explicitSide?: 'forward' | 'backward',
  ) => {
    // Allow interactive controls (Play Song button, links, etc.) inside pages to work normally
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) {
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const containerEl = mode === 'desktop' ? desktopBookRef.current : mobileBookRef.current;
    if (!containerEl) return;

    if (mode === 'desktop' && isDesktopAnimatingRef.current) return;
    if (mode === 'mobile' && isMobileAnimatingRef.current) return;

    const rect = containerEl.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const isLeftHalf = relX < rect.width / 2;

    const sideClicked: 'forward' | 'backward' =
      explicitSide ||
      (isRtl ? (isLeftHalf ? 'forward' : 'backward') : isLeftHalf ? 'backward' : 'forward');

    const currentPos = mode === 'desktop' ? desktopPosRef.current : mobilePosRef.current;
    const maxPos = mode === 'desktop' ? sheetCount : maxMobilePos;
    const roundedPos = Math.round(currentPos);

    // Determine single-leaf drag boundaries
    let direction: 1 | -1 = sideClicked === 'forward' ? 1 : -1;
    if (mode === 'desktop') {
      if (roundedPos === 0) direction = 1;
      else if (roundedPos === sheetCount) direction = -1;
    } else {
      if (roundedPos === 0 && sideClicked === 'backward') return;
      if (roundedPos === maxPos && sideClicked === 'forward') return;
    }

    if (direction === 1 && roundedPos >= maxPos) return;
    if (direction === -1 && roundedPos <= 0) return;

    const pageWidth = mode === 'desktop' ? rect.width / 2 : rect.width;

    containerEl.setPointerCapture(e.pointerId);
    setIsDragging(true);

    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      lastTime: performance.now(),
      velocityX: 0,
      startPos: roundedPos,
      direction,
      hasMoved: false,
      pageWidth: Math.max(180, pageWidth),
      sideClicked,
    };
  };

  const moveBookPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) {
      // Subtle viewing-angle hover parallax when idle on desktop
      if (
        !drag &&
        !prefersReducedMotion() &&
        e.pointerType === 'mouse' &&
        desktopBookRef.current &&
        e.currentTarget === desktopBookRef.current
      ) {
        const rect = desktopBookRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setHoverTilt({
          rx: clamp(3.5 - ny * 2.0, 1.5, 6.0),
          ry: clamp(nx * 2.4, -2.5, 2.5),
        });
      }
      return;
    }

    const dxFromStart = e.clientX - drag.startX;
    if (!drag.hasMoved && Math.abs(dxFromStart) > 6) {
      drag.hasMoved = true;
    }
    if (!drag.hasMoved) return;

    const now = performance.now();
    const dt = Math.max(8, now - drag.lastTime);
    drag.velocityX = (e.clientX - drag.lastX) / dt; // px/ms
    drag.lastX = e.clientX;
    drag.lastTime = now;

    // Convert drag delta into continuous sheet progress
    // In LTR: dragging left (dx < 0) moves forward (+progress); dragging right (dx > 0) moves backward (-progress)
    // In RTL: dragging right (dx > 0) moves forward (+progress); dragging left (dx < 0) moves backward (-progress)
    const directionalDelta = isRtl ? dxFromStart / drag.pageWidth : -dxFromStart / drag.pageWidth;

    if (drag.mode === 'desktop') {
      const nextRaw = drag.startPos + directionalDelta;
      const minBound = drag.direction === 1 ? drag.startPos : Math.max(0, drag.startPos - 1);
      const maxBound = drag.direction === 1 ? Math.min(sheetCount, drag.startPos + 1) : drag.startPos;
      const clamped = clamp(nextRaw, minBound, maxBound);
      desktopPosRef.current = clamped;
      setDesktopPos(clamped);
    } else {
      const nextRaw = drag.startPos + directionalDelta;
      const minBound = drag.direction === 1 ? drag.startPos : Math.max(0, drag.startPos - 1);
      const maxBound = drag.direction === 1 ? Math.min(maxMobilePos, drag.startPos + 1) : drag.startPos;
      const clamped = clamp(nextRaw, minBound, maxBound);
      mobilePosRef.current = clamped;
      setMobilePos(clamped);
    }
  };

  const endBookPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    dragRef.current = null;
    setIsDragging(false);

    if (!drag.hasMoved) {
      // Pure click or tap: turn one step cleanly
      const target =
        drag.sideClicked === 'forward' ? drag.startPos + 1 : drag.startPos - 1;
      if (drag.mode === 'desktop') animateDesktopTo(target);
      else animateMobileTo(target);
      return;
    }

    // Decide whether to complete the turn or spring back based on progress & flick velocity
    const currentPos = drag.mode === 'desktop' ? desktopPosRef.current : mobilePosRef.current;
    const progressDelta = currentPos - drag.startPos;
    const directionalVel = isRtl ? drag.velocityX : -drag.velocityX; // positive = flicking forward

    let targetPos = drag.startPos;
    if (drag.direction === 1) {
      if (progressDelta > 0.3 || directionalVel > 0.35) {
        targetPos = drag.startPos + 1;
      }
    } else {
      if (progressDelta < -0.3 || directionalVel < -0.35) {
        targetPos = drag.startPos - 1;
      }
    }

    if (drag.mode === 'desktop') animateDesktopTo(targetPos, 460);
    else animateMobileTo(targetPos, 420);
  };

  const markFailed = (key: string) => {
    setFailedUrls((prev) => ({ ...prev, [key]: true }));
  };

  const magSongClipId = `magazine-song-${edition.slug}`;
  const isMagazineSongPlaying = mag.musicPage.audioUrl
    ? activeClipId === magSongClipId
    : isPlaying;

  const toggleMagazineSong = () => {
    if (mag.musicPage.audioUrl) {
      playMemoryClip(mag.musicPage.audioUrl, magSongClipId);
    } else {
      togglePlay();
    }
  };

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(`${edition.birthdayDate}T12:00:00`));
    } catch {
      return edition.birthdayDate;
    }
  }, [edition.birthdayDate, lang]);

  // Paper surface helper style with organic fiber texture and optional per-page tint
  const getPaperTextureStyle = (pageKey?: string): React.CSSProperties => {
    const customPage = pageKey ? customPagesMap.get(pageKey) : undefined;
    const overrideBg = customPage?.bgColor || (pageKey ? mag.pageBackgrounds?.[pageKey] : undefined);
    return {
      backgroundColor: overrideBg || theme.paperBg,
      color: theme.ink,
      backgroundImage: `${PAPER_GRAIN_SVG}, radial-gradient(rgba(41,35,41,0.025) 1px, transparent 0)`,
      backgroundSize: '160px 160px, 24px 24px',
    };
  };

  // Determine which side of a page touches the physical central spine
  const getSpineSideForPage = (pageNum: number, singleMobile = false): 'left' | 'right' => {
    if (singleMobile) {
      return isRtl ? 'right' : 'left';
    }
    const isFrontFace = pageNum % 2 === 0;
    if (isRtl) return isFrontFace ? 'right' : 'left';
    return isFrontFace ? 'left' : 'right';
  };

  const resolvedSpreadMemories = useMemo(() => {
    const base = mag.memorySpreadItems || [];
    const flagged = (edition.memories || [])
      .filter((m) => m.showInMagazine && m.type === 'photo' && m.mediaUrl)
      .map((m) => ({
        id: `album-spread-${m.id}`,
        imageUrl: m.mediaUrl,
        title: m.title,
        caption: m.caption,
        date: m.date,
      }));
    const seen = new Set(base.map((b) => b.imageUrl));
    return [...base, ...flagged.filter((f) => !seen.has(f.imageUrl))];
  }, [edition.memories, mag.memorySpreadItems]);

  // Renders any page index from pagesList with spine curvature shading and content intact
  const renderPage = (pageNum: number, singleMobile = false) => {
    const pageKey = pagesList[pageNum] || 'p8';
    const customPage = customPagesMap.get(pageKey);
    const spineSide = getSpineSideForPage(pageNum, singleMobile);
    const isCover = pageKey === 'p1' || pageKey === 'p8';
    const paperTextureStyle = getPaperTextureStyle(pageKey);
    const displayNum = String(pageNum + 1).padStart(2, '0');

    const spineCurvatureOverlay = !isCover ? (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-20 w-10"
        style={{
          [spineSide]: 0,
          background:
            spineSide === 'left'
              ? 'linear-gradient(to right, rgba(30,25,30,0.28) 0%, rgba(30,25,30,0.10) 20%, rgba(255,255,255,0.16) 46%, rgba(0,0,0,0.03) 72%, transparent 100%)'
              : 'linear-gradient(to left, rgba(30,25,30,0.28) 0%, rgba(30,25,30,0.10) 20%, rgba(255,255,255,0.16) 46%, rgba(0,0,0,0.03) 72%, transparent 100%)',
        }}
      />
    ) : (
      // Hardcover spine hinge groove
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-20 w-4"
        style={{
          [spineSide]: 0,
          background:
            spineSide === 'left'
              ? 'linear-gradient(to right, rgba(0,0,0,0.42) 0%, rgba(197,164,109,0.24) 55%, rgba(0,0,0,0.22) 72%, transparent 100%)'
              : 'linear-gradient(to left, rgba(0,0,0,0.42) 0%, rgba(197,164,109,0.24) 55%, rgba(0,0,0,0.22) 72%, transparent 100%)',
        }}
      />
    );

    const outerEdgeSide = spineSide === 'left' ? 'right' : 'left';
    const outerCornerHint = !isCover ? (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 z-20 h-10 w-10 opacity-45"
        style={{
          [outerEdgeSide]: 0,
          background:
            outerEdgeSide === 'right'
              ? 'radial-gradient(circle at 100% 100%, rgba(197,164,109,0.28) 0%, transparent 70%)'
              : 'radial-gradient(circle at 0% 100%, rgba(197,164,109,0.28) 0%, transparent 70%)',
        }}
      />
    ) : null;

    let innerContent: React.ReactNode;

    if (pageKey === '__blank') {
      innerContent = (
        <div
          className="flex h-full w-full flex-col items-center justify-between p-8 text-center"
          style={paperTextureStyle}
        >
          <p className="text-[10px] tracking-[0.22em] uppercase opacity-50" style={{ color: theme.mutedInk }}>
            {pickText(mag.masthead, lang)}
          </p>
          <div className="space-y-3 opacity-55">
            <div className="mx-auto h-px w-16" style={{ backgroundColor: theme.accent }} />
            <p className="font-display text-lg italic" style={{ color: theme.mutedInk }}>
              {pickText(edition.recipientName, lang)}
            </p>
          </div>
          <p className="text-[10px] tabular-nums opacity-50" style={{ color: theme.mutedInk }}>
            {displayNum}
          </p>
        </div>
      );
    } else if (customPage) {
      const cpClipId = `mag-custom-${customPage.id}`;
      const isCustomAudioPlaying = activeClipId === cpClipId;
      const cpQr = customQrUrls[customPage.id];
      innerContent = (
        <div
          className="flex h-full w-full flex-col justify-between p-5 sm:p-7"
          style={paperTextureStyle}
        >
          <div
            className="flex items-center justify-between text-[10px] tracking-widest uppercase"
            style={{ color: theme.mutedInk }}
          >
            <span>{pickText(mag.masthead, lang)}</span>
            <span className="tabular-nums">{displayNum}</span>
          </div>

          <div className="my-auto space-y-3 py-2">
            {customPage.subtitle && pickText(customPage.subtitle, lang) && (
              <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: theme.accentText }}>
                {pickText(customPage.subtitle, lang)}
              </p>
            )}
            <h3 className="font-display text-2xl font-semibold sm:text-3xl leading-tight">
              {pickText(customPage.title, lang)}
            </h3>

            {customPage.photos.length > 0 && (
              <div
                className={`grid gap-2.5 ${
                  customPage.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {customPage.photos.slice(0, 2).map((ph) => (
                  <figure key={ph.id}>
                    <div
                      className="aspect-[4/3] overflow-hidden rounded-sm border bg-black/5"
                      style={{ borderColor: theme.border }}
                    >
                      <img
                        src={ph.url}
                        alt={pickText(ph.caption, lang) || pickText(customPage.title, lang)}
                        referrerPolicy="no-referrer"
                        draggable={false}
                        className="h-full w-full object-cover select-none"
                      />
                    </div>
                    {ph.caption && pickText(ph.caption, lang) && (
                      <figcaption className="mt-1 text-[10px] italic truncate" style={{ color: theme.mutedInk }}>
                        {pickText(ph.caption, lang)}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            <div className="text-xs sm:text-sm" style={{ color: theme.ink }}>
              <RichTextDisplay text={pickText(customPage.body, lang)} compact />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {customPage.audioUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playMemoryClip(customPage.audioUrl!, cpClipId);
                  }}
                  className="relative z-30 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: theme.accent,
                    color: theme.accent === '#713F50' ? '#F5EBDD' : '#292329',
                  }}
                >
                  {isCustomAudioPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <span>
                    {isCustomAudioPlaying ? t.pauseSong : t.playSong}
                    {customPage.audioTitle ? ` · ${pickText(customPage.audioTitle, lang)}` : ''}
                  </span>
                </button>
              )}

              {customPage.showQr && cpQr && (
                <img
                  src={cpQr}
                  alt={t.scanQr}
                  draggable={false}
                  className="h-11 w-11 rounded border select-none"
                  style={{ borderColor: theme.border }}
                />
              )}
            </div>
          </div>

          <div
            className="border-t pt-2 text-[10px]"
            style={{ borderColor: theme.border, color: theme.mutedInk }}
          >
            {pickText(edition.recipientName, lang)}
          </div>
        </div>
      );
    } else {
      switch (pageKey) {
      // PAGE 1: FRONT COVER
      case 'p1':
        innerContent = (
          <div
            className="relative flex h-full w-full flex-col justify-between overflow-hidden p-6 sm:p-8"
            style={{ backgroundColor: theme.coverBg, color: theme.coverInk }}
          >
            {!failedUrls['mag-cover'] && mag.coverPhotoUrl && (
              <img
                src={mag.coverPhotoUrl}
                alt={pickText(edition.recipientName, lang)}
                referrerPolicy="no-referrer"
                onError={() => markFailed('mag-cover')}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover opacity-55 select-none"
              />
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1E191E]/85 via-[#292329]/35 to-[#1E191E]/95"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-3 border border-[#C5A46D]/50"
            />
            {/* Cover satin sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08]"
            />

            {/* Masthead */}
            <div className="relative z-10 text-center pt-2">
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#C5A46D]">
                {pickText(mag.issueLabel, lang)}
              </p>
              <h3 className="mt-1 font-display text-3xl font-bold tracking-[0.12em] text-[#F5EBDD] sm:text-5xl">
                {pickText(mag.masthead, lang)}
              </h3>
              <div className="mx-auto mt-2 h-px w-24 bg-[#C5A46D]/70" />
            </div>

            {/* Cover Star & Headlines */}
            <div className="relative z-10 space-y-3.5 pb-2">
              <div>
                <p className="text-xs font-medium text-[#D9A5AE] tabular-nums">
                  {formattedDate} · {edition.age}
                </p>
                <h4 className="mt-1 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-4xl leading-tight">
                  {pickText(edition.recipientName, lang)}
                </h4>
              </div>

              <div className="space-y-1.5 border-t border-[#C5A46D]/40 pt-3">
                {mag.coverHeadlines.map((hl, idx) => (
                  <p key={idx} className="text-xs sm:text-sm font-medium text-[#F5EBDD]/90 leading-snug">
                    {pickText(hl, lang)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );
        break;

      // PAGE 2: EDITORIAL COLLAGE
      case 'p2':
        innerContent = (
          <div
            className="flex h-full w-full flex-col justify-between p-5 sm:p-7"
            style={paperTextureStyle}
          >
            <div
              className="flex items-center justify-between text-[10px] tracking-widest uppercase"
              style={{ color: theme.mutedInk }}
            >
              <span>{pickText(mag.masthead, lang)}</span>
              <span className="tabular-nums">{displayNum}</span>
            </div>

            <div className="my-auto py-2">
              <p
                className="text-[11px] font-semibold tracking-wider uppercase"
                style={{ color: theme.accentText }}
              >
                {pickText(mag.issueLabel, lang)}
              </p>
              <h3 className="mt-1 font-display text-2xl font-semibold sm:text-3xl leading-tight">
                {pickText(mag.editorialTitle, lang)}
              </h3>

              {mag.collagePhotos.length === 0 ? (
                <div
                  className="mt-6 rounded-lg border border-dashed p-6 text-center text-xs"
                  style={{ borderColor: theme.border, color: theme.mutedInk }}
                >
                  {pickText(mag.editorialTitle, lang)}
                </div>
              ) : (
                <div className="mt-3.5 grid grid-cols-12 gap-3">
                  {mag.collagePhotos[0] && (
                    <figure className="col-span-7">
                      <div
                        className="aspect-[3/4] overflow-hidden rounded-sm border bg-black/5"
                        style={{ borderColor: theme.border }}
                      >
                        {!failedUrls[`col-0-${mag.collagePhotos[0].id}`] &&
                        mag.collagePhotos[0].imageUrl ? (
                          <img
                            src={mag.collagePhotos[0].imageUrl}
                            alt={pickText(mag.collagePhotos[0].caption, lang)}
                            referrerPolicy="no-referrer"
                            onError={() => markFailed(`col-0-${mag.collagePhotos[0].id}`)}
                            draggable={false}
                            className="h-full w-full object-cover select-none"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center p-2 text-center text-[10px]"
                            style={{ color: theme.mutedInk }}
                          >
                            {pickText(mag.collagePhotos[0].caption, lang)}
                          </div>
                        )}
                      </div>
                      <figcaption
                        className="mt-1 text-[10px] italic leading-tight"
                        style={{ color: theme.mutedInk }}
                      >
                        {pickText(mag.collagePhotos[0].caption, lang)}
                      </figcaption>
                    </figure>
                  )}

                  <div className="col-span-5 flex flex-col gap-2.5">
                    {mag.collagePhotos.slice(1, 3).map((col, idx) => (
                      <figure key={col.id}>
                        <div
                          className="aspect-[4/3] overflow-hidden rounded-sm border bg-black/5"
                          style={{ borderColor: theme.border }}
                        >
                          {!failedUrls[`col-${idx + 1}-${col.id}`] && col.imageUrl ? (
                            <img
                              src={col.imageUrl}
                              alt={pickText(col.caption, lang)}
                              referrerPolicy="no-referrer"
                              onError={() => markFailed(`col-${idx + 1}-${col.id}`)}
                              draggable={false}
                              className="h-full w-full object-cover select-none"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center p-2 text-center text-[10px]"
                              style={{ color: theme.mutedInk }}
                            >
                              {pickText(col.caption, lang)}
                            </div>
                          )}
                        </div>
                        <figcaption
                          className="mt-1 text-[10px] italic leading-tight"
                          style={{ color: theme.mutedInk }}
                        >
                          {pickText(col.caption, lang)}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="border-t pt-2 text-[10px]"
              style={{ borderColor: theme.border, color: theme.mutedInk }}
            >
              {pickText(edition.recipientName, lang)}
            </div>
          </div>
        );
        break;

      // PAGE 3: FEATURE STORY & PULL QUOTE
      case 'p3':
        innerContent = (
          <div
            className="flex h-full w-full flex-col justify-between p-6 sm:p-8"
            style={paperTextureStyle}
          >
            <div
              className="flex items-center justify-between text-[10px] tracking-widest uppercase"
              style={{ color: theme.mutedInk }}
            >
              <span className="tabular-nums">{displayNum}</span>
              <span>{pickText(edition.relationship, lang)}</span>
            </div>

            <div className="my-auto space-y-5 py-3">
              <blockquote
                className="border-y py-4 font-display text-lg italic leading-relaxed sm:text-2xl"
                style={{ borderColor: theme.border, color: theme.ink }}
              >
                {pickText(mag.editorialPullQuote, lang)}
              </blockquote>

              <p
                className="text-xs sm:text-sm leading-[1.85] first-letter:font-display first-letter:text-4xl first-letter:font-semibold first-letter:float-start first-letter:me-2 first-letter:leading-none"
                style={{ color: theme.ink }}
              >
                {pickText(mag.editorialStory, lang)}
              </p>
            </div>

            <div
              className="flex items-center justify-between border-t pt-2 text-[10px] tabular-nums"
              style={{ borderColor: theme.border, color: theme.mutedInk }}
            >
              <span>{formattedDate}</span>
              <span>{t.collectorEdition}</span>
            </div>
          </div>
        );
        break;

      // PAGE 4: PERSONAL MEMORIES SPREAD
      case 'p4':
        innerContent = (
          <div
            className="flex h-full w-full flex-col justify-between p-5 sm:p-7"
            style={paperTextureStyle}
          >
            <div
              className="flex items-center justify-between text-[10px] tracking-widest uppercase"
              style={{ color: theme.mutedInk }}
            >
              <span>{pickText(mag.memorySpreadTitle, lang)}</span>
              <span className="tabular-nums">{displayNum}</span>
            </div>

            <div className="my-auto space-y-3.5 py-2">
              <h3 className="font-display text-2xl font-semibold sm:text-3xl">
                {pickText(mag.memorySpreadTitle, lang)}
              </h3>

              <div className="space-y-3">
                {resolvedSpreadMemories.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-6 text-center text-xs"
                    style={{ borderColor: theme.border, color: theme.mutedInk }}
                  >
                    {pickText(mag.memorySpreadTitle, lang)}
                  </div>
                ) : (
                  resolvedSpreadMemories.slice(0, 2).map((item) => (
                    <article
                      key={item.id}
                      className="grid grid-cols-12 items-center gap-3 rounded-lg border p-2.5"
                      style={{ borderColor: theme.border, backgroundColor: theme.paperAltBg }}
                    >
                      <div className="col-span-5 aspect-[4/3] overflow-hidden rounded-sm bg-black/5">
                        {!failedUrls[`mem-${item.id}`] && item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={pickText(item.title, lang)}
                            referrerPolicy="no-referrer"
                            onError={() => markFailed(`mem-${item.id}`)}
                            draggable={false}
                            className="h-full w-full object-cover select-none"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center p-2 text-center text-[10px]"
                            style={{ color: theme.mutedInk }}
                          >
                            {item.date}
                          </div>
                        )}
                      </div>
                      <div className="col-span-7 space-y-1">
                        <p className="text-[10px] tabular-nums" style={{ color: theme.accentText }}>
                          {item.date}
                        </p>
                        <h4 className="font-display text-base font-semibold leading-tight">
                          {pickText(item.title, lang)}
                        </h4>
                        <p
                          className="text-[11px] leading-relaxed line-clamp-3"
                          style={{ color: theme.mutedInk }}
                        >
                          {pickText(item.caption, lang)}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div
              className="border-t pt-2 text-[10px]"
              style={{ borderColor: theme.border, color: theme.mutedInk }}
            >
              {pickText(mag.masthead, lang)}
            </div>
          </div>
        );
        break;

      // PAGE 5: MUSIC & QR CODE PAGE
      case 'p5':
        innerContent = (
          <div
            className="flex h-full w-full flex-col justify-between p-5 sm:p-7"
            style={paperTextureStyle}
          >
            <div
              className="flex items-center justify-between text-[10px] tracking-widest uppercase"
              style={{ color: theme.mutedInk }}
            >
              <span className="tabular-nums">{displayNum}</span>
              <span>{pickText(mag.musicPage.title, lang)}</span>
            </div>

            <div className="my-auto flex flex-col items-center text-center space-y-3.5 py-1">
              <div
                className="relative h-28 w-28 sm:h-34 sm:w-34 overflow-hidden rounded-full border-4 shadow-md bg-black/10"
                style={{ borderColor: theme.accent }}
              >
                {!failedUrls['mag-music-art'] && mag.musicPage.coverArtUrl ? (
                  <img
                    src={mag.musicPage.coverArtUrl}
                    alt={pickText(mag.musicPage.songTitle, lang)}
                    referrerPolicy="no-referrer"
                    onError={() => markFailed('mag-music-art')}
                    draggable={false}
                    className="h-full w-full object-cover select-none"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Disc3 className="h-10 w-10" style={{ color: theme.accentText }} />
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 m-auto h-6 w-6 rounded-full border-2"
                  style={{ backgroundColor: theme.paperBg, borderColor: theme.accent }}
                />
              </div>

              <div>
                <h3 className="font-display text-2xl font-semibold leading-tight">
                  {pickText(mag.musicPage.songTitle, lang)}
                </h3>
                <p className="mt-0.5 text-xs" style={{ color: theme.mutedInk }}>
                  {pickText(mag.musicPage.artist, lang)}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMagazineSong();
                }}
                className="relative z-30 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.accent === '#713F50' ? '#F5EBDD' : '#292329',
                }}
              >
                {isMagazineSongPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                <span>{isMagazineSongPlaying ? t.pauseSong : t.playSong}</span>
              </button>

              {mag.musicPage.showQr && (
                <div
                  className="flex items-center gap-3 rounded-lg border p-2.5 text-start w-full max-w-xs"
                  style={{ borderColor: theme.border, backgroundColor: theme.paperAltBg }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={t.scanQr}
                      draggable={false}
                      className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded border select-none"
                      style={{ borderColor: theme.border }}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded border"
                      style={{ borderColor: theme.border }}
                    >
                      <QrCode className="h-7 w-7" style={{ color: theme.accentText }} />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold" style={{ color: theme.accentText }}>
                      {t.scanQr}
                    </p>
                    <p className="text-[10px] leading-snug" style={{ color: theme.mutedInk }}>
                      {pickText(mag.musicPage.qrCaption, lang)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between border-t pt-2 text-[10px]"
              style={{ borderColor: theme.border, color: theme.mutedInk }}
            >
              <span className="inline-flex items-center gap-1">
                <Disc3 className="h-3 w-3" />
                <span>Soundtrack</span>
              </span>
              <span>{pickText(mag.masthead, lang)}</span>
            </div>
          </div>
        );
        break;

      // PAGE 6: BIRTHDAY GREETING PAGE
      case 'p6':
        innerContent = (
          <div
            className="flex h-full w-full flex-col justify-between p-5 sm:p-7"
            style={paperTextureStyle}
          >
            <div
              className="flex items-center justify-between text-[10px] tracking-widest uppercase"
              style={{ color: theme.mutedInk }}
            >
              <span>{t.collectorEdition}</span>
              <span className="tabular-nums">{displayNum}</span>
            </div>

            <div className="my-auto space-y-3.5 py-1">
              <h3 className="font-display text-2xl sm:text-4xl font-bold leading-[1.08] text-balance">
                {pickText(mag.greetingPage.headline, lang)}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.mutedInk }}>
                {pickText(mag.greetingPage.subheadline, lang)}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {mag.greetingPage.photos.slice(0, 2).map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className={`overflow-hidden rounded-sm border bg-black/5 ${
                      idx === 0 ? 'aspect-[3/4]' : 'aspect-[3/4] translate-y-2.5'
                    }`}
                    style={{ borderColor: theme.border }}
                  >
                    {!failedUrls[`greet-${idx}`] && photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={pickText(mag.greetingPage.headline, lang)}
                        referrerPolicy="no-referrer"
                        onError={() => markFailed(`greet-${idx}`)}
                        draggable={false}
                        className="h-full w-full object-cover select-none"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center p-2 text-center text-[10px]"
                        style={{ color: theme.mutedInk }}
                      >
                        {edition.age}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="border-t pt-2 text-[10px] tabular-nums"
              style={{ borderColor: theme.border, color: theme.mutedInk }}
            >
              {edition.age} · {formattedDate}
            </div>
          </div>
        );
        break;

      // PAGE 7: PERSONAL LETTERS & MESSAGES
      case 'p7':
        innerContent = (
          <div
            className="flex h-full w-full flex-col justify-between p-6 sm:p-8"
            style={paperTextureStyle}
          >
            <div
              className="flex items-center justify-between text-[10px] tracking-widest uppercase"
              style={{ color: theme.mutedInk }}
            >
              <span className="tabular-nums">{displayNum}</span>
              <span>{pickText(mag.lettersPage.title, lang)}</span>
            </div>

            <div className="my-auto space-y-5 py-3">
              <h3 className="font-display text-2xl sm:text-3xl font-semibold">
                {pickText(mag.lettersPage.title, lang)}
              </h3>
              <div className="h-px w-16" style={{ backgroundColor: theme.accent }} />
              <div className="text-xs sm:text-sm" style={{ color: theme.ink }}>
                <RichTextDisplay text={pickText(mag.lettersPage.letterBody, lang)} />
              </div>
              <p className="font-display text-lg italic" style={{ color: theme.accentText }}>
                {pickText(mag.lettersPage.signature, lang)}
              </p>
            </div>

            <div
              className="border-t pt-2 text-[10px]"
              style={{ borderColor: theme.border, color: theme.mutedInk }}
            >
              {pickText(mag.masthead, lang)}
            </div>
          </div>
        );
        break;

      // PAGE 8: BACK COVER
      case 'p8':
      default:
        innerContent = (
          <div
            className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden p-7 sm:p-8 text-center"
            style={{ backgroundColor: theme.coverBg, color: theme.coverInk }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-3 border border-[#C5A46D]/45"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/25"
            />
            <div className="relative z-10 pt-2">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#C5A46D]" />
              <p className="text-[10px] tracking-[0.22em] uppercase text-[#C5A46D]">
                {pickText(mag.masthead, lang)}
              </p>
            </div>

            <div className="relative z-10 max-w-xs space-y-3.5">
              {mag.backCover.photoUrl && !failedUrls['mag-back'] && (
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-[#C5A46D]/60">
                  <img
                    src={mag.backCover.photoUrl}
                    alt={pickText(mag.backCover.headline, lang)}
                    referrerPolicy="no-referrer"
                    onError={() => markFailed('mag-back')}
                    draggable={false}
                    className="h-full w-full object-cover select-none"
                  />
                </div>
              )}
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5EBDD]">
                {pickText(mag.backCover.headline, lang)}
              </h3>
              <p className="text-xs leading-relaxed text-[#F5EBDD]/80">
                {pickText(mag.backCover.dedication, lang)}
              </p>
            </div>

            <div className="relative z-10 pb-2">
              <div
                className="mx-auto mb-2 flex items-end justify-center gap-0.5 opacity-65"
                aria-hidden="true"
              >
                {[3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2].map((w, i) => (
                  <span
                    key={i}
                    className="inline-block h-5 bg-[#F5EBDD]"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <p className="text-[10px] tracking-widest text-[#C5A46D]">
                {pickText(mag.backCover.colophon, lang)}
              </p>
            </div>
          </div>
        );
        break;
    }
    }

    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative h-full w-full overflow-hidden select-none"
      >
        {innerContent}
        {spineCurvatureOverlay}
        {outerCornerHint}
      </div>
    );
  };

  // Renders realistic reverse paper face on mobile when the physical sheet swings past 90deg
  const renderMobileSheetBackFace = (pageNum: number) => {
    const pageKey = pagesList[pageNum] || 'p8';
    const isCover = pageKey === 'p1' || pageKey === 'p8';
    const paperTextureStyle = getPaperTextureStyle(pageKey);
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative flex h-full w-full flex-col justify-between overflow-hidden p-6 select-none"
        style={
          isCover
            ? { backgroundColor: theme.coverBg, color: theme.coverInk }
            : paperTextureStyle
        }
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(41,35,41,0.35) 22px, rgba(41,35,41,0.35) 23px)',
          }}
        />
        <div
          className="flex items-center justify-between text-[10px] tracking-widest uppercase opacity-60"
          style={{ color: isCover ? theme.coverInk : theme.mutedInk }}
        >
          <span>{pickText(mag.masthead, lang)}</span>
          <span className="tabular-nums">0{pageNum + 1}</span>
        </div>
        <div className="my-auto text-center opacity-35">
          <div
            className="mx-auto h-px w-20"
            style={{ backgroundColor: isCover ? '#C5A46D' : theme.accent }}
          />
          <p
            className="mt-3 font-display text-lg italic"
            style={{ color: isCover ? '#F5EBDD' : theme.ink }}
          >
            {pickText(edition.recipientName, lang)}
          </p>
        </div>
        <div
          className="text-center text-[10px] opacity-55"
          style={{ color: isCover ? theme.coverInk : theme.mutedInk }}
        >
          {t.collectorEdition}
        </div>
        {/* Spine crease shadow along binding edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-10"
          style={{
            [isRtl ? 'left' : 'right']: 0,
            background: isRtl
              ? 'linear-gradient(to right, rgba(30,25,30,0.28), transparent)'
              : 'linear-gradient(to left, rgba(30,25,30,0.28), transparent)',
          }}
        />
      </div>
    );
  };

  // Desktop physical spread geometry
  const currentSpread = Math.round(desktopPos);
  const currentMobilePage = Math.round(mobilePos);

  // Smooth horizontal book centering:
  // Closed Front Cover centered -> Open Spine centered -> Closed Back Cover centered
  const centerShiftPercent = useMemo(() => {
    let shift = 0;
    if (desktopPos <= 1) {
      shift = -25 * (1 - desktopPos);
    } else if (desktopPos >= 3) {
      shift = 25 * (desktopPos - 3);
    }
    return isRtl ? -shift : shift;
  }, [desktopPos, isRtl]);

  // Active leaf turning metrics on desktop
  const activeTurningLeafIdx = Math.floor(desktopPos);
  const activeTurnFrac = desktopPos - activeTurningLeafIdx; // (0..1) when turning
  const isActivelyTurningDesktop = activeTurnFrac > 0.002 && activeTurnFrac < 0.998;
  const desktopArc = Math.sin(activeTurnFrac * Math.PI);

  // Stacked paper edge thicknesses based on how many sheets sit on each side
  const readSheetsCount = clamp(desktopPos, 0, sheetCount);
  const unreadSheetsCount = clamp(sheetCount - desktopPos, 0, sheetCount);
  const leftStackWidth = isRtl ? unreadSheetsCount * 3.5 : readSheetsCount * 3.5;
  const rightStackWidth = isRtl ? readSheetsCount * 3.5 : unreadSheetsCount * 3.5;

  // Book stage size
  const bookW = compactPreview ? 740 : 880;
  const bookH = compactPreview ? 470 : 560;

  // Active turning metrics on mobile
  const mobileBasePage = clamp(Math.floor(mobilePos), 0, maxMobilePos);
  const mobileFrac = clamp(mobilePos - mobileBasePage, 0, 1);
  const isActivelyTurningMobile = mobileFrac > 0.002 && mobileFrac < 0.998;
  const mobileArc = Math.sin(mobileFrac * Math.PI);
  const mobileAngle = mobileFrac * 124; // Swings 124deg around the spine
  const mobileUnreadSheets = clamp(maxMobilePos - mobilePos, 0, maxMobilePos);

  // Synchronized human-readable spread/page status
  const totalPagesCount = pagesList.length;
  const desktopSyncLabel = useMemo(() => {
    if (currentSpread === 0) return `${t.frontCover} · ${t.pageLabel} 1 ${t.ofLabel} ${totalPagesCount}`;
    if (currentSpread === sheetCount) {
      return `${t.backCover} · ${t.pageLabel} ${totalPagesCount} ${t.ofLabel} ${totalPagesCount}`;
    }
    const leftPage = currentSpread * 2;
    const rightPage = leftPage + 1;
    return `${t.pageLabel} ${leftPage}–${rightPage} ${t.ofLabel} ${totalPagesCount}`;
  }, [currentSpread, sheetCount, t.backCover, t.frontCover, t.ofLabel, t.pageLabel, totalPagesCount]);

  useEffect(() => {
    if (!awaitingCompletion || hasReachedBackCover) return;
    if (desktopPos >= sheetCount - 0.15 || mobilePos >= maxMobilePos - 0.15) {
      setHasReachedBackCover(true);
      playChime();
    }
  }, [awaitingCompletion, desktopPos, hasReachedBackCover, maxMobilePos, mobilePos, playChime, sheetCount]);

  return (
    <section
      id="section-magazine"
      ref={sectionRef}
      className={`overflow-x-hidden ${
        compactPreview
          ? 'bg-[#1E191E] text-[#F5EBDD] py-4'
          : 'bg-[#292329] text-[#F5EBDD] py-16 sm:py-24 border-b border-[#C5A46D]/20'
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!compactPreview && (
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{copy.kicker}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-5xl text-balance">
              {copy.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#F5EBDD]/75 sm:text-base">
              {copy.subtitle}
            </p>
          </div>
        )}

        {/* ============================================================
            DESKTOP PHYSICAL 3D BOOK (2-Facing Pages, 4 Double-Sided Sheets)
            ============================================================ */}
        <div className="hidden md:flex flex-col items-center">
          <div
            tabIndex={0}
            role="region"
            aria-roledescription="interactive 3D book"
            aria-label={t.title}
            onKeyDown={(e) => {
              if (handleKeyNavigation(e.key)) {
                e.preventDefault();
              }
            }}
            className="relative flex w-full items-center justify-center py-6 outline-none focus-visible:ring-2 focus-visible:ring-[#C5A46D]/60 rounded-2xl"
            style={{ perspective: '2400px' }}
          >
            {/* Ambient warm reading lamp glow on the table */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[420px] w-[680px] rounded-full bg-[#C5A46D]/[0.07] blur-3xl"
            />

            {/* Book Positioner: keeps closed covers & open spreads centered */}
            <div
              ref={desktopBookRef}
              dir="ltr"
              onPointerDown={(e) => beginBookPointerDown(e, 'desktop')}
              onPointerMove={moveBookPointer}
              onPointerUp={endBookPointer}
              onPointerCancel={endBookPointer}
              onPointerLeave={() => {
                if (!dragRef.current) setHoverTilt({ rx: 3.5, ry: 0 });
              }}
              className={`relative select-none touch-pan-y ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                width: `${bookW}px`,
                maxWidth: '100%',
                height: `${bookH}px`,
                transformStyle: 'preserve-3d',
                transform: `translateX(${centerShiftPercent}%) rotateX(${hoverTilt.rx}deg) rotateY(${hoverTilt.ry}deg)`,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {/* Table Ground Shadow under the active book footprint */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-7 rounded-[28px] bg-black/65 blur-2xl"
                style={{
                  left: desktopPos < 0.85 ? (isRtl ? '0%' : '50%') : '0%',
                  right: desktopPos > sheetCount - 0.85 ? (isRtl ? '50%' : '0%') : '0%',
                  height: '44px',
                  opacity: 0.72,
                  transform: 'translateZ(-16px)',
                }}
              />

              {/* Hardcover Backboard on the UNREAD side (frames unread paper stack) */}
              {desktopPos < sheetCount - 0.08 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-[-5px] rounded-lg border border-[#C5A46D]/35 shadow-[0_24px_55px_rgba(0,0,0,0.72)]"
                  style={{
                    left: isRtl ? `-${leftStackWidth + 5}px` : '50%',
                    width: `calc(50% + ${(isRtl ? leftStackWidth : rightStackWidth) + 5}px)`,
                    backgroundColor: theme.coverBg,
                    transform: 'translateZ(-6px)',
                  }}
                />
              )}

              {/* Hardcover Backboard on the READ side (frames turned paper stack) */}
              {desktopPos > 0.08 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-[-5px] rounded-lg border border-[#C5A46D]/35 shadow-[0_24px_55px_rgba(0,0,0,0.72)]"
                  style={{
                    left: isRtl ? '50%' : `-${leftStackWidth + 5}px`,
                    width: `calc(50% + ${(isRtl ? rightStackWidth : leftStackWidth) + 5}px)`,
                    backgroundColor: theme.coverBg,
                    transform: 'translateZ(-6px)',
                  }}
                />
              )}

              {/* Left Stacked Paper Edges (physical thickness of resting pages) */}
              {leftStackWidth > 0.5 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1.5 rounded-s-sm"
                  style={{
                    left: isRtl ? `-${leftStackWidth}px` : `-${leftStackWidth}px`,
                    width: `${leftStackWidth}px`,
                    background: `repeating-linear-gradient(90deg, ${theme.edgeCream} 0px, ${theme.edgeCream} 1.5px, ${theme.edgeShadow} 1.5px, ${theme.edgeShadow} 2.8px)`,
                    boxShadow: '-3px 4px 10px rgba(0,0,0,0.45)',
                    transform: 'translateZ(-2px)',
                  }}
                />
              )}

              {/* Right Stacked Paper Edges (physical thickness of resting pages) */}
              {rightStackWidth > 0.5 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1.5 rounded-e-sm"
                  style={{
                    right: `-${rightStackWidth}px`,
                    width: `${rightStackWidth}px`,
                    background: `repeating-linear-gradient(90deg, ${theme.edgeShadow} 0px, ${theme.edgeShadow} 1.3px, ${theme.edgeCream} 1.3px, ${theme.edgeCream} 2.8px)`,
                    boxShadow: '3px 4px 10px rgba(0,0,0,0.45)',
                    transform: 'translateZ(-2px)',
                  }}
                />
              )}

              {/* Gull-Wing Bottom Paper Thickness Profile (when open) */}
              {desktopPos > 0.25 && desktopPos < sheetCount - 0.25 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-2 inset-x-0 flex h-2"
                  style={{ transform: 'translateZ(-3px)' }}
                >
                  <div
                    className="h-full w-1/2 rounded-bl-md"
                    style={{
                      background: `linear-gradient(to bottom, ${theme.edgeCream}, ${theme.edgeShadow})`,
                      clipPath: 'polygon(0 0, 100% 35%, 99% 100%, 2% 100%)',
                    }}
                  />
                  <div
                    className="h-full w-1/2 rounded-br-md"
                    style={{
                      background: `linear-gradient(to bottom, ${theme.edgeCream}, ${theme.edgeShadow})`,
                      clipPath: 'polygon(0 35%, 100% 0, 98% 100%, 1% 100%)',
                    }}
                  />
                </div>
              )}

              {/* Central Binding Spine & Headband / Tailband Stitching */}
              {desktopPos > 0.15 && desktopPos < sheetCount - 0.15 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-[-4px] left-1/2 z-40 w-5 -translate-x-1/2"
                  style={{ transform: 'translateZ(2px)' }}
                >
                  {/* Top woven headband */}
                  <div
                    className="mx-auto h-1.5 w-3.5 rounded-t-sm"
                    style={{
                      background:
                        'repeating-linear-gradient(90deg, #C5A46D 0px, #C5A46D 2px, #713F50 2px, #713F50 4px)',
                    }}
                  />
                  {/* Spine valley shadow */}
                  <div
                    className="h-[calc(100%-12px)] w-full"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(30,25,30,0.34) 40%, rgba(16,12,16,0.52) 50%, rgba(30,25,30,0.34) 60%, transparent 100%)',
                    }}
                  />
                  {/* Bottom woven tailband */}
                  <div
                    className="mx-auto h-1.5 w-3.5 rounded-b-sm"
                    style={{
                      background:
                        'repeating-linear-gradient(90deg, #C5A46D 0px, #C5A46D 2px, #713F50 2px, #713F50 4px)',
                    }}
                  />
                </div>
              )}

              {/* Cast Shadow on Underlying Pages Beneath the Active Turning Sheet */}
              {isActivelyTurningDesktop && (
                <>
                  {/* Shadow falling on the unread stack as sheet lifts */}
                  {activeTurnFrac < 0.65 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 z-30"
                      style={{
                        left: isRtl ? undefined : '50%',
                        right: isRtl ? '50%' : undefined,
                        width: `${clamp((1 - activeTurnFrac) * 32, 6, 32)}%`,
                        opacity: desktopArc * 0.55,
                        background: isRtl
                          ? 'linear-gradient(to left, rgba(24,18,24,0.55), transparent)'
                          : 'linear-gradient(to right, rgba(24,18,24,0.55), transparent)',
                        transform: 'translateZ(7px)',
                      }}
                    />
                  )}
                  {/* Shadow falling on the read stack as sheet lands */}
                  {activeTurnFrac > 0.35 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 z-30"
                      style={{
                        right: isRtl ? undefined : '50%',
                        left: isRtl ? '50%' : undefined,
                        width: `${clamp(activeTurnFrac * 32, 6, 32)}%`,
                        opacity: desktopArc * 0.55,
                        background: isRtl
                          ? 'linear-gradient(to right, rgba(24,18,24,0.55), transparent)'
                          : 'linear-gradient(to left, rgba(24,18,24,0.55), transparent)',
                        transform: 'translateZ(7px)',
                      }}
                    />
                  )}
                </>
              )}

              {/* DYNAMIC DOUBLE-SIDED PHYSICAL SHEETS */}
              {Array.from({ length: sheetCount }, (_, leafIdx) => {
                const tLeaf = clamp(desktopPos - leafIdx, 0, 1);
                const isTurning = tLeaf > 0.002 && tLeaf < 0.998;
                const arc = Math.sin(tLeaf * Math.PI);

                // Stack depth & order so turned and unturned pages never z-fight
                const zIndex = isTurning
                  ? 50
                  : tLeaf >= 0.5
                    ? 10 + leafIdx
                    : 10 + (sheetCount - 1 - leafIdx);
                const zOffset = isTurning
                  ? 8 + arc * 32
                  : tLeaf >= 0.5
                    ? leafIdx * 1.4
                    : (sheetCount - 1 - leafIdx) * 1.4;

                const deg = isRtl ? tLeaf * 180 : -tLeaf * 180;
                const microLiftTilt = arc * 2.2;

                const frontPageNum = leafIdx * 2;
                const backPageNum = leafIdx * 2 + 1;

                // Moving cylindrical light/bend sheen across turning sheet
                const specularPos = Math.round(tLeaf * 100);

                return (
                  <div
                    key={leafIdx}
                    className="absolute inset-y-0 w-1/2"
                    style={{
                      left: isRtl ? '0%' : '50%',
                      transformOrigin: isRtl ? 'right center' : 'left center',
                      transformStyle: 'preserve-3d',
                      zIndex,
                      transform: `translateZ(${zOffset}px) rotateY(${deg}deg) rotateX(${microLiftTilt}deg) scaleX(${
                        isTurning ? 1 - arc * 0.04 : 1
                      })`,
                      willChange: isTurning ? 'transform' : 'auto',
                    }}
                  >
                    {/* FRONT FACE OF PHYSICAL SHEET */}
                    <div
                      className={`absolute inset-0 overflow-hidden border border-[#C5A46D]/35 ${
                        isRtl ? 'rounded-s-lg' : 'rounded-e-lg'
                      }`}
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        boxShadow: isTurning
                          ? `0 18px 42px rgba(0,0,0,${0.32 + arc * 0.28})`
                          : '0 2px 10px rgba(0,0,0,0.2)',
                      }}
                    >
                      {renderPage(frontPageNum, false)}

                      {/* Dynamic curved paper highlight & fold shadow during turn */}
                      {isTurning && tLeaf < 0.55 && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 z-30"
                          style={{
                            background: isRtl
                              ? `linear-gradient(to left, rgba(0,0,0,${arc * 0.2}) 0%, rgba(255,255,255,${arc * 0.24}) ${Math.max(12, 92 - specularPos)}%, rgba(0,0,0,${arc * 0.34}) 100%)`
                              : `linear-gradient(to right, rgba(0,0,0,${arc * 0.2}) 0%, rgba(255,255,255,${arc * 0.24}) ${Math.max(12, 92 - specularPos)}%, rgba(0,0,0,${arc * 0.34}) 100%)`,
                          }}
                        />
                      )}
                    </div>

                    {/* BACK FACE OF THE EXACT SAME PHYSICAL SHEET */}
                    <div
                      className={`absolute inset-0 overflow-hidden border border-[#C5A46D]/35 ${
                        isRtl ? 'rounded-e-lg' : 'rounded-s-lg'
                      }`}
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        boxShadow: isTurning
                          ? `0 18px 42px rgba(0,0,0,${0.32 + arc * 0.28})`
                          : '0 2px 10px rgba(0,0,0,0.2)',
                      }}
                    >
                      {renderPage(backPageNum, false)}

                      {/* Dynamic curved paper highlight & fold shadow on back face while settling */}
                      {isTurning && tLeaf > 0.45 && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 z-30"
                          style={{
                            background: isRtl
                              ? `linear-gradient(to right, rgba(0,0,0,${arc * 0.22}) 0%, rgba(255,255,255,${arc * 0.22}) ${clamp(specularPos, 10, 88)}%, rgba(0,0,0,${arc * 0.3}) 100%)`
                              : `linear-gradient(to left, rgba(0,0,0,${arc * 0.22}) 0%, rgba(255,255,255,${arc * 0.22}) ${clamp(specularPos, 10, 88)}%, rgba(0,0,0,${arc * 0.3}) 100%)`,
                          }}
                        />
                      )}
                    </div>

                    {/* Physical sheet edge thickness visible mid-turn */}
                    {isTurning && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0.5 w-[3px]"
                        style={{
                          [isRtl ? 'left' : 'right']: '-1.5px',
                          backgroundColor: theme.edgeCream,
                          transform: 'rotateY(90deg)',
                          opacity: arc,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Interactive Controls & Page Synchronization Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={goDesktopPrev}
              disabled={currentSpread === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#713F50] disabled:opacity-35 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{t.prevPage}</span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: sheetCount + 1 }, (_, idx) => {
                const label =
                  idx === 0
                    ? t.frontCover
                    : idx === sheetCount
                      ? t.backCover
                      : `${idx * 2}–${idx * 2 + 1}`;
                return (
                  <button
                    key={`${idx}-${label}`}
                    type="button"
                    onClick={() => jumpDesktopSpread(idx)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      currentSpread === idx
                        ? 'bg-[#C5A46D] text-[#292329]'
                        : 'bg-white/5 text-[#F5EBDD]/75 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goDesktopNext}
              disabled={currentSpread === sheetCount}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-35 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <span>{currentSpread === 0 ? t.openIssue : t.nextPage}</span>
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {currentSpread > 0 && (
              <button
                type="button"
                onClick={() => jumpDesktopSpread(0)}
                aria-label={t.frontCover}
                className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/25 px-2.5 py-2 text-xs text-[#C5A46D] hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-3 text-xs text-[#F5EBDD]/65">
            <span className="font-medium text-[#C5A46D] tabular-nums">{desktopSyncLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{t.swipeHint}</span>
          </div>
        </div>

        {/* ============================================================
            MOBILE VIEW: Single-Page Physical Book with Spine, Thickness & 3D Flip
            ============================================================ */}
        <div className="flex md:hidden flex-col items-center">
          <div
            className="relative flex w-full items-center justify-center py-4"
            style={{ perspective: '1600px' }}
          >
            <div
              ref={mobileBookRef}
              dir="ltr"
              onPointerDown={(e) => beginBookPointerDown(e, 'mobile')}
              onPointerMove={moveBookPointer}
              onPointerUp={endBookPointer}
              onPointerCancel={endBookPointer}
              className="relative h-[470px] w-[min(86vw,350px)] select-none touch-pan-y"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(2.5deg)',
              }}
            >
              {/* Table drop shadow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-5 inset-x-2 h-8 rounded-2xl bg-black/65 blur-xl"
                style={{ transform: 'translateZ(-12px)' }}
              />

              {/* Hardcover outer back board */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-xl border border-[#C5A46D]/35 shadow-2xl"
                style={{ backgroundColor: theme.coverBg, transform: 'translateZ(-6px)' }}
              />

              {/* Stacked Paper Edges on the outer fore-edge */}
              {mobileUnreadSheets > 0.2 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-1.5 rounded-sm"
                  style={{
                    [isRtl ? 'left' : 'right']: `-${Math.round(mobileUnreadSheets * 1.4) + 2}px`,
                    width: `${Math.round(mobileUnreadSheets * 1.4) + 2}px`,
                    background: `repeating-linear-gradient(90deg, ${theme.edgeShadow} 0px, ${theme.edgeShadow} 1px, ${theme.edgeCream} 1px, ${theme.edgeCream} 2.2px)`,
                    transform: 'translateZ(-2px)',
                  }}
                />
              )}

              {/* Bottom edge paper thickness */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1.5 inset-x-1 h-1.5 rounded-b-sm"
                style={{
                  background: `linear-gradient(to bottom, ${theme.edgeCream}, ${theme.edgeShadow})`,
                  transform: 'translateZ(-2px)',
                }}
              />

              {/* Visible physical spine bar along binding edge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-[-2px] z-40 w-3.5"
                style={{
                  [isRtl ? 'right' : 'left']: '-5px',
                  background: `linear-gradient(90deg, ${theme.coverBg}, #492E38, ${theme.coverBg})`,
                  borderRadius: '4px',
                  boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6)',
                  transform: 'translateZ(3px)',
                }}
              />

              {/* Underlying Page (Already exists physically underneath the turning sheet!) */}
              {mobileBasePage < maxMobilePos && (
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl border border-[#C5A46D]/35"
                  style={{ zIndex: 10, transform: 'translateZ(0px)' }}
                >
                  {renderPage(mobileBasePage + 1, true)}

                  {/* Dynamic cast shadow from the turning sheet overhead */}
                  {isActivelyTurningMobile && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-30"
                      style={{
                        opacity: mobileArc * 0.5,
                        background: isRtl
                          ? 'linear-gradient(to left, rgba(20,14,20,0.65) 0%, transparent 65%)'
                          : 'linear-gradient(to right, rgba(20,14,20,0.65) 0%, transparent 65%)',
                      }}
                    />
                  )}
                </div>
              )}

              {/* Top Physical Turning Sheet (Front = mobileBasePage, Back = Reverse Paper Face) */}
              <div
                className="absolute inset-0"
                style={{
                  zIndex: 30,
                  transformOrigin: isRtl ? 'right center' : 'left center',
                  transformStyle: 'preserve-3d',
                  transform: `translateZ(${2 + mobileArc * 22}px) rotateY(${
                    isRtl ? mobileAngle : -mobileAngle
                  }deg) rotateX(${mobileArc * 2.4}deg)`,
                  opacity: mobileFrac > 0.84 ? 1 - (mobileFrac - 0.84) / 0.16 : 1,
                }}
              >
                {/* Front Face */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl border border-[#C5A46D]/40"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    boxShadow: isActivelyTurningMobile
                      ? `0 16px 36px rgba(0,0,0,${0.3 + mobileArc * 0.25})`
                      : '0 4px 12px rgba(0,0,0,0.22)',
                  }}
                >
                  {renderPage(mobileBasePage, true)}
                  {isActivelyTurningMobile && mobileAngle < 90 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-30"
                      style={{
                        background: isRtl
                          ? `linear-gradient(to left, rgba(0,0,0,${mobileArc * 0.18}) 0%, rgba(255,255,255,${mobileArc * 0.2}) 60%, rgba(0,0,0,${mobileArc * 0.28}) 100%)`
                          : `linear-gradient(to right, rgba(0,0,0,${mobileArc * 0.18}) 0%, rgba(255,255,255,${mobileArc * 0.2}) 60%, rgba(0,0,0,${mobileArc * 0.28}) 100%)`,
                      }}
                    />
                  )}
                </div>

                {/* Reverse Side of the Physical Sheet (visible past 90deg) */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-xl border border-[#C5A46D]/35"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {renderMobileSheetBackFace(mobileBasePage)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex w-full max-w-[350px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={goMobilePrev}
              disabled={currentMobilePage === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/35 bg-[#1E191E] px-3.5 py-2.5 text-xs font-medium text-[#F5EBDD] disabled:opacity-35 min-h-[44px] whitespace-nowrap shrink-0"
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{t.prevPage}</span>
            </button>

            <span className="text-xs font-medium text-[#C5A46D] tabular-nums whitespace-nowrap">
              {t.pageLabel} {currentMobilePage + 1} {t.ofLabel} {totalPagesCount}
            </span>

            <button
              type="button"
              onClick={goMobileNext}
              disabled={currentMobilePage === maxMobilePos}
              className="inline-flex items-center gap-1 rounded-lg bg-[#C5A46D] px-3.5 py-2.5 text-xs font-semibold text-[#292329] disabled:opacity-35 min-h-[44px] whitespace-nowrap shrink-0"
            >
              <span>{currentMobilePage === 0 ? t.openIssue : t.nextPage}</span>
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#F5EBDD]/60 text-center">{t.swipeHint}</p>
        </div>

        {/* Stage 4 -> Stage 5 Transition Bar (Reveals remaining features ONLY after finishing the magazine) */}
        {!compactPreview && awaitingCompletion && !featuresUnlocked && onFinishMagazine && (
          <div className="mt-12 pb-12 flex flex-col items-center justify-center border-t border-[#C5A46D]/20 pt-8 text-center">
            {hasReachedBackCover ? (
              <div className="animate-stage-reveal flex flex-col items-center gap-4">
                <p className="font-display text-lg sm:text-2xl text-[#F5EBDD] text-balance max-w-xl">
                  {t.finishPrompt}
                </p>
                <button
                  type="button"
                  onClick={onFinishMagazine}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C5A46D] px-6 py-3.5 text-sm font-semibold text-[#292329] shadow-lg transition-all hover:bg-[#D4B47F] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A46D] whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{t.unlockFeaturesBtn}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs sm:text-sm text-[#C5A46D]/85 max-w-md text-balance">
                  {t.flipToUnlockHint}
                </p>
                <button
                  type="button"
                  onClick={onFinishMagazine}
                  className="rounded-lg border border-[#C5A46D]/35 bg-white/5 px-4 py-2 text-xs font-medium text-[#F5EBDD]/80 transition-colors hover:bg-white/10 hover:text-[#F5EBDD] whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  {t.quickContinue}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
