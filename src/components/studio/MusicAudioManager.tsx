import { useRef, useState } from 'react';
import { Mic, Music, Pause, Play, Plus, Square, Trash2, Upload, Video } from 'lucide-react';
import type { AudioTrack, BirthdayEdition, UploadedMediaAsset } from '../../types/birthday.ts';
import { LocalizedInputs, MediaPickerUpload, StudioSectionHeader } from './StudioControls.tsx';

interface MusicAudioManagerProps {
  draft: BirthdayEdition;
  onChange: (updater: (prev: BirthdayEdition) => BirthdayEdition) => void;
  uploadingField: string | null;
  onUploadFile: (file: File, fieldKey: string) => Promise<string | null>;
  mediaLibrary: UploadedMediaAsset[];
  onRefreshLibrary: () => Promise<void>;
}

export function MusicAudioManager({
  draft,
  onChange,
  uploadingField,
  onUploadFile,
  mediaLibrary,
  onRefreshLibrary,
}: MusicAudioManagerProps) {
  const [recordingMode, setRecordingMode] = useState<'track' | 'tribute' | null>(null);
  const [previewPlayingUrl, setPreviewPlayingUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const addTrack = (kind: 'url' | 'synth') => {
    const newTrack: AudioTrack = {
      id: `trk-${Date.now()}`,
      title: {
        en: kind === 'url' ? 'Custom Birthday Song' : 'Ambient Synth Composition',
        ar: kind === 'url' ? 'أغنية عيد ميلاد مخصصة' : 'مقطوعة موسيقية هادئة',
      },
      artist: { en: 'Atelier Soundtrack', ar: 'موسيقى الأمسية' },
      description: { en: '', ar: '' },
      sourceType: kind,
      ...(kind === 'synth' ? { preset: 'nocturne' } : { url: '' }),
    };
    onChange((prev) => ({
      ...prev,
      music: {
        ...prev.music,
        tracks: [...prev.music.tracks, newTrack],
      },
    }));
  };

  const togglePreviewAudio = (url: string) => {
    if (previewPlayingUrl === url && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewPlayingUrl(null);
      return;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const audio = new Audio(url);
    previewAudioRef.current = audio;
    audio.onended = () => setPreviewPlayingUrl(null);
    void audio.play().catch(() => setPreviewPlayingUrl(null));
    setPreviewPlayingUrl(url);
  };

  const startOrStopVoiceRecorder = async (target: 'track' | 'tribute') => {
    if (recordingMode && recorderRef.current) {
      recorderRef.current.stop();
      setRecordingMode(null);
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
        const file = new File([blob], `studio-voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = await onUploadFile(file, `voice-studio-${target}`);
        if (!url) return;

        if (target === 'track') {
          const newTrack: AudioTrack = {
            id: `trk-voice-${Date.now()}`,
            title: { en: 'Recorded Voice Note', ar: 'تسجيل صوتي خاص' },
            artist: { en: 'Personal Studio Recording', ar: 'تسجيل شخصي' },
            description: { en: 'Recorded inside Birthday Studio', ar: 'سُجل داخل استوديو عيد الميلاد' },
            sourceType: 'url',
            url,
          };
          onChange((prev) => ({
            ...prev,
            music: { ...prev.music, tracks: [...prev.music.tracks, newTrack] },
          }));
        } else {
          onChange((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `msg-voice-${Date.now()}`,
                type: 'audio',
                category: 'family',
                sender: { en: 'Voice Dedication', ar: 'إهداء صوتي' },
                relation: { en: 'Personal Message', ar: 'رسالة صوتية' },
                title: { en: 'A Recorded Birthday Note', ar: 'تهنئة صوتية مسجلة' },
                body: { en: 'Press play to listen to this special birthday note.', ar: 'اضغطي للاستماع إلى هذه التهنئة الخاصة.' },
                mediaUrl: url,
                date: new Date().toISOString().slice(0, 10),
              },
            ],
          }));
        }
      };
      recorder.start();
      setRecordingMode(target);
    } catch {
      // Permission denied
    }
  };

  const urlTracks = draft.music.tracks.filter((t) => t.sourceType === 'url' && t.url);

  return (
    <div className="space-y-6">
      <StudioSectionHeader
        kicker="Module 6 · Music & Audio Manager"
        title="Soundtracks, Voice Notes & Video Greetings"
        description="Upload MP3/WAV/OGG/M4A music, add streaming links, configure playback timing, record personal voice notes, and link songs directly to memories or timeline milestones."
        actions={
          <>
            <button
              type="button"
              onClick={() => addTrack('url')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-3.5 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Audio Track</span>
            </button>
            <button
              type="button"
              onClick={() => addTrack('synth')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/40 bg-[#292329] px-3.5 py-2 text-xs font-medium text-[#C5A46D] hover:bg-[#713F50] hover:text-[#F5EBDD]"
            >
              <Music className="h-3.5 w-3.5" />
              <span>Add Ambient Synth</span>
            </button>
          </>
        }
      />

      {/* Playback Behavior & Default Track */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-[#C5A46D] mb-1">Default Opening Track</label>
          <select
            value={draft.music.defaultTrackId}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                music: { ...prev.music, defaultTrackId: e.target.value },
              }))
            }
            className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
          >
            {draft.music.tracks.map((trk) => (
              <option key={trk.id} value={trk.id}>
                {trk.title.en || trk.title.ar}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#C5A46D] mb-1">Background Music Start Behavior</label>
          <select
            value={draft.music.autoplayMode || 'after_interaction'}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                music: {
                  ...prev.music,
                  autoplayMode: e.target.value as 'after_interaction' | 'on_start',
                },
              }))
            }
            className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
          >
            <option value="after_interaction">Start when visitor clicks &ldquo;Open with Music&rdquo; (Recommended)</option>
            <option value="on_start">Start automatically after the intro completes</option>
          </select>
        </div>
      </div>

      {/* Quick Voice Recorder & Video Message Drop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F5EBDD]">
            <Mic className="h-4 w-4 text-[#D9A5AE]" />
            <span>Voice Note Recorder</span>
          </div>
          <p className="text-xs text-[#F5EBDD]/65">
            Record a heartfelt birthday voice message directly in your browser and save it straight to your soundtrack or personal tributes.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startOrStopVoiceRecorder('track')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
                recordingMode === 'track'
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#713F50] text-[#F5EBDD] hover:bg-[#844B5F]'
              }`}
            >
              {recordingMode === 'track' ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              <span>{recordingMode === 'track' ? 'Stop & Save Track' : 'Record to Soundtrack'}</span>
            </button>
            <button
              type="button"
              onClick={() => void startOrStopVoiceRecorder('tribute')}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 px-3.5 py-2 text-xs font-medium ${
                recordingMode === 'tribute'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-[#1E191E] text-[#F5EBDD] hover:bg-white/10'
              }`}
            >
              {recordingMode === 'tribute' ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-[#C5A46D]" />}
              <span>{recordingMode === 'tribute' ? 'Stop & Save Tribute' : 'Record to Tributes'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F5EBDD]">
            <Video className="h-4 w-4 text-[#C5A46D]" />
            <span>Quick Video Greeting Upload</span>
          </div>
          <p className="text-xs text-[#F5EBDD]/65">
            Upload a birthday video message from friends or family to immediately publish it inside Chapter VII · Personal Tributes.
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]">
            <Upload className="h-3.5 w-3.5" />
            <span>
              {uploadingField === 'quick-video-msg' ? 'Uploading Video...' : 'Upload Video Tribute'}
            </span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const url = await onUploadFile(file, 'quick-video-msg');
                if (!url) return;
                onChange((prev) => ({
                  ...prev,
                  messages: [
                    ...prev.messages,
                    {
                      id: `msg-vid-${Date.now()}`,
                      type: 'video',
                      category: 'family',
                      sender: { en: 'Video Greeting', ar: 'تهنئة مصورة' },
                      relation: { en: 'Special Video', ar: 'فيديو خاص' },
                      title: { en: file.name.replace(/\.[^.]+$/, ''), ar: 'رسالة فيديو خاصة' },
                      body: { en: 'Watch this recorded video wish.', ar: 'شاهد هذه التهنئة المصورة الخاصة.' },
                      mediaUrl: url,
                      date: new Date().toISOString().slice(0, 10),
                    },
                  ],
                }));
              }}
            />
          </label>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-4">
        {draft.music.tracks.map((track, idx) => (
          <div
            key={track.id}
            className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C5A46D]/15 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-[#C5A46D]">
                  Track #{idx + 1} · {track.title.en || 'Untitled'}
                </span>
                {draft.music.defaultTrackId === track.id && (
                  <span className="rounded bg-[#713F50] px-2 py-0.5 text-[10px] font-medium text-[#F5EBDD]">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {track.sourceType === 'url' && track.url && (
                  <button
                    type="button"
                    onClick={() => togglePreviewAudio(track.url!)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#C5A46D]/35 px-2.5 py-1 text-[11px] text-[#C5A46D] hover:bg-white/5"
                  >
                    {previewPlayingUrl === track.url ? (
                      <>
                        <Pause className="h-3 w-3" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" /> Preview
                      </>
                    )}
                  </button>
                )}
                {draft.music.tracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => {
                        const remaining = prev.music.tracks.filter((t) => t.id !== track.id);
                        return {
                          ...prev,
                          music: {
                            ...prev.music,
                            tracks: remaining,
                            defaultTrackId:
                              prev.music.defaultTrackId === track.id
                                ? remaining[0]?.id || ''
                                : prev.music.defaultTrackId,
                          },
                        };
                      })
                    }
                    className="rounded-md border border-rose-500/30 p-1.5 text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-[#C5A46D] mb-1">Source Type</label>
                <select
                  value={track.sourceType}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      music: {
                        ...prev.music,
                        tracks: prev.music.tracks.map((t) =>
                          t.id === track.id
                            ? {
                                ...t,
                                sourceType: e.target.value as 'synth' | 'url',
                                preset: e.target.value === 'synth' ? t.preset || 'nocturne' : undefined,
                              }
                            : t,
                        ),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                >
                  <option value="url">Audio File / URL (MP3, WAV, OGG, M4A)</option>
                  <option value="synth">Built-in Ambient Synth</option>
                </select>
              </div>

              {track.sourceType === 'synth' ? (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#C5A46D] mb-1">Synth Preset</label>
                  <select
                    value={track.preset || 'nocturne'}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        music: {
                          ...prev.music,
                          tracks: prev.music.tracks.map((t) =>
                            t.id === track.id
                              ? { ...t, preset: e.target.value as AudioTrack['preset'] }
                              : t,
                          ),
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-[#C5A46D]/30 bg-[#1E191E] px-3 py-2 text-xs text-[#F5EBDD]"
                  >
                    <option value="nocturne">Midnight Velvet Nocturne</option>
                    <option value="waltz">Champagne Lantern Waltz</option>
                    <option value="celesta">Rosewater Dawn</option>
                  </select>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <MediaPickerUpload
                    label="Audio File or URL"
                    value={track.url || ''}
                    onChange={(url) =>
                      onChange((prev) => ({
                        ...prev,
                        music: {
                          ...prev.music,
                          tracks: prev.music.tracks.map((t) => (t.id === track.id ? { ...t, url } : t)),
                        },
                      }))
                    }
                    accept="audio/*"
                    fieldKey={`trk-${track.id}`}
                    uploadingField={uploadingField}
                    onUploadFile={onUploadFile}
                    mediaLibrary={mediaLibrary}
                    onRefreshLibrary={onRefreshLibrary}
                  />
                </div>
              )}
            </div>

            <LocalizedInputs
              label="Track Title"
              value={track.title}
              onChange={(title) =>
                onChange((prev) => ({
                  ...prev,
                  music: {
                    ...prev.music,
                    tracks: prev.music.tracks.map((t) => (t.id === track.id ? { ...t, title } : t)),
                  },
                }))
              }
            />
            <LocalizedInputs
              label="Artist / Composer"
              value={track.artist}
              onChange={(artist) =>
                onChange((prev) => ({
                  ...prev,
                  music: {
                    ...prev.music,
                    tracks: prev.music.tracks.map((t) => (t.id === track.id ? { ...t, artist } : t)),
                  },
                }))
              }
            />
            <LocalizedInputs
              label="Short Description / Mood Note"
              value={track.description || { en: '', ar: '' }}
              onChange={(description) =>
                onChange((prev) => ({
                  ...prev,
                  music: {
                    ...prev.music,
                    tracks: prev.music.tracks.map((t) =>
                      t.id === track.id ? { ...t, description } : t,
                    ),
                  },
                }))
              }
            />
          </div>
        ))}
      </div>

      {/* Quick Memory & Timeline Audio Assignment Overview */}
      {urlTracks.length > 0 && (draft.memories.length > 0 || (draft.timeline || []).length > 0) && (
        <div className="rounded-2xl border border-[#C5A46D]/25 bg-[#292329] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#F5EBDD]">Quick Song Assignment to Memories</h3>
          <p className="text-xs text-[#F5EBDD]/65">
            Attach an uploaded song to any memory card so visitors can play it while viewing that photograph.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {draft.memories.map((mem) => (
              <div
                key={mem.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#C5A46D]/20 bg-[#1E191E] px-3 py-2"
              >
                <span className="truncate text-xs text-[#F5EBDD]/85">{mem.title.en || mem.id}</span>
                <select
                  value={mem.audioUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    const found = urlTracks.find((t) => t.url === url);
                    onChange((prev) => ({
                      ...prev,
                      memories: prev.memories.map((m) =>
                        m.id === mem.id
                          ? { ...m, audioUrl: url || undefined, audioTitle: found?.title }
                          : m,
                      ),
                    }));
                  }}
                  className="max-w-[170px] rounded border border-[#C5A46D]/25 bg-[#292329] px-2 py-1 text-[11px] text-[#F5EBDD]"
                >
                  <option value="">No attached song</option>
                  {urlTracks.map((t) => (
                    <option key={t.id} value={t.url}>
                      {t.title.en || t.title.ar}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
