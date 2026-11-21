export type Language = 'en' | 'ar';

export interface LocalizedText {
  en: string;
  ar: string;
}

export type SectionKey =
  | 'stage3d'
  | 'cake'
  | 'gift'
  | 'memories'
  | 'magazine'
  | 'scratch'
  | 'games'
  | 'messages'
  | 'wishtree'
  | 'letter'
  | 'finale';

export interface MemoryAlbumCategory {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  coverUrl?: string;
}

export interface MemoryItem {
  id: string;
  type: 'photo' | 'video';
  mediaUrl: string;
  title: LocalizedText;
  caption: LocalizedText;
  date: string;
  location: LocalizedText;
  audioUrl?: string;
  audioTitle?: LocalizedText;
  albumId?: string;
  showInAlbum?: boolean;
  showInTimeline?: boolean;
  showInMagazine?: boolean;
  order?: number;
}

export interface TimelineEventItem {
  id: string;
  title: LocalizedText;
  date: string;
  photos: string[];
  story: LocalizedText;
  people: LocalizedText;
  audioUrl?: string;
  audioTitle?: LocalizedText;
  order?: number;
}

export interface ScratchCardItem {
  id: string;
  title: LocalizedText;
  hiddenMessage: LocalizedText;
  rewardLabel: LocalizedText;
  imageUrl?: string;
  foilTone: 'gold' | 'rose';
}

export interface QuizQuestion {
  id: string;
  question: LocalizedText;
  options: LocalizedText[];
  correctIndex: number;
  explanation: LocalizedText;
}

export interface MemoryGuessItem {
  id: string;
  imageUrl: string;
  clue: LocalizedText;
  question: LocalizedText;
  answer: LocalizedText;
  hint: LocalizedText;
}

export interface WheelOption {
  id: string;
  label: LocalizedText;
  message: LocalizedText;
  color: string;
}

export type MessageCategory = 'romantic' | 'friendship' | 'family';

export interface PersonalMessageItem {
  id: string;
  type: 'text' | 'audio' | 'video' | 'photo';
  category?: MessageCategory;
  sender: LocalizedText;
  relation: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
  mediaUrl?: string;
  date: string;
}

export interface AudioTrack {
  id: string;
  title: LocalizedText;
  artist: LocalizedText;
  description?: LocalizedText;
  sourceType: 'synth' | 'url';
  url?: string;
  preset?: 'nocturne' | 'waltz' | 'celesta';
}

export interface WishItem {
  id: string;
  editionSlug: string;
  author: string;
  message: string;
  style: 'leaf' | 'star' | 'blossom';
  status: 'approved' | 'pending';
  createdAt: string;
}

export type MagazineColorTheme = 'ivory-gold' | 'midnight-rose' | 'royal-cream' | 'rose-editorial';

export interface MagazineCollagePhoto {
  id: string;
  imageUrl: string;
  caption: LocalizedText;
}

export interface MagazineMemoryPageItem {
  id: string;
  imageUrl: string;
  title: LocalizedText;
  caption: LocalizedText;
  date: string;
}

export interface MagazineCustomPhoto {
  id: string;
  url: string;
  caption?: LocalizedText;
  date?: string;
}

export interface MagazineCustomPage {
  id: string;
  title: LocalizedText;
  subtitle?: LocalizedText;
  body: LocalizedText;
  photos: MagazineCustomPhoto[];
  bgColor?: string;
  audioUrl?: string;
  audioTitle?: LocalizedText;
  qrUrl?: string;
  showQr?: boolean;
}

export interface MagazineConfig {
  colorTheme: MagazineColorTheme;
  masthead: LocalizedText;
  issueLabel: LocalizedText;
  coverPhotoUrl: string;
  coverHeadlines: LocalizedText[];
  editorialTitle: LocalizedText;
  editorialPullQuote: LocalizedText;
  editorialStory: LocalizedText;
  collagePhotos: MagazineCollagePhoto[];
  memorySpreadTitle: LocalizedText;
  memorySpreadItems: MagazineMemoryPageItem[];
  musicPage: {
    title: LocalizedText;
    songTitle: LocalizedText;
    artist: LocalizedText;
    coverArtUrl: string;
    audioUrl?: string;
    qrUrl: string;
    qrCaption: LocalizedText;
    showQr: boolean;
  };
  greetingPage: {
    headline: LocalizedText;
    subheadline: LocalizedText;
    photos: string[];
  };
  lettersPage: {
    title: LocalizedText;
    letterBody: LocalizedText;
    signature: LocalizedText;
  };
  backCover: {
    headline: LocalizedText;
    dedication: LocalizedText;
    photoUrl?: string;
    colophon: LocalizedText;
  };
  pageBackgrounds?: Record<string, string>;
  pageOrder?: string[];
  customPages?: MagazineCustomPage[];
}

export interface ChapterCopyOverride {
  kicker?: LocalizedText;
  title?: LocalizedText;
  subtitle?: LocalizedText;
}

export interface BirthdayEdition {
  slug: string;
  bookTitle: LocalizedText;
  recipientName: LocalizedText;
  nickname?: LocalizedText;
  age: number;
  birthYear?: number;
  birthdayDate: string;
  preferredLanguage?: Language;
  relationship: LocalizedText;
  personalBio?: LocalizedText;
  welcomeMessage: LocalizedText;
  heroImageUrl: string;
  openingLetter?: {
    title: LocalizedText;
    body: LocalizedText;
    signature: LocalizedText;
  };
  envelopePrompt?: {
    instruction: LocalizedText;
    tapPrompt: LocalizedText;
  };
  albums?: MemoryAlbumCategory[];
  timeline?: TimelineEventItem[];
  chapterCopy?: Partial<Record<SectionKey, ChapterCopyOverride>>;
  cake: {
    candleCount: number;
    wishPrompt: LocalizedText;
    postWishMessage: LocalizedText;
  };
  gift: {
    title: LocalizedText;
    subtitle: LocalizedText;
    contentType: 'photo' | 'video' | 'audio' | 'text';
    mediaUrl?: string;
    message: LocalizedText;
    sender: LocalizedText;
  };
  memories: MemoryItem[];
  magazine?: MagazineConfig;
  scratchCards: ScratchCardItem[];
  quiz: QuizQuestion[];
  memoryGuesses: MemoryGuessItem[];
  puzzleImageUrl: string;
  wheelOptions: WheelOption[];
  messages: PersonalMessageItem[];
  futureLetter: {
    title: LocalizedText;
    openDate: string;
    sender: LocalizedText;
    body: LocalizedText;
  };
  wishTreeSettings: {
    allowPublicSubmissions: boolean;
    requireModeration: boolean;
    promptText: LocalizedText;
  };
  music: {
    tracks: AudioTrack[];
    defaultTrackId: string;
    autoplayMode?: 'after_interaction' | 'on_start';
  };
  finale: {
    title: LocalizedText;
    message: LocalizedText;
    mediaUrl?: string;
    mediaType?: 'photo' | 'video';
    signature: LocalizedText;
  };
  appearance: {
    accentPreset: 'champagne' | 'rose' | 'royal';
    primaryAccent: string;
    secondaryAccent: string;
    introLeadText?: LocalizedText;
    countdownEnabled?: boolean;
    countdownDurationSec?: number;
    effects: {
      stars: boolean;
      petals: boolean;
      fireworks: boolean;
      stage3d: boolean;
      intro?: boolean;
    };
  };
  sectionOrder: SectionKey[];
  visibleSections: Record<SectionKey, boolean>;
  updatedAt: string;
}

export interface EditionSummary {
  slug: string;
  bookTitle: LocalizedText;
  recipientName: LocalizedText;
  age: number;
  birthdayDate: string;
  updatedAt: string;
  isPublished?: boolean;
}

export interface EditionVersion {
  id: string;
  label: string;
  kind: 'publish' | 'manual' | 'restore';
  createdAt: string;
  snapshot: BirthdayEdition;
}

export interface EditionVersionSummary {
  id: string;
  label: string;
  kind: 'publish' | 'manual' | 'restore';
  createdAt: string;
}

export interface AdminEditionPayload {
  draft: BirthdayEdition;
  published: BirthdayEdition;
  lastSavedAt: string;
  lastPublishedAt: string;
  hasUnpublishedChanges: boolean;
  isPublished: boolean;
  publicPath: string;
  versions: EditionVersionSummary[];
}

export interface UploadedMediaAsset {
  filename: string;
  url: string;
  kind: 'image' | 'video' | 'audio';
  size: number;
  createdAt: string;
}
