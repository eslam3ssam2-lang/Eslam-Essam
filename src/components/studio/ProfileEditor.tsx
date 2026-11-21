import { Calculator, Globe, User } from 'lucide-react';
import type { BirthdayEdition, UploadedMediaAsset } from '../../types/birthday.ts';
import { RichTextEditor } from '../RichTextContent.tsx';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface ProfileEditorProps {
  draft: BirthdayEdition;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

export function ProfileEditor({
  draft,
  onChange,
  uploadingField,
  onUploadFile,
  mediaLibrary,
  onRefreshLibrary,
}: ProfileEditorProps) {
  const computeAgeFromBirthYear = () => {
    const birthYear = draft.birthYear || 2000;
    const celebrationYear = Number((draft.birthdayDate || '').slice(0, 4)) || new Date().getFullYear();
    const calculated = Math.max(1, Math.min(120, celebrationYear - birthYear));
    onChange((prev) => ({ ...prev, age: calculated }));
  };

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 1 · Identity & Profile"
        title="Birthday Profile & Dedication"
        description="Customize who this celebration is created for. Name, nickname, birth year, age, bio, preferred language, and opening greeting automatically update across the intro, cover, magazine, and finale."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Portrait & Core Details */}
        <div className="lg:col-span-5 space-y-5 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#C5A46D] bg-[#1E191E]">
              {draft.heroImageUrl ? (
                <img
                  src={draft.heroImageUrl}
                  alt={draft.recipientName.en || 'Portrait'}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#C5A46D]">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-semibold text-[#F5EBDD] truncate">
                {draft.recipientName.en || 'Recipient Name'}
              </p>
              <p className="text-xs text-[#D9A5AE] truncate">
                {draft.nickname?.en ? `“${draft.nickname.en}” · ` : ''}
                Turning {draft.age} · {draft.birthdayDate}
              </p>
            </div>
          </div>

          <MediaPickerUpload
            label="Profile Portrait Photo"
            value={draft.heroImageUrl}
            onChange={(url) => onChange((prev) => ({ ...prev, heroImageUrl: url }))}
            accept="image/*"
            fieldKey="heroImageUrl"
            uploadingField={uploadingField}
            onUploadFile={onUploadFile}
            mediaLibrary={mediaLibrary}
            onRefreshLibrary={onRefreshLibrary}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#C5A46D] mb-1">Birth Year</label>
              <input
                type="number"
                min={1900}
                max={2035}
                value={draft.birthYear ?? 2000}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, birthYear: Number(e.target.value) || 2000 }))
                }
                className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD] tabular-nums focus:border-[#C5A46D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C5A46D] mb-1">Birthday Age</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={130}
                  value={draft.age}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, age: Number(e.target.value) || 1 }))
                  }
                  className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD] tabular-nums focus:border-[#C5A46D] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={computeAgeFromBirthYear}
                  title="Calculate age from birth year & birthday date"
                  className="rounded-lg border border-[#C5A46D]/35 bg-[#1E191E] p-2 text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD] transition-colors shrink-0"
                >
                  <Calculator className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#C5A46D] mb-1">Birthday Date</label>
              <input
                type="date"
                value={draft.birthdayDate}
                onChange={(e) => onChange((prev) => ({ ...prev, birthdayDate: e.target.value }))}
                className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD] focus:border-[#C5A46D] focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#C5A46D] mb-1">
                <Globe className="h-3.5 w-3.5" />
                <span>Preferred Language</span>
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] p-1">
                {(['en', 'ar'] as const).map((langOpt) => (
                  <button
                    key={langOpt}
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, preferredLanguage: langOpt }))}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                      (draft.preferredLanguage || 'en') === langOpt
                        ? 'bg-[#713F50] text-[#F5EBDD]'
                        : 'text-[#F5EBDD]/70 hover:text-[#F5EBDD]'
                    }`}
                  >
                    {langOpt === 'en' ? 'English' : 'العربية'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Bilingual Names & Story Copy */}
        <div className="lg:col-span-7 space-y-4 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5">
          <LocalizedInputs
            label="Birthday Person's Full Name"
            value={draft.recipientName}
            onChange={(recipientName) => onChange((prev) => ({ ...prev, recipientName }))}
          />
          <LocalizedInputs
            label="Affectionate Nickname"
            value={draft.nickname || { en: '', ar: '' }}
            onChange={(nickname) => onChange((prev) => ({ ...prev, nickname }))}
          />
          <LocalizedInputs
            label="Website / Book Title"
            value={draft.bookTitle}
            onChange={(bookTitle) => onChange((prev) => ({ ...prev, bookTitle }))}
          />
          <LocalizedInputs
            label="Relationship / Tribute Subtitle"
            value={draft.relationship}
            onChange={(relationship) => onChange((prev) => ({ ...prev, relationship }))}
          />
          <LocalizedInputs
            label="Short Personal Description / Bio"
            value={draft.personalBio || { en: '', ar: '' }}
            onChange={(personalBio) => onChange((prev) => ({ ...prev, personalBio }))}
            multiline
          />
        </div>
      </div>

      {/* Greeting & Dedication */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
          <RichTextEditor
            label="Custom Birthday Welcome Greeting (Cover Page)"
            value={draft.welcomeMessage}
            onChange={(welcomeMessage) => onChange((prev) => ({ ...prev, welcomeMessage }))}
            rows={4}
            helperText="Supports headings, bold, italic, and bullet lists in English (LTR) and Arabic (RTL)."
          />
        </div>

        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
          <LocalizedInputs
            label="Opening Dedication Title"
            value={draft.openingLetter?.title || { en: '', ar: '' }}
            onChange={(title) =>
              onChange((prev) => ({
                ...prev,
                openingLetter: {
                  title,
                  body: prev.openingLetter?.body || { en: '', ar: '' },
                  signature: prev.openingLetter?.signature || { en: '', ar: '' },
                },
              }))
            }
          />
          <RichTextEditor
            label="Opening Dedication Note"
            value={draft.openingLetter?.body || { en: '', ar: '' }}
            onChange={(body) =>
              onChange((prev) => ({
                ...prev,
                openingLetter: {
                  title: prev.openingLetter?.title || { en: '', ar: '' },
                  body,
                  signature: prev.openingLetter?.signature || { en: '', ar: '' },
                },
              }))
            }
            rows={3}
          />
          <LocalizedInputs
            label="Dedication Signature"
            value={draft.openingLetter?.signature || { en: '', ar: '' }}
            onChange={(signature) =>
              onChange((prev) => ({
                ...prev,
                openingLetter: {
                  title: prev.openingLetter?.title || { en: '', ar: '' },
                  body: prev.openingLetter?.body || { en: '', ar: '' },
                  signature,
                },
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
