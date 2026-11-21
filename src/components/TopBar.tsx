import type { Language } from '../types/birthday.ts';
import { UI_STRINGS } from '../i18n/translations.ts';

interface TopBarProps {
  bookTitle: string;
  lang: Language;
  showFullNav?: boolean;
}

export function TopBar({ bookTitle, lang, showFullNav = true }: TopBarProps) {
  const t = UI_STRINGS[lang].nav;

  return (
    <header className="sticky top-0 z-40 border-b border-[#C5A46D]/20 bg-[#292329]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href={showFullNav ? '#cover' : '#section-magazine'}
          className="font-display text-xl font-semibold tracking-wide text-[#F5EBDD] whitespace-nowrap shrink-0 truncate max-w-[220px] sm:max-w-xs"
        >
          {bookTitle}
        </a>

        {showFullNav && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#F5EBDD]/80">
            <a
              href="#section-cake"
              className="hover:text-[#D9A5AE] transition-colors whitespace-nowrap shrink-0"
            >
              {t.celebration}
            </a>
            <a
              href="#section-memories"
              className="hover:text-[#D9A5AE] transition-colors whitespace-nowrap shrink-0"
            >
              {t.memories}
            </a>
            <a
              href="#section-magazine"
              className="hover:text-[#D9A5AE] transition-colors whitespace-nowrap shrink-0"
            >
              {UI_STRINGS[lang].sectionNames.magazine}
            </a>
            <a
              href="#section-games"
              className="hover:text-[#D9A5AE] transition-colors whitespace-nowrap shrink-0"
            >
              {t.games}
            </a>
            <a
              href="#section-wishtree"
              className="hover:text-[#D9A5AE] transition-colors whitespace-nowrap shrink-0"
            >
              {t.wishes}
            </a>
            <a
              href="#section-letter"
              className="hover:text-[#D9A5AE] transition-colors whitespace-nowrap shrink-0"
            >
              {t.finale}
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
