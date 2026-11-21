import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Expand,
  Film,
  Grid,
  ImageIcon,
  Pause,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language, MemoryItem } from '../types/birthday.ts';
import { RichTextDisplay } from './RichTextContent.tsx';

interface MemoryAlbumProps {
  edition: BirthdayEdition;
  lang: Language;
}

interface UnifiedTimelineEntry {
  id: string;
  date: string;
  title: string;
  story: string;
  people: string;
  photos: string[];
  audioUrl?: string;
  audioTitle?: string;
}

export function MemoryAlbum({ edition, lang }: MemoryAlbumProps) {
  const [viewMode, setViewMode] = useState<'gallery' | 'timeline'>('gallery');
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [lightboxMedia, setLightboxMedia] = useState<
    Array<{ url: string; type: 'photo' | 'video'; title: string; caption: string; date: string; location?: string }>
  >([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const { activeClipId, playMemoryClip } = useAudio();
  const t = UI_STRINGS[lang].memories;
  const copy = pickChapterCopy(
    edition.chapterCopy?.memories,
    { kicker: t.kicker, title: t.title, subtitle: t.subtitle },
    lang,
  );

  const albumList = edition.albums || [];

  const sortedAlbumMemories = useMemo(() => {
    return [...edition.memories]
      .filter((m) => m.showInAlbum !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [edition.memories]);

  const filtered: MemoryItem[] = useMemo(() => {
    return sortedAlbumMemories.filter((m) => {
      if (filter !== 'all' && m.type !== filter) return false;
      if (selectedAlbumId !== 'all' && m.albumId !== selectedAlbumId) return false;
      return true;
    });
  }, [filter, selectedAlbumId, sortedAlbumMemories]);

  const timelineEntries: UnifiedTimelineEntry[] = useMemo(() => {
    const manualTimeline: UnifiedTimelineEntry[] = (edition.timeline || []).map((ev) => ({
      id: ev.id,
      date: ev.date || '',
      title: pickText(ev.title, lang),
      story: pickText(ev.story, lang),
      people: pickText(ev.people, lang),
      photos: (ev.photos || []).filter(Boolean),
      audioUrl: ev.audioUrl,
      audioTitle: ev.audioTitle ? pickText(ev.audioTitle, lang) : undefined,
    }));

    const existingKeys = new Set(manualTimeline.map((e) => `${e.date}::${e.title.toLowerCase()}`));

    const memoryTimeline: UnifiedTimelineEntry[] = sortedAlbumMemories
      .filter((m) => m.showInTimeline && m.type === 'photo')
      .map((m) => ({
        id: `mem-tl-${m.id}`,
        date: m.date || '',
        title: pickText(m.title, lang),
        story: pickText(m.caption, lang),
        people: pickText(m.location, lang),
        photos: m.mediaUrl ? [m.mediaUrl] : [],
        audioUrl: m.audioUrl,
        audioTitle: m.audioTitle ? pickText(m.audioTitle, lang) : undefined,
      }))
      .filter((e) => !existingKeys.has(`${e.date}::${e.title.toLowerCase()}`));

    return [...manualTimeline, ...memoryTimeline].sort((a, b) => a.date.localeCompare(b.date));
  }, [edition.timeline, lang, sortedAlbumMemories]);

  useEffect(() => {
    if (lightboxIdx === null || lightboxMedia.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') {
        setLightboxIdx((prev) => (prev === null ? null : (prev + 1) % lightboxMedia.length));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev - 1 + lightboxMedia.length) % lightboxMedia.length,
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, lightboxMedia.length]);

  const openMemoryLightbox = (idx: number) => {
    setLightboxMedia(
      filtered.map((m) => ({
        url: m.mediaUrl,
        type: m.type,
        title: pickText(m.title, lang),
        caption: pickText(m.caption, lang),
        date: m.date,
        location: pickText(m.location, lang),
      })),
    );
    setLightboxIdx(idx);
  };

  const openTimelinePhotoLightbox = (entry: UnifiedTimelineEntry, photoIdx: number) => {
    setLightboxMedia(
      entry.photos.map((url) => ({
        url,
        type: 'photo' as const,
        title: entry.title,
        caption: entry.story,
        date: entry.date,
        location: entry.people,
      })),
    );
    setLightboxIdx(photoIdx);
  };

  const activeItem = lightboxIdx !== null ? lightboxMedia[lightboxIdx] : null;

  return (
    <section
      id="section-memories"
      className="bg-[#F5EBDD] text-[#292329] py-16 sm:py-24 border-b border-[#C5A46D]/30"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#C5A46D]/30 pb-6">
          <div>
            <p className="text-xs font-medium text-[#713F50] tracking-wide">{copy.kicker}</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#292329] sm:text-5xl text-balance">
              {copy.title}
            </h2>
            {copy.subtitle && <p className="mt-2 max-w-xl text-sm text-[#292329]/80">{copy.subtitle}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Gallery vs. Chronological Timeline Switch */}
            <div className="flex items-center gap-1 rounded-lg border border-[#C5A46D]/35 bg-[#FBF5EC] p-1">
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'gallery'
                    ? 'bg-[#292329] text-[#F5EBDD] shadow-sm'
                    : 'text-[#292329]/75 hover:text-[#292329]'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>{t.tabGallery}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'timeline'
                    ? 'bg-[#292329] text-[#F5EBDD] shadow-sm'
                    : 'text-[#292329]/75 hover:text-[#292329]'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{t.tabTimeline}</span>
              </button>
            </div>

            {viewMode === 'gallery' && (
              <div className="flex items-center gap-1 rounded-lg bg-[#292329]/8 p-1">
                {(['all', 'photo', 'video'] as const).map((key) => {
                  const label =
                    key === 'all' ? t.allFilter : key === 'photo' ? t.photosFilter : t.videosFilter;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setFilter(key);
                        setLightboxIdx(null);
                      }}
                      className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        filter === key
                          ? 'bg-[#713F50] text-[#F5EBDD] shadow-sm'
                          : 'text-[#292329]/75 hover:text-[#292329]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Album Category Filter Strip */}
        {viewMode === 'gallery' && albumList.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedAlbumId('all')}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedAlbumId === 'all'
                  ? 'border-[#713F50] bg-[#713F50] text-[#F5EBDD]'
                  : 'border-[#C5A46D]/40 bg-[#FBF5EC] text-[#292329]/80 hover:border-[#713F50]'
              }`}
            >
              {t.allAlbums}
            </button>
            {albumList.map((alb) => (
              <button
                key={alb.id}
                type="button"
                onClick={() => setSelectedAlbumId(alb.id)}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  selectedAlbumId === alb.id
                    ? 'border-[#713F50] bg-[#713F50] text-[#F5EBDD]'
                    : 'border-[#C5A46D]/40 bg-[#FBF5EC] text-[#292329]/80 hover:border-[#713F50]'
                }`}
              >
                {pickText(alb.title, lang)}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'gallery' ? (
          filtered.length === 0 ? (
            <div className="mt-10 rounded-xl border border-[#C5A46D]/35 bg-[#FBF5EC] p-12 text-center text-sm text-[#292329]/70">
              {t.empty}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item, idx) => {
                const isAudioPlaying = activeClipId === `memory-${item.id}`;
                return (
                  <article
                    key={item.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[#C5A46D]/35 bg-[#FBF5EC] shadow-sm transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#292329]">
                      {item.type === 'video' ? (
                        <video
                          src={item.mediaUrl}
                          controls
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : !failedImages[item.id] ? (
                        <img
                          src={item.mediaUrl}
                          alt={pickText(item.title, lang)}
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#292329] to-[#713F50] p-6 text-center text-[#F5EBDD]">
                          <ImageIcon className="mb-2 h-8 w-8 text-[#C5A46D]" />
                          <span className="font-display text-lg">{pickText(item.title, lang)}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openMemoryLightbox(idx)}
                        aria-label={t.openLightbox}
                        className="absolute top-3 end-3 rounded-lg bg-[#292329]/85 p-2 text-[#F5EBDD] hover:bg-[#713F50] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        {item.type === 'video' ? <Film className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2 text-xs text-[#713F50] tabular-nums">
                        <span>{item.date}</span>
                        {pickText(item.location, lang) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{pickText(item.location, lang)}</span>
                          </>
                        )}
                      </div>

                      <h3 className="mt-2 font-display text-2xl font-semibold text-[#292329]">
                        {pickText(item.title, lang)}
                      </h3>

                      <div className="mt-2 flex-1 text-sm text-[#292329]/80">
                        <RichTextDisplay text={pickText(item.caption, lang)} compact />
                      </div>

                      {item.audioUrl && (
                        <div className="mt-4 border-t border-[#C5A46D]/25 pt-3">
                          <button
                            type="button"
                            onClick={() => playMemoryClip(item.audioUrl!, `memory-${item.id}`)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                              isAudioPlaying
                                ? 'bg-[#713F50] text-[#F5EBDD]'
                                : 'bg-[#F5EBDD] text-[#713F50] border border-[#C5A46D]/45 hover:bg-[#C5A46D]/20'
                            }`}
                          >
                            {isAudioPlaying ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            <span>
                              {isAudioPlaying ? t.pauseMemoryAudio : t.playMemoryAudio}
                              {item.audioTitle ? ` · ${pickText(item.audioTitle, lang)}` : ''}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : timelineEntries.length === 0 ? (
          <div className="mt-10 rounded-xl border border-[#C5A46D]/35 bg-[#FBF5EC] p-12 text-center text-sm text-[#292329]/70">
            {t.timelineEmpty}
          </div>
        ) : (
          <div className="relative mt-10 space-y-8 ps-6 sm:ps-10 before:absolute before:inset-y-2 before:start-2.5 sm:before:start-4 before:w-px before:bg-[#C5A46D]/55">
            {timelineEntries.map((entry) => {
              const clipId = `timeline-${entry.id}`;
              const isPlayingEntry = activeClipId === clipId;
              return (
                <article
                  key={entry.id}
                  className="relative rounded-2xl border border-[#C5A46D]/35 bg-[#FBF5EC] p-5 sm:p-7 shadow-sm"
                >
                  {/* Golden node marker on vertical timeline spine */}
                  <span
                    aria-hidden="true"
                    className="absolute -start-[21px] sm:-start-[31px] top-7 h-3.5 w-3.5 rounded-full border-2 border-[#F5EBDD] bg-[#713F50] shadow"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5A46D]/25 pb-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#713F50]">
                      <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-[#C5A46D]" />
                        {entry.date}
                      </span>
                      {entry.people && (
                        <span className="inline-flex items-center gap-1.5 text-[#292329]/75">
                          <Users className="h-3.5 w-3.5 text-[#C5A46D]" />
                          {entry.people}
                        </span>
                      )}
                    </div>

                    {entry.audioUrl && (
                      <button
                        type="button"
                        onClick={() => playMemoryClip(entry.audioUrl!, clipId)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isPlayingEntry
                            ? 'bg-[#713F50] text-[#F5EBDD]'
                            : 'border border-[#C5A46D]/45 bg-[#F5EBDD] text-[#713F50] hover:bg-[#C5A46D]/20'
                        }`}
                      >
                        {isPlayingEntry ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        <span>
                          {isPlayingEntry ? t.pauseMemoryAudio : t.playMemoryAudio}
                          {entry.audioTitle ? ` · ${entry.audioTitle}` : ''}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                    {entry.photos.length > 0 && (
                      <div
                        className={`lg:col-span-5 grid gap-2.5 ${
                          entry.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                        }`}
                      >
                        {entry.photos.slice(0, 4).map((url, pIdx) => (
                          <button
                            key={`${entry.id}-p-${pIdx}`}
                            type="button"
                            onClick={() => openTimelinePhotoLightbox(entry, pIdx)}
                            className="group/img relative aspect-[4/3] overflow-hidden rounded-xl border border-[#C5A46D]/35 bg-[#292329]"
                          >
                            <img
                              src={url}
                              alt={entry.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-[1.04]"
                            />
                            <span className="absolute bottom-2 end-2 rounded-md bg-[#292329]/80 p-1 text-[#F5EBDD] opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <Expand className="h-3 w-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className={entry.photos.length > 0 ? 'lg:col-span-7 space-y-2.5' : 'lg:col-span-12 space-y-2.5'}>
                      <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#292329]">
                        {entry.title}
                      </h3>
                      <div className="text-sm sm:text-base text-[#292329]/85">
                        <RichTextDisplay text={entry.story} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Viewing Modal */}
      {activeItem && lightboxIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E191E]/95 p-4 sm:p-8"
        >
          <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#C5A46D]/35 bg-[#292329] text-[#F5EBDD] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#C5A46D]/20 px-5 py-3.5">
              <div className="text-xs text-[#C5A46D] tabular-nums">
                {activeItem.date}
                {activeItem.location ? ` · ${activeItem.location}` : ''}
              </div>
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                aria-label={t.close}
                className="rounded-lg p-2 text-[#F5EBDD]/80 hover:bg-white/10 hover:text-[#F5EBDD]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex max-h-[65vh] items-center justify-center bg-[#1E191E] p-2">
              {activeItem.type === 'video' ? (
                <video src={activeItem.url} controls autoPlay className="max-h-[60vh] rounded-lg" />
              ) : (
                <img
                  src={activeItem.url}
                  alt={activeItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] w-auto rounded-lg object-contain"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div>
                <h3 className="font-display text-2xl font-semibold text-[#F5EBDD]">
                  {activeItem.title}
                </h3>
                <div className="mt-1 text-sm text-[#F5EBDD]/80">
                  <RichTextDisplay text={activeItem.caption} compact />
                </div>
              </div>

              {lightboxMedia.length > 1 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIdx((lightboxIdx - 1 + lightboxMedia.length) % lightboxMedia.length)
                    }
                    aria-label={t.prev}
                    className="rounded-lg border border-[#C5A46D]/35 p-2.5 text-[#F5EBDD] hover:bg-[#713F50]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIdx((lightboxIdx + 1) % lightboxMedia.length)}
                    aria-label={t.next}
                    className="rounded-lg border border-[#C5A46D]/35 p-2.5 text-[#F5EBDD] hover:bg-[#713F50]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
