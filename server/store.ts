import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_EDITION,
  DEFAULT_EDITION_SLUG,
  DEFAULT_WISHES,
  normalizeEdition,
} from '../src/data/defaultExperience.ts';
import type {
  BirthdayEdition,
  EditionSummary,
  EditionVersion,
  WishItem,
} from '../src/types/birthday.ts';

export interface AdminCredential {
  email?: string;
  salt: string;
  hash: string;
  recoverySalt?: string;
  recoveryHash?: string;
  updatedAt?: string;
}

export interface EditionMeta {
  lastSavedAt: string;
  lastPublishedAt: string;
  isPublished: boolean;
}

export interface StoreData {
  editions: Record<string, BirthdayEdition>;
  drafts: Record<string, BirthdayEdition>;
  versions: Record<string, EditionVersion[]>;
  editionMeta: Record<string, EditionMeta>;
  wishes: WishItem[];
  adminCredential?: AdminCredential;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function applyLegacyMigrations(ed: BirthdayEdition): BirthdayEdition {
  if (!ed.magazine && DEFAULT_EDITION.magazine) {
    ed.magazine = structuredClone(DEFAULT_EDITION.magazine);
  }
  if (Array.isArray(ed.sectionOrder) && !ed.sectionOrder.includes('magazine')) {
    const memIdx = ed.sectionOrder.indexOf('memories');
    if (memIdx >= 0) {
      ed.sectionOrder.splice(memIdx + 1, 0, 'magazine');
    } else {
      ed.sectionOrder.push('magazine');
    }
  }
  if (ed.visibleSections && typeof ed.visibleSections.magazine !== 'boolean') {
    ed.visibleSections.magazine = true;
  }
  if (ed.appearance?.effects && typeof ed.appearance.effects.intro !== 'boolean') {
    ed.appearance.effects.intro = true;
  }
  if (ed.appearance && (!ed.appearance.introLeadText || ed.appearance.introLeadText.en === 'HAPPY')) {
    ed.appearance.introLeadText = {
      en: 'HAPPY BIRTHDAY',
      ar:
        ed.appearance.introLeadText?.ar === 'عيد سعيد' || !ed.appearance.introLeadText?.ar
          ? 'عيد ميلاد سعيد'
          : ed.appearance.introLeadText.ar,
    };
  }
  if (ed.appearance) {
    if (ed.appearance.primaryAccent === '#D8B978') ed.appearance.primaryAccent = '#C5A46D';
    if (ed.appearance.secondaryAccent === '#E9A9C3') ed.appearance.secondaryAccent = '#D9A5AE';
  }
  if (Array.isArray(ed.wheelOptions)) {
    const legacyMap: Record<string, string> = {
      '#60458C': '#713F50',
      '#D8B978': '#C5A46D',
      '#E9A9C3': '#D9A5AE',
      '#3D2C63': '#292329',
      '#B8944F': '#9C7E4D',
      '#7A59A8': '#8E5166',
    };
    for (const opt of ed.wheelOptions) {
      if (opt.color && legacyMap[opt.color]) {
        opt.color = legacyMap[opt.color];
      }
    }
  }
  return normalizeEdition(ed);
}

function createInitialStore(): StoreData {
  const seeded = normalizeEdition(structuredClone(DEFAULT_EDITION));
  const now = seeded.updatedAt || new Date().toISOString();
  return {
    editions: {
      [DEFAULT_EDITION_SLUG]: seeded,
    },
    drafts: {
      [DEFAULT_EDITION_SLUG]: structuredClone(seeded),
    },
    versions: {
      [DEFAULT_EDITION_SLUG]: [
        {
          id: 'ver-initial',
          label: 'Initial Keepsake Edition',
          kind: 'publish',
          createdAt: now,
          snapshot: structuredClone(seeded),
        },
      ],
    },
    editionMeta: {
      [DEFAULT_EDITION_SLUG]: {
        lastSavedAt: now,
        lastPublishedAt: now,
        isPublished: true,
      },
    },
    wishes: structuredClone(DEFAULT_WISHES),
  };
}

let cachedStore: StoreData | null = null;

export function loadStore(): StoreData {
  if (cachedStore) {
    return cachedStore;
  }
  ensureDirectories();
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialStore();
    saveStore(initial);
    cachedStore = initial;
    return cachedStore;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const editions: Record<string, BirthdayEdition> =
      parsed.editions && Object.keys(parsed.editions).length > 0
        ? parsed.editions
        : { [DEFAULT_EDITION_SLUG]: structuredClone(DEFAULT_EDITION) };

    const drafts: Record<string, BirthdayEdition> = parsed.drafts || {};
    const versions: Record<string, EditionVersion[]> = parsed.versions || {};
    const editionMeta: Record<string, EditionMeta> = parsed.editionMeta || {};

    for (const [slug, ed] of Object.entries(editions)) {
      const migrated = applyLegacyMigrations(ed);
      editions[slug] = migrated;
      drafts[slug] = drafts[slug]
        ? applyLegacyMigrations(drafts[slug])
        : structuredClone(migrated);
      if (!Array.isArray(versions[slug])) {
        versions[slug] = [];
      } else {
        versions[slug] = versions[slug].map((v) => ({
          ...v,
          snapshot: applyLegacyMigrations(v.snapshot),
        }));
      }
      const fallbackTs = migrated.updatedAt || new Date().toISOString();
      if (!editionMeta[slug]) {
        editionMeta[slug] = {
          lastSavedAt: drafts[slug].updatedAt || fallbackTs,
          lastPublishedAt: fallbackTs,
          isPublished: true,
        };
      } else if (typeof editionMeta[slug].isPublished !== 'boolean') {
        editionMeta[slug].isPublished = true;
      }
    }

    const hydrated: StoreData = {
      editions,
      drafts,
      versions,
      editionMeta,
      wishes: Array.isArray(parsed.wishes) ? parsed.wishes : structuredClone(DEFAULT_WISHES),
      adminCredential: parsed.adminCredential,
    };

    cachedStore = hydrated;
    return cachedStore;
  } catch {
    const fallback = createInitialStore();
    saveStore(fallback);
    cachedStore = fallback;
    return cachedStore;
  }
}

export function saveStore(data: StoreData): void {
  ensureDirectories();
  cachedStore = data;
  const tmpPath = path.resolve(DATA_DIR, `store.json.tmp.${process.pid}`);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

export function listEditionSummaries(store: StoreData, includeUnpublished = false): EditionSummary[] {
  return Object.values(store.editions)
    .filter((ed) => includeUnpublished || store.editionMeta[ed.slug]?.isPublished !== false)
    .map((ed) => ({
      slug: ed.slug,
      bookTitle: ed.bookTitle,
      recipientName: ed.recipientName,
      age: ed.age,
      birthdayDate: ed.birthdayDate,
      updatedAt: ed.updatedAt,
      isPublished: store.editionMeta[ed.slug]?.isPublished !== false,
    }));
}
