import React, { useMemo, useState } from 'react';
import { Flower2, Leaf, Send, Star } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language, WishItem } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';

interface WishTreeSectionProps {
  edition: BirthdayEdition;
  wishes: WishItem[];
  lang: Language;
  onWishAdded: (wish: WishItem) => void;
}

const CANOPY_SLOTS: Array<[number, number]> = [
  [210, 95],
  [145, 125],
  [275, 120],
  [115, 175],
  [185, 155],
  [250, 160],
  [305, 178],
  [155, 210],
  [225, 200],
  [280, 222],
  [100, 225],
  [325, 232],
  [180, 118],
  [245, 115],
  [135, 152],
  [292, 148],
];

export function WishTreeSection({
  edition,
  wishes,
  lang,
  onWishAdded,
}: WishTreeSectionProps) {
  const [selectedWishId, setSelectedWishId] = useState<string | null>(wishes[0]?.id || null);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [style, setStyle] = useState<'leaf' | 'star' | 'blossom'>('star');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const { playChime } = useAudio();
  const t = UI_STRINGS[lang].wishTree;
  const copy = pickChapterCopy(
    edition.chapterCopy?.wishtree,
    {
      kicker: t.kicker,
      title: t.title,
      subtitle: pickText(edition.wishTreeSettings.promptText, lang) || t.subtitle,
    },
    lang,
  );

  const selectedWish = useMemo(
    () => wishes.find((w) => w.id === selectedWishId) || wishes[0] || null,
    [selectedWishId, wishes],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !message.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/experience/${encodeURIComponent(edition.slug)}/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: author.trim(), message: message.trim(), style }),
      });
      const data = (await res.json()) as { wish?: WishItem; error?: string };
      if (!res.ok || !data.wish) {
        throw new Error(data.error || 'Could not submit wish.');
      }

      if (data.wish.status === 'approved') {
        onWishAdded(data.wish);
        setSelectedWishId(data.wish.id);
        triggerCelebrationBurst('confetti');
        playChime();
        setFeedback({ type: 'ok', text: t.submittedApproved });
      } else {
        setFeedback({ type: 'ok', text: t.submittedPending });
      }
      setAuthor('');
      setMessage('');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save wish.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="section-wishtree"
      className="bg-[#F5EBDD] text-[#292329] py-16 sm:py-24 border-b border-[#C5A46D]/30"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium text-[#713F50] tracking-wide">{copy.kicker}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[#292329] sm:text-5xl text-balance">
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#292329]/80 sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          {/* Interactive Botanical Wish Tree */}
          <div className="lg:col-span-6 rounded-2xl border border-[#C5A46D]/40 bg-[#292329] p-6 text-[#F5EBDD] shadow-xl">
            <div className="relative mx-auto max-w-md">
              <svg viewBox="0 0 420 380" className="w-full h-auto">
                <defs>
                  <radialGradient id="canopyGlow" cx="50%" cy="45%" r="50%">
                    <stop offset="0%" stopColor="#713F50" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#292329" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <circle cx="210" cy="165" r="145" fill="url(#canopyGlow)" />

                {/* Ground mound */}
                <ellipse cx="210" cy="350" rx="115" ry="12" fill="#1E191E" />

                {/* Trunk & Branches */}
                <path
                  d="M196,350 C198,295 198,255 190,220 C175,180 140,155 105,140 M224,350 C222,295 222,255 230,220 C248,180 282,155 316,138 M210,245 C210,195 210,145 210,85 M195,185 C165,150 145,120 135,100 M225,185 C255,150 278,125 292,102"
                  fill="none"
                  stroke="#C5A46D"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <path
                  d="M202,350 L204,235 L216,235 L218,350 Z"
                  fill="#9E7D4A"
                  opacity="0.72"
                />

                {/* Interactive Wish Ornaments */}
                {wishes.slice(0, CANOPY_SLOTS.length).map((wish, idx) => {
                  const [cx, cy] = CANOPY_SLOTS[idx];
                  const isSelected = selectedWish?.id === wish.id;
                  const fill =
                    wish.style === 'blossom'
                      ? '#D9A5AE'
                      : wish.style === 'leaf'
                        ? '#C5A46D'
                        : '#F5EBDD';
                  return (
                    <g
                      key={wish.id}
                      onClick={() => setSelectedWishId(wish.id)}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`${wish.author}: ${wish.message}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedWishId(wish.id);
                        }
                      }}
                    >
                      <line
                        x1={cx}
                        y1={cy - 14}
                        x2={cx}
                        y2={cy}
                        stroke="#C5A46D"
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      {isSelected && (
                        <circle cx={cx} cy={cy} r="17" fill={fill} opacity="0.24" />
                      )}
                      {wish.style === 'star' ? (
                        <polygon
                          points={`${cx},${cy - 10} ${cx + 3},${cy - 3} ${cx + 10},${cy - 3} ${cx + 4},${cy + 2} ${cx + 6},${cy + 9} ${cx},${cy + 5} ${cx - 6},${cy + 9} ${cx - 4},${cy + 2} ${cx - 10},${cy - 3} ${cx - 3},${cy - 3}`}
                          fill={fill}
                          stroke="#292329"
                          strokeWidth="1"
                        />
                      ) : wish.style === 'blossom' ? (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? 10 : 8}
                          fill={fill}
                          stroke="#F5EBDD"
                          strokeWidth="1.2"
                        />
                      ) : (
                        <ellipse
                          cx={cx}
                          cy={cy}
                          rx={isSelected ? 10 : 8}
                          ry={isSelected ? 6.5 : 5}
                          transform={`rotate(-25 ${cx} ${cy})`}
                          fill={fill}
                          stroke="#292329"
                          strokeWidth="1"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {selectedWish && (
              <div className="mt-4 rounded-xl border border-[#C5A46D]/35 bg-[#1E191E] p-4">
                <p className="text-xs font-medium text-[#C5A46D]">{selectedWish.author}</p>
                <p className="mt-1 font-display text-lg text-[#F5EBDD] leading-relaxed">
                  “{selectedWish.message}”
                </p>
              </div>
            )}
          </div>

          {/* Add Wish Form */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-2xl border border-[#C5A46D]/40 bg-[#FBF5EC] p-6 sm:p-7 shadow-sm">
              {!edition.wishTreeSettings.allowPublicSubmissions ? (
                <p className="text-sm text-[#292329]/75">{t.submissionsClosed}</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      maxLength={60}
                      required
                      placeholder={t.authorPlaceholder}
                      className="w-full rounded-lg border border-[#C5A46D]/45 bg-[#F5EBDD] px-4 py-3 text-sm text-[#292329] placeholder:text-[#292329]/50 focus:border-[#713F50] focus:outline-none"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={400}
                      required
                      placeholder={t.messagePlaceholder}
                      className="w-full rounded-lg border border-[#C5A46D]/45 bg-[#F5EBDD] px-4 py-3 text-sm text-[#292329] placeholder:text-[#292329]/50 focus:border-[#713F50] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ['star', t.styleStar, Star],
                        ['leaf', t.styleLeaf, Leaf],
                        ['blossom', t.styleBlossom, Flower2],
                      ] as const
                    ).map(([key, label, Icon]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStyle(key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          style === key
                            ? 'border-[#713F50] bg-[#713F50] text-[#F5EBDD]'
                            : 'border-[#C5A46D]/40 bg-[#F5EBDD] text-[#292329] hover:border-[#713F50]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#713F50] px-5 py-3 text-sm font-medium text-[#F5EBDD] hover:bg-[#5B303F] disabled:opacity-60 transition-colors min-h-[44px]"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? t.submitting : t.submitWish}</span>
                  </button>

                  {feedback && (
                    <p
                      className={`text-xs font-medium ${
                        feedback.type === 'ok' ? 'text-[#713F50]' : 'text-rose-700'
                      }`}
                    >
                      {feedback.text}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Message Wall */}
            <div>
              <h3 className="font-display text-2xl font-semibold text-[#292329] mb-4">
                {t.wallTitle} <span className="text-sm font-sans text-[#713F50] tabular-nums">({wishes.length})</span>
              </h3>

              {wishes.length === 0 ? (
                <p className="text-sm text-[#292329]/70">{t.emptyWall}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {wishes.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWishId(w.id)}
                      className={`text-start rounded-xl border p-4 transition-colors ${
                        selectedWish?.id === w.id
                          ? 'border-[#713F50] bg-[#FBF5EC] shadow-sm'
                          : 'border-[#C5A46D]/35 bg-[#FBF5EC]/80 hover:bg-[#FBF5EC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#713F50]">
                        <span className="font-semibold truncate">{w.author}</span>
                        <span className="tabular-nums opacity-70">
                          {w.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-[#292329]/85 leading-relaxed">
                        {w.message}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
