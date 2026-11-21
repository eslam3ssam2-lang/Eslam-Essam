import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';
import { useAudio } from '../context/AudioContext.tsx';
import { RichTextDisplay } from './RichTextContent.tsx';

interface InteractiveGiftBoxProps {
  edition: BirthdayEdition;
  lang: Language;
}

export function InteractiveGiftBox({ edition, lang }: InteractiveGiftBoxProps) {
  const [opened, setOpened] = useState(false);
  const [imgError, setImgError] = useState(false);
  const t = UI_STRINGS[lang].gift;
  const { playChime } = useAudio();

  const toggleBox = () => {
    setOpened((prev) => {
      const next = !prev;
      if (next) {
        triggerCelebrationBurst('confetti');
        playChime();
      }
      return next;
    });
  };

  const gift = edition.gift;
  const copy = pickChapterCopy(
    edition.chapterCopy?.gift,
    { kicker: t.kicker, title: t.title, subtitle: pickText(gift.subtitle, lang) || t.subtitle },
    lang,
  );

  return (
    <section
      id="section-gift"
      className="bg-[#F5EBDD] text-[#292329] py-16 sm:py-24 border-b border-[#C5A46D]/30"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium text-[#713F50] tracking-wide">{copy.kicker}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[#292329] sm:text-5xl text-balance">
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#292329]/80 sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* 3D-Inspired Interactive Box */}
          <div className="flex flex-col items-center lg:col-span-5">
            <button
              type="button"
              onClick={toggleBox}
              aria-expanded={opened}
              className="group relative flex h-72 w-72 flex-col items-center justify-end pb-6 focus-visible:outline-2 focus-visible:outline-[#713F50] rounded-2xl"
            >
              {/* Soft glow inside box when open */}
              <div
                aria-hidden="true"
                className={`absolute top-12 h-36 w-48 rounded-full bg-[#C5A46D]/45 blur-2xl transition-opacity duration-500 ${
                  opened ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Lid */}
              <div
                className={`relative z-20 w-56 rounded-xl border border-[#C5A46D]/65 bg-gradient-to-br from-[#713F50] to-[#3B212A] py-4 shadow-xl transition-transform duration-500 ease-out ${
                  opened ? '-translate-y-16 -rotate-12 scale-105' : 'translate-y-1 group-hover:-translate-y-1'
                }`}
              >
                {/* Bow loops */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                  <span className="h-5 w-7 rounded-full border-2 border-[#C5A46D] bg-[#D9A5AE]/35 -rotate-12" />
                  <span className="h-3 w-3 rounded-full bg-[#C5A46D]" />
                  <span className="h-5 w-7 rounded-full border-2 border-[#C5A46D] bg-[#D9A5AE]/35 rotate-12" />
                </div>
                <div className="mx-auto h-2 w-12 rounded-full bg-[#C5A46D]" />
              </div>

              {/* Box Body */}
              <div className="relative z-10 flex h-36 w-52 items-center justify-center rounded-b-xl border-x border-b border-[#C5A46D]/55 bg-gradient-to-b from-[#542E3C] to-[#292329] shadow-2xl">
                <div className="absolute inset-y-0 w-7 bg-gradient-to-r from-[#A58552] via-[#C5A46D] to-[#A58552]" />
                <div className="absolute inset-x-0 h-5 bg-gradient-to-b from-[#C5A46D]/90 to-[#A58552]/90" />
                <Gift className="relative z-10 h-6 w-6 text-[#292329]" />
              </div>
            </button>

            <button
              type="button"
              onClick={toggleBox}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#713F50] px-6 py-3 text-sm font-medium text-[#F5EBDD] hover:bg-[#5B303F] transition-colors min-h-[44px]"
            >
              <Sparkles className="h-4 w-4 text-[#C5A46D]" />
              <span>{opened ? t.closeGift : t.openGift}</span>
            </button>
          </div>

          {/* Revealed Surprise Panel */}
          <div className="lg:col-span-7">
            <div
              className={`rounded-2xl border border-[#C5A46D]/40 bg-[#FBF5EC] p-6 sm:p-8 shadow-sm transition-all duration-500 ${
                opened ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'
              }`}
            >
              {!opened ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                  <Gift className="mb-3 h-8 w-8 text-[#713F50]" />
                  <h3 className="font-display text-2xl font-semibold text-[#292329]">
                    {pickText(gift.title, lang)}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-[#292329]/75">
                    {t.openGift}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#C5A46D]/30 pb-3">
                    <h3 className="font-display text-2xl font-semibold text-[#292329]">
                      {pickText(gift.title, lang)}
                    </h3>
                    <span className="text-xs font-medium text-[#713F50]">
                      {t.fromLabel} {pickText(gift.sender, lang)}
                    </span>
                  </div>

                  {gift.contentType === 'photo' && gift.mediaUrl && !imgError && (
                    <div className="overflow-hidden rounded-xl border border-[#C5A46D]/35 bg-[#F5EBDD]">
                      <img
                        src={gift.mediaUrl}
                        alt={pickText(gift.title, lang)}
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                        className="max-h-72 w-full object-cover"
                      />
                    </div>
                  )}

                  {gift.contentType === 'video' && gift.mediaUrl && (
                    <video
                      src={gift.mediaUrl}
                      controls
                      playsInline
                      className="max-h-72 w-full rounded-xl border border-[#C5A46D]/35 bg-[#292329]"
                    />
                  )}

                  {gift.contentType === 'audio' && gift.mediaUrl && (
                    <div className="rounded-xl border border-[#C5A46D]/35 bg-[#F5EBDD] p-4">
                      <audio src={gift.mediaUrl} controls className="w-full" />
                    </div>
                  )}

                  <div className="font-display text-xl text-[#292329]">
                    <RichTextDisplay text={pickText(gift.message, lang)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
