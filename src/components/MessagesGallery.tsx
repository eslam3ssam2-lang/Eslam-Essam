import { useState } from 'react';
import { Film, Mail, Mic, Pause, Play } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language, MessageCategory } from '../types/birthday.ts';
import { RichTextDisplay } from './RichTextContent.tsx';

export function MessagesGallery({
  edition,
  lang,
}: {
  edition: BirthdayEdition;
  lang: Language;
}) {
  const [filter, setFilter] = useState<'all' | 'text' | 'audio' | 'video' | 'photo'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MessageCategory>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const { activeClipId, playMemoryClip } = useAudio();
  const t = UI_STRINGS[lang].messages;
  const heading = pickChapterCopy(
    edition.chapterCopy?.messages,
    { kicker: t.kicker, title: t.title, subtitle: t.subtitle },
    lang,
  );

  const filtered = edition.messages.filter((m) => {
    const typeOk = filter === 'all' ? true : m.type === filter;
    const catOk = categoryFilter === 'all' ? true : (m.category || 'family') === categoryFilter;
    return typeOk && catOk;
  });

  return (
    <section
      id="section-messages"
      className="bg-[#292329] text-[#F5EBDD] py-16 sm:py-24 border-b border-[#C5A46D]/20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#C5A46D]/20 pb-6">
          <div>
            <p className="text-xs font-medium text-[#C5A46D] tracking-wide">{heading.kicker}</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5EBDD] sm:text-5xl text-balance">
              {heading.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#F5EBDD]/75">{heading.subtitle}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#1E191E] p-1">
              {(
                [
                  ['all', t.allTypes],
                  ['text', t.letterType],
                  ['audio', t.audioType],
                  ['video', t.videoType],
                  ['photo', t.photoType],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    filter === key
                      ? 'bg-[#713F50] text-[#F5EBDD]'
                      : 'text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#1E191E]/75 p-1">
              {(
                [
                  ['all', t.catAll],
                  ['romantic', t.catRomantic],
                  ['friendship', t.catFriendship],
                  ['family', t.catFamily],
                ] as const
              ).map(([catKey, label]) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setCategoryFilter(catKey)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === catKey
                      ? 'bg-[#C5A46D] text-[#292329] font-semibold'
                      : 'text-[#F5EBDD]/70 hover:text-[#F5EBDD]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((msg) => {
            const isPlaying = activeClipId === `msg-${msg.id}`;
            return (
              <article
                key={msg.id}
                className="flex flex-col justify-between rounded-2xl border border-[#C5A46D]/30 bg-[#1E191E] p-6 sm:p-7 shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#D9A5AE]">
                    <span>
                      {pickText(msg.sender, lang)} · {pickText(msg.relation, lang)}
                    </span>
                    <span className="tabular-nums text-[#F5EBDD]/60">{msg.date}</span>
                  </div>

                  <h3 className="mt-3 font-display text-2xl font-semibold text-[#F5EBDD]">
                    {pickText(msg.title, lang)}
                  </h3>

                  {msg.type === 'photo' && msg.mediaUrl && !failedImages[msg.id] && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-[#C5A46D]/25">
                      <img
                        src={msg.mediaUrl}
                        alt={pickText(msg.title, lang)}
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImages((prev) => ({ ...prev, [msg.id]: true }))}
                        className="h-52 w-full object-cover"
                      />
                    </div>
                  )}

                  {msg.type === 'video' && msg.mediaUrl && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-[#C5A46D]/25 bg-black">
                      <video src={msg.mediaUrl} controls playsInline className="max-h-64 w-full" />
                    </div>
                  )}

                  {msg.type === 'audio' && msg.mediaUrl && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#C5A46D]/25 bg-[#292329] p-3.5">
                      <button
                        type="button"
                        onClick={() => playMemoryClip(msg.mediaUrl!, `msg-${msg.id}`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#C5A46D] px-3.5 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
                      >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        <span>{pickText(msg.title, lang)}</span>
                      </button>
                      <audio src={msg.mediaUrl} controls className="h-9 flex-1 min-w-[180px]" />
                    </div>
                  )}

                  <div className="mt-4 text-sm text-[#F5EBDD]/85 sm:text-base">
                    <RichTextDisplay text={pickText(msg.body, lang)} />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#C5A46D]/20 pt-3 text-xs text-[#C5A46D]/90">
                  <span className="inline-flex items-center gap-2">
                    {msg.type === 'audio' && <Mic className="h-3.5 w-3.5" />}
                    {msg.type === 'video' && <Film className="h-3.5 w-3.5" />}
                    {(msg.type === 'text' || msg.type === 'photo') && <Mail className="h-3.5 w-3.5" />}
                    <span>{pickText(msg.sender, lang)}</span>
                  </span>
                  {msg.category && (
                    <span className="text-[11px] text-[#F5EBDD]/55">
                      {msg.category === 'romantic'
                        ? t.catRomantic
                        : msg.category === 'friendship'
                          ? t.catFriendship
                          : t.catFamily}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
