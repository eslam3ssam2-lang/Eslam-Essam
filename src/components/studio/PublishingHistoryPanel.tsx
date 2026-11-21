import { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  History,
  Link2,
  Loader2,
  Rocket,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { normalizeEdition } from '../../data/defaultExperience.ts';
import type { BirthdayEdition, EditionVersionSummary } from '../../types/birthday.ts';
import { StudioSectionHeader } from './StudioControls.tsx';

interface PublishingHistoryPanelProps {
  draft: BirthdayEdition;
  lastSavedAt: string;
  lastPublishedAt: string;
  hasUnpublishedChanges: boolean;
  isPublished: boolean;
  versions: EditionVersionSummary[];
  publishing: boolean;
  onSaveDraft: () => Promise<void>;
  onOpenPreview: () => void;
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
  onRenameSlug: (newSlug: string) => Promise<void>;
  onDiscardDraft: () => Promise<void>;
  onCreateBackup: (label: string) => Promise<void>;
  onRestoreVersion: (versionId: string) => Promise<void>;
  onDeleteVersion: (versionId: string) => Promise<void>;
  onImportJsonEdition: (imported: BirthdayEdition) => void;
}

export function PublishingHistoryPanel({
  draft,
  lastSavedAt,
  lastPublishedAt,
  hasUnpublishedChanges,
  isPublished,
  versions,
  publishing,
  onSaveDraft,
  onOpenPreview,
  onPublish,
  onUnpublish,
  onRenameSlug,
  onDiscardDraft,
  onCreateBackup,
  onRestoreVersion,
  onDeleteVersion,
  onImportJsonEdition,
}: PublishingHistoryPanelProps) {
  const [backupLabel, setBackupLabel] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [slugInput, setSlugInput] = useState(draft.slug);
  const [updatingSlug, setUpdatingSlug] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setSlugInput(draft.slug);
  }, [draft.slug]);

  const publicPath = `/birthday/${encodeURIComponent(draft.slug)}`;
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath;

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleGenerateSlugFromName = async () => {
    const clean = (slugInput || draft.recipientName.en || 'birthday')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    if (!clean) return;
    setSlugInput(clean);
    if (clean !== draft.slug) {
      setUpdatingSlug(true);
      try {
        await onRenameSlug(clean);
      } finally {
        setUpdatingSlug(false);
      }
    }
  };

  const exportBackupJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `birthday-studio-${draft.slug}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File | undefined) => {
    if (!file) return;
    setImportFeedback(null);
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as BirthdayEdition;
      if (!parsed || typeof parsed !== 'object' || !parsed.recipientName) {
        throw new Error('This file does not look like a valid Birthday Studio backup.');
      }
      const normalized = normalizeEdition({ ...parsed, slug: draft.slug });
      onImportJsonEdition(normalized);
      setImportFeedback('Backup loaded into Draft! Review changes or click Publish.');
    } catch (err) {
      setImportFeedback(err instanceof Error ? err.message : 'Invalid backup JSON file.');
    }
  };

  const formatTimestamp = (iso: string) => {
    if (!iso) return 'Not yet published';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 9 · Publishing, Sharing & Version History"
        title="Publish, Share Public Link & Backups"
        description="Save changes safely to your private Draft, preview the complete experience, publish or unpublish anytime, and generate a unique public /birthday/ link for guests."
      />

      {/* Publishing Status & Primary Actions */}
      <div className="rounded-2xl border border-[#C5A46D]/35 bg-[#292329] p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isPublished
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                    : 'bg-[#713F50]/60 text-[#D9A5AE] border border-[#D9A5AE]/35'
                }`}
              >
                {isPublished ? <Globe className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>{isPublished ? 'Published (Publicly Live)' : 'Unpublished (Private Only)'}</span>
              </span>

              {hasUnpublishedChanges && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A46D]/40 bg-[#C5A46D]/15 px-3 py-1 text-xs font-medium text-[#C5A46D]">
                  Unpublished Draft Edits Pending
                </span>
              )}
            </div>
            <p className="text-xs text-[#F5EBDD]/65 tabular-nums">
              Last draft saved: {formatTimestamp(lastSavedAt)} · Last published:{' '}
              {formatTimestamp(lastPublishedAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onSaveDraft()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-3.5 py-2 text-xs font-medium text-[#F5EBDD] hover:border-[#C5A46D]"
            >
              <Save className="h-3.5 w-3.5 text-[#C5A46D]" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              onClick={onOpenPreview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9A5AE]/40 bg-[#1E191E] px-3.5 py-2 text-xs font-medium text-[#F5EBDD] hover:border-[#D9A5AE]"
            >
              <Eye className="h-3.5 w-3.5 text-[#D9A5AE]" />
              <span>Preview Birthday Website</span>
            </button>

            <button
              type="button"
              disabled={publishing}
              onClick={() => void onPublish()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              <span>{publishing ? 'Publishing...' : 'Publish'}</span>
            </button>

            {isPublished && !confirmUnpublish && (
              <button
                type="button"
                onClick={() => setConfirmUnpublish(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/35 bg-[#1E191E] px-3.5 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>Unpublish</span>
              </button>
            )}

            {isPublished && confirmUnpublish && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await onUnpublish();
                    setConfirmUnpublish(false);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Confirm Unpublish
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnpublish(false)}
                  className="rounded-lg border border-[#C5A46D]/30 px-2.5 py-2 text-xs text-[#F5EBDD]/80"
                >
                  Cancel
                </button>
              </div>
            )}

            {hasUnpublishedChanges && !confirmDiscard && (
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200/85 hover:bg-rose-500/10"
              >
                Discard Draft
              </button>
            )}
            {confirmDiscard && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await onDiscardDraft();
                    setConfirmDiscard(false);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Confirm Discard
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className="rounded-lg border border-[#C5A46D]/30 px-2.5 py-2 text-xs text-[#F5EBDD]/80"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Public Shareable Link Generator */}
        <div className="rounded-xl border border-[#C5A46D]/25 bg-[#1E191E] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A46D]">
              <Link2 className="h-4 w-4" />
              <span>Unique Public Birthday Link</span>
            </div>
            <span className="text-[11px] text-[#F5EBDD]/60">
              {isPublished
                ? 'Visitors can open this URL without logging in.'
                : 'Currently unpublished — publish first before sharing with guests.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[220px] flex-1 items-center overflow-hidden rounded-lg border border-[#C5A46D]/30 bg-[#292329]">
              <span className="border-e border-[#C5A46D]/20 bg-[#1E191E]/70 px-3 py-2 text-xs text-[#F5EBDD]/60 select-none">
                {typeof window !== 'undefined' ? `${window.location.origin}/birthday/` : '/birthday/'}
              </span>
              <input
                type="text"
                value={slugInput}
                onChange={(e) =>
                  setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="sara"
                dir="ltr"
                className="min-w-[100px] flex-1 bg-transparent px-3 py-2 text-xs font-mono text-[#F5EBDD] focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={updatingSlug || !slugInput.trim()}
              onClick={() => void handleGenerateSlugFromName()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#713F50] px-3.5 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F] disabled:opacity-50"
            >
              {updatingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              <span>Generate Public Link</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopyPublicLink()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#292329] px-3.5 py-2 text-xs font-medium text-[#C5A46D] hover:bg-[#C5A46D] hover:text-[#292329]"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied Public Link' : 'Copy Public Link'}</span>
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#292329] px-3.5 py-2 text-xs font-medium text-[#F5EBDD] hover:border-[#C5A46D]"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#D9A5AE]" />
              <span>Open Public Link</span>
            </a>
          </div>
        </div>
      </div>

      {/* Manual Checkpoint & JSON Export / Import */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F5EBDD]">
            <Archive className="h-4 w-4 text-[#C5A46D]" />
            <span>Create Manual Backup Snapshot</span>
          </div>
          <p className="text-xs text-[#F5EBDD]/65">
            Save a named restore point of your current Draft before trying major layout or magazine changes.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onCreateBackup(backupLabel.trim());
              setBackupLabel('');
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="text"
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder="e.g. Before adding sister tributes"
              className="min-w-[180px] flex-1 rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#713F50] px-4 py-2 text-xs font-semibold text-[#F5EBDD] hover:bg-[#844B5F]"
            >
              Save Snapshot
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F5EBDD]">
            <Download className="h-4 w-4 text-[#D9A5AE]" />
            <span>Export & Restore JSON File</span>
          </div>
          <p className="text-xs text-[#F5EBDD]/65">
            Download a portable backup file of this entire birthday book or import a saved JSON backup into Draft.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportBackupJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-3.5 py-2 text-xs font-medium text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download JSON Backup</span>
            </button>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-3.5 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-white/10">
              <Upload className="h-3.5 w-3.5 text-[#D9A5AE]" />
              <span>Import JSON Backup</span>
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  void handleImportJson(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {importFeedback && <p className="text-xs text-[#C5A46D]">{importFeedback}</p>}
        </div>
      </div>

      {/* Saved Version History List */}
      <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F5EBDD]">
          <History className="h-4 w-4 text-[#C5A46D]" />
          <span>Version History ({versions.length})</span>
        </div>

        {versions.length === 0 ? (
          <p className="text-xs text-[#F5EBDD]/60 py-4 text-center">
            Snapshots are created automatically every time you publish changes or save a manual backup.
          </p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#713F50] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#F5EBDD]">
                      {v.kind}
                    </span>
                    <span className="truncate text-xs font-medium text-[#F5EBDD]">{v.label}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#F5EBDD]/55 tabular-nums">
                    {formatTimestamp(v.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void onRestoreVersion(v.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 px-3 py-1.5 text-xs font-medium text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore to Draft</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteVersion(v.id)}
                    className="rounded-lg border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/15"
                    title="Delete snapshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
