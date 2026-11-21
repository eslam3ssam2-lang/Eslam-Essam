import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  History,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  Music,
  Plus,
  Rocket,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { normalizeEdition } from '../data/defaultExperience.ts';
import type {
  AdminEditionPayload,
  BirthdayEdition,
  EditionSummary,
  EditionVersionSummary,
  Language,
  UploadedMediaAsset,
  WishItem,
} from '../types/birthday.ts';
import { ProfileEditor } from './studio/ProfileEditor.tsx';
import { PhotoMemoryManager } from './studio/PhotoMemoryManager.tsx';
import { MessagesLettersEditor } from './studio/MessagesLettersEditor.tsx';
import { TimelineManager } from './studio/TimelineManager.tsx';
import { MagazineEditor } from './studio/MagazineEditor.tsx';
import { MusicAudioManager } from './studio/MusicAudioManager.tsx';
import { ChaptersContentManager } from './studio/ChaptersContentManager.tsx';
import { LivePreviewPanel } from './studio/LivePreviewPanel.tsx';
import { PublishingHistoryPanel } from './studio/PublishingHistoryPanel.tsx';

interface OwnerStudioProps {
  edition: BirthdayEdition;
  editions: EditionSummary[];
  lang: Language;
  token: string | null;
  authenticated: boolean;
  adminEmail: string | null;
  authChecking: boolean;
  needsSetup: boolean;
  envManaged: boolean;
  onAuthSuccess: (token: string | null, email: string) => void;
  onSessionExpired: () => void;
  onLogout: () => Promise<void>;
  onEditionUpdated: (updated: BirthdayEdition) => void;
  onSwitchEdition: (slug: string) => void;
  onEditionsListUpdated: (summaries: EditionSummary[]) => void;
  onWishesReload: () => void;
  onExitToSite: (slug?: string) => void;
}

type StudioSection =
  | 'profile'
  | 'memories'
  | 'letters'
  | 'timeline'
  | 'magazine'
  | 'music'
  | 'chapters'
  | 'preview'
  | 'publishing';

const NAV_ITEMS: Array<{
  id: StudioSection;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'profile', label: 'Birthday Profile', subtitle: 'Name, age, bio & cover', icon: User },
  { id: 'memories', label: 'Photos & Albums', subtitle: 'Batch upload & reorder', icon: ImageIcon },
  { id: 'letters', label: 'Messages & Letters', subtitle: 'Envelope, tributes & finale', icon: Mail },
  { id: 'timeline', label: 'Timeline & Dates', subtitle: 'Chronological milestones', icon: CalendarClock },
  { id: 'magazine', label: 'Birthday Magazine', subtitle: '3D pages & custom spreads', icon: BookOpen },
  { id: 'music', label: 'Music & Audio', subtitle: 'Songs, voice notes & video', icon: Music },
  { id: 'chapters', label: 'Website & Colors', subtitle: 'Colors, countdown & chapters', icon: Layers },
  { id: 'preview', label: 'Live Preview', subtitle: 'Desktop & mobile draft view', icon: Eye },
  { id: 'publishing', label: 'Publish & Share', subtitle: 'Public /birthday/ link & backups', icon: History },
];

export function OwnerStudio({
  edition,
  editions,
  lang,
  token,
  authenticated,
  adminEmail,
  authChecking,
  needsSetup,
  envManaged,
  onAuthSuccess,
  onSessionExpired,
  onLogout,
  onEditionUpdated,
  onSwitchEdition,
  onEditionsListUpdated,
  onWishesReload,
  onExitToSite,
}: OwnerStudioProps) {
  const [activeSection, setActiveSection] = useState<StudioSection>('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth form states (/admin)
  const [authView, setAuthView] = useState<'login' | 'reset' | 'recovery_saved'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [issuedRecoveryKey, setIssuedRecoveryKey] = useState<string | null>(null);
  const [pendingDashboardAuth, setPendingDashboardAuth] = useState<{
    token: string | null;
    email: string;
  } | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Account Security modal state (inside /admin/dashboard)
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [nextPwConfirm, setNextPwConfirm] = useState('');
  const [securityMsg, setSecurityMsg] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [rotatedRecoveryKey, setRotatedRecoveryKey] = useState<string | null>(null);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Studio draft & edition states
  const [draft, setDraft] = useState<BirthdayEdition>(() => normalizeEdition(edition));
  const [lastSavedAt, setLastSavedAt] = useState<string>(edition.updatedAt);
  const [lastPublishedAt, setLastPublishedAt] = useState<string>(edition.updatedAt);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [versions, setVersions] = useState<EditionVersionSummary[]>([]);

  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [publishing, setPublishing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<UploadedMediaAsset[]>([]);
  const [adminWishes, setAdminWishes] = useState<WishItem[]>([]);

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newAge, setNewAge] = useState(25);
  const [creatingEdition, setCreatingEdition] = useState(false);

  const dirtyCounterRef = useRef(0);
  const skipNextAutoSaveRef = useRef(true);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((prev) => (prev === msg ? null : prev)), 4000);
  }, []);

  const adminFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set('X-Requested-With', 'XMLHttpRequest');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });
      if (res.status === 401) {
        onSessionExpired();
      }
      return res;
    },
    [onSessionExpired, token],
  );

  const applyAdminPayload = useCallback(
    (payload: AdminEditionPayload & { summaries?: EditionSummary[] }) => {
      skipNextAutoSaveRef.current = true;
      setDraft(normalizeEdition(payload.draft));
      setLastSavedAt(payload.lastSavedAt);
      setLastPublishedAt(payload.lastPublishedAt);
      setHasUnpublishedChanges(payload.hasUnpublishedChanges);
      setIsPublished(payload.isPublished !== false);
      setVersions(payload.versions || []);
      setAutoSaveState('saved');
      onEditionUpdated(payload.published);
      if (payload.summaries) {
        onEditionsListUpdated(payload.summaries);
      }
    },
    [onEditionUpdated, onEditionsListUpdated],
  );

  const loadAdminEditionsList = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await adminFetch('/api/admin/editions');
      if (res.ok) {
        const data = (await res.json()) as { editions?: EditionSummary[] };
        if (data.editions) {
          onEditionsListUpdated(data.editions);
        }
      }
    } catch {
      // ignore
    }
  }, [adminFetch, authenticated, onEditionsListUpdated]);

  const loadAdminEdition = useCallback(
    async (slug: string) => {
      if (!authenticated) return;
      try {
        const res = await adminFetch(`/api/admin/experience/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const payload = (await res.json()) as AdminEditionPayload;
          applyAdminPayload(payload);
        }
      } catch {
        // ignore
      }
    },
    [adminFetch, applyAdminPayload, authenticated],
  );

  const loadMediaLibrary = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await adminFetch('/api/admin/media');
      if (res.ok) {
        const data = (await res.json()) as {
          assets?: UploadedMediaAsset[];
          media?: UploadedMediaAsset[];
        };
        setMediaLibrary(data.assets || data.media || []);
      }
    } catch {
      // ignore
    }
  }, [adminFetch, authenticated]);

  const loadAdminWishes = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await adminFetch(`/api/admin/experience/${encodeURIComponent(draft.slug)}/wishes`);
      if (res.ok) {
        const data = (await res.json()) as { wishes?: WishItem[] };
        setAdminWishes(data.wishes || []);
      }
    } catch {
      // ignore
    }
  }, [adminFetch, authenticated, draft.slug]);

  useEffect(() => {
    if (!authenticated) return;
    void loadAdminEditionsList();
    void loadAdminEdition(edition.slug);
    void loadMediaLibrary();
  }, [authenticated, edition.slug, loadAdminEdition, loadAdminEditionsList, loadMediaLibrary]);

  useEffect(() => {
    if (!authenticated) return;
    void loadAdminWishes();
  }, [authenticated, draft.slug, loadAdminWishes]);

  const saveDraftToServer = useCallback(
    async (editionData: BirthdayEdition, silent = true) => {
      if (!authenticated) return;
      setAutoSaveState('saving');
      try {
        const res = await adminFetch(
          `/api/admin/experience/${encodeURIComponent(editionData.slug)}/draft`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editionData),
          },
        );
        if (res.status === 401) return;
        const data = (await res.json()) as AdminEditionPayload & { error?: string };
        if (!res.ok || !data.draft) {
          throw new Error(data.error || 'Could not save draft.');
        }
        setLastSavedAt(data.lastSavedAt);
        setHasUnpublishedChanges(data.hasUnpublishedChanges);
        setIsPublished(data.isPublished !== false);
        setVersions(data.versions || []);
        setAutoSaveState('saved');
        if (!silent) showToast('Saved to private Draft.');
      } catch (err) {
        setAutoSaveState('error');
        if (!silent) {
          showToast(err instanceof Error ? err.message : 'Draft save failed.');
        }
      }
    },
    [adminFetch, authenticated, showToast],
  );

  const updateDraft = useCallback((updater: (prev: BirthdayEdition) => BirthdayEdition) => {
    skipNextAutoSaveRef.current = false;
    dirtyCounterRef.current += 1;
    setAutoSaveState('dirty');
    setHasUnpublishedChanges(true);
    setDraft((prev) => updater(prev));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void saveDraftToServer(draftRef.current, true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [authenticated, draft, saveDraftToServer]);

  const handlePublish = async () => {
    if (!authenticated) return;
    setPublishing(true);
    try {
      const res = await adminFetch(
        `/api/admin/experience/${encodeURIComponent(draft.slug)}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      );
      if (res.status === 401) return;
      const data = (await res.json()) as AdminEditionPayload & {
        summaries?: EditionSummary[];
        error?: string;
      };
      if (!res.ok || !data.published) {
        throw new Error(data.error || 'Could not publish changes.');
      }
      applyAdminPayload(data);
      showToast(`Published! Public link /birthday/${draft.slug} is now live.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!authenticated) return;
    setPublishing(true);
    try {
      const res = await adminFetch(
        `/api/admin/experience/${encodeURIComponent(draft.slug)}/unpublish`,
        { method: 'POST' },
      );
      if (res.status === 401) return;
      const data = (await res.json()) as AdminEditionPayload & {
        summaries?: EditionSummary[];
        error?: string;
      };
      if (!res.ok || !data.draft) {
        throw new Error(data.error || 'Could not unpublish.');
      }
      applyAdminPayload(data);
      showToast('Unpublished. Public visitors can no longer view this link until you publish again.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unpublish failed.');
    } finally {
      setPublishing(false);
    }
  };

  const handleRenameSlug = async (newSlugValue: string) => {
    if (!authenticated) return;
    try {
      await saveDraftToServer(draftRef.current, true);
      const res = await adminFetch(
        `/api/admin/experience/${encodeURIComponent(draft.slug)}/rename-slug`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newSlug: newSlugValue }),
        },
      );
      const data = (await res.json()) as AdminEditionPayload & {
        summaries?: EditionSummary[];
        error?: string;
      };
      if (!res.ok || !data.draft) {
        throw new Error(data.error || 'Could not update public URL.');
      }
      applyAdminPayload(data);
      onSwitchEdition(data.draft.slug);
      showToast(`Public link updated to /birthday/${data.draft.slug}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update public URL.');
    }
  };

  const handleDiscardDraft = async () => {
    if (!authenticated) return;
    const res = await adminFetch(
      `/api/admin/experience/${encodeURIComponent(draft.slug)}/discard-draft`,
      { method: 'POST' },
    );
    if (res.ok) {
      const data = (await res.json()) as AdminEditionPayload;
      applyAdminPayload(data);
      showToast('Unpublished draft changes discarded.');
    }
  };

  const handleCreateBackup = async (label: string) => {
    if (!authenticated) return;
    await saveDraftToServer(draft, true);
    const res = await adminFetch(
      `/api/admin/experience/${encodeURIComponent(draft.slug)}/versions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      },
    );
    if (res.ok) {
      const data = (await res.json()) as AdminEditionPayload;
      setVersions(data.versions || []);
      showToast('Backup snapshot created.');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!authenticated) return;
    const res = await adminFetch(
      `/api/admin/experience/${encodeURIComponent(draft.slug)}/versions/${encodeURIComponent(versionId)}/restore`,
      { method: 'POST' },
    );
    if (res.ok) {
      const data = (await res.json()) as AdminEditionPayload;
      applyAdminPayload(data);
      showToast('Restored snapshot into Draft. Click Publish when ready to go live.');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!authenticated) return;
    const res = await adminFetch(
      `/api/admin/experience/${encodeURIComponent(draft.slug)}/versions/${encodeURIComponent(versionId)}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      const data = (await res.json()) as AdminEditionPayload;
      setVersions(data.versions || []);
    }
  };

  const handleLoginOrClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (needsSetup && passwordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthenticating(true);
    const endpoint = needsSetup ? '/api/auth/claim' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
      });
      const data = (await res.json()) as {
        token?: string;
        admin?: { email: string };
        recoveryKey?: string;
        error?: string;
      };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Authentication failed.');
      }
      const verifiedEmail = data.admin?.email || emailInput.trim().toLowerCase();
      setPasswordInput('');
      setConfirmPasswordInput('');

      if (data.recoveryKey) {
        setIssuedRecoveryKey(data.recoveryKey);
        setPendingDashboardAuth({ token: data.token, email: verifiedEmail });
        setAuthView('recovery_saved');
      } else {
        onAuthSuccess(data.token, verifiedEmail);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput !== confirmPasswordInput) {
      setAuthError('New passwords do not match.');
      return;
    }
    setAuthenticating(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: emailInput.trim(),
          recoveryCode: recoveryCodeInput.trim(),
          newPassword: passwordInput,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        admin?: { email: string };
        recoveryKey?: string;
        error?: string;
      };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Password reset failed.');
      }
      const verifiedEmail = data.admin?.email || emailInput.trim().toLowerCase();
      setPasswordInput('');
      setConfirmPasswordInput('');
      setRecoveryCodeInput('');
      if (data.recoveryKey) {
        setIssuedRecoveryKey(data.recoveryKey);
        setPendingDashboardAuth({ token: data.token, email: verifiedEmail });
        setAuthView('recovery_saved');
      } else {
        onAuthSuccess(data.token, verifiedEmail);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecurityMsg(null);
    if (nextPw !== nextPwConfirm) {
      setSecurityError('New passwords do not match.');
      return;
    }
    setSavingSecurity(true);
    try {
      const res = await adminFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: nextPw }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not update password.');
      }
      setCurrentPw('');
      setNextPw('');
      setNextPwConfirm('');
      setSecurityMsg('Admin password updated permanently.');
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleRotateRecoveryKey = async () => {
    setSecurityError(null);
    setSecurityMsg(null);
    setSavingSecurity(true);
    try {
      const res = await adminFetch('/api/auth/recovery-key/rotate', {
        method: 'POST',
      });
      const data = (await res.json()) as { recoveryKey?: string; error?: string };
      if (!res.ok || !data.recoveryKey) {
        throw new Error(data.error || 'Could not generate recovery key.');
      }
      setRotatedRecoveryKey(data.recoveryKey);
      setSecurityMsg('New one-time Recovery Key generated. Save it securely.');
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : 'Could not generate recovery key.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const uploadMediaFile = async (file: File, fieldKey: string): Promise<string | null> => {
    if (!authenticated) return null;
    setUploadingField(fieldKey);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await adminFetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed.');
      }
      void loadMediaLibrary();
      return data.url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed.');
      return null;
    } finally {
      setUploadingField(null);
    }
  };

  const uploadMediaBatch = async (
    files: FileList | File[],
  ): Promise<Array<{ url: string; kind: 'image' | 'video' | 'audio'; originalName: string }>> => {
    if (!authenticated) return [];
    try {
      const form = new FormData();
      Array.from(files)
        .slice(0, 20)
        .forEach((f) => form.append('files', f));
      const res = await adminFetch('/api/upload/batch', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as {
        files?: Array<{ url: string; kind: 'image' | 'video' | 'audio'; originalName: string }>;
        error?: string;
      };
      if (!res.ok || !data.files) {
        throw new Error(data.error || 'Batch upload failed.');
      }
      void loadMediaLibrary();
      showToast(`Uploaded ${data.files.length} file(s) to media storage.`);
      return data.files;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Batch upload failed.');
      return [];
    }
  };

  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !newName.trim()) return;
    setCreatingEdition(true);
    try {
      const res = await adminFetch('/api/admin/editions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: { en: newName.trim(), ar: newName.trim() },
          slug: newSlug.trim() || undefined,
          age: newAge,
          publishNow: false,
        }),
      });
      const data = (await res.json()) as {
        edition?: BirthdayEdition;
        summaries?: EditionSummary[];
        error?: string;
      };
      if (!res.ok || !data.edition) {
        throw new Error(data.error || 'Could not create edition.');
      }
      if (data.summaries) onEditionsListUpdated(data.summaries);
      onSwitchEdition(data.edition.slug);
      setNewName('');
      setNewSlug('');
      showToast(
        `Created private draft for ${data.edition.recipientName.en} (/birthday/${data.edition.slug}). Publish when ready!`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create edition.');
    } finally {
      setCreatingEdition(false);
    }
  };

  const publicUrl = `${window.location.origin}/birthday/${encodeURIComponent(draft.slug)}`;

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  // Loading session verification
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#1E191E] text-[#F5EBDD] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-[#C5A46D]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verifying admin session...</span>
        </div>
      </div>
    );
  }

  // Private Admin Login Gate (/admin)
  if (!authenticated) {
    return (
      <div dir="ltr" className="min-h-screen bg-[#1E191E] text-[#F5EBDD] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#C5A46D]/35 bg-[#292329] p-7 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#C5A46D]">
              <Lock className="h-3.5 w-3.5" />
              <span>Private Admin Portal</span>
            </span>
            <button
              type="button"
              onClick={() => onExitToSite(edition.slug)}
              className="inline-flex items-center gap-1 text-xs text-[#F5EBDD]/70 hover:text-[#F5EBDD]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Site</span>
            </button>
          </div>

          {authView === 'recovery_saved' && issuedRecoveryKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#C5A46D]">
                <ShieldCheck className="h-5 w-5" />
                <h1 className="font-display text-2xl font-semibold text-[#F5EBDD]">
                  Save Your Admin Recovery Key
                </h1>
              </div>
              <p className="text-xs text-[#F5EBDD]/75 leading-relaxed">
                Store this recovery key in a safe place. It is shown only once and allows you to reset your admin password without losing access.
              </p>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#C5A46D]/50 bg-[#1E191E] px-4 py-3">
                <code className="font-mono text-sm font-semibold tracking-wider text-[#C5A46D]">
                  {issuedRecoveryKey}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(issuedRecoveryKey);
                    setCopiedRecovery(true);
                    window.setTimeout(() => setCopiedRecovery(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#713F50] px-2.5 py-1.5 text-[11px] font-medium text-[#F5EBDD]"
                >
                  {copiedRecovery ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedRecovery ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (pendingDashboardAuth) {
                    onAuthSuccess(pendingDashboardAuth.token, pendingDashboardAuth.email);
                  }
                  setIssuedRecoveryKey(null);
                  setPendingDashboardAuth(null);
                  setAuthView('login');
                }}
                className="w-full rounded-lg bg-[#C5A46D] px-5 py-3 text-sm font-semibold text-[#292329] hover:bg-[#D4B47F]"
              >
                Continue to Birthday Studio Dashboard
              </button>
            </div>
          ) : authView === 'reset' ? (
            <>
              <div>
                <h1 className="font-display text-3xl font-semibold text-[#F5EBDD]">Reset Admin Password</h1>
                <p className="mt-1.5 text-xs text-[#F5EBDD]/70 leading-relaxed">
                  Enter your authorized admin email and recovery key to set a new password.
                </p>
              </div>
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                    Authorized Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                    Recovery Key
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryCodeInput}
                    onChange={(e) => setRecoveryCodeInput(e.target.value)}
                    placeholder="AS-XXXX-XXXX-XXXX-XXXX"
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm font-mono text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>

                {authError && <p className="text-xs font-medium text-[#D9A5AE]">{authError}</p>}

                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full rounded-lg bg-[#C5A46D] px-5 py-3 text-sm font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-50"
                >
                  {authenticating ? 'Resetting...' : 'Reset Password & Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setAuthView('login');
                  }}
                  className="w-full text-center text-xs text-[#C5A46D] hover:underline"
                >
                  Back to Admin Sign In
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-display text-3xl font-semibold text-[#F5EBDD]">Birthday Studio</h1>
                <p className="mt-1.5 text-xs text-[#F5EBDD]/70 leading-relaxed">
                  {needsSetup
                    ? 'Claim your private administrator account (email & password). Public registration is permanently locked afterward.'
                    : 'Sign in with your authorized administrator email and password to manage and publish birthday experiences.'}
                </p>
              </div>

              <form onSubmit={handleLoginOrClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                    {needsSetup ? 'Create Password (min 8 characters)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={needsSetup ? 8 : 4}
                    maxLength={128}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                  />
                </div>

                {needsSetup && (
                  <div>
                    <label className="block text-xs font-medium text-[#C5A46D] mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2.5 text-sm text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
                    />
                  </div>
                )}

                {authError && <p className="text-xs font-medium text-[#D9A5AE]">{authError}</p>}

                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full rounded-lg bg-[#C5A46D] px-5 py-3 text-sm font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-50"
                >
                  {authenticating
                    ? 'Verifying...'
                    : needsSetup
                      ? 'Create Admin Account & Open Dashboard'
                      : 'Sign In to Dashboard'}
                </button>

                {!needsSetup && !envManaged && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[#F5EBDD]/50">Authorized account only</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthView('reset');
                      }}
                      className="text-[#C5A46D] hover:underline"
                    >
                      Forgot / Reset Password?
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="min-h-screen bg-[#1E191E] text-[#F5EBDD] flex flex-col">
      {/* Studio Sticky Top Workspace Bar */}
      <header className="sticky top-0 z-40 border-b border-[#C5A46D]/25 bg-[#292329]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          {/* Left: Mobile Drawer Trigger + Brand + Edition Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-lg border border-[#C5A46D]/30 p-2 text-[#C5A46D] lg:hidden"
              aria-label="Toggle studio navigation"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A46D]">
                Atelier Souvenir · {adminEmail || 'Admin'}
              </p>
              <h1 className="font-display text-lg font-semibold text-[#F5EBDD] leading-tight">
                Birthday Studio
              </h1>
            </div>

            <div className="hidden sm:flex items-center gap-2 border-s border-[#C5A46D]/20 ps-3">
              <select
                value={draft.slug}
                onChange={(e) => onSwitchEdition(e.target.value)}
                className="rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-2.5 py-1.5 text-xs text-[#F5EBDD]"
              >
                {editions.map((ed) => (
                  <option key={ed.slug} value={ed.slug}>
                    {ed.recipientName.en || ed.slug} ({ed.age}) ·{' '}
                    {ed.isPublished === false ? 'Draft' : 'Live'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void copyShareUrl()}
                className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-2.5 py-1.5 text-xs text-[#F5EBDD]/85 hover:border-[#C5A46D]"
                title={publicUrl}
              >
                {copiedLink ? (
                  <Check className="h-3.5 w-3.5 text-[#C5A46D]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[#C5A46D]" />
                )}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>

              {isPublished && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-2.5 py-1.5 text-xs text-[#D9A5AE] hover:border-[#C5A46D]"
                  title="Open Public Birthday Page"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Right: Auto-Save + Status + Quick Actions + Security + Logout */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/20 bg-[#1E191E] px-2.5 py-1.5 text-[11px] text-[#F5EBDD]/80">
              {autoSaveState === 'saving' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-[#C5A46D]" />
                  <span>Saving draft...</span>
                </>
              ) : autoSaveState === 'dirty' ? (
                <>
                  <Clock className="h-3 w-3 text-[#D9A5AE]" />
                  <span>Unsaved edits</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-[#C5A46D]" />
                  <span>Draft saved</span>
                </>
              )}
            </span>

            <span
              className={`hidden xl:inline-block rounded-md px-2.5 py-1 text-[11px] font-medium ${
                isPublished
                  ? hasUnpublishedChanges
                    ? 'bg-[#713F50] text-[#F5EBDD]'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-[#713F50]/60 text-[#D9A5AE]'
              }`}
            >
              {!isPublished ? 'Unpublished' : hasUnpublishedChanges ? 'Draft Pending' : 'Live'}
            </span>

            <button
              type="button"
              onClick={() => setActiveSection('preview')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 bg-[#1E191E] px-3 py-1.5 text-xs font-medium text-[#F5EBDD] hover:border-[#C5A46D]"
            >
              <Eye className="h-3.5 w-3.5 text-[#D9A5AE]" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button
              type="button"
              onClick={() => void saveDraftToServer(draft, false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 bg-[#1E191E] px-3 py-1.5 text-xs font-medium text-[#F5EBDD] hover:border-[#C5A46D]"
            >
              <Save className="h-3.5 w-3.5 text-[#C5A46D]" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>

            <button
              type="button"
              disabled={publishing}
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-3.5 py-1.5 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              <span>{publishing ? 'Publishing...' : 'Publish'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSecurityError(null);
                setSecurityMsg(null);
                setRotatedRecoveryKey(null);
                setSecurityModalOpen(true);
              }}
              className="rounded-lg border border-[#C5A46D]/25 p-1.5 text-[#C5A46D] hover:bg-white/10"
              title="Account Security & Password Reset Key"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => void onLogout()}
              className="inline-flex items-center gap-1 rounded-lg border border-[#C5A46D]/25 px-2.5 py-1.5 text-xs text-[#F5EBDD]/80 hover:bg-white/10 hover:text-[#F5EBDD]"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Account Security Modal */}
      {securityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#C5A46D]/40 bg-[#292329] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#C5A46D]" />
                <h2 className="font-display text-xl font-semibold text-[#F5EBDD]">
                  Admin Account Security
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="rounded-lg p-1 text-[#F5EBDD]/65 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] px-3.5 py-2.5 text-xs">
              <span className="text-[#F5EBDD]/60">Signed in as: </span>
              <span className="font-semibold text-[#C5A46D]">{adminEmail}</span>
            </div>

            {!envManaged ? (
              <>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <p className="text-xs font-semibold text-[#F5EBDD]">Change Admin Password</p>
                  <input
                    type="password"
                    required
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Current password"
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={nextPw}
                    onChange={(e) => setNextPw(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={nextPwConfirm}
                    onChange={(e) => setNextPwConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                  <button
                    type="submit"
                    disabled={savingSecurity}
                    className="w-full rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-50"
                  >
                    Update Password
                  </button>
                </form>

                <div className="border-t border-[#C5A46D]/20 pt-4 space-y-2.5">
                  <p className="text-xs font-semibold text-[#F5EBDD]">Password Recovery Key</p>
                  <p className="text-[11px] text-[#F5EBDD]/65">
                    Generate a new one-time recovery key in case you ever need to reset your password at /admin.
                  </p>
                  <button
                    type="button"
                    disabled={savingSecurity}
                    onClick={() => void handleRotateRecoveryKey()}
                    className="w-full rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-4 py-2 text-xs font-medium text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD]"
                  >
                    Generate New Recovery Key
                  </button>
                  {rotatedRecoveryKey && (
                    <div className="flex items-center justify-between rounded-lg border border-[#C5A46D]/40 bg-[#1E191E] px-3 py-2">
                      <code className="font-mono text-xs text-[#C5A46D]">{rotatedRecoveryKey}</code>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(rotatedRecoveryKey)}
                        className="text-[11px] text-[#D9A5AE] hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-[#F5EBDD]/75">
                Your admin password is managed via server environment Secrets (`ADMIN_PASSCODE`).
              </p>
            )}

            {securityError && <p className="text-xs font-medium text-rose-300">{securityError}</p>}
            {securityMsg && <p className="text-xs font-medium text-[#C5A46D]">{securityMsg}</p>}
          </div>
        </div>
      )}

      {/* Main Workspace Layout: Sidebar + Content Canvas */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        {/* Desktop Sidebar + Mobile Drawer */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 start-0 z-50 w-72 shadow-2xl pt-16' : 'hidden'
          } lg:static lg:block lg:w-64 lg:shrink-0 border-e border-[#C5A46D]/20 bg-[#231D23] p-4 flex flex-col justify-between gap-6`}
        >
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                    isActive
                      ? 'bg-[#713F50] text-[#F5EBDD] shadow-sm'
                      : 'text-[#F5EBDD]/75 hover:bg-[#292329] hover:text-[#F5EBDD]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#C5A46D]' : 'text-[#C5A46D]/80'}`} />
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{item.label}</span>
                    <span className="block truncate text-[10px] opacity-70">{item.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Create New Birthday Edition Card */}
          <div className="rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5 space-y-2.5">
            <p className="text-[11px] font-semibold text-[#C5A46D]">New Birthday Edition</p>
            <form onSubmit={handleCreateEdition} className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Recipient name (e.g. Sara)"
                className="w-full rounded-lg border border-[#C5A46D]/25 bg-[#292329] px-2.5 py-1.5 text-xs text-[#F5EBDD]"
              />
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="URL slug (e.g. sara)"
                dir="ltr"
                className="w-full rounded-lg border border-[#C5A46D]/25 bg-[#292329] px-2.5 py-1.5 text-xs font-mono text-[#F5EBDD]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={130}
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value) || 25)}
                  className="w-16 rounded-lg border border-[#C5A46D]/25 bg-[#292329] px-2.5 py-1.5 text-xs text-[#F5EBDD] tabular-nums"
                />
                <button
                  type="submit"
                  disabled={creatingEdition || !newName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#713F50] px-2.5 py-1.5 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F] disabled:opacity-45"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Draft</span>
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Active Studio Module Canvas */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {toastMsg && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#C5A46D]/45 bg-[#292329] px-4 py-2.5 text-xs font-medium text-[#C5A46D] shadow-lg">
              <span>{toastMsg}</span>
              <button type="button" onClick={() => setToastMsg(null)} className="text-[#F5EBDD]/60">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {activeSection === 'profile' && (
            <ProfileEditor
              draft={draft}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'memories' && (
            <PhotoMemoryManager
              draft={draft}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              onUploadBatch={uploadMediaBatch}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'letters' && (
            <MessagesLettersEditor
              draft={draft}
              lang={lang}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'timeline' && (
            <TimelineManager
              draft={draft}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              onUploadBatch={uploadMediaBatch}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'magazine' && (
            <MagazineEditor
              draft={draft}
              lang={lang}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              onUploadBatch={uploadMediaBatch}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'music' && (
            <MusicAudioManager
              draft={draft}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'chapters' && (
            <ChaptersContentManager
              draft={draft}
              lang={lang}
              token={token}
              adminWishes={adminWishes}
              onRefreshWishes={loadAdminWishes}
              onWishesChangedPublic={onWishesReload}
              onChange={updateDraft}
              uploadingField={uploadingField}
              onUploadFile={uploadMediaFile}
              mediaLibrary={mediaLibrary}
              onRefreshLibrary={loadMediaLibrary}
            />
          )}

          {activeSection === 'preview' && (
            <LivePreviewPanel draft={draft} wishes={adminWishes} initialLang={lang} />
          )}

          {activeSection === 'publishing' && (
            <PublishingHistoryPanel
              draft={draft}
              lastSavedAt={lastSavedAt}
              lastPublishedAt={lastPublishedAt}
              hasUnpublishedChanges={hasUnpublishedChanges}
              isPublished={isPublished}
              versions={versions}
              publishing={publishing}
              onSaveDraft={() => saveDraftToServer(draft, false)}
              onOpenPreview={() => setActiveSection('preview')}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onRenameSlug={handleRenameSlug}
              onDiscardDraft={handleDiscardDraft}
              onCreateBackup={handleCreateBackup}
              onRestoreVersion={handleRestoreVersion}
              onDeleteVersion={handleDeleteVersion}
              onImportJsonEdition={(imported) => {
                updateDraft(() => imported);
                showToast('Imported backup into Draft. Click Save as Draft or Publish.');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
