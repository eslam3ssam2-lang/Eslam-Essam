import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { AudioProvider, useAudio } from './context/AudioContext.tsx';
import { DEFAULT_EDITION, DEFAULT_WISHES, normalizeEdition } from './data/defaultExperience.ts';
import { pickText } from './i18n/translations.ts';
import type { BirthdayEdition, EditionSummary, Language, SectionKey, WishItem } from './types/birthday.ts';
import { CelebrationCanvas } from './components/CelebrationCanvas.tsx';
import { CinematicBirthdayIntro } from './components/CinematicBirthdayIntro.tsx';
import { TopBar } from './components/TopBar.tsx';
import { WelcomeCover } from './components/WelcomeCover.tsx';
import { BirthdayStage3D } from './components/BirthdayStage3D.tsx';
import { InteractiveCake } from './components/InteractiveCake.tsx';
import { InteractiveGiftBox } from './components/InteractiveGiftBox.tsx';
import { MemoryAlbum } from './components/MemoryAlbum.tsx';
import { BirthdayMagazine } from './components/BirthdayMagazine.tsx';
import { ScratchCards } from './components/ScratchCards.tsx';
import { GamesHub } from './components/GamesHub.tsx';
import { MessagesGallery } from './components/MessagesGallery.tsx';
import { WishTreeSection } from './components/WishTreeSection.tsx';
import { FutureLetter } from './components/FutureLetter.tsx';
import { EmotionalFinale } from './components/EmotionalFinale.tsx';
import { FloatingDock } from './components/FloatingDock.tsx';
import { OwnerStudio } from './components/OwnerStudio.tsx';

type AppRoute =
  | { kind: 'admin_login' }
  | { kind: 'admin_dashboard'; slug?: string }
  | { kind: 'public_birthday'; slug: string }
  | { kind: 'public_home'; slug: string };

function parseAppRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return { kind: 'public_home', slug: '__default__' };
  }
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  if (pathname === '/admin') {
    return { kind: 'admin_login' };
  }
  if (pathname === '/admin/dashboard' || pathname.startsWith('/studio') || params.get('studio') === '1') {
    return { kind: 'admin_dashboard', slug: params.get('edition') || undefined };
  }
  if (pathname.startsWith('/birthday/')) {
    const rawSlug = decodeURIComponent(pathname.slice('/birthday/'.length)).split('/')[0];
    if (rawSlug) {
      return { kind: 'public_birthday', slug: rawSlug };
    }
  }
  return { kind: 'public_home', slug: params.get('edition') || '__default__' };
}

function UniversalBirthdayBook() {
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute());
  const isStudioRoute = route.kind === 'admin_login' || route.kind === 'admin_dashboard';

  const [lang, setLang] = useState<Language>('en');
  const userChangedLangRef = useRef(false);
  const [edition, setEdition] = useState<BirthdayEdition>(DEFAULT_EDITION);
  const [editions, setEditions] = useState<EditionSummary[]>([]);
  const [wishes, setWishes] = useState<WishItem[]>(DEFAULT_WISHES);
  const [publicUnavailable, setPublicUnavailable] = useState(false);

  const [experienceOpened, setExperienceOpened] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(() => isStudioRoute);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [envManaged, setEnvManaged] = useState(false);

  const [manualPetals, setManualPetals] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [introDismissed, setIntroDismissed] = useState(false);

  const { setTracksConfig, startMusic } = useAudio();

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseAppRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isStudioRoute ? 'ltr' : lang === 'ar' ? 'rtl' : 'ltr';
  }, [isStudioRoute, lang]);

  // Verify admin session & enforce /admin vs /admin/dashboard routing
  const verifyAdminSession = useCallback(async () => {
    if (!isStudioRoute) return;
    setAuthChecking(true);
    try {
      const headers: Record<string, string> = {};
      if (ownerToken) {
        headers.Authorization = `Bearer ${ownerToken}`;
      }
      const res = await fetch('/api/auth/status', {
        headers,
        credentials: 'include',
      });
      const data = (await res.json()) as {
        needsSetup?: boolean;
        authenticated?: boolean;
        envManaged?: boolean;
        adminEmail?: string;
      };
      const isAuthed = Boolean(data.authenticated);
      setNeedsSetup(Boolean(data.needsSetup));
      setEnvManaged(Boolean(data.envManaged));
      setAuthenticated(isAuthed);
      setAdminEmail(isAuthed ? data.adminEmail || null : null);
      if (!isAuthed) {
        setOwnerToken(null);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, [isStudioRoute, ownerToken]);

  useEffect(() => {
    if (isStudioRoute) {
      void verifyAdminSession();
    }
  }, [isStudioRoute, verifyAdminSession]);

  // Enforce clean SPA redirects between /admin and /admin/dashboard
  useEffect(() => {
    if (authChecking || !isStudioRoute) return;
    if (authenticated && route.kind === 'admin_login') {
      window.history.replaceState({}, '', '/admin/dashboard');
      setRoute({ kind: 'admin_dashboard' });
    } else if (!authenticated && route.kind === 'admin_dashboard') {
      window.history.replaceState({}, '', '/admin');
      setRoute({ kind: 'admin_login' });
    }
  }, [authChecking, authenticated, isStudioRoute, route.kind]);

  const fetchEdition = useCallback(
    async (slug: string) => {
      setLoading(true);
      setPublicUnavailable(false);
      try {
        const [expRes, listRes] = await Promise.all([
          fetch(`/api/experience/${encodeURIComponent(slug)}`),
          fetch('/api/editions'),
        ]);
        if (expRes.ok) {
          const data = (await expRes.json()) as { edition: BirthdayEdition; wishes: WishItem[] };
          const normalized = normalizeEdition(data.edition);
          setEdition(normalized);
          setWishes(data.wishes);
          setTracksConfig(normalized.music.tracks, normalized.music.defaultTrackId);
          if (!userChangedLangRef.current && normalized.preferredLanguage) {
            setLang(normalized.preferredLanguage);
          }
        } else if (expRes.status === 404 && !isStudioRoute) {
          setPublicUnavailable(true);
        }
        if (listRes.ok) {
          const listData = (await listRes.json()) as { editions: EditionSummary[] };
          setEditions(listData.editions);
        }
      } catch {
        // Keep seeded fallback only if server unreachable on default home
      } finally {
        setLoading(false);
      }
    },
    [isStudioRoute, setTracksConfig],
  );

  useEffect(() => {
    if (route.kind === 'public_birthday' || route.kind === 'public_home') {
      setIntroDismissed(false);
      setExperienceOpened(false);
      void fetchEdition(route.slug);
    } else if (route.kind === 'admin_dashboard') {
      void fetchEdition(route.slug || '__default__');
    } else {
      setLoading(false);
    }
  }, [fetchEdition, route]);

  const handleToggleLanguage = (nextLang: Language) => {
    userChangedLangRef.current = true;
    setLang(nextLang);
  };

  const handleStart = (withMusic: boolean) => {
    setExperienceOpened(true);
    if (withMusic) {
      startMusic();
    }
    const firstSection = edition.sectionOrder.find((s) => edition.visibleSections[s]);
    const targetEl = firstSection ? document.getElementById(`section-${firstSection}`) : null;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSwitchEdition = (slug: string) => {
    if (route.kind === 'admin_dashboard') {
      const url = new URL(window.location.href);
      url.searchParams.set('edition', slug);
      window.history.replaceState({}, '', url.toString());
      void fetchEdition(slug);
    } else {
      const targetPath = `/birthday/${encodeURIComponent(slug)}`;
      window.history.pushState({}, '', targetPath);
      setRoute({ kind: 'public_birthday', slug });
    }
  };

  const exitStudioToPublicSite = (targetSlug?: string) => {
    const slugToOpen = targetSlug || edition.slug;
    const targetPath = `/birthday/${encodeURIComponent(slugToOpen)}`;
    window.history.pushState({}, '', targetPath);
    setRoute({ kind: 'public_birthday', slug: slugToOpen });
  };

  const handleAuthSuccess = (newToken: string | null, email: string) => {
    setOwnerToken(newToken);
    setAuthenticated(true);
    setAdminEmail(email);
    setNeedsSetup(false);
    window.history.pushState({}, '', '/admin/dashboard');
    setRoute({ kind: 'admin_dashboard' });
  };

  const handleSessionExpired = useCallback(() => {
    setOwnerToken(null);
    setAuthenticated(false);
    setAdminEmail(null);
    window.history.replaceState({}, '', '/admin');
    setRoute({ kind: 'admin_login' });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } catch {
      // ignore network errors during logout
    }
    setOwnerToken(null);
    setAuthenticated(false);
    setAdminEmail(null);
    window.history.pushState({}, '', '/admin');
    setRoute({ kind: 'admin_login' });
  };

  // Private Admin Routes (/admin & /admin/dashboard) — completely invisible on public pages
  if (isStudioRoute) {
    return (
      <OwnerStudio
        edition={edition}
        editions={editions}
        lang={lang}
        token={ownerToken}
        authenticated={authenticated}
        adminEmail={adminEmail}
        authChecking={authChecking}
        needsSetup={needsSetup}
        envManaged={envManaged}
        onAuthSuccess={handleAuthSuccess}
        onSessionExpired={handleSessionExpired}
        onLogout={handleLogout}
        onEditionUpdated={(updated) => {
          const normalized = normalizeEdition(updated);
          setEdition(normalized);
          setTracksConfig(normalized.music.tracks, normalized.music.defaultTrackId);
        }}
        onSwitchEdition={handleSwitchEdition}
        onEditionsListUpdated={setEditions}
        onWishesReload={() => void fetchEdition(edition.slug)}
        onExitToSite={exitStudioToPublicSite}
      />
    );
  }

  // Unpublished / Missing Public Birthday Page (/birthday/:slug)
  if (publicUnavailable && !loading) {
    return (
      <div className="min-h-screen bg-[#292329] text-[#F5EBDD] flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-8 shadow-2xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#C5A46D]/40 bg-[#713F50]/40 text-[#C5A46D]">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#F5EBDD]">
            {lang === 'ar' ? 'هذه الصفحة غير منشورة حالياً' : 'Birthday Keepsake Unavailable'}
          </h1>
          <p className="text-xs leading-relaxed text-[#F5EBDD]/70">
            {lang === 'ar'
              ? 'هذا الاحتفال خاص حالياً أو لم يتم نشره بعد.'
              : 'This birthday celebration is currently private, unpublished, or the link may have changed.'}
          </p>
        </div>
      </div>
    );
  }

  const petalsActive = manualPetals !== null ? manualPetals : edition.appearance.effects.petals;

  const renderSection = (key: SectionKey) => {
    if (!edition.visibleSections[key]) return null;
    switch (key) {
      case 'stage3d':
        if (!edition.appearance.effects.stage3d) return null;
        return (
          <BirthdayStage3D
            key={key}
            lang={lang}
            recipientName={pickText(edition.recipientName, lang)}
            age={edition.age}
            petalsActive={petalsActive}
            onTogglePetals={() => setManualPetals((prev) => !(prev ?? edition.appearance.effects.petals))}
            chapterCopy={edition.chapterCopy?.stage3d}
          />
        );
      case 'cake':
        return <InteractiveCake key={key} edition={edition} lang={lang} />;
      case 'gift':
        return <InteractiveGiftBox key={key} edition={edition} lang={lang} />;
      case 'memories':
        return <MemoryAlbum key={key} edition={edition} lang={lang} />;
      case 'magazine':
        return <BirthdayMagazine key={key} edition={edition} lang={lang} />;
      case 'scratch':
        return <ScratchCards key={key} edition={edition} lang={lang} />;
      case 'games':
        return <GamesHub key={key} edition={edition} lang={lang} />;
      case 'messages':
        return <MessagesGallery key={key} edition={edition} lang={lang} />;
      case 'wishtree':
        return (
          <WishTreeSection
            key={key}
            edition={edition}
            wishes={wishes}
            lang={lang}
            onWishAdded={(wish) => setWishes((prev) => [wish, ...prev])}
          />
        );
      case 'letter':
        return <FutureLetter key={key} edition={edition} lang={lang} />;
      case 'finale':
        return <EmotionalFinale key={key} edition={edition} lang={lang} />;
      default:
        return null;
    }
  };

  const handleIntroComplete = () => {
    setIntroDismissed(true);
    if (edition.music.autoplayMode === 'on_start') {
      startMusic();
    }
  };

  return (
    <div
      className="min-h-screen bg-[#292329] text-[#F5EBDD]"
      style={
        {
          '--accent-primary': edition.appearance.primaryAccent,
          '--accent-secondary': edition.appearance.secondaryAccent,
        } as React.CSSProperties
      }
    >
      {!introDismissed && (
        <CinematicBirthdayIntro
          edition={edition}
          lang={lang}
          ready={!loading}
          onChangeLang={handleToggleLanguage}
          onComplete={handleIntroComplete}
        />
      )}

      <CelebrationCanvas
        starsEnabled={edition.appearance.effects.stars}
        petalsEnabled={petalsActive}
      />

      <TopBar
        bookTitle={pickText(edition.bookTitle, lang)}
        lang={lang}
      />

      <main>
        <WelcomeCover
          edition={edition}
          lang={lang}
          opened={experienceOpened}
          onStart={handleStart}
          onChangeLang={handleToggleLanguage}
        />

        {loading && (
          <div className="mx-auto max-w-6xl px-6 py-4 text-center text-xs text-[#C5A46D]">
            {lang === 'ar' ? 'جارٍ تحميل كتاب الذكريات...' : 'Loading memory book...'}
          </div>
        )}

        {edition.sectionOrder.map((secKey) => renderSection(secKey))}
      </main>

      <FloatingDock lang={lang} onToggleLanguage={handleToggleLanguage} />
    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <UniversalBirthdayBook />
    </AudioProvider>
  );
}
