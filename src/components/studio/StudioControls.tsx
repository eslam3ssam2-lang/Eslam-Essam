import React, { useState } from 'react';
import { FolderOpen, Image as ImageIcon, Loader2, Music, Upload, Video, X } from 'lucide-react';
import type { LocalizedText, UploadedMediaAsset } from '../../types/birthday.ts';

export function LocalizedInputs({
  label,
  value,
  onChange,
  multiline = false,
  placeholderEn = 'English',
  placeholderAr = 'العربية',
}: {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  placeholderEn?: string;
  placeholderAr?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#C5A46D]">{label}</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {multiline ? (
          <>
            <textarea
              rows={3}
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
              placeholder={placeholderEn}
              dir="ltr"
              className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD] placeholder:text-[#F5EBDD]/35 focus:border-[#C5A46D] focus:outline-none"
            />
            <textarea
              rows={3}
              value={value.ar}
              onChange={(e) => onChange({ ...value, ar: e.target.value })}
              placeholder={placeholderAr}
              dir="rtl"
              className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD] placeholder:text-[#F5EBDD]/35 focus:border-[#C5A46D] focus:outline-none"
            />
          </>
        ) : (
          <>
            <input
              type="text"
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
              placeholder={placeholderEn}
              dir="ltr"
              className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD] placeholder:text-[#F5EBDD]/35 focus:border-[#C5A46D] focus:outline-none"
            />
            <input
              type="text"
              value={value.ar}
              onChange={(e) => onChange({ ...value, ar: e.target.value })}
              placeholder={placeholderAr}
              dir="rtl"
              className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD] placeholder:text-[#F5EBDD]/35 focus:border-[#C5A46D] focus:outline-none"
            />
          </>
        )}
      </div>
    </div>
  );
}

export function MediaPickerUpload({
  label,
  value,
  onChange,
  accept,
  fieldKey,
  uploadingField,
  onUploadFile,
  mediaLibrary,
  onRefreshLibrary,
  showPreview = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept: string;
  fieldKey: string;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary?: () => Promise<void>;
  showPreview?: boolean;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const isUploading = uploadingField === fieldKey;

  const filterKind: 'image' | 'audio' | 'video' | 'all' = accept.startsWith('audio')
    ? 'audio'
    : accept.startsWith('video')
      ? 'video'
      : accept.startsWith('image')
        ? 'image'
        : 'all';

  const filteredAssets =
    filterKind === 'all' ? mediaLibrary : mediaLibrary.filter((a) => a.kind === filterKind);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-[#C5A46D]">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-[#D9A5AE] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showPreview && value && filterKind === 'image' && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#C5A46D]/35 bg-[#292329]">
            <img src={value} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or /uploads/..."
          dir="ltr"
          className="min-w-[180px] flex-1 rounded-lg border border-[#C5A46D]/30 bg-[#292329] px-3 py-2 text-xs text-[#F5EBDD] placeholder:text-[#F5EBDD]/35 focus:border-[#C5A46D] focus:outline-none"
        />

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#713F50] px-3 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F] transition-colors whitespace-nowrap shrink-0">
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={isUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const url = await onUploadFile(file, fieldKey);
              if (url) onChange(url);
            }}
          />
        </label>

        <button
          type="button"
          onClick={async () => {
            if (!libraryOpen && onRefreshLibrary) await onRefreshLibrary();
            setLibraryOpen((o) => !o);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 bg-[#292329] px-3 py-2 text-xs font-medium text-[#F5EBDD]/85 hover:border-[#C5A46D] hover:text-[#F5EBDD] transition-colors whitespace-nowrap shrink-0"
        >
          <FolderOpen className="h-3.5 w-3.5 text-[#C5A46D]" />
          <span>Library</span>
        </button>
      </div>

      {libraryOpen && (
        <div className="rounded-xl border border-[#C5A46D]/35 bg-[#1E191E] p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#C5A46D]">
              Uploaded Media Library ({filteredAssets.length})
            </span>
            <button
              type="button"
              onClick={() => setLibraryOpen(false)}
              className="rounded p-1 text-[#F5EBDD]/60 hover:bg-white/10 hover:text-[#F5EBDD]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {filteredAssets.length === 0 ? (
            <p className="py-3 text-center text-xs text-[#F5EBDD]/55">
              No matching uploaded files yet. Upload a file to add it to your library.
            </p>
          ) : (
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.filename}
                  type="button"
                  onClick={() => {
                    onChange(asset.url);
                    setLibraryOpen(false);
                  }}
                  className="group flex flex-col overflow-hidden rounded-lg border border-[#C5A46D]/25 bg-[#292329] text-start hover:border-[#C5A46D] transition-colors"
                >
                  <div className="flex h-16 w-full items-center justify-center bg-[#1E191E] overflow-hidden">
                    {asset.kind === 'image' ? (
                      <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                    ) : asset.kind === 'video' ? (
                      <Video className="h-5 w-5 text-[#D9A5AE]" />
                    ) : (
                      <Music className="h-5 w-5 text-[#C5A46D]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#F5EBDD]/80 truncate">
                    {asset.kind === 'image' && <ImageIcon className="h-2.5 w-2.5 shrink-0 text-[#C5A46D]" />}
                    <span className="truncate">{asset.filename}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StudioSectionHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#C5A46D]/20 pb-4">
      <div>
        <p className="text-[11px] font-medium tracking-wider uppercase text-[#C5A46D]">{kicker}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-[#F5EBDD] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-[#F5EBDD]/70 leading-relaxed">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
