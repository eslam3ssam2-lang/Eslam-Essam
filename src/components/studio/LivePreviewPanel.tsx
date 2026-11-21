import { useRef, useState } from 'react';
import { Monitor, RotateCcw, Smartphone } from 'lucide-react';
import { DEFAULT_WISHES } from '../../data/defaultExperience.ts';
import { pickText, UI_STRINGS } from '../../i18n/translations.ts';
import type { BirthdayEdition, Language, SectionKey, WishItem } from '../../types/birthday.ts';
import { BirthdayMagazine } from '../BirthdayMagazine.tsx';
import { BirthdayStage3D } from '../BirthdayStage3D.tsx';
import { CinematicBirthdayIntro } from '../CinematicBirthdayIntro.tsx';
import { EmotionalFinale } from '../EmotionalFinale.tsx';
import { FutureLetter } from '../FutureLetter.tsx';
import { GamesHub } from '../GamesHub.tsx';
import { InteractiveCake } from '../InteractiveCake.tsx';
import { InteractiveGiftBox } from '../InteractiveGiftBox.tsx';
import { MemoryAlbum } from '../MemoryAlbum.tsx';
import { MessagesGallery } from '../MessagesGallery.tsx';
import { ScratchCards } from '../ScratchCards.tsx';
import { WelcomeCover } from '../WelcomeCover.tsx';
import { WishTreeSection } from '../WishTreeSection.tsx';
import { StudioSectionHeader } from './StudioControls.tsx';

interface LivePreviewPanelProps {
  draft: BirthdayEdition;
  wishes: WishItem[];
  initialLang: Language;
}

type PreviewStage = 'full' | 'intro' | 'envelope' | 'magazine';

export function LivePreviewPanel({
  draft,
  wishes,
  initialLang,
}: LivePreviewPanelProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [stage, setStage] = useState<PreviewStage>('full');
  const [previewLang, setPreviewLang] = useState<Language>(initialLang);
  const [introReplayKey, setIntroReplayKey] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [petalsActive, setPetalsActive] = useState(draft.appearance.effects.petals);
  const scrollFrameRef = useRef<HTMLDivElement | null>(null);
  const sectionNames = UI_STRINGS[previewLang].sectionNames;

  const previewWishes = wishes.length > 0 ? wishes : DEFAULT_WISHES;

  const jumpToChapter = (secKey: SectionKey) => {
    setStage('full');
    window.requestAnimationFrame(() => {
      const container = scrollFrameRef.current;
      if (!container) return;
      const target = container.querySelector(`#preview-chap-${secKey}`) as HTMLElement | null;
      if (target) {
        container.scrollTo({
          top: target.offsetTop - 16,
          behavior: 'smooth',
        });
      }
    });
  };

  const renderSectionNode = (key: SectionKey) => {
    if (!draft.visibleSections[key]) return null;
    switch (key) {
      case 'stage3d':
        if (!draft.appearance.effects.stage3d) return null;
        return (
          <BirthdayStage3D
            lang={previewLang}
            recipientName={pickText(draft.recipientName, previewLang)}
            age={draft.age}
            petalsActive={petalsActive}
            onTogglePetals={() => setPetalsActive((p) => !p)}
            chapterCopy={draft.chapterCopy?.stage3d}
          />
        );
      case 'cake':
        return <InteractiveCake edition={draft} lang={previewLang} />;
      case 'gift':
        return <InteractiveGiftBox edition={draft} lang={previewLang} />;
      case 'memories':
        return <MemoryAlbum edition={draft} lang={previewLang} />;
      case 'magazine':
        return <BirthdayMagazine edition={draft} lang={previewLang} />;
      case 'scratch':
        return <ScratchCards edition={draft} lang={previewLang} />;
      case 'games':
        return <GamesHub edition={draft} lang={previewLang} />;
      case 'messages':
        return <MessagesGallery edition={draft} lang={previewLang} />;
      case 'wishtree':
        return (
          <WishTreeSection
            edition={draft}
            wishes={previewWishes}
            lang={previewLang}
            onWishAdded={() => undefined}
          />
        );
      case 'letter':
        return <FutureLetter edition={draft} lang={previewLang} />;
      case 'finale':
        return <EmotionalFinale edition={draft} lang={previewLang} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <StudioSectionHeader
        kicker="Module 8 · Live Interactive Preview"
        title="Preview Draft Changes Live"
        description="Inspect your unsaved draft across Desktop and Mobile viewports—including the Matrix Countdown Intro, Chapter IX Interactive Envelope, 3D Physical Magazine, and every chapter—before publishing live."
      />

      {/* Preview Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-3.5">
        {/* Stage Switch */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['full', 'Full Website'],
              ['intro', 'Matrix Intro + Countdown'],
              ['envelope', 'Chapter IX Envelope'],
              ['magazine', '3D Magazine'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStage(key);
                if (key === 'intro') {
                  setIntroDone(false);
                  setIntroReplayKey((k) => k + 1);
                }
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                stage === key
                  ? 'bg-[#713F50] text-[#F5EBDD]'
                  : 'bg-[#1E191E] text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Chapter Jump */}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) jumpToChapter(e.target.value as SectionKey);
            }}
            className="rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-2.5 py-1.5 text-xs text-[#F5EBDD]"
          >
            <option value="">Jump to chapter...</option>
            {draft.sectionOrder
              .filter((k) => draft.visibleSections[k])
              .map((secKey) => (
                <option key={secKey} value={secKey}>
                  {sectionNames[secKey]}
                </option>
              ))}
          </select>

          {/* Language Toggle */}
          <div className="flex items-center rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] p-0.5 text-xs">
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreviewLang(l)}
                className={`rounded-md px-2.5 py-1 font-medium ${
                  previewLang === l ? 'bg-[#C5A46D] text-[#292329]' : 'text-[#F5EBDD]/70'
                }`}
              >
                {l === 'en' ? 'EN' : 'AR'}
              </button>
            ))}
          </div>

          {/* Viewport Switch */}
          <div className="flex items-center rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              title="Desktop preview"
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                viewport === 'desktop' ? 'bg-[#C5A46D] text-[#292329]' : 'text-[#F5EBDD]/70'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              title="Mobile preview"
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                viewport === 'mobile' ? 'bg-[#C5A46D] text-[#292329]' : 'text-[#F5EBDD]/70'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contained Live Preview Viewport */}
      <div className="flex justify-center rounded-2xl border border-[#C5A46D]/30 bg-[#120F12] p-3 sm:p-5">
        <div
          ref={scrollFrameRef}
          dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
          className={`relative overflow-y-auto overflow-x-hidden rounded-xl border border-[#C5A46D]/30 bg-[#292329] text-[#F5EBDD] shadow-2xl transition-all duration-300 ${
            viewport === 'mobile' ? 'w-[390px] max-w-full h-[680px]' : 'w-full h-[680px]'
          }`}
        >
          {stage === 'intro' && (
            <div className="relative h-full w-full min-h-[560px]">
              {!introDone ? (
                <CinematicBirthdayIntro
                  key={introReplayKey}
                  edition={draft}
                  lang={previewLang}
                  ready
                  previewMode
                  onChangeLang={setPreviewLang}
                  onComplete={() => setIntroDone(true)}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="font-display text-2xl text-[#F5EBDD]">Intro Sequence Complete</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIntroDone(false);
                      setIntroReplayKey((k) => k + 1);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Replay Countdown & Matrix Intro
                  </button>
                </div>
              )}
            </div>
          )}

          {stage === 'envelope' && <FutureLetter edition={draft} lang={previewLang} />}

          {stage === 'magazine' && <BirthdayMagazine edition={draft} lang={previewLang} />}

          {stage === 'full' && (
            <div>
              <WelcomeCover
                edition={draft}
                lang={previewLang}
                opened={false}
                onStart={() => jumpToChapter(draft.sectionOrder[0] || 'cake')}
                onChangeLang={setPreviewLang}
              />
              {draft.sectionOrder.map((secKey) => (
                <div key={secKey} id={`preview-chap-${secKey}`}>
                  {renderSectionNode(secKey)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
