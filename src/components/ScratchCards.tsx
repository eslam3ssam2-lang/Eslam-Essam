import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, RotateCcw, Sparkles } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language, ScratchCardItem } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';

function SingleScratchCard({
  card,
  lang,
}: {
  card: ScratchCardItem;
  lang: Language;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { playChime } = useAudio();
  const t = UI_STRINGS[lang].scratch;

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (card.foilTone === 'rose') {
      grad.addColorStop(0, '#D9A5AE');
      grad.addColorStop(0.5, '#E9C3C9');
      grad.addColorStop(1, '#BA808A');
    } else {
      grad.addColorStop(0, '#B5925B');
      grad.addColorStop(0.5, '#D7BA87');
      grad.addColorStop(1, '#9E7D4A');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle brushed texture lines
    ctx.strokeStyle = 'rgba(245, 235, 221, 0.18)';
    ctx.lineWidth = 1;
    for (let y = 6; y < h; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#292329';
    ctx.font = '600 15px "Plus Jakarta Sans", "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pickText(card.title, lang), w / 2, h / 2 - 6);
    ctx.font = '400 12px "Plus Jakarta Sans", "Cairo", sans-serif';
    ctx.fillStyle = 'rgba(41, 35, 41, 0.8)';
    ctx.fillText(t.instruction, w / 2, h / 2 + 18);

    strokeCountRef.current = 0;
    setRevealed(false);
  }, [card.foilTone, card.title, lang, t.instruction]);

  useEffect(() => {
    paintFoil();
  }, [paintFoil]);

  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 40) transparent += 1;
    }
    const totalSampled = data.length / 16;
    if (transparent / totalSampled > 0.48) {
      setRevealed(true);
      playChime();
      triggerCelebrationBurst('confetti');
    }
  };

  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    strokeCountRef.current += 1;
    if (strokeCountRef.current % 10 === 0) {
      checkProgress();
    }
  };

  const revealInstant = () => {
    setRevealed(true);
    playChime();
    triggerCelebrationBurst('confetti');
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-5 shadow-xl">
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-[#C5A46D]/30 bg-[#F5EBDD] text-[#292329]">
        {/* Revealed Content Layer */}
        <div className="flex h-full flex-col justify-between p-5">
          <div>
            <p className="text-xs font-medium text-[#713F50]">{pickText(card.rewardLabel, lang)}</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-[#292329]">
              {pickText(card.title, lang)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#292329]/85">
              {pickText(card.hiddenMessage, lang)}
            </p>
          </div>

          {card.imageUrl && !imgError && (
            <div className="mt-3 h-20 w-full overflow-hidden rounded-lg border border-[#C5A46D]/35">
              <img
                src={card.imageUrl}
                alt={pickText(card.title, lang)}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Foil Canvas Layer */}
        <canvas
          ref={canvasRef}
          width={360}
          height={256}
          onPointerDown={(e) => {
            isDrawingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scratchAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!isDrawingRef.current) return;
            scratchAt(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            isDrawingRef.current = false;
            checkProgress();
          }}
          className={`absolute inset-0 h-full w-full touch-none cursor-crosshair transition-opacity duration-500 ${
            revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-[#C5A46D]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{revealed ? t.revealedLabel : pickText(card.title, lang)}</span>
        </span>

        {!revealed ? (
          <button
            type="button"
            onClick={revealInstant}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#713F50] px-3 py-1.5 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F] transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{t.revealButton}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={paintFoil}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 px-3 py-1.5 text-xs font-medium text-[#F5EBDD]/85 hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t.resetButton}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function ScratchCards({
  edition,
  lang,
}: {
  edition: BirthdayEdition;
  lang: Language;
}) {
  const t = UI_STRINGS[lang].scratch;
  const copy = pickChapterCopy(
    edition.chapterCopy?.scratch,
    { kicker: t.kicker, title: t.title, subtitle: t.subtitle },
    lang,
  );

  return (
    <section
      id="section-scratch"
      className="bg-[#292329] text-[#F5EBDD] py-16 sm:py-24 border-b border-[#C5A46D]/20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{copy.kicker}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-5xl text-balance">
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#F5EBDD]/75 sm:text-base">{copy.subtitle}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {edition.scratchCards.map((card) => (
            <SingleScratchCard key={card.id} card={card} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  );
}
