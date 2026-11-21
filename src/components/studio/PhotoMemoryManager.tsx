import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Clock,
  FolderPlus,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  BirthdayEdition,
  MemoryAlbumCategory,
  MemoryItem,
  UploadedMediaAsset,
} from '../../types/birthday.ts';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface PhotoMemoryManagerProps {
  draft: BirthdayEdition;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  onUploadBatch: (files: FileList | File[]) => Promise<Array<{ url: string; kind: 'image' | 'video' | 'audio'; originalName: string }>>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

export function PhotoMemoryManager({
  draft,
  onChange,
  uploadingField,
  onUploadFile,
  onUploadBatch,
  mediaLibrary,
  onRefreshLibrary,
}: PhotoMemoryManagerProps) {
  const [targetAlbumId, setTargetAlbumId] = useState<string>('');
  const [batchUploading, setBatchUploading] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [albumFilter, setAlbumFilter] = useState<string>('all');

  const albums = draft.albums || [];
  const sortedMemories = [...draft.memories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const visibleMemories =
    albumFilter === 'all'
      ? sortedMemories
      : albumFilter === 'unassigned'
        ? sortedMemories.filter((m) => !m.albumId)
        : sortedMemories.filter((m) => m.albumId === albumFilter);

  const handleBatchFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploading(true);
    try {
      const uploaded = await onUploadBatch(files);
      if (uploaded.length === 0) return;
      const today = new Date().toISOString().slice(0, 10);
      onChange((prev) => {
        const baseOrder = prev.memories.length;
        const additions: MemoryItem[] = uploaded
          .filter((item) => item.kind === 'image' || item.kind === 'video')
          .map((item, i) => {
            const cleanTitle = item.originalName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
            return {
              id: `mem-${Date.now()}-${i}`,
              type: item.kind === 'video' ? 'video' : 'photo',
              mediaUrl: item.url,
              title: { en: cleanTitle || `Memory ${baseOrder + i + 1}`, ar: cleanTitle || `ذكرى ${baseOrder + i + 1}` },
              caption: { en: '', ar: '' },
              date: today,
              location: { en: '', ar: '' },
              albumId: targetAlbumId || undefined,
              showInAlbum: true,
              showInTimeline: false,
              showInMagazine: false,
              order: baseOrder + i,
            };
          });
        return { ...prev, memories: [...prev.memories, ...additions] };
      });
    } finally {
      setBatchUploading(false);
    }
  };

  const moveMemory = (id: string, delta: number) => {
    onChange((prev) => {
      const ordered = [...prev.memories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = ordered.findIndex((m) => m.id === id);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= ordered.length) return prev;
      [ordered[idx], ordered[nextIdx]] = [ordered[nextIdx], ordered[idx]];
      return {
        ...prev,
        memories: ordered.map((m, i) => ({ ...m, order: i })),
      };
    });
  };

  const handleDropOnMemory = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    onChange((prev) => {
      const ordered = [...prev.memories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const fromIdx = ordered.findIndex((m) => m.id === draggedId);
      const toIdx = ordered.findIndex((m) => m.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = ordered.splice(fromIdx, 1);
      ordered.splice(toIdx, 0, moved);
      return {
        ...prev,
        memories: ordered.map((m, i) => ({ ...m, order: i })),
      };
    });
    setDraggedId(null);
  };

  const addAlbum = () => {
    const newAlb: MemoryAlbumCategory = {
      id: `alb-${Date.now()}`,
      title: { en: 'New Collection', ar: 'ألبوم جديد' },
      description: { en: '', ar: '' },
    };
    onChange((prev) => ({ ...prev, albums: [...(prev.albums || []), newAlb] }));
  };

  const addEmptyMemory = () => {
    onChange((prev) => ({
      ...prev,
      memories: [
        ...prev.memories,
        {
          id: `mem-${Date.now()}`,
          type: 'photo',
          mediaUrl: '',
          title: { en: 'New Keepsake Photo', ar: 'صورة تذكارية جديدة' },
          caption: { en: '', ar: '' },
          date: new Date().toISOString().slice(0, 10),
          location: { en: '', ar: '' },
          albumId: targetAlbumId || undefined,
          showInAlbum: true,
          showInTimeline: false,
          showInMagazine: false,
          order: prev.memories.length,
        },
      ],
    }));
  };

  const audioOptions = draft.music.tracks.filter((t) => t.sourceType === 'url' && t.url);

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 2 · Photo & Memory Manager"
        title="Photos, Videos & Albums"
        description="Batch-upload multiple photos or videos, organize albums, drag-and-drop to reorder memories, attach audio clips, and choose where each photo appears (Album, Timeline, or 3D Magazine)."
        actions={
          <button
            type="button"
            onClick={addEmptyMemory}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-3.5 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Single Memory</span>
          </button>
        }
      />

      {/* Batch Multi-Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleBatchFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-[#C5A46D]/45 bg-[#292329] p-5 sm:flex-row"
      >
        <div className="space-y-1 text-center sm:text-start">
          <p className="text-sm font-semibold text-[#F5EBDD]">Batch Upload Multiple Photos & Videos</p>
          <p className="text-xs text-[#F5EBDD]/65">
            Select or drag up to 20 files at once. Each file creates an editable memory card ready for captions and placement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={targetAlbumId}
            onChange={(e) => setTargetAlbumId(e.target.value)}
            className="rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
          >
            <option value="">No default album</option>
            {albums.map((alb) => (
              <option key={alb.id} value={alb.id}>
                Assign to: {alb.title.en || alb.title.ar}
              </option>
            ))}
          </select>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#713F50] px-4 py-2 text-xs font-semibold text-[#F5EBDD] hover:bg-[#844B5F] transition-colors">
            {batchUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-[#C5A46D]" />}
            <span>{batchUploading ? 'Uploading Batch...' : 'Select Files'}</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              disabled={batchUploading}
              onChange={(e) => {
                void handleBatchFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* Albums / Categories Section */}
      <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Photo Albums & Categories ({albums.length})</h3>
            <p className="text-xs text-[#F5EBDD]/60">Group photos into curated collections visitors can filter by.</p>
          </div>
          <button
            type="button"
            onClick={addAlbum}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-3 py-1.5 text-xs font-medium text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD]"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>New Album</span>
          </button>
        </div>

        {albums.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {albums.map((alb, aIdx) => (
              <div
                key={alb.id}
                className="rounded-xl border border-[#C5A46D]/25 bg-[#1E191E] p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#D9A5AE]">Album #{aIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        albums: (prev.albums || []).filter((x) => x.id !== alb.id),
                        memories: prev.memories.map((m) =>
                          m.albumId === alb.id ? { ...m, albumId: undefined } : m,
                        ),
                      }))
                    }
                    className="rounded p-1 text-rose-300 hover:bg-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <LocalizedInputs
                  label="Album Title"
                  value={alb.title}
                  onChange={(title) =>
                    onChange((prev) => ({
                      ...prev,
                      albums: (prev.albums || []).map((x) => (x.id === alb.id ? { ...x, title } : x)),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Reorder List */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAlbumFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              albumFilter === 'all' ? 'bg-[#C5A46D] text-[#292329]' : 'bg-[#292329] text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
            }`}
          >
            All ({sortedMemories.length})
          </button>
          {albums.map((alb) => (
            <button
              key={alb.id}
              type="button"
              onClick={() => setAlbumFilter(alb.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                albumFilter === alb.id ? 'bg-[#C5A46D] text-[#292329]' : 'bg-[#292329] text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
              }`}
            >
              {alb.title.en || alb.title.ar}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAlbumFilter('unassigned')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              albumFilter === 'unassigned' ? 'bg-[#C5A46D] text-[#292329]' : 'bg-[#292329] text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
            }`}
          >
            Unassigned
          </button>
        </div>
        <p className="text-[11px] text-[#F5EBDD]/55">Drag cards by the grip handle or use arrows to reorder.</p>
      </div>

      <div className="space-y-4">
        {visibleMemories.map((item, vIdx) => {
          const globalIndex = sortedMemories.findIndex((m) => m.id === item.id);
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnMemory(item.id)}
              onDragEnd={() => setDraggedId(null)}
              className={`rounded-2xl border bg-[#292329] p-4 sm:p-5 transition-colors ${
                draggedId === item.id ? 'border-[#D9A5AE] opacity-70' : 'border-[#C5A46D]/25'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5A46D]/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="cursor-grab text-[#C5A46D]" title="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-[#C5A46D] tabular-nums">
                    #{vIdx + 1} · {item.title.en || 'Untitled Memory'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={globalIndex <= 0}
                    onClick={() => moveMemory(item.id, -1)}
                    className="rounded-md border border-[#C5A46D]/25 p-1.5 text-[#F5EBDD]/80 hover:bg-white/10 disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={globalIndex >= sortedMemories.length - 1}
                    onClick={() => moveMemory(item.id, 1)}
                    className="rounded-md border border-[#C5A46D]/25 p-1.5 text-[#F5EBDD]/80 hover:bg-white/10 disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        memories: prev.memories
                          .filter((m) => m.id !== item.id)
                          .map((m, idx) => ({ ...m, order: idx })),
                      }))
                    }
                    className="rounded-md border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/15"
                    title="Delete memory"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* Thumbnail & Placement */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#C5A46D]/30 bg-[#1E191E] flex items-center justify-center">
                    {item.mediaUrl ? (
                      item.type === 'video' ? (
                        <video src={item.mediaUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img
                          src={item.mediaUrl}
                          alt={item.title.en}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <ImageIcon className="h-8 w-8 text-[#C5A46D]/50" />
                    )}
                  </div>

                  {/* Where to show toggles */}
                  <div className="space-y-1.5 rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3">
                    <p className="text-[11px] font-medium text-[#C5A46D]">Display Placement</p>
                    <label className="flex items-center justify-between text-xs text-[#F5EBDD]/85 cursor-pointer py-0.5">
                      <span className="inline-flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-[#C5A46D]" /> Show in Photo Album
                      </span>
                      <input
                        type="checkbox"
                        checked={item.showInAlbum !== false}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === item.id ? { ...m, showInAlbum: e.target.checked } : m,
                            ),
                          }))
                        }
                        className="accent-[#C5A46D]"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-[#F5EBDD]/85 cursor-pointer py-0.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#D9A5AE]" /> Include in Timeline
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(item.showInTimeline)}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === item.id ? { ...m, showInTimeline: e.target.checked } : m,
                            ),
                          }))
                        }
                        className="accent-[#C5A46D]"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-[#F5EBDD]/85 cursor-pointer py-0.5">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-[#C5A46D]" /> Feature in 3D Magazine
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(item.showInMagazine)}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === item.id ? { ...m, showInMagazine: e.target.checked } : m,
                            ),
                          }))
                        }
                        className="accent-[#C5A46D]"
                      />
                    </label>
                  </div>
                </div>

                {/* Metadata Fields */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-[#C5A46D] mb-1">Media Type</label>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === item.id ? { ...m, type: e.target.value as 'photo' | 'video' } : m,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                      >
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#C5A46D] mb-1">Album</label>
                      <select
                        value={item.albumId || ''}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === item.id ? { ...m, albumId: e.target.value || undefined } : m,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                      >
                        <option value="">Unassigned</option>
                        {albums.map((alb) => (
                          <option key={alb.id} value={alb.id}>
                            {alb.title.en || alb.title.ar}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#C5A46D] mb-1">Memory Date</label>
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === item.id ? { ...m, date: e.target.value } : m,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                      />
                    </div>
                  </div>

                  <MediaPickerUpload
                    label="Photo / Video File or URL"
                    value={item.mediaUrl}
                    onChange={(mediaUrl) =>
                      onChange((prev) => ({
                        ...prev,
                        memories: prev.memories.map((m) => (m.id === item.id ? { ...m, mediaUrl } : m)),
                      }))
                    }
                    accept={item.type === 'video' ? 'video/*' : 'image/*'}
                    fieldKey={`mem-media-${item.id}`}
                    uploadingField={uploadingField}
                    onUploadFile={onUploadFile}
                    mediaLibrary={mediaLibrary}
                    onRefreshLibrary={onRefreshLibrary}
                  />

                  <LocalizedInputs
                    label="Memory Title"
                    value={item.title}
                    onChange={(title) =>
                      onChange((prev) => ({
                        ...prev,
                        memories: prev.memories.map((m) => (m.id === item.id ? { ...m, title } : m)),
                      }))
                    }
                  />

                  <LocalizedInputs
                    label="Story / Caption"
                    value={item.caption}
                    onChange={(caption) =>
                      onChange((prev) => ({
                        ...prev,
                        memories: prev.memories.map((m) => (m.id === item.id ? { ...m, caption } : m)),
                      }))
                    }
                    multiline
                  />

                  <LocalizedInputs
                    label="Location"
                    value={item.location}
                    onChange={(location) =>
                      onChange((prev) => ({
                        ...prev,
                        memories: prev.memories.map((m) => (m.id === item.id ? { ...m, location } : m)),
                      }))
                    }
                  />

                  <div className="space-y-2 rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#C5A46D]">Optional Memory Audio Clip</span>
                      {audioOptions.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            const found = audioOptions.find((t) => t.url === e.target.value);
                            if (found) {
                              onChange((prev) => ({
                                ...prev,
                                memories: prev.memories.map((m) =>
                                  m.id === item.id
                                    ? { ...m, audioUrl: found.url, audioTitle: found.title }
                                    : m,
                                ),
                              }));
                            }
                          }}
                          className="rounded-md border border-[#C5A46D]/25 bg-[#292329] px-2.5 py-1 text-[11px] text-[#F5EBDD]"
                        >
                          <option value="">Assign from soundtrack...</option>
                          {audioOptions.map((trk) => (
                            <option key={trk.id} value={trk.url}>
                              {trk.title.en || trk.title.ar}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <MediaPickerUpload
                      label="Audio URL or Upload"
                      value={item.audioUrl || ''}
                      onChange={(audioUrl) =>
                        onChange((prev) => ({
                          ...prev,
                          memories: prev.memories.map((m) =>
                            m.id === item.id ? { ...m, audioUrl: audioUrl || undefined } : m,
                          ),
                        }))
                      }
                      accept="audio/*"
                      fieldKey={`mem-audio-${item.id}`}
                      uploadingField={uploadingField}
                      onUploadFile={onUploadFile}
                      mediaLibrary={mediaLibrary}
                      onRefreshLibrary={onRefreshLibrary}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
