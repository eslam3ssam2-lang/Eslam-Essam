import { useState } from 'react';
import { Globe, Music, Pause, Play, SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { Language } from '../types/birthday.ts';

interface FloatingDockProps {
  lang: Language;
  onToggleLanguage: (next: Language) => void;
}

export function FloatingDock({ lang, onToggleLanguage }: FloatingDockProps) {
  const {
    isPlaying,
    isMuted,
    volume,
    activeTrackId,
    tracks,
    togglePlay,
    toggleMute,
    setVolume,
    selectTrack,
  } = useAudio();

  const [expanded, setExpanded] = useState(false);
  const t = UI_STRINGS[lang].dock;
  const currentTrack = tracks.find((tr) => tr.id === activeTrackId) || tracks[0];

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex flex-col items-center pointer-events-none px-4">
      {expanded && (
        <div className="pointer-events-auto mb-2 w-full max-w-sm rounded-xl border border-[#C5A46D]/35 bg-[#1E191E]/95 p-4 text-[#F5EBDD] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[#C5A46D]/20 pb-2.5 mb-3">
            <span className="text-xs font-medium text-[#C5A46D]">{t.trackLabel}</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close audio drawer"
              className="rounded-md p-1.5 text-[#F5EBDD]/70 hover:text-[#F5EBDD] hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5 mb-4">
            {tracks.map((tr) => {
              const active = tr.id === currentTrack?.id;
              return (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => selectTrack(tr.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-xs transition-colors ${
                    active
                      ? 'bg-[#713F50] text-[#F5EBDD] border border-[#C5A46D]/45'
                      : 'bg-white/5 text-[#F5EBDD]/80 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <span className="truncate font-medium">{pickText(tr.title, lang)}</span>
                  <span className="text-[11px] opacity-75 shrink-0">{pickText(tr.artist, lang)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#F5EBDD]/75 shrink-0">{t.volumeLabel}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label={t.volumeLabel}
              className="w-full accent-[#C5A46D]"
            />
          </div>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#C5A46D]/35 bg-[#1E191E]/92 px-3 py-2 shadow-xl">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? t.musicPause : t.musicPlay}
          className="flex items-center gap-2 rounded-lg bg-[#713F50] px-3 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline max-w-[140px] truncate">
            {currentTrack ? pickText(currentTrack.title, lang) : t.musicPlay}
          </span>
        </button>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? t.unmute : t.mute}
          className="rounded-lg p-2.5 text-[#F5EBDD]/85 hover:bg-white/10 hover:text-[#C5A46D] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-[#D9A5AE]" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={t.trackLabel}
          className="rounded-lg p-2.5 text-[#F5EBDD]/85 hover:bg-white/10 hover:text-[#C5A46D] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          {expanded ? <SlidersHorizontal className="h-4 w-4 text-[#C5A46D]" /> : <Music className="h-4 w-4" />}
        </button>

        <div className="h-5 w-px bg-[#C5A46D]/25 mx-0.5" aria-hidden="true" />

        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1" role="group" aria-label={t.languageLabel}>
          <Globe className="h-3.5 w-3.5 text-[#C5A46D] mx-1 hidden sm:block" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onToggleLanguage('en')}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              lang === 'en' ? 'bg-[#C5A46D] text-[#292329] font-semibold' : 'text-[#F5EBDD]/80 hover:text-[#F5EBDD]'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onToggleLanguage('ar')}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              lang === 'ar' ? 'bg-[#C5A46D] text-[#292329] font-semibold' : 'text-[#F5EBDD]/80 hover:text-[#F5EBDD]'
            }`}
          >
            العربية
          </button>
        </div>
      </div>
    </div>
  );
}
