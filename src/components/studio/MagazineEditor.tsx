import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DEFAULT_EDITION } from '../../data/defaultExperience.ts';
import type {
  BirthdayEdition,
  Language,
  MagazineColorTheme,
  MagazineConfig,
  MagazineCustomPage,
  UploadedMediaAsset,
} from '../../types/birthday.ts';
import { BirthdayMagazine } from '../BirthdayMagazine.tsx';
import { RichTextEditor } from '../RichTextContent.tsx';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface MagazineEditorProps {
  draft: BirthdayEdition;
  lang: Language;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  onUploadBatch: (files: FileList | File[]) => Promise<Array<{ url: string; kind: 'image' | 'video' | 'audio'; originalName: string }>>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

const STANDARD_PAGE_LABELS: Record<string, string> = {
  p1: 'Page 1 · Front Cover',
  p2: 'Page 2 · Editorial Collage',
  p3: 'Page 3 · Feature Story & Quote',
  p4: 'Page 4 · Memories Spread',
  p5: 'Page 5 · Soundtrack & QR',
  p6: 'Page 6 · Birthday Greeting Spread',
  p7: 'Page 7 · Editor’s Letter',
  p8: 'Page 8 · Back Cover',
};

const BG_SWATCHES = [
  { label: 'Theme Default', value: '' },
  { label: 'Warm Ivory', value: '#F5EBDD' },
  { label: 'Soft Cream', value: '#FBF5EC' },
  { label: 'Blush Cream', value: '#F8ECEE' },
  { label: 'Champagne Parchment', value: '#EFE2CF' },
  { label: 'Soft Charcoal', value: '#292329' },
];

export function MagazineEditor({
  draft,
  lang,
  onChange,
  uploadingField,
  onUploadFile,
  onUploadBatch,
  mediaLibrary,
  onRefreshLibrary,
}: MagazineEditorProps) {
  const [selectedPageKey, setSelectedPageKey] = useState<string>('p1');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewLang, setPreviewLang] = useState<Language>(lang);
  const [batchUploadingForPage, setBatchUploadingForPage] = useState<string | null>(null);

  const mag: MagazineConfig = draft.magazine || DEFAULT_EDITION.magazine!;
  const updateMag = (patch: Partial<MagazineConfig>) => {
    onChange((prev) => ({
      ...prev,
      magazine: {
        ...(prev.magazine || DEFAULT_EDITION.magazine!),
        ...patch,
      },
    }));
  };

  const customPages = mag.customPages || [];
  const customMap = useMemo(() => {
    const m = new Map<string, MagazineCustomPage>();
    for (const cp of customPages) m.set(cp.id, cp);
    return m;
  }, [customPages]);

  const pageOrder = useMemo(() => {
    const raw =
      Array.isArray(mag.pageOrder) && mag.pageOrder.length > 0
        ? mag.pageOrder
        : ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const result = [...raw.filter((k) => Boolean(STANDARD_PAGE_LABELS[k] || customMap.has(k)))];
    for (const std of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']) {
      if (!result.includes(std)) result.push(std);
    }
    for (const cp of customPages) {
      if (!result.includes(cp.id)) result.push(cp.id);
    }
    return result;
  }, [customMap, customPages, mag.pageOrder]);

  const movePageOrder = (idx: number, delta: number) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= pageOrder.length) return;
    // Keep front cover p1 at start and back cover p8 at end for realistic binding
    if (pageOrder[idx] === 'p1' || pageOrder[idx] === 'p8') return;
    if (pageOrder[targetIdx] === 'p1' || pageOrder[targetIdx] === 'p8') return;
    const next = [...pageOrder];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    updateMag({ pageOrder: next });
  };

  const addCustomPage = () => {
    const newId = `cp-${Date.now()}`;
    const newPage: MagazineCustomPage = {
      id: newId,
      title: { en: 'Special Feature Page', ar: 'صفحة خاصة إضافية' },
      subtitle: { en: 'Collector Supplement', ar: 'ملحق تذكاري' },
      body: {
        en: 'Write a dedicated story, poem, or tribute for this spread.',
        ar: 'اكتب قصة أو إهداءً خاصاً لهذه الصفحة.',
      },
      photos: [],
      bgColor: '',
    };
    const nextOrder = [...pageOrder];
    const backIdx = nextOrder.indexOf('p8');
    if (backIdx >= 0) nextOrder.splice(backIdx, 0, newId);
    else nextOrder.push(newId);

    updateMag({
      customPages: [...customPages, newPage],
      pageOrder: nextOrder,
    });
    setSelectedPageKey(newId);
  };

  const deleteCustomPage = (pageId: string) => {
    const nextCustom = customPages.filter((cp) => cp.id !== pageId);
    const nextOrder = pageOrder.filter((k) => k !== pageId);
    updateMag({ customPages: nextCustom, pageOrder: nextOrder });
    if (selectedPageKey === pageId) setSelectedPageKey('p1');
  };

  const setPageBg = (key: string, color: string) => {
    const nextBgs = { ...(mag.pageBackgrounds || {}) };
    if (color) nextBgs[key] = color;
    else delete nextBgs[key];
    updateMag({ pageBackgrounds: nextBgs });
  };

  const selectedCustomPage = customMap.get(selectedPageKey);
  const audioTracks = draft.music.tracks.filter((t) => t.sourceType === 'url' && t.url);
  const albumMagPhotosCount = draft.memories.filter((m) => m.showInMagazine).length;

  const handleBatchAddToCollage = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploadingForPage('collage');
    try {
      const uploaded = await onUploadBatch(files);
      const imgs = uploaded.filter((u) => u.kind === 'image');
      if (imgs.length === 0) return;
      updateMag({
        collagePhotos: [
          ...mag.collagePhotos,
          ...imgs.map((img, i) => ({
            id: `col-${Date.now()}-${i}`,
            imageUrl: img.url,
            caption: { en: img.originalName.replace(/\.[^.]+$/, ''), ar: '' },
          })),
        ],
      });
    } finally {
      setBatchUploadingForPage(null);
    }
  };

  const handleBatchAddToCustomPage = async (cpId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploadingForPage(cpId);
    try {
      const uploaded = await onUploadBatch(files);
      const imgs = uploaded.filter((u) => u.kind === 'image');
      if (imgs.length === 0) return;
      updateMag({
        customPages: customPages.map((cp) =>
          cp.id === cpId
            ? {
                ...cp,
                photos: [
                  ...cp.photos,
                  ...imgs.map((img, i) => ({
                    id: `cph-${Date.now()}-${i}`,
                    url: img.url,
                    caption: { en: '', ar: '' },
                  })),
                ],
              }
            : cp,
        ),
      });
    } finally {
      setBatchUploadingForPage(null);
    }
  };

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 5 · Birthday Magazine Editor"
        title="3D Collector Magazine Builder"
        description="Edit every page of the physical 3D turning book, add custom pages, customize paper backgrounds, reorder inner pages, and preview the live book interactively."
        actions={
          <>
            <button
              type="button"
              onClick={addCustomPage}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-3.5 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Custom Page</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLivePreview((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#292329] px-3.5 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#713F50]"
            >
              {showLivePreview ? <EyeOff className="h-3.5 w-3.5 text-[#C5A46D]" /> : <Eye className="h-3.5 w-3.5 text-[#C5A46D]" />}
              <span>{showLivePreview ? 'Hide 3D Preview' : 'Show 3D Book Preview'}</span>
            </button>
          </>
        }
      />

      {/* Global Magazine Branding & Theme */}
      <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-[#C5A46D] mb-1">Issue Color Theme</label>
            <select
              value={mag.colorTheme}
              onChange={(e) => updateMag({ colorTheme: e.target.value as MagazineColorTheme })}
              className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
            >
              <option value="ivory-gold">Warm Ivory & Champagne Gold</option>
              <option value="midnight-rose">Midnight Charcoal & Dusty Rose</option>
              <option value="royal-cream">Royal Burgundy & Cream</option>
              <option value="rose-editorial">Rose Blush Editorial</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <LocalizedInputs
              label="Magazine Masthead"
              value={mag.masthead}
              onChange={(masthead) => updateMag({ masthead })}
            />
          </div>
        </div>
        <LocalizedInputs
          label="Issue Volume Label"
          value={mag.issueLabel}
          onChange={(issueLabel) => updateMag({ issueLabel })}
        />
      </div>

      {/* Live Embedded 3D Book Preview */}
      {showLivePreview && (
        <div className="overflow-hidden rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#C5A46D]/15 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A46D]">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Interactive 3D Physical Magazine Preview ({pageOrder.length} pages)</span>
            </span>
            <div className="flex items-center gap-1 rounded-md border border-[#C5A46D]/25 bg-[#292329] p-0.5 text-[11px]">
              {(['en', 'ar'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setPreviewLang(l)}
                  className={`rounded px-2.5 py-1 font-medium ${
                    previewLang === l ? 'bg-[#C5A46D] text-[#292329]' : 'text-[#F5EBDD]/75'
                  }`}
                >
                  {l === 'en' ? 'EN' : 'AR'}
                </button>
              ))}
            </div>
          </div>
          <BirthdayMagazine
            edition={draft}
            lang={previewLang}
            overrideMagazine={mag}
            compactPreview
          />
        </div>
      )}

      {/* Split Workspace: Left Page List + Right Selected Page Editor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Page Order Selector Column */}
        <div className="lg:col-span-4 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#C5A46D]/15">
            <span className="text-xs font-semibold text-[#C5A46D]">Magazine Pages ({pageOrder.length})</span>
            <button
              type="button"
              onClick={addCustomPage}
              className="text-[11px] font-medium text-[#D9A5AE] hover:underline"
            >
              + Custom Page
            </button>
          </div>

          <div className="space-y-1.5">
            {pageOrder.map((key, idx) => {
              const cp = customMap.get(key);
              const label = cp
                ? `Custom · ${cp.title.en || cp.title.ar || 'Untitled'}`
                : STANDARD_PAGE_LABELS[key] || key;
              const isCover = key === 'p1' || key === 'p8';
              const isSelected = selectedPageKey === key;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-1.5 rounded-xl border p-2 transition-colors ${
                    isSelected
                      ? 'border-[#C5A46D] bg-[#713F50]/45 text-[#F5EBDD]'
                      : 'border-[#C5A46D]/15 bg-[#1E191E] text-[#F5EBDD]/80 hover:border-[#C5A46D]/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPageKey(key)}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="block truncate text-xs font-medium">{label}</span>
                  </button>

                  {!isCover && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx <= 1}
                        onClick={() => movePageOrder(idx, -1)}
                        className="rounded p-1 text-[#F5EBDD]/70 hover:bg-white/10 disabled:opacity-25"
                        title="Move earlier"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx >= pageOrder.length - 2}
                        onClick={() => movePageOrder(idx, 1)}
                        className="rounded p-1 text-[#F5EBDD]/70 hover:bg-white/10 disabled:opacity-25"
                        title="Move later"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      {cp && (
                        <button
                          type="button"
                          onClick={() => deleteCustomPage(cp.id)}
                          className="rounded p-1 text-rose-300 hover:bg-rose-500/20"
                          title="Delete custom page"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Page Inspector Column */}
        <div className="lg:col-span-8 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-5">
          {/* Paper Background Swatch Row for Non-Cover Pages */}
          {selectedPageKey !== 'p1' && selectedPageKey !== 'p8' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3">
              <span className="text-xs font-medium text-[#C5A46D]">Page Paper Background</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {BG_SWATCHES.map((sw) => {
                  const activeBg = selectedCustomPage
                    ? selectedCustomPage.bgColor || ''
                    : mag.pageBackgrounds?.[selectedPageKey] || '';
                  return (
                    <button
                      key={sw.label}
                      type="button"
                      onClick={() => {
                        if (selectedCustomPage) {
                          updateMag({
                            customPages: customPages.map((cp) =>
                              cp.id === selectedCustomPage.id ? { ...cp, bgColor: sw.value || undefined } : cp,
                            ),
                          });
                        } else {
                          setPageBg(selectedPageKey, sw.value);
                        }
                      }}
                      title={sw.label}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                        activeBg === sw.value
                          ? 'border-[#C5A46D] bg-[#713F50] text-[#F5EBDD]'
                          : 'border-[#C5A46D]/25 bg-[#292329] text-[#F5EBDD]/75 hover:border-[#C5A46D]'
                      }`}
                    >
                      {sw.value && (
                        <span
                          className="h-3 w-3 rounded-full border border-white/30"
                          style={{ backgroundColor: sw.value }}
                        />
                      )}
                      <span>{sw.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STANDARD PAGE 1: FRONT COVER */}
          {selectedPageKey === 'p1' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-[#F5EBDD]">Front Cover</h3>
              <MediaPickerUpload
                label="Cover Star Portrait"
                value={mag.coverPhotoUrl}
                onChange={(coverPhotoUrl) => updateMag({ coverPhotoUrl })}
                accept="image/*"
                fieldKey="mag-coverPhotoUrl"
                uploadingField={uploadingField}
                onUploadFile={onUploadFile}
                mediaLibrary={mediaLibrary}
                onRefreshLibrary={onRefreshLibrary}
                showPreview
              />

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#C5A46D]">Cover Headlines</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateMag({
                        coverHeadlines: [...mag.coverHeadlines, { en: 'New Cover Story', ar: 'عنوان جديد' }],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-[#C5A46D]/35 px-2.5 py-1 text-[11px] text-[#C5A46D]"
                  >
                    <Plus className="h-3 w-3" /> Add Headline
                  </button>
                </div>
                {mag.coverHeadlines.map((hl, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <LocalizedInputs
                        label={`Headline #${idx + 1}`}
                        value={hl}
                        onChange={(nextHl) =>
                          updateMag({
                            coverHeadlines: mag.coverHeadlines.map((h, i) => (i === idx ? nextHl : h)),
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateMag({
                          coverHeadlines: mag.coverHeadlines.filter((_, i) => i !== idx),
                        })
                      }
                      className="mt-6 rounded-lg border border-rose-500/30 p-2 text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STANDARD PAGE 2: EDITORIAL COLLAGE */}
          {selectedPageKey === 'p2' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[#F5EBDD]">Editorial Collage Page</h3>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#713F50] px-3 py-1.5 text-[11px] font-medium text-[#F5EBDD]">
                    {batchUploadingForPage === 'collage' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Batch Add Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        void handleBatchAddToCollage(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateMag({
                        collagePhotos: [
                          ...mag.collagePhotos,
                          { id: `col-${Date.now()}`, imageUrl: '', caption: { en: '', ar: '' } },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/35 px-2.5 py-1.5 text-[11px] text-[#C5A46D]"
                  >
                    <Plus className="h-3 w-3" /> Add Frame
                  </button>
                </div>
              </div>

              <LocalizedInputs
                label="Editorial Page Heading"
                value={mag.editorialTitle}
                onChange={(editorialTitle) => updateMag({ editorialTitle })}
              />

              <div className="space-y-3">
                {mag.collagePhotos.map((col, idx) => (
                  <div
                    key={col.id}
                    className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#D9A5AE]">Collage Frame #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateMag({
                            collagePhotos: mag.collagePhotos.filter((c) => c.id !== col.id),
                          })
                        }
                        className="rounded p-1 text-rose-300 hover:bg-white/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <MediaPickerUpload
                      label="Photo"
                      value={col.imageUrl}
                      onChange={(imageUrl) =>
                        updateMag({
                          collagePhotos: mag.collagePhotos.map((c) =>
                            c.id === col.id ? { ...c, imageUrl } : c,
                          ),
                        })
                      }
                      accept="image/*"
                      fieldKey={`mag-col-${col.id}`}
                      uploadingField={uploadingField}
                      onUploadFile={onUploadFile}
                      mediaLibrary={mediaLibrary}
                      onRefreshLibrary={onRefreshLibrary}
                      showPreview
                    />
                    <LocalizedInputs
                      label="Caption"
                      value={col.caption}
                      onChange={(caption) =>
                        updateMag({
                          collagePhotos: mag.collagePhotos.map((c) =>
                            c.id === col.id ? { ...c, caption } : c,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STANDARD PAGE 3: FEATURE STORY */}
          {selectedPageKey === 'p3' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-[#F5EBDD]">Feature Story & Pull Quote</h3>
              <LocalizedInputs
                label="Pull Quote"
                value={mag.editorialPullQuote}
                onChange={(editorialPullQuote) => updateMag({ editorialPullQuote })}
                multiline
              />
              <RichTextEditor
                label="Feature Story Copy"
                value={mag.editorialStory}
                onChange={(editorialStory) => updateMag({ editorialStory })}
                rows={6}
              />
            </div>
          )}

          {/* STANDARD PAGE 4: MEMORIES SPREAD */}
          {selectedPageKey === 'p4' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[#F5EBDD]">Archival Memories Spread</h3>
                  {albumMagPhotosCount > 0 && (
                    <p className="text-[11px] text-[#C5A46D]">
                      +{albumMagPhotosCount} memory card(s) from Photo Manager also marked “Feature in 3D Magazine”.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateMag({
                      memorySpreadItems: [
                        ...mag.memorySpreadItems,
                        {
                          id: `mag-mem-${Date.now()}`,
                          imageUrl: '',
                          title: { en: 'New Spread Memory', ar: 'ذكرى في المجلة' },
                          caption: { en: '', ar: '' },
                          date: new Date().toISOString().slice(0, 10),
                        },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[#C5A46D] px-3 py-1.5 text-xs font-semibold text-[#292329]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
              </div>

              <LocalizedInputs
                label="Spread Heading"
                value={mag.memorySpreadTitle}
                onChange={(memorySpreadTitle) => updateMag({ memorySpreadTitle })}
              />

              <div className="space-y-3">
                {mag.memorySpreadItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#D9A5AE]">Item #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateMag({
                            memorySpreadItems: mag.memorySpreadItems.filter((x) => x.id !== item.id),
                          })
                        }
                        className="rounded p-1 text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <MediaPickerUpload
                      label="Photo"
                      value={item.imageUrl}
                      onChange={(imageUrl) =>
                        updateMag({
                          memorySpreadItems: mag.memorySpreadItems.map((x) =>
                            x.id === item.id ? { ...x, imageUrl } : x,
                          ),
                        })
                      }
                      accept="image/*"
                      fieldKey={`mag-sp-${item.id}`}
                      uploadingField={uploadingField}
                      onUploadFile={onUploadFile}
                      mediaLibrary={mediaLibrary}
                      onRefreshLibrary={onRefreshLibrary}
                      showPreview
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-[#C5A46D] mb-1">Date</label>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) =>
                            updateMag({
                              memorySpreadItems: mag.memorySpreadItems.map((x) =>
                                x.id === item.id ? { ...x, date: e.target.value } : x,
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <LocalizedInputs
                          label="Title"
                          value={item.title}
                          onChange={(title) =>
                            updateMag({
                              memorySpreadItems: mag.memorySpreadItems.map((x) =>
                                x.id === item.id ? { ...x, title } : x,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                    <LocalizedInputs
                      label="Caption"
                      value={item.caption}
                      onChange={(caption) =>
                        updateMag({
                          memorySpreadItems: mag.memorySpreadItems.map((x) =>
                            x.id === item.id ? { ...x, caption } : x,
                          ),
                        })
                      }
                      multiline
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STANDARD PAGE 5: SOUNDTRACK & QR */}
          {selectedPageKey === 'p5' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-[#F5EBDD]">Soundtrack & QR Code Page</h3>
              <LocalizedInputs
                label="Music Page Title"
                value={mag.musicPage.title}
                onChange={(title) => updateMag({ musicPage: { ...mag.musicPage, title } })}
              />
              <LocalizedInputs
                label="Featured Song Title"
                value={mag.musicPage.songTitle}
                onChange={(songTitle) => updateMag({ musicPage: { ...mag.musicPage, songTitle } })}
              />
              <LocalizedInputs
                label="Artist / Dedication"
                value={mag.musicPage.artist}
                onChange={(artist) => updateMag({ musicPage: { ...mag.musicPage, artist } })}
              />
              <MediaPickerUpload
                label="Vinyl Cover Artwork"
                value={mag.musicPage.coverArtUrl}
                onChange={(coverArtUrl) => updateMag({ musicPage: { ...mag.musicPage, coverArtUrl } })}
                accept="image/*"
                fieldKey="mag-music-art"
                uploadingField={uploadingField}
                onUploadFile={onUploadFile}
                mediaLibrary={mediaLibrary}
                onRefreshLibrary={onRefreshLibrary}
                showPreview
              />
              <MediaPickerUpload
                label="Dedicated Audio Track (MP3/WAV or Track URL)"
                value={mag.musicPage.audioUrl || ''}
                onChange={(audioUrl) =>
                  updateMag({ musicPage: { ...mag.musicPage, audioUrl: audioUrl || undefined } })
                }
                accept="audio/*"
                fieldKey="mag-music-audio"
                uploadingField={uploadingField}
                onUploadFile={onUploadFile}
                mediaLibrary={mediaLibrary}
                onRefreshLibrary={onRefreshLibrary}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1">QR Target Link</label>
                  <input
                    type="url"
                    value={mag.musicPage.qrUrl}
                    onChange={(e) => updateMag({ musicPage: { ...mag.musicPage, qrUrl: e.target.value } })}
                    dir="ltr"
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                </div>
                <label className="mt-5 flex items-center gap-2 text-xs text-[#F5EBDD] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mag.musicPage.showQr}
                    onChange={(e) => updateMag({ musicPage: { ...mag.musicPage, showQr: e.target.checked } })}
                    className="accent-[#C5A46D]"
                  />
                  <span>Display scannable QR code on page</span>
                </label>
              </div>
              <LocalizedInputs
                label="QR Caption"
                value={mag.musicPage.qrCaption}
                onChange={(qrCaption) => updateMag({ musicPage: { ...mag.musicPage, qrCaption } })}
              />
            </div>
          )}

          {/* STANDARD PAGE 6: GREETING SPREAD */}
          {selectedPageKey === 'p6' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-[#F5EBDD]">Birthday Greeting Spread</h3>
              <LocalizedInputs
                label="Greeting Headline"
                value={mag.greetingPage.headline}
                onChange={(headline) => updateMag({ greetingPage: { ...mag.greetingPage, headline } })}
              />
              <LocalizedInputs
                label="Subheadline"
                value={mag.greetingPage.subheadline}
                onChange={(subheadline) =>
                  updateMag({ greetingPage: { ...mag.greetingPage, subheadline } })
                }
                multiline
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1].map((pIdx) => (
                  <MediaPickerUpload
                    key={pIdx}
                    label={`Feature Portrait #${pIdx + 1}`}
                    value={mag.greetingPage.photos[pIdx] || ''}
                    onChange={(url) => {
                      const next = [...mag.greetingPage.photos];
                      next[pIdx] = url;
                      updateMag({ greetingPage: { ...mag.greetingPage, photos: next } });
                    }}
                    accept="image/*"
                    fieldKey={`mag-greet-${pIdx}`}
                    uploadingField={uploadingField}
                    onUploadFile={onUploadFile}
                    mediaLibrary={mediaLibrary}
                    onRefreshLibrary={onRefreshLibrary}
                    showPreview
                  />
                ))}
              </div>
            </div>
          )}

          {/* STANDARD PAGE 7: EDITOR'S LETTER */}
          {selectedPageKey === 'p7' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-[#F5EBDD]">Editor’s Birthday Letter</h3>
              <LocalizedInputs
                label="Letter Heading"
                value={mag.lettersPage.title}
                onChange={(title) => updateMag({ lettersPage: { ...mag.lettersPage, title } })}
              />
              <RichTextEditor
                label="Letter Body"
                value={mag.lettersPage.letterBody}
                onChange={(letterBody) =>
                  updateMag({ lettersPage: { ...mag.lettersPage, letterBody } })
                }
                rows={6}
              />
              <LocalizedInputs
                label="Signature"
                value={mag.lettersPage.signature}
                onChange={(signature) =>
                  updateMag({ lettersPage: { ...mag.lettersPage, signature } })
                }
              />
            </div>
          )}

          {/* STANDARD PAGE 8: BACK COVER */}
          {selectedPageKey === 'p8' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-[#F5EBDD]">Back Cover</h3>
              <MediaPickerUpload
                label="Back Cover Portrait Emblem"
                value={mag.backCover.photoUrl || ''}
                onChange={(photoUrl) =>
                  updateMag({ backCover: { ...mag.backCover, photoUrl: photoUrl || undefined } })
                }
                accept="image/*"
                fieldKey="mag-backCover"
                uploadingField={uploadingField}
                onUploadFile={onUploadFile}
                mediaLibrary={mediaLibrary}
                onRefreshLibrary={onRefreshLibrary}
                showPreview
              />
              <LocalizedInputs
                label="Back Cover Headline"
                value={mag.backCover.headline}
                onChange={(headline) => updateMag({ backCover: { ...mag.backCover, headline } })}
              />
              <LocalizedInputs
                label="Dedication Note"
                value={mag.backCover.dedication}
                onChange={(dedication) => updateMag({ backCover: { ...mag.backCover, dedication } })}
                multiline
              />
              <LocalizedInputs
                label="Colophon Press Line"
                value={mag.backCover.colophon}
                onChange={(colophon) => updateMag({ backCover: { ...mag.backCover, colophon } })}
              />
            </div>
          )}

          {/* CUSTOM PAGE INSPECTOR */}
          {selectedCustomPage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#F5EBDD]">
                  Custom Page: {selectedCustomPage.title.en || 'Untitled'}
                </h3>
                <button
                  type="button"
                  onClick={() => deleteCustomPage(selectedCustomPage.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/35 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/15"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Page
                </button>
              </div>

              <LocalizedInputs
                label="Page Heading"
                value={selectedCustomPage.title}
                onChange={(title) =>
                  updateMag({
                    customPages: customPages.map((cp) =>
                      cp.id === selectedCustomPage.id ? { ...cp, title } : cp,
                    ),
                  })
                }
              />
              <LocalizedInputs
                label="Subtitle / Kicker"
                value={selectedCustomPage.subtitle || { en: '', ar: '' }}
                onChange={(subtitle) =>
                  updateMag({
                    customPages: customPages.map((cp) =>
                      cp.id === selectedCustomPage.id ? { ...cp, subtitle } : cp,
                    ),
                  })
                }
              />

              <RichTextEditor
                label="Page Editorial Text"
                value={selectedCustomPage.body}
                onChange={(body) =>
                  updateMag({
                    customPages: customPages.map((cp) =>
                      cp.id === selectedCustomPage.id ? { ...cp, body } : cp,
                    ),
                  })
                }
                rows={5}
              />

              {/* Multi-photo uploader for custom page */}
              <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#C5A46D]">
                    Page Photos ({selectedCustomPage.photos.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#713F50] px-3 py-1.5 text-[11px] font-medium text-[#F5EBDD]">
                      {batchUploadingForPage === selectedCustomPage.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>Upload Multiple</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          void handleBatchAddToCustomPage(selectedCustomPage.id, e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateMag({
                          customPages: customPages.map((cp) =>
                            cp.id === selectedCustomPage.id
                              ? {
                                  ...cp,
                                  photos: [
                                    ...cp.photos,
                                    { id: `cph-${Date.now()}`, url: '', caption: { en: '', ar: '' } },
                                  ],
                                }
                              : cp,
                          ),
                        })
                      }
                      className="rounded-lg border border-[#C5A46D]/35 px-2.5 py-1.5 text-[11px] text-[#C5A46D]"
                    >
                      + Add Photo
                    </button>
                  </div>
                </div>

                {selectedCustomPage.photos.map((ph, pIdx) => (
                  <div key={ph.id} className="flex items-start gap-2 border-t border-[#C5A46D]/10 pt-2.5">
                    <div className="flex-1 space-y-2">
                      <MediaPickerUpload
                        label={`Photo #${pIdx + 1}`}
                        value={ph.url}
                        onChange={(url) =>
                          updateMag({
                            customPages: customPages.map((cp) =>
                              cp.id === selectedCustomPage.id
                                ? {
                                    ...cp,
                                    photos: cp.photos.map((x) => (x.id === ph.id ? { ...x, url } : x)),
                                  }
                                : cp,
                            ),
                          })
                        }
                        accept="image/*"
                        fieldKey={`cp-ph-${ph.id}`}
                        uploadingField={uploadingField}
                        onUploadFile={onUploadFile}
                        mediaLibrary={mediaLibrary}
                        onRefreshLibrary={onRefreshLibrary}
                        showPreview
                      />
                      <LocalizedInputs
                        label="Caption"
                        value={ph.caption || { en: '', ar: '' }}
                        onChange={(caption) =>
                          updateMag({
                            customPages: customPages.map((cp) =>
                              cp.id === selectedCustomPage.id
                                ? {
                                    ...cp,
                                    photos: cp.photos.map((x) => (x.id === ph.id ? { ...x, caption } : x)),
                                  }
                                : cp,
                            ),
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateMag({
                          customPages: customPages.map((cp) =>
                            cp.id === selectedCustomPage.id
                              ? { ...cp, photos: cp.photos.filter((x) => x.id !== ph.id) }
                              : cp,
                          ),
                        })
                      }
                      className="mt-6 rounded-lg border border-rose-500/30 p-2 text-rose-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Optional Audio + QR */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2">
                  <span className="text-xs font-medium text-[#C5A46D]">Optional Audio Clip</span>
                  {audioTracks.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const trk = audioTracks.find((t) => t.url === e.target.value);
                        if (trk) {
                          updateMag({
                            customPages: customPages.map((cp) =>
                              cp.id === selectedCustomPage.id
                                ? { ...cp, audioUrl: trk.url, audioTitle: trk.title }
                                : cp,
                            ),
                          });
                        }
                      }}
                      className="w-full rounded-md border border-[#C5A46D]/25 bg-[#292329] px-2.5 py-1.5 text-[11px] text-[#F5EBDD]"
                    >
                      <option value="">Assign from soundtrack...</option>
                      {audioTracks.map((t) => (
                        <option key={t.id} value={t.url}>
                          {t.title.en || t.title.ar}
                        </option>
                      ))}
                    </select>
                  )}
                  <MediaPickerUpload
                    label="Audio File / URL"
                    value={selectedCustomPage.audioUrl || ''}
                    onChange={(audioUrl) =>
                      updateMag({
                        customPages: customPages.map((cp) =>
                          cp.id === selectedCustomPage.id
                            ? { ...cp, audioUrl: audioUrl || undefined }
                            : cp,
                        ),
                      })
                    }
                    accept="audio/*"
                    fieldKey={`cp-aud-${selectedCustomPage.id}`}
                    uploadingField={uploadingField}
                    onUploadFile={onUploadFile}
                    mediaLibrary={mediaLibrary}
                    onRefreshLibrary={onRefreshLibrary}
                  />
                </div>

                <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2">
                  <span className="text-xs font-medium text-[#C5A46D]">Optional QR Code</span>
                  <input
                    type="url"
                    value={selectedCustomPage.qrUrl || ''}
                    onChange={(e) =>
                      updateMag({
                        customPages: customPages.map((cp) =>
                          cp.id === selectedCustomPage.id ? { ...cp, qrUrl: e.target.value } : cp,
                        ),
                      })
                    }
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                  <label className="flex items-center gap-2 text-xs text-[#F5EBDD]/85 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedCustomPage.showQr)}
                      onChange={(e) =>
                        updateMag({
                          customPages: customPages.map((cp) =>
                            cp.id === selectedCustomPage.id ? { ...cp, showQr: e.target.checked } : cp,
                          ),
                        })
                      }
                      className="accent-[#C5A46D]"
                    />
                    <span>Show QR badge on page</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
