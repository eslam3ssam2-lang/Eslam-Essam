import { useState } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';
import { RichTextDisplay } from './RichTextContent.tsx';

export function EmotionalFinale({
  edition,
  lang,
}: {
  edition: BirthdayEdition;
  lang: Language;
}) {
  const [imgError, setImgError] = useState(false);
  const { playFanfare } = useAudio();
  const t = UI_STRINGS[lang].finale;
  const heading = pickChapterCopy(
    edition.chapterCopy?.finale,
    { kicker: t.kicker, title: pickText(edition.finale.title, lang) },
    lang,
  );

  const launchFinale = () => {
    triggerCelebrationBurst('fireworks');
    window.setTimeout(() => triggerCelebrationBurst('confetti'), 350);
    playFanfare();
  };

  return (
    <section
      id="section-finale"
      className="relative overflow-hidden bg-[#1E191E] text-[#F5EBDD] py-20 sm:py-28 pb-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(197,164,109,0.16),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(113,63,80,0.38),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{heading.kicker}</p>
        <h2 className="mt-3 font-display text-4xl font-semibold text-[#F5EBDD] sm:text-6xl text-balance">
          {heading.title}
        </h2>

        {edition.finale.mediaUrl && !imgError && (
          <div className="mx-auto mt-10 max-w-lg overflow-hidden rounded-2xl border border-[#C5A46D]/35 bg-[#292329] shadow-2xl">
            {edition.finale.mediaType === 'video' ? (
              <video src={edition.finale.mediaUrl} controls playsInline className="w-full" />
            ) : (
              <img
                src={edition.finale.mediaUrl}
                alt={heading.title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="aspect-[4/3] w-full object-cover"
              />
            )}
          </div>
        )}

        <div className="mx-auto mt-8 max-w-2xl font-display text-xl text-[#F5EBDD]/90 sm:text-2xl">
          <RichTextDisplay text={pickText(edition.finale.message, lang)} />
        </div>

        <p className="mt-6 text-sm text-[#D9A5AE] font-medium">
          {pickText(edition.finale.signature, lang)}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={launchFinale}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C5A46D] px-6 py-3.5 text-sm font-semibold text-[#292329] hover:bg-[#D4B47F] transition-colors min-h-[44px]"
          >
            <Sparkles className="h-4 w-4" />
            <span>{t.launchFireworks}</span>
          </button>

          <a
            href="#cover"
            className="inline-flex items-center gap-2 rounded-lg border border-[#C5A46D]/40 bg-white/5 px-6 py-3.5 text-sm font-medium text-[#F5EBDD] hover:bg-white/10 transition-colors min-h-[44px]"
          >
            <ArrowUp className="h-4 w-4" />
            <span>{t.replayJourney}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
