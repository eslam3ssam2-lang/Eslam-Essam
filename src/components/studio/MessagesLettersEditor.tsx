import { useRef, useState } from 'react';
import { BookOpen, Mail, MessageSquareHeart, Mic, Plus, Sparkles, Square, Trash2 } from 'lucide-react';
import type {
  BirthdayEdition,
  Language,
  MessageCategory,
  PersonalMessageItem,
  SectionKey,
  UploadedMediaAsset,
} from '../../types/birthday.ts';
import { UI_STRINGS } from '../../i18n/translations.ts';
import { RichTextEditor } from '../RichTextContent.tsx';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface MessagesLettersEditorProps {
  draft: BirthdayEdition;
  lang: Language;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

const SECTION_KEYS: SectionKey[] = [
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

export function MessagesLettersEditor({
  draft,
  lang,
  onChange,
  uploadingField,
  onUploadFile,
  mediaLibrary,
  onRefreshLibrary,
}: MessagesLettersEditorProps) {
  const [subTab, setSubTab] = useState<'letters' | 'tributes' | 'chapters' | 'finale'>('letters');
  const [recordingMsgId, setRecordingMsgId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sectionNames = UI_STRINGS[lang].sectionNames;

  const toggleVoiceRecording = async (msgId: string) => {
    if (recordingMsgId === msgId && recorderRef.current) {
      recorderRef.current.stop();
      setRecordingMsgId(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `tribute-voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = await onUploadFile(file, `msg-voice-${msgId}`);
        if (url) {
          onChange((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === msgId ? { ...m, type: 'audio', mediaUrl: url } : m,
            ),
          }));
        }
      };
      recorder.start();
      setRecordingMsgId(msgId);
    } catch {
      // Permission denied or unsupported browser
    }
  };

  const addTribute = () => {
    const newMsg: PersonalMessageItem = {
      id: `msg-${Date.now()}`,
      type: 'text',
      category: 'family',
      sender: { en: 'Friend or Family Member', ar: 'أحد الأصدقاء أو العائلة' },
      relation: { en: 'Close Circle', ar: 'العائلة والأصدقاء' },
      title: { en: 'Warm Birthday Tribute', ar: 'رسالة تهنئة دافئة' },
      body: { en: '', ar: '' },
      date: new Date().toISOString().slice(0, 10),
    };
    onChange((prev) => ({ ...prev, messages: [...prev.messages, newMsg] }));
  };

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 3 · Messages, Letters & Chapters"
        title="Letters, Tributes & Chapter Headings"
        description="Edit the Matrix birthday intro phrase, Chapter IX envelope letter, rich personal tributes (Romantic, Friendship, Family) with voice recording, the closing finale, and every chapter's title."
      />

      {/* Clean sub-navigation */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#C5A46D]/25 bg-[#292329] p-1.5">
        {(
          [
            ['letters', 'Intro & Envelope Letter', Mail],
            ['tributes', `Personal Tributes (${draft.messages.length})`, MessageSquareHeart],
            ['finale', 'Closing Finale', Sparkles],
            ['chapters', 'Chapter Titles & Subtitles', BookOpen],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === key
                ? 'bg-[#713F50] text-[#F5EBDD] shadow-sm'
                : 'text-[#F5EBDD]/75 hover:text-[#F5EBDD]'
            }`}
          >
            <Icon className="h-3.5 w-3.5 text-[#C5A46D]" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {subTab === 'letters' && (
        <div className="space-y-6">
          {/* Matrix Intro Headline */}
          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Matrix Intro Greeting Text</h3>
            <LocalizedInputs
              label="Center Display Text (e.g. HAPPY BIRTHDAY)"
              value={draft.appearance.introLeadText || { en: 'HAPPY BIRTHDAY', ar: 'عيد ميلاد سعيد' }}
              onChange={(introLeadText) =>
                onChange((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, introLeadText },
                }))
              }
            />
          </div>

          {/* Chapter IX Sealed Envelope & Letter */}
          <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F5EBDD]">Chapter IX · Interactive Envelope & Birthday Letter</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LocalizedInputs
                label="Envelope Card Label"
                value={draft.envelopePrompt?.instruction || { en: 'A special letter for you', ar: 'رسالة خاصة لكِ' }}
                onChange={(instruction) =>
                  onChange((prev) => ({
                    ...prev,
                    envelopePrompt: {
                      instruction,
                      tapPrompt: prev.envelopePrompt?.tapPrompt || {
                        en: 'Click the wax seal to open',
                        ar: 'اضغطي على الختم الشمعي لفتح الرسالة',
                      },
                    },
                  }))
                }
              />
              <LocalizedInputs
                label="Envelope Seal Action Prompt"
                value={
                  draft.envelopePrompt?.tapPrompt || {
                    en: 'Click the wax seal to open',
                    ar: 'اضغطي على الختم الشمعي لفتح الرسالة',
                  }
                }
                onChange={(tapPrompt) =>
                  onChange((prev) => ({
                    ...prev,
                    envelopePrompt: {
                      instruction: prev.envelopePrompt?.instruction || {
                        en: 'A special letter for you',
                        ar: 'رسالة خاصة لكِ',
                      },
                      tapPrompt,
                    },
                  }))
                }
              />
            </div>

            <LocalizedInputs
              label="Letter Heading"
              value={draft.futureLetter.title}
              onChange={(title) =>
                onChange((prev) => ({
                  ...prev,
                  futureLetter: { ...prev.futureLetter, title },
                }))
              }
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-[#C5A46D] mb-1">Letter Date / Stamp</label>
                <input
                  type="text"
                  value={draft.futureLetter.openDate}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      futureLetter: { ...prev.futureLetter, openDate: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                />
              </div>
              <div className="sm:col-span-2">
                <LocalizedInputs
                  label="Letter Signature / Sender"
                  value={draft.futureLetter.sender}
                  onChange={(sender) =>
                    onChange((prev) => ({
                      ...prev,
                      futureLetter: { ...prev.futureLetter, sender },
                    }))
                  }
                />
              </div>
            </div>

            <RichTextEditor
              label="Sealed Envelope Letter Content"
              value={draft.futureLetter.body}
              onChange={(body) =>
                onChange((prev) => ({
                  ...prev,
                  futureLetter: { ...prev.futureLetter, body },
                }))
              }
              rows={6}
            />
          </div>
        </div>
      )}

      {subTab === 'tributes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addTribute}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Personal Tribute</span>
            </button>
          </div>

          {draft.messages.map((msg, idx) => (
            <div
              key={msg.id}
              className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C5A46D]/15 pb-3">
                <span className="text-xs font-semibold text-[#C5A46D]">
                  Tribute #{idx + 1} · {msg.sender.en || 'Sender'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      messages: prev.messages.filter((m) => m.id !== msg.id),
                    }))
                  }
                  className="rounded-md border border-rose-500/30 p-1.5 text-rose-300 hover:bg-rose-500/15"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1">Format</label>
                  <select
                    value={msg.type}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        messages: prev.messages.map((m) =>
                          m.id === msg.id ? { ...m, type: e.target.value as PersonalMessageItem['type'] } : m,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  >
                    <option value="text">Written Letter</option>
                    <option value="audio">Voice Note</option>
                    <option value="video">Video Message</option>
                    <option value="photo">Photo Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1">Category Circle</label>
                  <select
                    value={msg.category || 'family'}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        messages: prev.messages.map((m) =>
                          m.id === msg.id ? { ...m, category: e.target.value as MessageCategory } : m,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  >
                    <option value="romantic">Romantic</option>
                    <option value="friendship">Friendship</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1">Date</label>
                  <input
                    type="date"
                    value={msg.date}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        messages: prev.messages.map((m) =>
                          m.id === msg.id ? { ...m, date: e.target.value } : m,
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  />
                </div>
              </div>

              <LocalizedInputs
                label="Sender Name"
                value={msg.sender}
                onChange={(sender) =>
                  onChange((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) => (m.id === msg.id ? { ...m, sender } : m)),
                  }))
                }
              />
              <LocalizedInputs
                label="Relationship Label"
                value={msg.relation}
                onChange={(relation) =>
                  onChange((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) => (m.id === msg.id ? { ...m, relation } : m)),
                  }))
                }
              />
              <LocalizedInputs
                label="Message Title"
                value={msg.title}
                onChange={(title) =>
                  onChange((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) => (m.id === msg.id ? { ...m, title } : m)),
                  }))
                }
              />

              <RichTextEditor
                label="Tribute Message Body"
                value={msg.body}
                onChange={(body) =>
                  onChange((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) => (m.id === msg.id ? { ...m, body } : m)),
                  }))
                }
                rows={4}
              />

              {msg.type !== 'text' && (
                <div className="space-y-3 rounded-xl border border-[#C5A46D]/20 bg-[#1E191E] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#C5A46D]">Attached Media</span>
                    {msg.type === 'audio' && (
                      <button
                        type="button"
                        onClick={() => void toggleVoiceRecording(msg.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          recordingMsgId === msg.id
                            ? 'bg-rose-600 text-white'
                            : 'bg-[#713F50] text-[#F5EBDD] hover:bg-[#844B5F]'
                        }`}
                      >
                        {recordingMsgId === msg.id ? (
                          <>
                            <Square className="h-3.5 w-3.5" />
                            <span>Stop Recording</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5" />
                            <span>Record Voice Note</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <MediaPickerUpload
                    label="Media File / URL"
                    value={msg.mediaUrl || ''}
                    onChange={(mediaUrl) =>
                      onChange((prev) => ({
                        ...prev,
                        messages: prev.messages.map((m) =>
                          m.id === msg.id ? { ...m, mediaUrl: mediaUrl || undefined } : m,
                        ),
                      }))
                    }
                    accept={
                      msg.type === 'audio' ? 'audio/*' : msg.type === 'video' ? 'video/*' : 'image/*'
                    }
                    fieldKey={`msg-media-${msg.id}`}
                    uploadingField={uploadingField}
                    onUploadFile={onUploadFile}
                    mediaLibrary={mediaLibrary}
                    onRefreshLibrary={onRefreshLibrary}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {subTab === 'finale' && (
        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#F5EBDD]">Closing Birthday Finale</h3>
          <LocalizedInputs
            label="Finale Headline"
            value={draft.finale.title}
            onChange={(title) =>
              onChange((prev) => ({ ...prev, finale: { ...prev.finale, title } }))
            }
          />
          <RichTextEditor
            label="Closing Blessing Message"
            value={draft.finale.message}
            onChange={(message) =>
              onChange((prev) => ({ ...prev, finale: { ...prev.finale, message } }))
            }
            rows={5}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#C5A46D] mb-1">Media Type</label>
              <select
                value={draft.finale.mediaType || 'photo'}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    finale: { ...prev.finale, mediaType: e.target.value as 'photo' | 'video' },
                  }))
                }
                className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
              >
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <MediaPickerUpload
                label="Finale Portrait / Video"
                value={draft.finale.mediaUrl || ''}
                onChange={(mediaUrl) =>
                  onChange((prev) => ({
                    ...prev,
                    finale: { ...prev.finale, mediaUrl: mediaUrl || undefined },
                  }))
                }
                accept={draft.finale.mediaType === 'video' ? 'video/*' : 'image/*'}
                fieldKey="finale-media"
                uploadingField={uploadingField}
                onUploadFile={onUploadFile}
                mediaLibrary={mediaLibrary}
                onRefreshLibrary={onRefreshLibrary}
              />
            </div>
          </div>
          <LocalizedInputs
            label="Closing Signature"
            value={draft.finale.signature}
            onChange={(signature) =>
              onChange((prev) => ({ ...prev, finale: { ...prev.finale, signature } }))
            }
          />
        </div>
      )}

      {subTab === 'chapters' && (
        <div className="space-y-4">
          <p className="text-xs text-[#F5EBDD]/70">
            Leave any field blank to keep the built-in bilingual chapter title, or customize any chapter header below.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {SECTION_KEYS.map((secKey) => {
              const current = draft.chapterCopy?.[secKey] || {};
              const updateSec = (
                field: 'kicker' | 'title' | 'subtitle',
                val: { en: string; ar: string },
              ) => {
                onChange((prev) => ({
                  ...prev,
                  chapterCopy: {
                    ...(prev.chapterCopy || {}),
                    [secKey]: {
                      ...(prev.chapterCopy?.[secKey] || {}),
                      [field]: val,
                    },
                  },
                }));
              };
              return (
                <div
                  key={secKey}
                  className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-4 space-y-3"
                >
                  <p className="text-xs font-semibold text-[#C5A46D]">{sectionNames[secKey]}</p>
                  <LocalizedInputs
                    label="Chapter Kicker (e.g. Chapter I)"
                    value={current.kicker || { en: '', ar: '' }}
                    onChange={(v) => updateSec('kicker', v)}
                  />
                  <LocalizedInputs
                    label="Chapter Heading"
                    value={current.title || { en: '', ar: '' }}
                    onChange={(v) => updateSec('title', v)}
                  />
                  <LocalizedInputs
                    label="Chapter Subtitle"
                    value={current.subtitle || { en: '', ar: '' }}
                    onChange={(v) => updateSec('subtitle', v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
