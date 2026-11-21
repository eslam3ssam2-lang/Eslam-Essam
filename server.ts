import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_EDITION,
  DEFAULT_EDITION_SLUG,
  normalizeEdition,
} from './src/data/defaultExperience.ts';
import type {
  BirthdayEdition,
  ChapterCopyOverride,
  EditionVersion,
  Language,
  LocalizedText,
  MagazineCustomPage,
  MessageCategory,
  SectionKey,
  UploadedMediaAsset,
  WishItem,
} from './src/types/birthday.ts';
import { listEditionSummaries, loadStore, saveStore, UPLOADS_DIR } from './server/store.ts';

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'weba',
};

const VALID_SECTIONS: SectionKey[] = [
  'stage3d',
  'cake',
  'gift',
  'memories',
  'magazine',
  'scratch',
  'games',
  'messages',
  'wishtree',
  'letter',
  'finale',
];

const SESSION_COOKIE_NAME = 'atelier_admin_session';
const authAttempts = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    authAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) {
    return false;
  }
  entry.count += 1;
  return true;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function getEnvEmail(): string {
  return (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSCODE || '').trim();
}

function generateRecoveryKey(): string {
  const chunk = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `AS-${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

function hashSecret(secret: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyHashedSecret(secret: string, salt: string, hashHex: string): boolean {
  const derived = crypto.scryptSync(secret, salt, 64);
  const stored = Buffer.from(hashHex, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function setSessionCookie(res: Response, token: string): void {
  const maxAgeSec = Math.floor(TOKEN_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=None; Partitioned`,
  );
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`,
  );
}

function issueSessionToken(email: string): string {
  const payload = JSON.stringify({
    role: 'owner',
    email: email.toLowerCase(),
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(8).toString('hex'),
  });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string): { valid: boolean; email?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      role?: string;
      email?: string;
      exp?: number;
    };
    if (parsed.role === 'owner' && typeof parsed.exp === 'number' && parsed.exp > Date.now()) {
      return { valid: true, email: parsed.email };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

function extractSessionAuth(req: Request): { token: string | null; viaCookie: boolean } {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice('Bearer '.length).trim();
    if (bearer) return { token: bearer, viaCookie: false };
  }
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE_NAME]) {
    return { token: cookies[SESSION_COOKIE_NAME], viaCookie: true };
  }
  return { token: null, viaCookie: false };
}

function verifyCsrfForCookieAuth(req: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  const origin = req.headers.origin;
  const expectedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  if (!origin || !expectedHost) return false;
  try {
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const { token, viaCookie } = extractSessionAuth(req);
  if (!token) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  if (viaCookie && !verifyCsrfForCookieAuth(req)) {
    res.status(403).json({ error: 'CSRF validation failed.' });
    return;
  }
  const verified = verifySessionToken(token);
  if (!verified.valid) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in at /admin.' });
    return;
  }
  res.locals.adminEmail = verified.email || getEnvEmail() || 'admin';
  next();
}

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function sanitizeMediaUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/src/assets/images/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed.slice(0, 500);
  }
  return undefined;
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

function sanitizeLocalized(val: unknown, maxLen = 4000): LocalizedText {
  if (!val || typeof val !== 'object') {
    return { en: '', ar: '' };
  }
  const obj = val as Record<string, unknown>;
  return {
    en: clampString(obj.en, maxLen),
    ar: clampString(obj.ar, maxLen),
  };
}

function sanitizeHexColor(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : undefined;
}

function validateAndNormalizeEdition(
  slug: string,
  body: unknown,
  existingRaw: BirthdayEdition,
): BirthdayEdition {
  const existing = normalizeEdition(existingRaw);
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const ageNum =
    typeof raw.age === 'number' && Number.isFinite(raw.age)
      ? Math.min(150, Math.max(1, Math.round(raw.age)))
      : existing.age;
  const birthYearNum =
    typeof raw.birthYear === 'number' && Number.isFinite(raw.birthYear)
      ? Math.min(2100, Math.max(1900, Math.round(raw.birthYear)))
      : existing.birthYear;
  const preferredLanguage: Language =
    raw.preferredLanguage === 'ar' ? 'ar' : raw.preferredLanguage === 'en' ? 'en' : existing.preferredLanguage || 'en';

  const rawSectionOrder = Array.isArray(raw.sectionOrder) ? raw.sectionOrder : existing.sectionOrder;
  const filteredOrder = rawSectionOrder.filter(
    (s): s is SectionKey => typeof s === 'string' && VALID_SECTIONS.includes(s as SectionKey),
  );
  const missingSections = VALID_SECTIONS.filter((s) => !filteredOrder.includes(s));
  const sectionOrder = [...new Set([...filteredOrder, ...missingSections])];

  const rawVisible = (raw.visibleSections && typeof raw.visibleSections === 'object'
    ? raw.visibleSections
    : existing.visibleSections) as Record<string, unknown>;
  const visibleSections = {} as Record<SectionKey, boolean>;
  for (const key of VALID_SECTIONS) {
    visibleSections[key] =
      typeof rawVisible[key] === 'boolean' ? (rawVisible[key] as boolean) : existing.visibleSections[key];
  }

  const rawAlbums = Array.isArray(raw.albums) ? raw.albums.slice(0, 24) : existing.albums || [];
  const albums = rawAlbums
    .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
    .map((a, idx) => ({
      id: clampString(a.id, 60) || `alb-${Date.now()}-${idx}`,
      title: sanitizeLocalized(a.title, 120),
      description: a.description ? sanitizeLocalized(a.description, 320) : undefined,
      coverUrl: sanitizeMediaUrl(a.coverUrl),
    }));

  const rawTimeline = Array.isArray(raw.timeline) ? raw.timeline.slice(0, 60) : existing.timeline || [];
  const timeline = rawTimeline
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t, idx) => ({
      id: clampString(t.id, 60) || `tl-${Date.now()}-${idx}`,
      title: sanitizeLocalized(t.title, 160),
      date: clampString(t.date, 30) || new Date().toISOString().slice(0, 10),
      photos: Array.isArray(t.photos)
        ? t.photos
            .slice(0, 12)
            .map((p) => sanitizeMediaUrl(p))
            .filter((p): p is string => Boolean(p))
        : [],
      story: sanitizeLocalized(t.story, 2500),
      people: sanitizeLocalized(t.people, 200),
      audioUrl: sanitizeMediaUrl(t.audioUrl),
      audioTitle: t.audioTitle ? sanitizeLocalized(t.audioTitle, 120) : undefined,
      order: typeof t.order === 'number' && Number.isFinite(t.order) ? t.order : idx,
    }));

  const rawChapterCopy = (raw.chapterCopy && typeof raw.chapterCopy === 'object'
    ? raw.chapterCopy
    : existing.chapterCopy || {}) as Record<string, unknown>;
  const chapterCopy: Partial<Record<SectionKey, ChapterCopyOverride>> = {};
  for (const key of VALID_SECTIONS) {
    const entry = rawChapterCopy[key];
    if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      const override: ChapterCopyOverride = {};
      if (obj.kicker) override.kicker = sanitizeLocalized(obj.kicker, 140);
      if (obj.title) override.title = sanitizeLocalized(obj.title, 180);
      if (obj.subtitle) override.subtitle = sanitizeLocalized(obj.subtitle, 500);
      if (override.kicker || override.title || override.subtitle) {
        chapterCopy[key] = override;
      }
    }
  }

  const rawOpening = (raw.openingLetter && typeof raw.openingLetter === 'object'
    ? raw.openingLetter
    : existing.openingLetter || DEFAULT_EDITION.openingLetter!) as Record<string, unknown>;
  const openingLetter = {
    title: sanitizeLocalized(rawOpening.title, 180),
    body: sanitizeLocalized(rawOpening.body, 4000),
    signature: sanitizeLocalized(rawOpening.signature, 200),
  };

  const rawEnvPrompt = (raw.envelopePrompt && typeof raw.envelopePrompt === 'object'
    ? raw.envelopePrompt
    : existing.envelopePrompt || DEFAULT_EDITION.envelopePrompt!) as Record<string, unknown>;
  const envelopePrompt = {
    instruction: sanitizeLocalized(rawEnvPrompt.instruction, 160),
    tapPrompt: sanitizeLocalized(rawEnvPrompt.tapPrompt, 160),
  };

  const rawCake = (raw.cake && typeof raw.cake === 'object' ? raw.cake : {}) as Record<string, unknown>;
  const candleCount =
    typeof rawCake.candleCount === 'number' && Number.isFinite(rawCake.candleCount)
      ? Math.min(30, Math.max(1, Math.round(rawCake.candleCount)))
      : existing.cake.candleCount;

  const rawGift = (raw.gift && typeof raw.gift === 'object' ? raw.gift : {}) as Record<string, unknown>;
  const giftType = ['photo', 'video', 'audio', 'text'].includes(String(rawGift.contentType))
    ? (String(rawGift.contentType) as 'photo' | 'video' | 'audio' | 'text')
    : existing.gift.contentType;

  const rawMemories = Array.isArray(raw.memories) ? raw.memories.slice(0, 100) : existing.memories;
  const memories = rawMemories
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m, idx) => ({
      id: clampString(m.id, 60) || `mem-${Date.now()}-${idx}`,
      type: (m.type === 'video' ? 'video' : 'photo') as 'photo' | 'video',
      mediaUrl: sanitizeMediaUrl(m.mediaUrl) || existing.heroImageUrl,
      title: sanitizeLocalized(m.title, 160),
      caption: sanitizeLocalized(m.caption, 1200),
      date: clampString(m.date, 30) || new Date().toISOString().slice(0, 10),
      location: sanitizeLocalized(m.location, 160),
      audioUrl: sanitizeMediaUrl(m.audioUrl),
      audioTitle: m.audioTitle ? sanitizeLocalized(m.audioTitle, 120) : undefined,
      albumId: clampString(m.albumId, 60) || undefined,
      showInAlbum: typeof m.showInAlbum === 'boolean' ? m.showInAlbum : true,
      showInTimeline: typeof m.showInTimeline === 'boolean' ? m.showInTimeline : false,
      showInMagazine: typeof m.showInMagazine === 'boolean' ? m.showInMagazine : false,
      order: typeof m.order === 'number' && Number.isFinite(m.order) ? m.order : idx,
    }));

  const rawScratch = Array.isArray(raw.scratchCards) ? raw.scratchCards.slice(0, 12) : existing.scratchCards;
  const scratchCards = rawScratch
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .map((s, idx) => ({
      id: clampString(s.id, 60) || `sc-${Date.now()}-${idx}`,
      title: sanitizeLocalized(s.title, 160),
      hiddenMessage: sanitizeLocalized(s.hiddenMessage, 600),
      rewardLabel: sanitizeLocalized(s.rewardLabel, 120),
      imageUrl: sanitizeMediaUrl(s.imageUrl),
      foilTone: (s.foilTone === 'rose' ? 'rose' : 'gold') as 'gold' | 'rose',
    }));

  const rawQuiz = Array.isArray(raw.quiz) ? raw.quiz.slice(0, 30) : existing.quiz;
  const quiz = rawQuiz
    .filter((q): q is Record<string, unknown> => Boolean(q && typeof q === 'object'))
    .map((q, idx) => {
      const options = Array.isArray(q.options)
        ? q.options.slice(0, 6).map((o) => sanitizeLocalized(o, 200))
        : existing.quiz[0]?.options || [];
      const correctIndex =
        typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length
          ? Math.floor(q.correctIndex)
          : 0;
      return {
        id: clampString(q.id, 60) || `q-${Date.now()}-${idx}`,
        question: sanitizeLocalized(q.question, 300),
        options,
        correctIndex,
        explanation: sanitizeLocalized(q.explanation, 400),
      };
    });

  const rawGuesses = Array.isArray(raw.memoryGuesses) ? raw.memoryGuesses.slice(0, 24) : existing.memoryGuesses;
  const memoryGuesses = rawGuesses
    .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === 'object'))
    .map((g, idx) => ({
      id: clampString(g.id, 60) || `mg-${Date.now()}-${idx}`,
      imageUrl: sanitizeMediaUrl(g.imageUrl) || existing.heroImageUrl,
      clue: sanitizeLocalized(g.clue, 250),
      question: sanitizeLocalized(g.question, 250),
      answer: sanitizeLocalized(g.answer, 250),
      hint: sanitizeLocalized(g.hint, 250),
    }));

  const rawWheel = Array.isArray(raw.wheelOptions) ? raw.wheelOptions.slice(0, 12) : existing.wheelOptions;
  const wheelOptions = rawWheel
    .filter((w): w is Record<string, unknown> => Boolean(w && typeof w === 'object'))
    .map((w, idx) => ({
      id: clampString(w.id, 60) || `w-${Date.now()}-${idx}`,
      label: sanitizeLocalized(w.label, 80),
      message: sanitizeLocalized(w.message, 300),
      color: sanitizeHexColor(w.color) || '#713F50',
    }));

  const rawMessages = Array.isArray(raw.messages) ? raw.messages.slice(0, 80) : existing.messages;
  const messages = rawMessages
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m, idx) => ({
      id: clampString(m.id, 60) || `msg-${Date.now()}-${idx}`,
      type: (['text', 'audio', 'video', 'photo'].includes(String(m.type)) ? String(m.type) : 'text') as
        | 'text'
        | 'audio'
        | 'video'
        | 'photo',
      category: (['romantic', 'friendship', 'family'].includes(String(m.category))
        ? String(m.category)
        : 'family') as MessageCategory,
      sender: sanitizeLocalized(m.sender, 120),
      relation: sanitizeLocalized(m.relation, 120),
      title: sanitizeLocalized(m.title, 160),
      body: sanitizeLocalized(m.body, 4000),
      mediaUrl: sanitizeMediaUrl(m.mediaUrl),
      date: clampString(m.date, 30) || new Date().toISOString().slice(0, 10),
    }));

  const rawLetter = (raw.futureLetter && typeof raw.futureLetter === 'object'
    ? raw.futureLetter
    : {}) as Record<string, unknown>;

  const rawWishSettings = (raw.wishTreeSettings && typeof raw.wishTreeSettings === 'object'
    ? raw.wishTreeSettings
    : {}) as Record<string, unknown>;

  const rawMusic = (raw.music && typeof raw.music === 'object' ? raw.music : {}) as Record<string, unknown>;
  const tracks = Array.isArray(rawMusic.tracks)
    ? rawMusic.tracks
        .slice(0, 30)
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .map((t, idx) => ({
          id: clampString(t.id, 60) || `track-${Date.now()}-${idx}`,
          title: sanitizeLocalized(t.title, 120),
          artist: sanitizeLocalized(t.artist, 120),
          description: t.description ? sanitizeLocalized(t.description, 320) : undefined,
          sourceType: (t.sourceType === 'url' ? 'url' : 'synth') as 'synth' | 'url',
          url: sanitizeMediaUrl(t.url),
          preset: (['nocturne', 'waltz', 'celesta'].includes(String(t.preset))
            ? String(t.preset)
            : 'nocturne') as 'nocturne' | 'waltz' | 'celesta',
        }))
    : existing.music.tracks;

  const rawFinale = (raw.finale && typeof raw.finale === 'object' ? raw.finale : {}) as Record<string, unknown>;
  const rawAppearance = (raw.appearance && typeof raw.appearance === 'object'
    ? raw.appearance
    : {}) as Record<string, unknown>;
  const rawEffects = (rawAppearance.effects && typeof rawAppearance.effects === 'object'
    ? rawAppearance.effects
    : {}) as Record<string, unknown>;

  const accentPreset = ['champagne', 'rose', 'royal'].includes(String(rawAppearance.accentPreset))
    ? (String(rawAppearance.accentPreset) as 'champagne' | 'rose' | 'royal')
    : existing.appearance.accentPreset;

  const presetColors: Record<'champagne' | 'rose' | 'royal', { primary: string; secondary: string }> = {
    champagne: { primary: '#C5A46D', secondary: '#D9A5AE' },
    rose: { primary: '#D9A5AE', secondary: '#C5A46D' },
    royal: { primary: '#713F50', secondary: '#C5A46D' },
  };

  const baseMag = existing.magazine || DEFAULT_EDITION.magazine!;
  const rawMag = (raw.magazine && typeof raw.magazine === 'object' ? raw.magazine : {}) as Record<string, unknown>;
  const rawMagMusic = (rawMag.musicPage && typeof rawMag.musicPage === 'object'
    ? rawMag.musicPage
    : {}) as Record<string, unknown>;
  const rawMagGreeting = (rawMag.greetingPage && typeof rawMag.greetingPage === 'object'
    ? rawMag.greetingPage
    : {}) as Record<string, unknown>;
  const rawMagLetters = (rawMag.lettersPage && typeof rawMag.lettersPage === 'object'
    ? rawMag.lettersPage
    : {}) as Record<string, unknown>;
  const rawMagBack = (rawMag.backCover && typeof rawMag.backCover === 'object'
    ? rawMag.backCover
    : {}) as Record<string, unknown>;

  const magazineColorTheme = ['ivory-gold', 'midnight-rose', 'royal-cream', 'rose-editorial'].includes(
    String(rawMag.colorTheme),
  )
    ? (String(rawMag.colorTheme) as 'ivory-gold' | 'midnight-rose' | 'royal-cream' | 'rose-editorial')
    : baseMag.colorTheme;

  const sanitizeQrUrl = (val: unknown, fallback: string): string => {
    if (typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/')) {
      return trimmed.slice(0, 500);
    }
    return fallback;
  };

  const pageBackgrounds: Record<string, string> = {};
  if (rawMag.pageBackgrounds && typeof rawMag.pageBackgrounds === 'object') {
    for (const [k, v] of Object.entries(rawMag.pageBackgrounds as Record<string, unknown>)) {
      const hex = sanitizeHexColor(v);
      const safeKey = clampString(k, 60);
      if (safeKey && hex) {
        pageBackgrounds[safeKey] = hex;
      }
    }
  }

  const customPages: MagazineCustomPage[] = Array.isArray(rawMag.customPages)
    ? rawMag.customPages
        .slice(0, 20)
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p, idx) => ({
          id: clampString(p.id, 60) || `cp-${Date.now()}-${idx}`,
          title: sanitizeLocalized(p.title, 160),
          subtitle: p.subtitle ? sanitizeLocalized(p.subtitle, 240) : undefined,
          body: sanitizeLocalized(p.body, 3000),
          photos: Array.isArray(p.photos)
            ? p.photos
                .slice(0, 8)
                .filter((ph): ph is Record<string, unknown> => Boolean(ph && typeof ph === 'object'))
                .map((ph, pidx) => ({
                  id: clampString(ph.id, 60) || `cph-${Date.now()}-${pidx}`,
                  url: sanitizeMediaUrl(ph.url) || baseMag.coverPhotoUrl,
                  caption: ph.caption ? sanitizeLocalized(ph.caption, 200) : undefined,
                  date: clampString(ph.date, 30) || undefined,
                }))
            : [],
          bgColor: sanitizeHexColor(p.bgColor),
          audioUrl: sanitizeMediaUrl(p.audioUrl),
          audioTitle: p.audioTitle ? sanitizeLocalized(p.audioTitle, 120) : undefined,
          qrUrl: sanitizeQrUrl(p.qrUrl, ''),
          showQr: typeof p.showQr === 'boolean' ? p.showQr : false,
        }))
    : baseMag.customPages || [];

  const validPageKeys = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', ...customPages.map((c) => c.id)]);
  const rawPageOrder = Array.isArray(rawMag.pageOrder)
    ? rawMag.pageOrder.map((k) => clampString(k, 60)).filter((k) => validPageKeys.has(k))
    : baseMag.pageOrder || ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
  const pageOrder = [...new Set(rawPageOrder)];
  for (const key of validPageKeys) {
    if (!pageOrder.includes(key)) {
      const backIdx = pageOrder.indexOf('p8');
      if (backIdx >= 0) pageOrder.splice(backIdx, 0, key);
      else pageOrder.push(key);
    }
  }

  const magazine = {
    colorTheme: magazineColorTheme,
    masthead: rawMag.masthead ? sanitizeLocalized(rawMag.masthead, 80) : baseMag.masthead,
    issueLabel: rawMag.issueLabel ? sanitizeLocalized(rawMag.issueLabel, 120) : baseMag.issueLabel,
    coverPhotoUrl: sanitizeMediaUrl(rawMag.coverPhotoUrl) || baseMag.coverPhotoUrl,
    coverHeadlines: Array.isArray(rawMag.coverHeadlines)
      ? rawMag.coverHeadlines.slice(0, 6).map((h) => sanitizeLocalized(h, 160))
      : baseMag.coverHeadlines,
    editorialTitle: rawMag.editorialTitle ? sanitizeLocalized(rawMag.editorialTitle, 160) : baseMag.editorialTitle,
    editorialPullQuote: rawMag.editorialPullQuote
      ? sanitizeLocalized(rawMag.editorialPullQuote, 400)
      : baseMag.editorialPullQuote,
    editorialStory: rawMag.editorialStory ? sanitizeLocalized(rawMag.editorialStory, 3000) : baseMag.editorialStory,
    collagePhotos: Array.isArray(rawMag.collagePhotos)
      ? rawMag.collagePhotos
          .slice(0, 8)
          .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
          .map((c, idx) => ({
            id: clampString(c.id, 60) || `col-${Date.now()}-${idx}`,
            imageUrl: sanitizeMediaUrl(c.imageUrl) || baseMag.coverPhotoUrl,
            caption: sanitizeLocalized(c.caption, 180),
          }))
      : baseMag.collagePhotos,
    memorySpreadTitle: rawMag.memorySpreadTitle
      ? sanitizeLocalized(rawMag.memorySpreadTitle, 160)
      : baseMag.memorySpreadTitle,
    memorySpreadItems: Array.isArray(rawMag.memorySpreadItems)
      ? rawMag.memorySpreadItems
          .slice(0, 10)
          .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
          .map((m, idx) => ({
            id: clampString(m.id, 60) || `mag-mem-${Date.now()}-${idx}`,
            imageUrl: sanitizeMediaUrl(m.imageUrl) || baseMag.coverPhotoUrl,
            title: sanitizeLocalized(m.title, 140),
            caption: sanitizeLocalized(m.caption, 500),
            date: clampString(m.date, 30) || new Date().toISOString().slice(0, 10),
          }))
      : baseMag.memorySpreadItems,
    musicPage: {
      title: rawMagMusic.title ? sanitizeLocalized(rawMagMusic.title, 140) : baseMag.musicPage.title,
      songTitle: rawMagMusic.songTitle ? sanitizeLocalized(rawMagMusic.songTitle, 140) : baseMag.musicPage.songTitle,
      artist: rawMagMusic.artist ? sanitizeLocalized(rawMagMusic.artist, 140) : baseMag.musicPage.artist,
      coverArtUrl: sanitizeMediaUrl(rawMagMusic.coverArtUrl) || baseMag.musicPage.coverArtUrl,
      audioUrl: sanitizeMediaUrl(rawMagMusic.audioUrl),
      qrUrl: sanitizeQrUrl(rawMagMusic.qrUrl, baseMag.musicPage.qrUrl),
      qrCaption: rawMagMusic.qrCaption ? sanitizeLocalized(rawMagMusic.qrCaption, 240) : baseMag.musicPage.qrCaption,
      showQr: typeof rawMagMusic.showQr === 'boolean' ? rawMagMusic.showQr : baseMag.musicPage.showQr,
    },
    greetingPage: {
      headline: rawMagGreeting.headline
        ? sanitizeLocalized(rawMagGreeting.headline, 180)
        : baseMag.greetingPage.headline,
      subheadline: rawMagGreeting.subheadline
        ? sanitizeLocalized(rawMagGreeting.subheadline, 360)
        : baseMag.greetingPage.subheadline,
      photos: Array.isArray(rawMagGreeting.photos)
        ? rawMagGreeting.photos
            .slice(0, 8)
            .map((p) => sanitizeMediaUrl(p))
            .filter((p): p is string => Boolean(p))
        : baseMag.greetingPage.photos,
    },
    lettersPage: {
      title: rawMagLetters.title ? sanitizeLocalized(rawMagLetters.title, 140) : baseMag.lettersPage.title,
      letterBody: rawMagLetters.letterBody
        ? sanitizeLocalized(rawMagLetters.letterBody, 3500)
        : baseMag.lettersPage.letterBody,
      signature: rawMagLetters.signature
        ? sanitizeLocalized(rawMagLetters.signature, 160)
        : baseMag.lettersPage.signature,
    },
    backCover: {
      headline: rawMagBack.headline ? sanitizeLocalized(rawMagBack.headline, 160) : baseMag.backCover.headline,
      dedication: rawMagBack.dedication
        ? sanitizeLocalized(rawMagBack.dedication, 360)
        : baseMag.backCover.dedication,
      photoUrl: sanitizeMediaUrl(rawMagBack.photoUrl),
      colophon: rawMagBack.colophon ? sanitizeLocalized(rawMagBack.colophon, 160) : baseMag.backCover.colophon,
    },
    pageBackgrounds,
    pageOrder,
    customPages,
  };

  return {
    slug,
    bookTitle: raw.bookTitle ? sanitizeLocalized(raw.bookTitle, 120) : existing.bookTitle,
    recipientName: raw.recipientName ? sanitizeLocalized(raw.recipientName, 120) : existing.recipientName,
    nickname: raw.nickname ? sanitizeLocalized(raw.nickname, 120) : existing.nickname,
    age: ageNum,
    birthYear: birthYearNum,
    birthdayDate: clampString(raw.birthdayDate, 20) || existing.birthdayDate,
    preferredLanguage,
    relationship: raw.relationship ? sanitizeLocalized(raw.relationship, 120) : existing.relationship,
    personalBio: raw.personalBio ? sanitizeLocalized(raw.personalBio, 800) : existing.personalBio,
    welcomeMessage: raw.welcomeMessage ? sanitizeLocalized(raw.welcomeMessage, 2500) : existing.welcomeMessage,
    heroImageUrl: sanitizeMediaUrl(raw.heroImageUrl) || existing.heroImageUrl,
    openingLetter,
    envelopePrompt,
    albums,
    timeline,
    chapterCopy,
    cake: {
      candleCount,
      wishPrompt: rawCake.wishPrompt ? sanitizeLocalized(rawCake.wishPrompt, 500) : existing.cake.wishPrompt,
      postWishMessage: rawCake.postWishMessage
        ? sanitizeLocalized(rawCake.postWishMessage, 1500)
        : existing.cake.postWishMessage,
    },
    gift: {
      title: rawGift.title ? sanitizeLocalized(rawGift.title, 160) : existing.gift.title,
      subtitle: rawGift.subtitle ? sanitizeLocalized(rawGift.subtitle, 400) : existing.gift.subtitle,
      contentType: giftType,
      mediaUrl: sanitizeMediaUrl(rawGift.mediaUrl),
      message: rawGift.message ? sanitizeLocalized(rawGift.message, 2000) : existing.gift.message,
      sender: rawGift.sender ? sanitizeLocalized(rawGift.sender, 120) : existing.gift.sender,
    },
    memories,
    magazine,
    scratchCards,
    quiz,
    memoryGuesses,
    puzzleImageUrl: sanitizeMediaUrl(raw.puzzleImageUrl) || existing.puzzleImageUrl,
    wheelOptions,
    messages,
    futureLetter: {
      title: rawLetter.title ? sanitizeLocalized(rawLetter.title, 160) : existing.futureLetter.title,
      openDate: clampString(rawLetter.openDate, 20) || existing.futureLetter.openDate,
      sender: rawLetter.sender ? sanitizeLocalized(rawLetter.sender, 120) : existing.futureLetter.sender,
      body: rawLetter.body ? sanitizeLocalized(rawLetter.body, 5000) : existing.futureLetter.body,
    },
    wishTreeSettings: {
      allowPublicSubmissions:
        typeof rawWishSettings.allowPublicSubmissions === 'boolean'
          ? rawWishSettings.allowPublicSubmissions
          : existing.wishTreeSettings.allowPublicSubmissions,
      requireModeration:
        typeof rawWishSettings.requireModeration === 'boolean'
          ? rawWishSettings.requireModeration
          : existing.wishTreeSettings.requireModeration,
      promptText: rawWishSettings.promptText
        ? sanitizeLocalized(rawWishSettings.promptText, 400)
        : existing.wishTreeSettings.promptText,
    },
    music: {
      tracks: tracks.length > 0 ? tracks : existing.music.tracks,
      defaultTrackId: clampString(rawMusic.defaultTrackId, 60) || existing.music.defaultTrackId,
      autoplayMode: rawMusic.autoplayMode === 'on_start' ? 'on_start' : 'after_interaction',
    },
    finale: {
      title: rawFinale.title ? sanitizeLocalized(rawFinale.title, 160) : existing.finale.title,
      message: rawFinale.message ? sanitizeLocalized(rawFinale.message, 2500) : existing.finale.message,
      mediaUrl: sanitizeMediaUrl(rawFinale.mediaUrl),
      mediaType: rawFinale.mediaType === 'video' ? 'video' : 'photo',
      signature: rawFinale.signature ? sanitizeLocalized(rawFinale.signature, 160) : existing.finale.signature,
    },
    appearance: {
      accentPreset,
      primaryAccent: sanitizeHexColor(rawAppearance.primaryAccent) || presetColors[accentPreset].primary,
      secondaryAccent: sanitizeHexColor(rawAppearance.secondaryAccent) || presetColors[accentPreset].secondary,
      introLeadText: rawAppearance.introLeadText
        ? sanitizeLocalized(rawAppearance.introLeadText, 80)
        : existing.appearance.introLeadText || { en: 'HAPPY BIRTHDAY', ar: 'عيد ميلاد سعيد' },
      countdownEnabled:
        typeof rawAppearance.countdownEnabled === 'boolean'
          ? rawAppearance.countdownEnabled
          : existing.appearance.countdownEnabled ?? true,
      countdownDurationSec:
        typeof rawAppearance.countdownDurationSec === 'number' && Number.isFinite(rawAppearance.countdownDurationSec)
          ? Math.min(20, Math.max(3, Math.round(rawAppearance.countdownDurationSec)))
          : existing.appearance.countdownDurationSec ?? 11,
      effects: {
        stars: typeof rawEffects.stars === 'boolean' ? rawEffects.stars : existing.appearance.effects.stars,
        petals: typeof rawEffects.petals === 'boolean' ? rawEffects.petals : existing.appearance.effects.petals,
        fireworks:
          typeof rawEffects.fireworks === 'boolean' ? rawEffects.fireworks : existing.appearance.effects.fireworks,
        stage3d: typeof rawEffects.stage3d === 'boolean' ? rawEffects.stage3d : existing.appearance.effects.stage3d,
        intro:
          typeof rawEffects.intro === 'boolean'
            ? rawEffects.intro
            : existing.appearance.effects.intro ?? true,
      },
    },
    sectionOrder,
    visibleSections,
    updatedAt: new Date().toISOString(),
  };
}

function editionsDiffer(a: BirthdayEdition, b: BirthdayEdition): boolean {
  const { updatedAt: _ua, ...restA } = a;
  const { updatedAt: _ub, ...restB } = b;
  return JSON.stringify(restA) !== JSON.stringify(restB);
}

function pushVersionSnapshot(
  storeVersions: Record<string, EditionVersion[]>,
  slug: string,
  snapshot: BirthdayEdition,
  kind: 'publish' | 'manual' | 'restore',
  label: string,
): EditionVersion {
  if (!Array.isArray(storeVersions[slug])) {
    storeVersions[slug] = [];
  }
  const entry: EditionVersion = {
    id: `ver-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    label: label.slice(0, 120),
    kind,
    createdAt: new Date().toISOString(),
    snapshot: structuredClone(snapshot),
  };
  storeVersions[slug].unshift(entry);
  if (storeVersions[slug].length > 30) {
    storeVersions[slug] = storeVersions[slug].slice(0, 30);
  }
  return entry;
}

function buildAdminPayload(slug: string) {
  const store = loadStore();
  const published = normalizeEdition(store.editions[slug]);
  const draft = normalizeEdition(store.drafts[slug] || published);
  const meta = store.editionMeta[slug] || {
    lastSavedAt: draft.updatedAt,
    lastPublishedAt: published.updatedAt,
    isPublished: true,
  };
  const versions = (store.versions[slug] || []).map((v) => ({
    id: v.id,
    label: v.label,
    kind: v.kind,
    createdAt: v.createdAt,
  }));
  return {
    draft,
    published,
    lastSavedAt: meta.lastSavedAt,
    lastPublishedAt: meta.lastPublishedAt,
    hasUnpublishedChanges: editionsDiffer(draft, published),
    isPublished: meta.isPublished !== false,
    publicPath: `/birthday/${encodeURIComponent(slug)}`,
    versions,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_EXT[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV, MP3, WAV, OGG, M4A.'));
    }
  },
});

async function startServer(): Promise<void> {
  loadStore();
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(filename)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  });

  app.get('/api/auth/status', (req, res) => {
    const store = loadStore();
    const envPass = getEnvPasscode();
    const envEmail = getEnvEmail();
    const hasConfiguredCredential = Boolean(envPass) || Boolean(store.adminCredential?.hash);
    const needsSetup = !hasConfiguredCredential;
    const { token } = extractSessionAuth(req);
    const verified = token ? verifySessionToken(token) : { valid: false };
    res.json({
      needsSetup,
      authenticated: verified.valid,
      envManaged: Boolean(envPass),
      requiresEmailBinding: Boolean(!envEmail && store.adminCredential && !store.adminCredential.email),
      adminEmail: verified.valid ? verified.email || envEmail || store.adminCredential?.email : undefined,
    });
  });

  app.post('/api/auth/claim', (req, res) => {
    if (!checkAuthRateLimit(req.ip || 'unknown')) {
      res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
      return;
    }
    const envPass = getEnvPasscode();
    const store = loadStore();
    if (envPass || store.adminCredential?.hash) {
      res.status(409).json({ error: 'Admin account is already configured. Public registration is disabled.' });
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password =
      typeof req.body?.password === 'string'
        ? req.body.password.trim()
        : typeof req.body?.passcode === 'string'
          ? req.body.passcode.trim()
          : '';
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid authorized admin email address.' });
      return;
    }
    const envEmail = getEnvEmail();
    if (envEmail && envEmail !== email) {
      res.status(403).json({ error: 'This email is not authorized for admin setup.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }
    const recoveryKey = generateRecoveryKey();
    const pw = hashSecret(password);
    const rec = hashSecret(recoveryKey);
    store.adminCredential = {
      email,
      salt: pw.salt,
      hash: pw.hash,
      recoverySalt: rec.salt,
      recoveryHash: rec.hash,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
    const token = issueSessionToken(email);
    setSessionCookie(res, token);
    res.json({ token, admin: { email }, recoveryKey });
  });

  app.post('/api/auth/login', (req, res) => {
    if (!checkAuthRateLimit(req.ip || 'unknown')) {
      res.status(429).json({ error: 'Too many login attempts. Please wait a few minutes.' });
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password =
      typeof req.body?.password === 'string'
        ? req.body.password.trim()
        : typeof req.body?.passcode === 'string'
          ? req.body.passcode.trim()
          : '';

    if (!isValidEmail(email) || !password) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const store = loadStore();
    const envPass = getEnvPasscode();
    const envEmail = getEnvEmail();
    const authorizedEmail = envEmail || store.adminCredential?.email?.toLowerCase() || '';

    // Verify password first
    let passwordMatches = false;
    if (envPass) {
      passwordMatches = safeEqualStrings(password, envPass);
    } else if (store.adminCredential?.salt && store.adminCredential?.hash) {
      passwordMatches = verifyHashedSecret(password, store.adminCredential.salt, store.adminCredential.hash);
    }

    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Bind email once if migrating from legacy passcode-only credential
    if (!authorizedEmail && store.adminCredential) {
      store.adminCredential.email = email;
      if (!store.adminCredential.recoveryHash) {
        const recKey = generateRecoveryKey();
        const rec = hashSecret(recKey);
        store.adminCredential.recoverySalt = rec.salt;
        store.adminCredential.recoveryHash = rec.hash;
      }
      store.adminCredential.updatedAt = new Date().toISOString();
      saveStore(store);
    } else if (authorizedEmail !== email) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = issueSessionToken(email);
    setSessionCookie(res, token);
    res.json({ token, admin: { email } });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/change-password', requireOwner, (req, res) => {
    const envPass = getEnvPasscode();
    if (envPass) {
      res.status(400).json({
        error: 'Password is managed via environment configuration (ADMIN_PASSCODE). Update it in Secrets.',
      });
      return;
    }
    const store = loadStore();
    if (!store.adminCredential) {
      res.status(400).json({ error: 'Admin credential is not initialized.' });
      return;
    }
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    if (!currentPassword || !verifyHashedSecret(currentPassword, store.adminCredential.salt, store.adminCredential.hash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
      return;
    }
    const next = hashSecret(newPassword);
    store.adminCredential.salt = next.salt;
    store.adminCredential.hash = next.hash;
    store.adminCredential.updatedAt = new Date().toISOString();
    saveStore(store);
    res.json({ ok: true });
  });

  app.post('/api/auth/recovery-key/rotate', requireOwner, (_req, res) => {
    const store = loadStore();
    if (!store.adminCredential) {
      res.status(400).json({ error: 'Admin credential is not stored locally.' });
      return;
    }
    const recoveryKey = generateRecoveryKey();
    const rec = hashSecret(recoveryKey);
    store.adminCredential.recoverySalt = rec.salt;
    store.adminCredential.recoveryHash = rec.hash;
    store.adminCredential.updatedAt = new Date().toISOString();
    saveStore(store);
    res.json({ recoveryKey });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    if (!checkAuthRateLimit(req.ip || 'unknown')) {
      res.status(429).json({ error: 'Too many reset attempts. Please wait a few minutes.' });
      return;
    }
    const envPass = getEnvPasscode();
    if (envPass) {
      res.status(400).json({
        error: 'Password is managed via server environment secret (ADMIN_PASSCODE).',
      });
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const recoveryCode = typeof req.body?.recoveryCode === 'string' ? req.body.recoveryCode.trim().toUpperCase() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

    if (!isValidEmail(email) || !recoveryCode) {
      res.status(401).json({ error: 'Invalid email or recovery key.' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
      return;
    }

    const store = loadStore();
    const authorizedEmail = getEnvEmail() || store.adminCredential?.email?.toLowerCase() || '';
    if (!store.adminCredential || !authorizedEmail || authorizedEmail !== email) {
      res.status(401).json({ error: 'Invalid email or recovery key.' });
      return;
    }

    const envRecovery = (process.env.ADMIN_RECOVERY_CODE || '').trim().toUpperCase();
    const envMatches = envRecovery ? safeEqualStrings(recoveryCode, envRecovery) : false;
    const hashMatches =
      store.adminCredential.recoverySalt && store.adminCredential.recoveryHash
        ? verifyHashedSecret(recoveryCode, store.adminCredential.recoverySalt, store.adminCredential.recoveryHash)
        : false;

    if (!envMatches && !hashMatches) {
      res.status(401).json({ error: 'Invalid email or recovery key.' });
      return;
    }

    const nextPw = hashSecret(newPassword);
    const nextRecovery = generateRecoveryKey();
    const nextRecHash = hashSecret(nextRecovery);
    store.adminCredential.salt = nextPw.salt;
    store.adminCredential.hash = nextPw.hash;
    store.adminCredential.recoverySalt = nextRecHash.salt;
    store.adminCredential.recoveryHash = nextRecHash.hash;
    store.adminCredential.updatedAt = new Date().toISOString();
    saveStore(store);

    const token = issueSessionToken(email);
    setSessionCookie(res, token);
    res.json({ token, admin: { email }, recoveryKey: nextRecovery });
  });

  // Public list: strictly published editions only
  app.get('/api/editions', (_req, res) => {
    const store = loadStore();
    res.json({ editions: listEditionSummaries(store, false) });
  });

  // Private admin list: all editions including unpublished drafts
  app.get('/api/admin/editions', requireOwner, (_req, res) => {
    const store = loadStore();
    res.json({ editions: listEditionSummaries(store, true) });
  });

  // Public visitor endpoint — returns ONLY published edition + approved wishes
  app.get('/api/experience/:slug', (req, res) => {
    const store = loadStore();
    const rawParam = req.params.slug;
    let edition: BirthdayEdition | undefined;

    if (rawParam === '__default__') {
      const defaultCandidate = store.editions[DEFAULT_EDITION_SLUG];
      if (defaultCandidate && store.editionMeta[DEFAULT_EDITION_SLUG]?.isPublished !== false) {
        edition = defaultCandidate;
      } else {
        edition = Object.values(store.editions).find(
          (ed) => store.editionMeta[ed.slug]?.isPublished !== false,
        );
      }
    } else {
      const slug = sanitizeSlug(rawParam);
      if (slug && store.editions[slug] && store.editionMeta[slug]?.isPublished !== false) {
        edition = store.editions[slug];
      }
    }

    if (!edition) {
      res.status(404).json({
        error: 'This birthday celebration is currently private or not published yet.',
        unpublished: true,
      });
      return;
    }

    const approvedWishes = store.wishes.filter(
      (w) => w.editionSlug === edition.slug && w.status === 'approved',
    );
    res.json({ edition, wishes: approvedWishes });
  });

  app.post('/api/experience/:slug/wishes', (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug) || DEFAULT_EDITION_SLUG;
    const edition = store.editions[slug];
    if (!edition || store.editionMeta[slug]?.isPublished === false) {
      res.status(404).json({ error: 'Birthday edition not found or unpublished.' });
      return;
    }
    if (!edition.wishTreeSettings.allowPublicSubmissions) {
      res.status(403).json({ error: 'Public wish submissions are disabled for this edition.' });
      return;
    }
    const author = clampString(req.body?.author, 60);
    const message = clampString(req.body?.message, 400);
    const style = ['leaf', 'star', 'blossom'].includes(String(req.body?.style))
      ? (String(req.body.style) as 'leaf' | 'star' | 'blossom')
      : 'star';

    if (!author || !message) {
      res.status(400).json({ error: 'Name and wish message are required.' });
      return;
    }

    const newWish: WishItem = {
      id: `wish-${crypto.randomUUID()}`,
      editionSlug: edition.slug,
      author,
      message,
      style,
      status: edition.wishTreeSettings.requireModeration ? 'pending' : 'approved',
      createdAt: new Date().toISOString(),
    };
    store.wishes.unshift(newWish);
    saveStore(store);
    res.status(201).json({ wish: newWish });
  });

  // Admin: fetch draft + published + metadata + version history
  app.get('/api/admin/experience/:slug', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug) || DEFAULT_EDITION_SLUG;
    if (!store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    res.json(buildAdminPayload(slug));
  });

  // Admin: save Draft only (for Auto-Save and Save Draft — does NOT alter live site)
  app.put('/api/admin/experience/:slug/draft', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const base = store.drafts[slug] || store.editions[slug];
    const updatedDraft = validateAndNormalizeEdition(slug, req.body, base);
    store.drafts[slug] = updatedDraft;
    const now = new Date().toISOString();
    store.editionMeta[slug] = {
      lastSavedAt: now,
      lastPublishedAt: store.editionMeta[slug]?.lastPublishedAt || store.editions[slug].updatedAt,
      isPublished: store.editionMeta[slug]?.isPublished !== false,
    };
    saveStore(store);
    res.json(buildAdminPayload(slug));
  });

  // Admin: publish Draft to Live site & automatically create backup snapshot
  app.post('/api/admin/experience/:slug/publish', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const base = store.drafts[slug] || store.editions[slug];
    const nextPublished =
      req.body && Object.keys(req.body).length > 0
        ? validateAndNormalizeEdition(slug, req.body, base)
        : normalizeEdition(structuredClone(base));

    const prevPublished = store.editions[slug];
    const now = new Date().toISOString();
    nextPublished.updatedAt = now;

    // Save snapshot of previous live edition before overwriting
    pushVersionSnapshot(
      store.versions,
      slug,
      prevPublished,
      'publish',
      `Published snapshot (${prevPublished.updatedAt.slice(0, 16).replace('T', ' ')})`,
    );

    store.editions[slug] = structuredClone(nextPublished);
    store.drafts[slug] = structuredClone(nextPublished);
    store.editionMeta[slug] = {
      lastSavedAt: now,
      lastPublishedAt: now,
      isPublished: true,
    };
    saveStore(store);
    res.json({
      ...buildAdminPayload(slug),
      summaries: listEditionSummaries(store, true),
    });
  });

  // Admin: unpublish public birthday page while keeping draft & edition safely stored
  app.post('/api/admin/experience/:slug/unpublish', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const prevMeta = store.editionMeta[slug] || {
      lastSavedAt: store.editions[slug].updatedAt,
      lastPublishedAt: store.editions[slug].updatedAt,
      isPublished: true,
    };
    store.editionMeta[slug] = {
      ...prevMeta,
      isPublished: false,
    };
    saveStore(store);
    res.json({
      ...buildAdminPayload(slug),
      summaries: listEditionSummaries(store, true),
    });
  });

  // Admin: customize/update the public URL slug (e.g. /birthday/sara)
  app.post('/api/admin/experience/:slug/rename-slug', requireOwner, (req, res) => {
    const store = loadStore();
    const oldSlug = sanitizeSlug(req.params.slug);
    const nextSlug = sanitizeSlug(typeof req.body?.newSlug === 'string' ? req.body.newSlug : '');
    if (!oldSlug || !store.editions[oldSlug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    if (!nextSlug || nextSlug.length < 2) {
      res.status(400).json({ error: 'Please enter at least 2 letters or numbers for the public link.' });
      return;
    }
    if (nextSlug === oldSlug) {
      res.json({ ...buildAdminPayload(oldSlug), summaries: listEditionSummaries(store, true) });
      return;
    }
    if (store.editions[nextSlug] || nextSlug === '__default__') {
      res.status(409).json({ error: `The public link /birthday/${nextSlug} is already in use.` });
      return;
    }

    const ed = store.editions[oldSlug];
    ed.slug = nextSlug;
    store.editions[nextSlug] = ed;
    delete store.editions[oldSlug];

    const dr = store.drafts[oldSlug] || structuredClone(ed);
    dr.slug = nextSlug;
    store.drafts[nextSlug] = dr;
    delete store.drafts[oldSlug];

    store.versions[nextSlug] = (store.versions[oldSlug] || []).map((v) => ({
      ...v,
      snapshot: { ...v.snapshot, slug: nextSlug },
    }));
    delete store.versions[oldSlug];

    if (store.editionMeta[oldSlug]) {
      store.editionMeta[nextSlug] = store.editionMeta[oldSlug];
      delete store.editionMeta[oldSlug];
    }

    for (const w of store.wishes) {
      if (w.editionSlug === oldSlug) {
        w.editionSlug = nextSlug;
      }
    }

    saveStore(store);
    res.json({
      ...buildAdminPayload(nextSlug),
      summaries: listEditionSummaries(store, true),
    });
  });

  // Admin: discard unpublished draft changes back to live published copy
  app.post('/api/admin/experience/:slug/discard-draft', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    store.drafts[slug] = structuredClone(store.editions[slug]);
    const now = new Date().toISOString();
    store.editionMeta[slug] = {
      lastSavedAt: now,
      lastPublishedAt: store.editionMeta[slug]?.lastPublishedAt || store.editions[slug].updatedAt,
      isPublished: store.editionMeta[slug]?.isPublished !== false,
    };
    saveStore(store);
    res.json(buildAdminPayload(slug));
  });

  // Admin: create manual backup checkpoint
  app.post('/api/admin/experience/:slug/versions', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const source = store.drafts[slug] || store.editions[slug];
    const label = clampString(req.body?.label, 100) || `Manual backup · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    pushVersionSnapshot(store.versions, slug, source, 'manual', label);
    saveStore(store);
    res.status(201).json(buildAdminPayload(slug));
  });

  // Admin: restore a version snapshot into the working Draft
  app.post('/api/admin/experience/:slug/versions/:versionId/restore', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const version = (store.versions[slug] || []).find((v) => v.id === req.params.versionId);
    if (!version) {
      res.status(404).json({ error: 'Version backup not found.' });
      return;
    }
    // Snapshot current draft first so restore is non-destructive
    if (store.drafts[slug]) {
      pushVersionSnapshot(
        store.versions,
        slug,
        store.drafts[slug],
        'restore',
        `Before restoring "${version.label}"`,
      );
    }
    const restored = normalizeEdition(structuredClone(version.snapshot));
    restored.updatedAt = new Date().toISOString();
    store.drafts[slug] = restored;
    store.editionMeta[slug] = {
      lastSavedAt: restored.updatedAt,
      lastPublishedAt: store.editionMeta[slug]?.lastPublishedAt || store.editions[slug].updatedAt,
      isPublished: store.editionMeta[slug]?.isPublished !== false,
    };
    saveStore(store);
    res.json(buildAdminPayload(slug));
  });

  app.delete('/api/admin/experience/:slug/versions/:versionId', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const list = store.versions[slug] || [];
    store.versions[slug] = list.filter((v) => v.id !== req.params.versionId);
    saveStore(store);
    res.json(buildAdminPayload(slug));
  });

  // Backward-compatible direct save & publish endpoint
  app.put('/api/admin/experience/:slug', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug);
    if (!slug || !store.editions[slug]) {
      res.status(404).json({ error: 'Edition not found.' });
      return;
    }
    const prev = store.editions[slug];
    const updated = validateAndNormalizeEdition(slug, req.body, prev);
    pushVersionSnapshot(store.versions, slug, prev, 'publish', `Snapshot before update`);
    store.editions[slug] = structuredClone(updated);
    store.drafts[slug] = structuredClone(updated);
    store.editionMeta[slug] = {
      lastSavedAt: updated.updatedAt,
      lastPublishedAt: updated.updatedAt,
      isPublished: true,
    };
    saveStore(store);
    res.json({ edition: updated });
  });

  app.post('/api/admin/editions', requireOwner, (req, res) => {
    const store = loadStore();
    const recipientEn = clampString(req.body?.recipientName?.en || req.body?.name, 100);
    const recipientAr = clampString(req.body?.recipientName?.ar || recipientEn, 100);
    if (!recipientEn) {
      res.status(400).json({ error: 'Recipient name is required.' });
      return;
    }
    const baseSlug = sanitizeSlug(req.body?.slug || recipientEn) || `edition-${Date.now()}`;
    let slug = baseSlug;
    let counter = 2;
    while (store.editions[slug] || slug === '__default__') {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    const age =
      typeof req.body?.age === 'number' && Number.isFinite(req.body.age)
        ? Math.min(150, Math.max(1, Math.round(req.body.age)))
        : 25;
    const cloned = normalizeEdition(structuredClone(DEFAULT_EDITION));
    cloned.slug = slug;
    cloned.recipientName = { en: recipientEn, ar: recipientAr };
    cloned.bookTitle = {
      en: `${recipientEn}'s Keepsake`,
      ar: `كتاب ذكريات ${recipientAr}`,
    };
    cloned.age = age;
    cloned.birthdayDate = clampString(req.body?.birthdayDate, 20) || new Date().toISOString().slice(0, 10);
    cloned.updatedAt = new Date().toISOString();

    const publishNow = req.body?.publishNow === true;
    store.editions[slug] = structuredClone(cloned);
    store.drafts[slug] = structuredClone(cloned);
    store.versions[slug] = [];
    store.editionMeta[slug] = {
      lastSavedAt: cloned.updatedAt,
      lastPublishedAt: publishNow ? cloned.updatedAt : '',
      isPublished: publishNow,
    };
    saveStore(store);
    res.status(201).json({
      edition: cloned,
      summaries: listEditionSummaries(store, true),
      publicPath: `/birthday/${encodeURIComponent(slug)}`,
    });
  });

  app.get('/api/admin/experience/:slug/wishes', requireOwner, (req, res) => {
    const store = loadStore();
    const slug = sanitizeSlug(req.params.slug) || DEFAULT_EDITION_SLUG;
    const wishes = store.wishes.filter((w) => w.editionSlug === slug);
    res.json({ wishes });
  });

  app.patch('/api/admin/wishes/:wishId', requireOwner, (req, res) => {
    const store = loadStore();
    const wish = store.wishes.find((w) => w.id === req.params.wishId);
    if (!wish) {
      res.status(404).json({ error: 'Wish not found.' });
      return;
    }
    const status = req.body?.status === 'pending' ? 'pending' : 'approved';
    wish.status = status;
    saveStore(store);
    res.json({ wish });
  });

  app.delete('/api/admin/wishes/:wishId', requireOwner, (req, res) => {
    const store = loadStore();
    const before = store.wishes.length;
    store.wishes = store.wishes.filter((w) => w.id !== req.params.wishId);
    if (store.wishes.length === before) {
      res.status(404).json({ error: 'Wish not found.' });
      return;
    }
    saveStore(store);
    res.json({ deleted: true });
  });

  app.get('/api/admin/media', requireOwner, (_req, res) => {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        res.json({ assets: [] });
        return;
      }
      const entries = fs.readdirSync(UPLOADS_DIR);
      const assets: UploadedMediaAsset[] = [];
      for (const name of entries) {
        if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(name)) continue;
        const resolved = path.resolve(UPLOADS_DIR, name);
        if (!resolved.startsWith(UPLOADS_DIR + path.sep)) continue;
        const stat = fs.statSync(resolved);
        if (!stat.isFile()) continue;
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const kind: 'image' | 'video' | 'audio' = ['mp4', 'webm', 'mov'].includes(ext)
          ? 'video'
          : ['mp3', 'wav', 'ogg', 'm4a', 'weba'].includes(ext)
            ? 'audio'
            : 'image';
        assets.push({
          filename: name,
          url: `/uploads/${name}`,
          kind,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        });
      }
      assets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json({ assets });
    } catch {
      res.json({ assets: [] });
    }
  });

  app.post('/api/upload', requireOwner, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No file provided.' });
        return;
      }
      const ext = ALLOWED_MIME_EXT[req.file.mimetype];
      if (!ext) {
        res.status(400).json({ error: 'Unsupported MIME type.' });
        return;
      }
      const safeName = `${crypto.randomUUID()}.${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, safeName);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        res.status(400).json({ error: 'Invalid upload path.' });
        return;
      }
      fs.writeFileSync(targetPath, req.file.buffer);
      res.status(201).json({
        url: `/uploads/${safeName}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
    });
  });

  app.post('/api/upload/batch', requireOwner, (req, res) => {
    upload.array('files', 20)(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Batch upload failed.' });
        return;
      }
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided.' });
        return;
      }
      const uploaded: { url: string; mimeType: string; size: number; originalName: string }[] = [];
      for (const file of files) {
        const ext = ALLOWED_MIME_EXT[file.mimetype];
        if (!ext) continue;
        const safeName = `${crypto.randomUUID()}.${ext}`;
        const targetPath = path.resolve(UPLOADS_DIR, safeName);
        if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) continue;
        fs.writeFileSync(targetPath, file.buffer);
        uploaded.push({
          url: `/uploads/${safeName}`,
          mimeType: file.mimetype,
          size: file.size,
          originalName: clampString(file.originalname, 120),
        });
      }
      if (uploaded.length === 0) {
        res.status(400).json({ error: 'No valid supported media files were found.' });
        return;
      }
      res.status(201).json({ files: uploaded });
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Souvenir listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
