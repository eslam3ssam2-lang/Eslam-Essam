import { useState } from 'react';
import { BookOpen, ChevronDown, Music2 } from 'lucide-react';
import { pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';
import { RichTextDisplay } from './RichTextContent.tsx';

interface WelcomeCoverProps {
  edition: BirthdayEdition;
  lang: Language;
  opened: boolean;
  onStart: (withMusic: boolean) => void;
  onChangeLang: (next: Language) => void;
}

export function WelcomeCover({
  edition,
  lang,
  opened,
  onStart,
  onChangeLang,
}: WelcomeCoverProps) {
  const [imgError, setImgError] = useState(false);
  const t = UI_STRINGS[lang].hero;

  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(`${edition.birthdayDate}T12:00:00`));
    } catch {
      return edition.birthdayDate;
    }
  })();

  const nickname = pickText(edition.nickname, lang);
  const personalBio = pickText(edition.personalBio, lang);
  const openingTitle = pickText(edition.openingLetter?.title, lang);
  const openingBody = pickText(edition.openingLetter?.body, lang);

  return (
    <section
      id="cover"
      className="relative overflow-hidden bg-[#292329] text-[#F5EBDD] border-b border-[#C5A46D]/20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(113,63,80,0.42),transparent_56%),radial-gradient(circle_at_80%_75%,rgba(217,165,174,0.16),transparent_52%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#C5A46D]/20 pb-4 text-xs text-[#F5EBDD]/75">
          <div className="flex flex-wrap items-center gap-2">
            <span>{t.editionLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{pickText(edition.relationship, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[#C5A46D]">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] p-1">
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                lang === 'en' ? 'bg-[#C5A46D] text-[#292329] font-semibold' : 'text-[#F5EBDD]/80 hover:text-[#F5EBDD]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('ar')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                lang === 'ar' ? 'bg-[#C5A46D] text-[#292329] font-semibold' : 'text-[#F5EBDD]/80 hover:text-[#F5EBDD]'
              }`}
            >
              العربية
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="mb-3 text-sm font-medium text-[#D9A5AE] tracking-wide">
              {t.turningAge} <span className="tabular-nums text-[#C5A46D] font-semibold">{edition.age}</span>
              {edition.birthYear ? (
                <span className="text-[#F5EBDD]/65 tabular-nums"> · {edition.birthYear}</span>
              ) : null}
              {nickname ? <span className="text-[#D9A5AE]/90"> · “{nickname}”</span> : null}
            </p>

            <h1 className="font-display text-4xl font-semibold leading-[1.12] text-[#F5EBDD] sm:text-5xl lg:text-6xl text-balance">
              {pickText(edition.recipientName, lang)}
            </h1>

            {personalBio && (
              <p className="mt-3 text-sm font-medium text-[#D9A5AE]/90">{personalBio}</p>
            )}

            <div className="mt-5 max-w-xl text-base text-[#F5EBDD]/85 sm:text-lg">
              <RichTextDisplay text={pickText(edition.welcomeMessage, lang)} />
            </div>

            {openingBody && (
              <div className="mt-5 rounded-xl border border-[#C5A46D]/25 bg-[#1E191E]/65 p-4 text-xs sm:text-sm text-[#F5EBDD]/80">
                {openingTitle && (
                  <p className="font-display text-base font-semibold text-[#C5A46D] mb-1.5">
                    {openingTitle}
                  </p>
                )}
                <RichTextDisplay text={openingBody} compact />
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onStart(false)}
                className="inline-flex items-center gap-2.5 rounded-lg bg-[#C5A46D] px-6 py-3.5 text-sm font-semibold text-[#292329] transition-all duration-150 hover:bg-[#D4B47F] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5EBDD] whitespace-nowrap shrink-0 min-h-[44px]"
              >
                <BookOpen className="h-4 w-4" />
                <span>{t.startExperience}</span>
              </button>

              <button
                type="button"
                onClick={() => onStart(true)}
                className="inline-flex items-center gap-2.5 rounded-lg border border-[#C5A46D]/45 bg-[#713F50]/85 px-6 py-3.5 text-sm font-medium text-[#F5EBDD] transition-colors hover:bg-[#713F50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A46D] whitespace-nowrap shrink-0 min-h-[44px]"
              >
                <Music2 className="h-4 w-4 text-[#D9A5AE]" />
                <span>{t.startWithMusic}</span>
              </button>
            </div>

            {opened && (
              <p className="mt-6 inline-flex items-center gap-2 text-xs text-[#C5A46D]/90">
                <ChevronDown className="h-4 w-4" />
                <span>{t.scrollHint}</span>
              </p>
            )}
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] sm:min-h-[380px] overflow-hidden rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] shadow-2xl">
              {!imgError && edition.heroImageUrl ? (
                <img
                  src={edition.heroImageUrl}
                  alt={pickText(edition.recipientName, lang)}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center bg-gradient-to-br from-[#3D252E] via-[#292329] to-[#1E191E] p-8 text-center">
                  <BookOpen className="mb-3 h-10 w-10 text-[#C5A46D]" />
                  <p className="font-display text-2xl text-[#F5EBDD]">
                    {pickText(edition.bookTitle, lang)}
                  </p>
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#292329]/85 via-[#292329]/15 to-transparent"
              />
              <div className="absolute bottom-5 inset-x-5 flex items-end justify-between gap-4 text-xs text-[#F5EBDD]/90">
                <span className="font-display text-lg italic text-[#F5EBDD]">
                  {pickText(edition.bookTitle, lang)}
                </span>
                <span className="tabular-nums text-[#C5A46D]">{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
