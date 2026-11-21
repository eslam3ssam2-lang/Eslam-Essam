import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  BirthdayEdition,
  TimelineEventItem,
  UploadedMediaAsset,
} from '../../types/birthday.ts';
import { RichTextEditor } from '../RichTextContent.tsx';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface TimelineManagerProps {
  draft: BirthdayEdition;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  onUploadBatch: (files: FileList | File[]) => Promise<Array<{ url: string; kind: 'image' | 'video' | 'audio'; originalName: string }>>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

export function TimelineManager({
  draft,
  onChange,
  uploadingField,
  onUploadFile,
  onUploadBatch,
  mediaLibrary,
  onRefreshLibrary,
}: TimelineManagerProps) {
  const [uploadingPhotosFor, setUploadingPhotosFor] = useState<string | null>(null);
  const timeline = draft.timeline || [];

  const addMilestone = () => {
    const newItem: TimelineEventItem = {
      id: `tl-${Date.now()}`,
      title: { en: 'New Milestone', ar: 'محطة جديدة' },
      date: new Date().toISOString().slice(0, 10),
      photos: [],
      story: { en: '', ar: '' },
      people: { en: '', ar: '' },
      order: timeline.length,
    };
    onChange((prev) => ({ ...prev, timeline: [...(prev.timeline || []), newItem] }));
  };

  const sortChronologically = () => {
    onChange((prev) => {
      const sorted = [...(prev.timeline || [])]
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map((item, idx) => ({ ...item, order: idx }));
      return { ...prev, timeline: sorted };
    });
  };

  const moveItem = (idx: number, delta: number) => {
    onChange((prev) => {
      const list = [...(prev.timeline || [])];
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= list.length) return prev;
      [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
      return {
        ...prev,
        timeline: list.map((item, i) => ({ ...item, order: i })),
      };
    });
  };

  const addMultiplePhotos = async (eventId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhotosFor(eventId);
    try {
      const uploaded = await onUploadBatch(files);
      const imageUrls = uploaded.filter((u) => u.kind === 'image').map((u) => u.url);
      if (imageUrls.length === 0) return;
      onChange((prev) => ({
        ...prev,
        timeline: (prev.timeline || []).map((ev) =>
          ev.id === eventId ? { ...ev, photos: [...ev.photos, ...imageUrls] } : ev,
        ),
      }));
    } finally {
      setUploadingPhotosFor(null);
    }
  };

  const audioTracks = draft.music.tracks.filter((t) => t.sourceType === 'url' && t.url);

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 4 · Timeline & Dates Manager"
        title="Chronological Milestones"
        description="Build the chronological story timeline shown inside the Memory Archive chapter. Attach dates, multi-photo galleries, people present, rich stories, and optional audio."
        actions={
          <>
            <button
              type="button"
              onClick={sortChronologically}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#292329] px-3.5 py-2 text-xs font-medium text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD]"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Sort by Date</span>
            </button>
            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-3.5 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Milestone</span>
            </button>
          </>
        }
      />

      {timeline.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C5A46D]/35 bg-[#292329] p-10 text-center text-xs text-[#F5EBDD]/65">
          No timeline milestones yet. Click &ldquo;Add Milestone&rdquo; or enable &ldquo;Include in Timeline&rdquo; on any memory photo.
        </div>
      ) : (
        <div className="space-y-5">
          {timeline.map((ev, idx) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5A46D]/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-[#713F50] px-2.5 py-1 text-[11px] font-semibold text-[#F5EBDD] tabular-nums">
                    {ev.date || 'No Date'}
                  </span>
                  <span className="text-sm font-semibold text-[#F5EBDD]">
                    {ev.title.en || ev.title.ar || `Milestone #${idx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, -1)}
                    className="rounded-md border border-[#C5A46D]/25 p-1.5 text-[#F5EBDD]/80 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === timeline.length - 1}
                    onClick={() => moveItem(idx, 1)}
                    className="rounded-md border border-[#C5A46D]/25 p-1.5 text-[#F5EBDD]/80 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        timeline: (prev.timeline || []).filter((t) => t.id !== ev.id),
                      }))
                    }
                    className="rounded-md border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1">Exact Date</label>
                  <input
                    type="date"
                    value={ev.date}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        timeline: (prev.timeline || []).map((t) =>
                          t.id === ev.id ? { ...t, date: e.target.value } : t,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <LocalizedInputs
                    label="Related People"
                    value={ev.people}
                    onChange={(people) =>
                      onChange((prev) => ({
                        ...prev,
                        timeline: (prev.timeline || []).map((t) =>
                          t.id === ev.id ? { ...t, people } : t,
                        ),
                      }))
                    }
                  />
                </div>
              </div>

              <LocalizedInputs
                label="Milestone Title"
                value={ev.title}
                onChange={(title) =>
                  onChange((prev) => ({
                    ...prev,
                    timeline: (prev.timeline || []).map((t) =>
                      t.id === ev.id ? { ...t, title } : t,
                    ),
                  }))
                }
              />

              {/* Multi-Photo Strip */}
              <div className="space-y-2.5 rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#C5A46D]">
                    Milestone Photos ({ev.photos.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#713F50] px-3 py-1.5 text-[11px] font-medium text-[#F5EBDD] hover:bg-[#844B5F]">
                      {uploadingPhotosFor === ev.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>Upload Multiple Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          void addMultiplePhotos(ev.id, e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          timeline: (prev.timeline || []).map((t) =>
                            t.id === ev.id ? { ...t, photos: [...t.photos, ''] } : t,
                          ),
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/35 px-2.5 py-1.5 text-[11px] text-[#C5A46D] hover:bg-white/5"
                    >
                      <Plus className="h-3 w-3" /> Add URL Slot
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ev.photos.map((photoUrl, pIdx) => (
                    <div key={`${ev.id}-ph-${pIdx}`} className="flex items-start gap-2">
                      <div className="flex-1">
                        <MediaPickerUpload
                          label={`Photo #${pIdx + 1}`}
                          value={photoUrl}
                          onChange={(url) =>
                            onChange((prev) => ({
                              ...prev,
                              timeline: (prev.timeline || []).map((t) =>
                                t.id === ev.id
                                  ? {
                                      ...t,
                                      photos: t.photos.map((u, i) => (i === pIdx ? url : u)),
                                    }
                                  : t,
                              ),
                            }))
                          }
                          accept="image/*"
                          fieldKey={`tl-${ev.id}-p-${pIdx}`}
                          uploadingField={uploadingField}
                          onUploadFile={onUploadFile}
                          mediaLibrary={mediaLibrary}
                          onRefreshLibrary={onRefreshLibrary}
                          showPreview
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            timeline: (prev.timeline || []).map((t) =>
                              t.id === ev.id
                                ? { ...t, photos: t.photos.filter((_, i) => i !== pIdx) }
                                : t,
                            ),
                          }))
                        }
                        className="mt-6 rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-500/15"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <RichTextEditor
                label="Milestone Story"
                value={ev.story}
                onChange={(story) =>
                  onChange((prev) => ({
                    ...prev,
                    timeline: (prev.timeline || []).map((t) =>
                      t.id === ev.id ? { ...t, story } : t,
                    ),
                  }))
                }
                rows={4}
              />

              <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#C5A46D]">Optional Milestone Audio</span>
                  {audioTracks.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const found = audioTracks.find((t) => t.url === e.target.value);
                        if (found) {
                          onChange((prev) => ({
                            ...prev,
                            timeline: (prev.timeline || []).map((t) =>
                              t.id === ev.id
                                ? { ...t, audioUrl: found.url, audioTitle: found.title }
                                : t,
                            ),
                          }));
                        }
                      }}
                      className="rounded-md border border-[#C5A46D]/25 bg-[#292329] px-2.5 py-1 text-[11px] text-[#F5EBDD]"
                    >
                      <option value="">Assign from soundtrack...</option>
                      {audioTracks.map((trk) => (
                        <option key={trk.id} value={trk.url}>
                          {trk.title.en || trk.title.ar}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <MediaPickerUpload
                  label="Audio File / URL"
                  value={ev.audioUrl || ''}
                  onChange={(audioUrl) =>
                    onChange((prev) => ({
                      ...prev,
                      timeline: (prev.timeline || []).map((t) =>
                        t.id === ev.id ? { ...t, audioUrl: audioUrl || undefined } : t,
                      ),
                    }))
                  }
                  accept="audio/*"
                  fieldKey={`tl-audio-${ev.id}`}
                  uploadingField={uploadingField}
                  onUploadFile={onUploadFile}
                  mediaLibrary={mediaLibrary}
                  onRefreshLibrary={onRefreshLibrary}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
