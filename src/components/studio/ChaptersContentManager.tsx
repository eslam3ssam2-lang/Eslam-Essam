import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Cake,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Gamepad2,
  Plus,
  Sparkles,
  Trash2,
  TreeDeciduous,
} from 'lucide-react';
import { UI_STRINGS } from '../../i18n/translations.ts';
import type {
  BirthdayEdition,
  Language,
  SectionKey,
  UploadedMediaAsset,
  WishItem,
} from '../../types/birthday.ts';
import { RichTextEditor } from '../RichTextContent.tsx';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface ChaptersContentManagerProps {
  draft: BirthdayEdition;
  lang: Language;
  token: string | null;
  adminWishes: WishItem[];
  onRefreshWishes: () => Promise<void>;
  onWishesChangedPublic: () => void;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

export function ChaptersContentManager({
  draft,
  lang,
  token,
  adminWishes,
  onRefreshWishes,
  onWishesChangedPublic,
  onChange,
  uploadingField,
  onUploadFile,
  mediaLibrary,
  onRefreshLibrary,
}: ChaptersContentManagerProps) {
  const [subTab, setSubTab] = useState<'intro_effects' | 'cake_gift' | 'games' | 'wishtree_layout'>(
    'intro_effects',
  );
  const sectionNames = UI_STRINGS[lang].sectionNames;

  const moveSection = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= draft.sectionOrder.length) return;
    const next = [...draft.sectionOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange((prev) => ({ ...prev, sectionOrder: next }));
  };

  const toggleSectionVisibility = (sec: SectionKey) => {
    onChange((prev) => ({
      ...prev,
      visibleSections: {
        ...prev.visibleSections,
        [sec]: !prev.visibleSections[sec],
      },
    }));
  };

  const updateWishStatus = async (wishId: string, status: 'approved' | 'pending') => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(
      `/api/admin/experience/${encodeURIComponent(draft.slug)}/wishes/${encodeURIComponent(wishId)}`,
      {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status }),
      },
    );
    await onRefreshWishes();
    onWishesChangedPublic();
  };

  const deleteWish = async (wishId: string) => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(
      `/api/admin/experience/${encodeURIComponent(draft.slug)}/wishes/${encodeURIComponent(wishId)}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'include',
      },
    );
    await onRefreshWishes();
    onWishesChangedPublic();
  };

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 7 · Full Website Content Manager"
        title="Countdown, Cake, Games, Wishes & Chapter Layout"
        description="Control the cinematic countdown, ambient effects, birthday cake candles, gift reveal, scratch cards, trivia games, lucky wheel, wish tree moderation, and chapter visibility."
      />

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#C5A46D]/25 bg-[#292329] p-1.5">
        {(
          [
            ['intro_effects', 'Countdown & Effects', Sparkles],
            ['cake_gift', 'Cake & Gift Box', Cake],
            ['games', 'Scratch Cards & Games', Gamepad2],
            ['wishtree_layout', 'Wish Tree & Chapters Order', TreeDeciduous],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === key
                ? 'bg-[#713F50] text-[#F5EBDD]'
                : 'text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
            }`}
          >
            <Icon className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 1. COUNTDOWN & EFFECTS */}
      {subTab === 'intro_effects' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Matrix Intro & Countdown Timing</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 text-xs text-[#F5EBDD] cursor-pointer">
                <span>Enable Full-Screen Matrix Birthday Intro</span>
                <input
                  type="checkbox"
                  checked={draft.appearance.effects.intro !== false}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      appearance: {
                        ...prev.appearance,
                        effects: { ...prev.appearance.effects, intro: e.target.checked },
                      },
                    }))
                  }
                  className="accent-[#C5A46D]"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 text-xs text-[#F5EBDD] cursor-pointer">
                <span>Enable 3–2–1 Dramatic Countdown Before Reveal</span>
                <input
                  type="checkbox"
                  checked={draft.appearance.countdownEnabled !== false}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      appearance: { ...prev.appearance, countdownEnabled: e.target.checked },
                    }))
                  }
                  className="accent-[#C5A46D]"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#C5A46D]">Total Countdown Duration</span>
                <span className="font-semibold text-[#F5EBDD] tabular-nums">
                  {draft.appearance.countdownDurationSec ?? 11} seconds
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                value={draft.appearance.countdownDurationSec ?? 11}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    appearance: {
                      ...prev.appearance,
                      countdownDurationSec: Number(e.target.value),
                    },
                  }))
                }
                className="w-full accent-[#C5A46D]"
              />
            </div>

            <LocalizedInputs
              label="Matrix Center Greeting Phrase"
              value={draft.appearance.introLeadText || { en: 'HAPPY BIRTHDAY', ar: 'عيد ميلاد سعيد' }}
              onChange={(introLeadText) =>
                onChange((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, introLeadText },
                }))
              }
            />
          </div>

          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F5EBDD]">Website Colors & Luxury Accent Customization</h3>
              <p className="text-xs text-[#F5EBDD]/65">
                Choose a curated palette preset or fine-tune the primary and secondary highlight colors across buttons, borders, and accents.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'champagne', label: 'Champagne Gold', primary: '#C5A46D', secondary: '#D9A5AE' },
                  { id: 'rose', label: 'Dusty Rose', primary: '#D9A5AE', secondary: '#C5A46D' },
                  { id: 'royal', label: 'Deep Burgundy', primary: '#713F50', secondary: '#C5A46D' },
                ] as const
              ).map((preset) => {
                const active = draft.appearance.accentPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          accentPreset: preset.id,
                          primaryAccent: preset.primary,
                          secondaryAccent: preset.secondary,
                        },
                      }))
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#C5A46D] bg-[#713F50] text-[#F5EBDD]'
                        : 'border-[#C5A46D]/25 bg-[#1E191E] text-[#F5EBDD]/80 hover:border-[#C5A46D]/60'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: preset.secondary }}
                    />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] px-3.5 py-2.5 text-xs text-[#F5EBDD]">
                <span>Primary Accent Color</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#C5A46D]">{draft.appearance.primaryAccent}</span>
                  <input
                    type="color"
                    value={draft.appearance.primaryAccent}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, primaryAccent: e.target.value },
                      }))
                    }
                    className="h-7 w-9 cursor-pointer rounded border border-[#C5A46D]/40 bg-transparent"
                  />
                </div>
              </label>
              <label className="flex items-center justify-between rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] px-3.5 py-2.5 text-xs text-[#F5EBDD]">
                <span>Secondary Highlight Color</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#D9A5AE]">{draft.appearance.secondaryAccent}</span>
                  <input
                    type="color"
                    value={draft.appearance.secondaryAccent}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, secondaryAccent: e.target.value },
                      }))
                    }
                    className="h-7 w-9 cursor-pointer rounded border border-[#C5A46D]/40 bg-transparent"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Ambient Celebration Effects</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['stars', 'Night Sky Starfield Particles'],
                  ['petals', 'Floating Rose Petals Overlay'],
                  ['fireworks', 'Celebration Confetti & Fireworks'],
                  ['stage3d', 'Interactive 3D Keepsake Stage (Three.js)'],
                ] as const
              ).map(([effectKey, label]) => (
                <label
                  key={effectKey}
                  className="flex items-center justify-between rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 text-xs text-[#F5EBDD] cursor-pointer"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.appearance.effects[effectKey])}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        appearance: {
                          ...prev.appearance,
                          effects: { ...prev.appearance.effects, [effectKey]: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[#C5A46D]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. CAKE & GIFT BOX */}
      {subTab === 'cake_gift' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Birthday Cake & Candles</h3>
            <div>
              <label className="block text-xs font-medium text-[#C5A46D] mb-1">
                Number of Taper Candles (1–15)
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={draft.cake.candleCount}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    cake: { ...prev.cake, candleCount: Math.min(15, Math.max(1, Number(e.target.value) || 1)) },
                  }))
                }
                className="w-32 rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD] tabular-nums"
              />
            </div>
            <LocalizedInputs
              label="Candle Lighting Instruction"
              value={draft.cake.wishPrompt}
              onChange={(wishPrompt) =>
                onChange((prev) => ({ ...prev, cake: { ...prev.cake, wishPrompt } }))
              }
              multiline
            />
            <RichTextEditor
              label="Post-Wish Celebration Message"
              value={draft.cake.postWishMessage}
              onChange={(postWishMessage) =>
                onChange((prev) => ({ ...prev, cake: { ...prev.cake, postWishMessage } }))
              }
              rows={4}
            />
          </div>

          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Velvet Gift Box Reveal</h3>
            <LocalizedInputs
              label="Gift Title"
              value={draft.gift.title}
              onChange={(title) =>
                onChange((prev) => ({ ...prev, gift: { ...prev.gift, title } }))
              }
            />
            <LocalizedInputs
              label="Gift Subtitle"
              value={draft.gift.subtitle}
              onChange={(subtitle) =>
                onChange((prev) => ({ ...prev, gift: { ...prev.gift, subtitle } }))
              }
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#C5A46D] mb-1">Gift Content Type</label>
                <select
                  value={draft.gift.contentType}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      gift: {
                        ...prev.gift,
                        contentType: e.target.value as BirthdayEdition['gift']['contentType'],
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                >
                  <option value="photo">Photo Keepsake</option>
                  <option value="video">Video Surprise</option>
                  <option value="audio">Voice / Audio Gift</option>
                  <option value="text">Text Note Only</option>
                </select>
              </div>
              <LocalizedInputs
                label="From"
                value={draft.gift.sender}
                onChange={(sender) =>
                  onChange((prev) => ({ ...prev, gift: { ...prev.gift, sender } }))
                }
              />
            </div>

            {draft.gift.contentType !== 'text' && (
              <MediaPickerUpload
                label="Gift Surprise Media"
                value={draft.gift.mediaUrl || ''}
                onChange={(mediaUrl) =>
                  onChange((prev) => ({
                    ...prev,
                    gift: { ...prev.gift, mediaUrl: mediaUrl || undefined },
                  }))
                }
                accept={
                  draft.gift.contentType === 'video'
                    ? 'video/*'
                    : draft.gift.contentType === 'audio'
                      ? 'audio/*'
                      : 'image/*'
                }
                fieldKey="gift-media"
                uploadingField={uploadingField}
                onUploadFile={onUploadFile}
                mediaLibrary={mediaLibrary}
                onRefreshLibrary={onRefreshLibrary}
              />
            )}

            <RichTextEditor
              label="Gift Reveal Message"
              value={draft.gift.message}
              onChange={(message) =>
                onChange((prev) => ({ ...prev, gift: { ...prev.gift, message } }))
              }
              rows={4}
            />
          </div>
        </div>
      )}

      {/* 3. SCRATCH CARDS & GAMES */}
      {subTab === 'games' && (
        <div className="space-y-6">
          {/* Scratch Cards */}
          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F5EBDD]">
                Golden Scratch Vouchers ({draft.scratchCards.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    scratchCards: [
                      ...prev.scratchCards,
                      {
                        id: `sc-${Date.now()}`,
                        title: { en: 'Special Birthday Coupon', ar: 'قسيمة عيد ميلاد خاصة' },
                        rewardLabel: { en: 'Golden Gift', ar: 'هدية ذهبية' },
                        hiddenMessage: { en: '', ar: '' },
                        foilTone: 'gold',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg bg-[#C5A46D] px-3 py-1.5 text-xs font-semibold text-[#292329]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Card
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {draft.scratchCards.map((card, idx) => (
                <div
                  key={card.id}
                  className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#C5A46D]">Card #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          scratchCards: prev.scratchCards.filter((c) => c.id !== card.id),
                        }))
                      }
                      className="rounded p-1 text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <LocalizedInputs
                    label="Card Title"
                    value={card.title}
                    onChange={(title) =>
                      onChange((prev) => ({
                        ...prev,
                        scratchCards: prev.scratchCards.map((c) =>
                          c.id === card.id ? { ...c, title } : c,
                        ),
                      }))
                    }
                  />
                  <LocalizedInputs
                    label="Reward Label"
                    value={card.rewardLabel}
                    onChange={(rewardLabel) =>
                      onChange((prev) => ({
                        ...prev,
                        scratchCards: prev.scratchCards.map((c) =>
                          c.id === card.id ? { ...c, rewardLabel } : c,
                        ),
                      }))
                    }
                  />
                  <LocalizedInputs
                    label="Hidden Surprise Message"
                    value={card.hiddenMessage}
                    onChange={(hiddenMessage) =>
                      onChange((prev) => ({
                        ...prev,
                        scratchCards: prev.scratchCards.map((c) =>
                          c.id === card.id ? { ...c, hiddenMessage } : c,
                        ),
                      }))
                    }
                    multiline
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-[#C5A46D] mb-1">Foil Tone</label>
                      <select
                        value={card.foilTone}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            scratchCards: prev.scratchCards.map((c) =>
                              c.id === card.id
                                ? { ...c, foilTone: e.target.value as 'gold' | 'rose' }
                                : c,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-2.5 py-2 text-xs text-[#F5EBDD]"
                      >
                        <option value="gold">Champagne Gold</option>
                        <option value="rose">Dusty Rose</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <MediaPickerUpload
                        label="Optional Thumbnail"
                        value={card.imageUrl || ''}
                        onChange={(imageUrl) =>
                          onChange((prev) => ({
                            ...prev,
                            scratchCards: prev.scratchCards.map((c) =>
                              c.id === card.id ? { ...c, imageUrl: imageUrl || undefined } : c,
                            ),
                          }))
                        }
                        accept="image/*"
                        fieldKey={`sc-${card.id}`}
                        uploadingField={uploadingField}
                        onUploadFile={onUploadFile}
                        mediaLibrary={mediaLibrary}
                        onRefreshLibrary={onRefreshLibrary}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Birthday Quiz */}
          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F5EBDD]">Birthday Trivia Quiz ({draft.quiz.length})</h3>
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    quiz: [
                      ...prev.quiz,
                      {
                        id: `q-${Date.now()}`,
                        question: { en: 'New Trivia Question?', ar: 'سؤال جديد؟' },
                        options: [
                          { en: 'Option A', ar: 'الخيار الأول' },
                          { en: 'Option B', ar: 'الخيار الثاني' },
                          { en: 'Option C', ar: 'الخيار الثالث' },
                        ],
                        correctIndex: 0,
                        explanation: { en: '', ar: '' },
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg bg-[#C5A46D] px-3 py-1.5 text-xs font-semibold text-[#292329]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Question
              </button>
            </div>

            {draft.quiz.map((q, qIdx) => (
              <div
                key={q.id}
                className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#C5A46D]">Question #{qIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        quiz: prev.quiz.filter((item) => item.id !== q.id),
                      }))
                    }
                    className="rounded p-1 text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <LocalizedInputs
                  label="Question"
                  value={q.question}
                  onChange={(question) =>
                    onChange((prev) => ({
                      ...prev,
                      quiz: prev.quiz.map((item) => (item.id === q.id ? { ...item, question } : item)),
                    }))
                  }
                />
                <div className="space-y-2">
                  <span className="block text-[11px] font-medium text-[#C5A46D]">
                    Answer Choices (select the correct answer)
                  </span>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctIndex === optIdx}
                        onChange={() =>
                          onChange((prev) => ({
                            ...prev,
                            quiz: prev.quiz.map((item) =>
                              item.id === q.id ? { ...item, correctIndex: optIdx } : item,
                            ),
                          }))
                        }
                        className="accent-[#C5A46D]"
                        title="Mark as correct option"
                      />
                      <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={opt.en}
                          onChange={(e) =>
                            onChange((prev) => ({
                              ...prev,
                              quiz: prev.quiz.map((item) =>
                                item.id === q.id
                                  ? {
                                      ...item,
                                      options: item.options.map((o, i) =>
                                        i === optIdx ? { ...o, en: e.target.value } : o,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          placeholder="English option"
                          className="rounded-lg border border-[#C5A46D]/25 bg-[#292329] px-3 py-1.5 text-xs text-[#F5EBDD]"
                        />
                        <input
                          type="text"
                          value={opt.ar}
                          dir="rtl"
                          onChange={(e) =>
                            onChange((prev) => ({
                              ...prev,
                              quiz: prev.quiz.map((item) =>
                                item.id === q.id
                                  ? {
                                      ...item,
                                      options: item.options.map((o, i) =>
                                        i === optIdx ? { ...o, ar: e.target.value } : o,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          placeholder="الخيار بالعربية"
                          className="rounded-lg border border-[#C5A46D]/25 bg-[#292329] px-3 py-1.5 text-xs text-[#F5EBDD]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <LocalizedInputs
                  label="Explanation Shown After Answering"
                  value={q.explanation}
                  onChange={(explanation) =>
                    onChange((prev) => ({
                      ...prev,
                      quiz: prev.quiz.map((item) =>
                        item.id === q.id ? { ...item, explanation } : item,
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {/* Guess the Memory + Puzzle Image + Lucky Wheel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#F5EBDD]">
                  Memory Guesses ({draft.memoryGuesses.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      memoryGuesses: [
                        ...prev.memoryGuesses,
                        {
                          id: `mg-${Date.now()}`,
                          imageUrl: '',
                          clue: { en: 'Location clue', ar: 'تلميح المكان' },
                          question: { en: 'When did we take this?', ar: 'متى التقطنا هذه الصورة؟' },
                          answer: { en: 'Answer', ar: 'الإجابة' },
                          hint: { en: 'Hint', ar: 'تلميح إضافي' },
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/35 px-2.5 py-1 text-xs text-[#C5A46D]"
                >
                  <Plus className="h-3 w-3" /> Add Memory Guess
                </button>
              </div>

              {draft.memoryGuesses.map((mg, idx) => (
                <div
                  key={mg.id}
                  className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#D9A5AE]">Guess #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          memoryGuesses: prev.memoryGuesses.filter((g) => g.id !== mg.id),
                        }))
                      }
                      className="rounded p-1 text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <MediaPickerUpload
                    label="Blurred Photo"
                    value={mg.imageUrl}
                    onChange={(imageUrl) =>
                      onChange((prev) => ({
                        ...prev,
                        memoryGuesses: prev.memoryGuesses.map((g) =>
                          g.id === mg.id ? { ...g, imageUrl } : g,
                        ),
                      }))
                    }
                    accept="image/*"
                    fieldKey={`mg-${mg.id}`}
                    uploadingField={uploadingField}
                    onUploadFile={onUploadFile}
                    mediaLibrary={mediaLibrary}
                    onRefreshLibrary={onRefreshLibrary}
                    showPreview
                  />
                  <LocalizedInputs
                    label="Question"
                    value={mg.question}
                    onChange={(question) =>
                      onChange((prev) => ({
                        ...prev,
                        memoryGuesses: prev.memoryGuesses.map((g) =>
                          g.id === mg.id ? { ...g, question } : g,
                        ),
                      }))
                    }
                  />
                  <LocalizedInputs
                    label="Clue"
                    value={mg.clue}
                    onChange={(clue) =>
                      onChange((prev) => ({
                        ...prev,
                        memoryGuesses: prev.memoryGuesses.map((g) =>
                          g.id === mg.id ? { ...g, clue } : g,
                        ),
                      }))
                    }
                  />
                  <LocalizedInputs
                    label="Hint"
                    value={mg.hint}
                    onChange={(hint) =>
                      onChange((prev) => ({
                        ...prev,
                        memoryGuesses: prev.memoryGuesses.map((g) =>
                          g.id === mg.id ? { ...g, hint } : g,
                        ),
                      }))
                    }
                  />
                  <LocalizedInputs
                    label="Revealed Answer"
                    value={mg.answer}
                    onChange={(answer) =>
                      onChange((prev) => ({
                        ...prev,
                        memoryGuesses: prev.memoryGuesses.map((g) =>
                          g.id === mg.id ? { ...g, answer } : g,
                        ),
                      }))
                    }
                  />
                </div>
              ))}

              <div className="pt-2 border-t border-[#C5A46D]/15">
                <MediaPickerUpload
                  label="Photo Puzzle Master Image (3×3 Tile Game)"
                  value={draft.puzzleImageUrl}
                  onChange={(puzzleImageUrl) => onChange((prev) => ({ ...prev, puzzleImageUrl }))}
                  accept="image/*"
                  fieldKey="puzzle-image"
                  uploadingField={uploadingField}
                  onUploadFile={onUploadFile}
                  mediaLibrary={mediaLibrary}
                  onRefreshLibrary={onRefreshLibrary}
                  showPreview
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#F5EBDD]">
                  Lucky Treat Wheel ({draft.wheelOptions.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      wheelOptions: [
                        ...prev.wheelOptions,
                        {
                          id: `w-${Date.now()}`,
                          label: { en: 'Surprise Treat', ar: 'مفاجأة جميلة' },
                          message: { en: '', ar: '' },
                          color: '#713F50',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/35 px-2.5 py-1 text-xs text-[#C5A46D]"
                >
                  <Plus className="h-3 w-3" /> Add Slice
                </button>
              </div>

              {draft.wheelOptions.map((opt, idx) => (
                <div
                  key={opt.id}
                  className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={opt.color}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            wheelOptions: prev.wheelOptions.map((w) =>
                              w.id === opt.id ? { ...w, color: e.target.value } : w,
                            ),
                          }))
                        }
                        className="h-6 w-8 rounded border border-[#C5A46D]/40 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-[#C5A46D]">Slice #{idx + 1}</span>
                    </div>
                    {draft.wheelOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            wheelOptions: prev.wheelOptions.filter((w) => w.id !== opt.id),
                          }))
                        }
                        className="rounded p-1 text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <LocalizedInputs
                    label="Slice Label"
                    value={opt.label}
                    onChange={(label) =>
                      onChange((prev) => ({
                        ...prev,
                        wheelOptions: prev.wheelOptions.map((w) =>
                          w.id === opt.id ? { ...w, label } : w,
                        ),
                      }))
                    }
                  />
                  <LocalizedInputs
                    label="Prize / Surprise Description"
                    value={opt.message}
                    onChange={(message) =>
                      onChange((prev) => ({
                        ...prev,
                        wheelOptions: prev.wheelOptions.map((w) =>
                          w.id === opt.id ? { ...w, message } : w,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. WISH TREE MODERATION & CHAPTER ORDER/VISIBILITY */}
      {subTab === 'wishtree_layout' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Chapter Order & Visibility */}
          <div className="lg:col-span-6 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F5EBDD]">Website Section Order & Visibility</h3>
              <p className="text-xs text-[#F5EBDD]/65">
                Reorder chapters or hide any section temporarily without deleting its content.
              </p>
            </div>

            <div className="space-y-2">
              {draft.sectionOrder.map((sec, idx) => {
                const isVisible = draft.visibleSections[sec];
                return (
                  <div
                    key={sec}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                      isVisible
                        ? 'border-[#C5A46D]/30 bg-[#1E191E] text-[#F5EBDD]'
                        : 'border-[#C5A46D]/10 bg-[#1E191E]/50 text-[#F5EBDD]/45'
                    }`}
                  >
                    <span className="text-xs font-medium">{sectionNames[sec]}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, -1)}
                        className="rounded p-1.5 hover:bg-white/10 disabled:opacity-25"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draft.sectionOrder.length - 1}
                        onClick={() => moveSection(idx, 1)}
                        className="rounded p-1.5 hover:bg-white/10 disabled:opacity-25"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility(sec)}
                        className={`rounded p-1.5 ${
                          isVisible ? 'text-[#C5A46D] hover:bg-white/10' : 'text-[#D9A5AE] hover:bg-white/10'
                        }`}
                        title={isVisible ? 'Hide section' : 'Show section'}
                      >
                        {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wish Tree Settings & Moderation */}
          <div className="lg:col-span-6 space-y-5">
            <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#F5EBDD]">Wish Tree Settings</h3>
              <LocalizedInputs
                label="Guest Prompt"
                value={draft.wishTreeSettings.promptText}
                onChange={(promptText) =>
                  onChange((prev) => ({
                    ...prev,
                    wishTreeSettings: { ...prev.wishTreeSettings, promptText },
                  }))
                }
              />
              <label className="flex items-center justify-between text-xs text-[#F5EBDD] cursor-pointer">
                <span>Allow visitors to submit new wishes</span>
                <input
                  type="checkbox"
                  checked={draft.wishTreeSettings.allowPublicSubmissions}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      wishTreeSettings: {
                        ...prev.wishTreeSettings,
                        allowPublicSubmissions: e.target.checked,
                      },
                    }))
                  }
                  className="accent-[#C5A46D]"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-[#F5EBDD] cursor-pointer">
                <span>Hold guest wishes for approval before showing publicly</span>
                <input
                  type="checkbox"
                  checked={draft.wishTreeSettings.requireModeration}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      wishTreeSettings: {
                        ...prev.wishTreeSettings,
                        requireModeration: e.target.checked,
                      },
                    }))
                  }
                  className="accent-[#C5A46D]"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#F5EBDD]">
                Submitted Wishes Moderation ({adminWishes.length})
              </h3>
              {adminWishes.length === 0 ? (
                <p className="text-xs text-[#F5EBDD]/60">No guest wishes recorded yet.</p>
              ) : (
                <div className="max-h-96 space-y-2.5 overflow-y-auto pe-1">
                  {adminWishes.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#C5A46D]">{w.author}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
                              w.status === 'approved'
                                ? 'bg-[#713F50] text-[#F5EBDD]'
                                : 'bg-[#C5A46D]/25 text-[#C5A46D]'
                            }`}
                          >
                            {w.status === 'approved' ? (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            ) : (
                              <Clock className="h-2.5 w-2.5" />
                            )}
                            {w.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void updateWishStatus(
                                w.id,
                                w.status === 'approved' ? 'pending' : 'approved',
                              )
                            }
                            className="rounded border border-[#C5A46D]/30 px-2 py-1 text-[11px] text-[#F5EBDD]/85 hover:bg-white/10"
                          >
                            {w.status === 'approved' ? 'Set Pending' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteWish(w.id)}
                            className="rounded border border-rose-500/30 p-1 text-rose-300 hover:bg-rose-500/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#F5EBDD]/85 leading-relaxed">{w.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
