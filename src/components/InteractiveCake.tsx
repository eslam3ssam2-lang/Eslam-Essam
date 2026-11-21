import { useEffect, useState } from 'react';
import { Flame, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';
import { useAudio } from '../context/AudioContext.tsx';
import { RichTextDisplay } from './RichTextContent.tsx';

interface InteractiveCakeProps {
  edition: BirthdayEdition;
  lang: Language;
}

export function InteractiveCake({ edition, lang }: InteractiveCakeProps) {
  const count = Math.min(15, Math.max(1, edition.cake.candleCount || 5));
  const [litCandles, setLitCandles] = useState<boolean[]>(() => Array(count).fill(false));
  const [wishGranted, setWishGranted] = useState(false);
  const [smoking, setSmoking] = useState(false);

  const t = UI_STRINGS[lang].cake;
  const copy = pickChapterCopy(
    edition.chapterCopy?.cake,
    { kicker: t.kicker, title: t.title, subtitle: pickText(edition.cake.wishPrompt, lang) || t.subtitle },
    lang,
  );
  const { playChime, playFanfare } = useAudio();

  useEffect(() => {
    setLitCandles(Array(count).fill(false));
    setWishGranted(false);
  }, [count, edition.slug]);

  const litCount = litCandles.filter(Boolean).length;

  const toggleCandle = (idx: number) => {
    setLitCandles((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    if (!litCandles[idx]) {
      playChime();
    }
  };

  const lightAll = () => {
    setLitCandles(Array(count).fill(true));
    setWishGranted(false);
    setSmoking(false);
    playChime();
  };

  const blowOutAll = () => {
    if (litCount === 0) return;
    setLitCandles(Array(count).fill(false));
    setSmoking(true);
    setWishGranted(true);
    triggerCelebrationBurst('confetti');
    playFanfare();
    window.setTimeout(() => setSmoking(false), 1800);
  };

  return (
    <section
      id="section-cake"
      className="bg-[#292329] py-16 sm:py-24 border-b border-[#C5A46D]/20"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{copy.kicker}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-5xl text-balance">
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#F5EBDD]/75 sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-[#C5A46D]/30 bg-[#1E191E]/85 p-6 sm:p-10 shadow-2xl">
          {/* Interactive Candles & Layered Velvet Cake */}
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className="relative flex w-full items-end justify-center gap-2.5 sm:gap-3.5 px-4 pt-12 pb-1 z-10">
              {litCandles.map((isLit, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCandle(idx)}
                  aria-label={`Candle ${idx + 1}`}
                  aria-pressed={isLit}
                  className="group relative flex flex-col items-center focus-visible:outline-2 focus-visible:outline-[#C5A46D] rounded-sm p-1 min-w-[24px]"
                >
                  {/* Flame */}
                  <div className="relative h-8 w-5 flex items-end justify-center">
                    {isLit && (
                      <div className="animate-flame relative flex items-center justify-center">
                        <div className="absolute -inset-2 rounded-full bg-[#C5A46D]/35 blur-md" />
                        <svg viewBox="0 0 24 36" className="h-7 w-4 drop-shadow-[0_0_8px_rgba(197,164,109,0.85)]">
                          <path
                            d="M12 2 C17 12, 21 19, 19 27 C17.5 32, 6.5 32, 5 27 C3 19, 7 12, 12 2 Z"
                            fill="#DFBA73"
                          />
                          <path
                            d="M12 12 C14.5 18, 16 22, 15 27 C14 29.5, 10 29.5, 9 27 C8 22, 9.5 18, 12 12 Z"
                            fill="#F5EBDD"
                          />
                        </svg>
                      </div>
                    )}
                    {!isLit && smoking && (
                      <div className="h-6 w-1.5 rounded-full bg-[#F5EBDD]/35 blur-[2px] -translate-y-2 transition-all duration-700" />
                    )}
                  </div>

                  {/* Wick */}
                  <div className="h-2 w-0.5 bg-[#292329]" />

                  {/* Taper Candle Stick */}
                  <div
                    className={`h-14 w-3 sm:w-3.5 rounded-t-sm border-x border-t transition-colors ${
                      idx % 2 === 0
                        ? 'bg-gradient-to-b from-[#F5EBDD] to-[#E2D1B8] border-[#C5A46D]/50'
                        : 'bg-gradient-to-b from-[#F2D5DC] to-[#D9A5AE] border-[#C5A46D]/50'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Top Cake Tier */}
            <div className="relative w-64 sm:w-72 rounded-t-2xl border-x border-t border-[#C5A46D]/45 bg-gradient-to-b from-[#713F50] to-[#562D3B] pt-5 pb-7 shadow-lg">
              <div className="absolute inset-x-0 top-0 h-5 rounded-t-2xl bg-[#F5EBDD] shadow-sm" />
              <svg viewBox="0 0 280 24" className="absolute inset-x-0 top-3.5 w-full h-6" preserveAspectRatio="none">
                <path
                  d="M0,0 L280,0 L280,8 Q260,22 242,8 Q224,20 206,9 Q188,24 170,8 Q152,19 134,10 Q116,24 98,9 Q80,20 62,8 Q44,22 26,8 Q12,18 0,9 Z"
                  fill="#F5EBDD"
                />
              </svg>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[#C5A46D]">
                <span className="h-px w-6 bg-[#C5A46D]/50" />
                <span className="tabular-nums font-display text-lg text-[#F5EBDD]">{edition.age}</span>
                <span className="h-px w-6 bg-[#C5A46D]/50" />
              </div>
            </div>

            {/* Bottom Cake Tier */}
            <div className="relative w-80 sm:w-96 rounded-t-xl border-x border-t border-[#C5A46D]/50 bg-gradient-to-b from-[#4E2A37] to-[#341E27] pt-6 pb-8 shadow-xl">
              <div className="absolute inset-x-0 top-0 h-3 bg-[#D9A5AE]" />
              <div className="absolute inset-x-4 bottom-2 h-1.5 rounded-full bg-[#C5A46D]/75" />
              <p className="mt-2 text-center font-display text-xl italic text-[#F5EBDD]/95">
                {pickText(edition.recipientName, lang)}
              </p>
            </div>

            {/* Pedestal Stand */}
            <div className="h-3 w-[340px] sm:w-[410px] rounded-full bg-gradient-to-r from-[#9C7D49] via-[#C5A46D] to-[#9C7D49] shadow-lg" />
            <div className="h-6 w-20 bg-gradient-to-b from-[#AD8D55] to-[#7D6335]" />
            <div className="h-2.5 w-40 rounded-full bg-[#C5A46D]" />
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-xs text-[#F5EBDD]/70 tabular-nums">
              {litCount} / {count} {t.candlesLitCount} · {litCount === count ? t.allLitHint : t.tapCandleHint}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={lightAll}
                className="inline-flex items-center gap-2 rounded-lg border border-[#C5A46D]/45 bg-[#713F50] px-5 py-2.5 text-sm font-medium text-[#F5EBDD] hover:bg-[#844B5F] transition-colors min-h-[44px]"
              >
                <Flame className="h-4 w-4 text-[#C5A46D]" />
                <span>{wishGranted ? t.relight : t.lightAll}</span>
              </button>

              <button
                type="button"
                onClick={blowOutAll}
                disabled={litCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C5A46D] px-5 py-2.5 text-sm font-semibold text-[#292329] transition-colors hover:bg-[#D4B47F] disabled:opacity-45 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Wind className="h-4 w-4" />
                <span>{t.blowCandles}</span>
              </button>
            </div>

            {wishGranted && (
              <div className="mt-4 max-w-xl rounded-xl border border-[#C5A46D]/40 bg-[#292329] p-6 text-center shadow-lg">
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-[#C5A46D]">
                  <Sparkles className="h-4 w-4" />
                  <span>{t.wishGranted}</span>
                </div>
                <div className="font-display text-xl text-[#F5EBDD] sm:text-2xl">
                  <RichTextDisplay text={pickText(edition.cake.postWishMessage, lang)} />
                </div>
                <button
                  type="button"
                  onClick={lightAll}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#D9A5AE] hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t.relight}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
