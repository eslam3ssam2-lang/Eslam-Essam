import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, HelpCircle, Puzzle, RotateCw, Shuffle, Sparkles, XCircle } from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { pickChapterCopy, pickText, UI_STRINGS } from '../i18n/translations.ts';
import type { BirthdayEdition, Language } from '../types/birthday.ts';
import { triggerCelebrationBurst } from './CelebrationCanvas.tsx';

type GameTab = 'quiz' | 'guess' | 'puzzle' | 'wheel';

function BirthdayQuiz({ edition, lang }: { edition: BirthdayEdition; lang: Language }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const { playChime, playFanfare } = useAudio();
  const t = UI_STRINGS[lang].games;

  const questions = edition.quiz;
  const current = questions[idx];

  const handleSelect = (optIdx: number) => {
    if (selected !== null || !current) return;
    setSelected(optIdx);
    if (optIdx === current.correctIndex) {
      setScore((s) => s + 1);
      playChime();
    }
  };

  const handleNext = () => {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      triggerCelebrationBurst('confetti');
      playFanfare();
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setIdx(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  if (!questions.length) return null;

  if (finished) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-8 text-center text-[#F5EBDD]">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#C5A46D]" />
        <p className="text-xs text-[#C5A46D]">{t.quizScoreTitle}</p>
        <p className="mt-2 font-display text-5xl font-semibold text-[#F5EBDD] tabular-nums">
          {score} / {questions.length}
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-6 rounded-lg bg-[#C5A46D] px-6 py-3 text-sm font-semibold text-[#292329] hover:bg-[#D4B47F]"
        >
          {t.quizRestart}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-6 sm:p-8 text-[#F5EBDD]">
      <div className="flex items-center justify-between text-xs text-[#C5A46D] tabular-nums border-b border-[#C5A46D]/20 pb-3">
        <span>
          {t.quizQuestionOf} {idx + 1} / {questions.length}
        </span>
        <span>{score} pts</span>
      </div>

      <h3 className="mt-5 font-display text-2xl font-semibold text-[#F5EBDD] sm:text-3xl">
        {pickText(current.question, lang)}
      </h3>

      <div className="mt-6 space-y-3">
        {current.options.map((opt, optIdx) => {
          const isPicked = selected === optIdx;
          const isCorrect = optIdx === current.correctIndex;
          const showResult = selected !== null;

          let styleClass =
            'border-[#C5A46D]/25 bg-white/5 text-[#F5EBDD] hover:bg-[#713F50]/45';
          if (showResult && isCorrect) {
            styleClass = 'border-[#C5A46D] bg-[#713F50] text-[#F5EBDD]';
          } else if (showResult && isPicked && !isCorrect) {
            styleClass = 'border-[#D9A5AE] bg-[#D9A5AE]/15 text-[#F5EBDD]';
          }

          return (
            <button
              key={optIdx}
              type="button"
              onClick={() => handleSelect(optIdx)}
              disabled={showResult}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-start text-sm transition-colors min-h-[48px] ${styleClass}`}
            >
              <span>{pickText(opt, lang)}</span>
              {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 text-[#C5A46D] shrink-0" />}
              {showResult && isPicked && !isCorrect && <XCircle className="h-4 w-4 text-[#D9A5AE] shrink-0" />}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#C5A46D]/20 pt-4">
          <div className="text-sm text-[#F5EBDD]/85">
            <span className="font-semibold text-[#C5A46D]">
              {selected === current.correctIndex ? t.quizCorrect : t.quizIncorrect}{' '}
            </span>
            <span>{pickText(current.explanation, lang)}</span>
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-[#C5A46D] px-5 py-2.5 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F] shrink-0"
          >
            {t.quizNext}
          </button>
        </div>
      )}
    </div>
  );
}

function MemoryGuessGame({ edition, lang }: { edition: BirthdayEdition; lang: Language }) {
  const [idx, setIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { playChime } = useAudio();
  const t = UI_STRINGS[lang].games;

  const items = edition.memoryGuesses;
  const item = items[idx];

  if (!item) return null;

  const handleReveal = () => {
    setRevealed(true);
    playChime();
  };

  const handleNext = () => {
    setIdx((i) => (i + 1) % items.length);
    setShowHint(false);
    setRevealed(false);
  };

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-6 sm:p-8 text-[#F5EBDD]">
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
        <div className="md:col-span-6 overflow-hidden rounded-xl border border-[#C5A46D]/30 bg-[#292329]">
          <img
            src={item.imageUrl}
            alt={pickText(item.clue, lang)}
            referrerPolicy="no-referrer"
            className={`aspect-[4/3] w-full object-cover transition-all duration-500 ${
              revealed ? 'blur-0 scale-100' : 'blur-[5px] scale-105'
            }`}
          />
        </div>

        <div className="md:col-span-6 space-y-4">
          <p className="text-xs text-[#C5A46D] tabular-nums">
            {idx + 1} / {items.length} · {pickText(item.clue, lang)}
          </p>
          <h3 className="font-display text-2xl font-semibold text-[#F5EBDD]">
            {pickText(item.question, lang)}
          </h3>

          {showHint && (
            <p className="rounded-lg border border-[#C5A46D]/25 bg-white/5 p-3 text-xs text-[#D9A5AE]">
              {pickText(item.hint, lang)}
            </p>
          )}

          {revealed && (
            <div className="rounded-lg border border-[#C5A46D]/45 bg-[#713F50]/55 p-4">
              <p className="font-display text-xl text-[#F5EBDD]">{pickText(item.answer, lang)}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-2">
            {!revealed && (
              <>
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 px-4 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-white/10"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>{t.guessShowHint}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReveal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A46D] px-4 py-2 text-xs font-semibold text-[#292329] hover:bg-[#D4B47F]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{t.guessReveal}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#713F50] px-4 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F]"
            >
              <span>{t.guessNext}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createShuffledTiles(): number[] {
  const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.every((v, i) => v === i)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

function PhotoPuzzleGame({ edition, lang }: { edition: BirthdayEdition; lang: Language }) {
  const [tiles, setTiles] = useState<number[]>(() => createShuffledTiles());
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const { playChime, playFanfare } = useAudio();
  const t = UI_STRINGS[lang].games;

  const isSolved = tiles.every((v, idx) => v === idx);

  const handleTileClick = (pos: number) => {
    if (isSolved) return;
    if (selectedTile === null) {
      setSelectedTile(pos);
      return;
    }
    if (selectedTile === pos) {
      setSelectedTile(null);
      return;
    }
    const next = [...tiles];
    [next[selectedTile], next[pos]] = [next[pos], next[selectedTile]];
    setTiles(next);
    setSelectedTile(null);
    setMoves((m) => m + 1);
    playChime();

    if (next.every((v, i) => v === i)) {
      triggerCelebrationBurst('confetti');
      playFanfare();
    }
  };

  const shuffle = () => {
    setTiles(createShuffledTiles());
    setSelectedTile(null);
    setMoves(0);
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-6 sm:p-8 text-[#F5EBDD]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#C5A46D]">
          <Puzzle className="h-4 w-4" />
          <span>{t.puzzleSelectHint}</span>
        </div>
        <span className="text-xs font-medium text-[#F5EBDD] tabular-nums">
          {t.puzzleMoves}: {moves}
        </span>
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#C5A46D]/35 bg-[#292329]">
        {previewing ? (
          <img
            src={edition.puzzleImageUrl}
            alt="Puzzle preview"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 bg-[#292329]">
            {tiles.map((pieceIndex, pos) => {
              const row = Math.floor(pieceIndex / 3);
              const col = pieceIndex % 3;
              const isSelected = selectedTile === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => handleTileClick(pos)}
                  aria-label={`Tile ${pos + 1}`}
                  style={{
                    backgroundImage: `url(${edition.puzzleImageUrl})`,
                    backgroundSize: '300% 300%',
                    backgroundPosition: `${col * 50}% ${row * 50}%`,
                  }}
                  className={`relative h-full w-full transition-transform duration-150 ${
                    isSelected ? 'ring-2 ring-[#C5A46D] scale-[0.96] z-10' : 'hover:opacity-90'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#713F50] px-4 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-[#844B5F]"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>{t.puzzleShuffle}</span>
          </button>

          <button
            type="button"
            onPointerDown={() => setPreviewing(true)}
            onPointerUp={() => setPreviewing(false)}
            onPointerLeave={() => setPreviewing(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A46D]/35 px-4 py-2 text-xs font-medium text-[#F5EBDD] hover:bg-white/10"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{t.puzzlePreview}</span>
          </button>
        </div>

        {isSolved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C5A46D]">
            <Sparkles className="h-4 w-4" />
            <span>{t.puzzleSolved}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function LuckyWheelGame({ edition, lang }: { edition: BirthdayEdition; lang: Language }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const { playWheelTick, playFanfare } = useAudio();
  const t = UI_STRINGS[lang].games;

  const options = edition.wheelOptions;
  const count = options.length || 1;
  const sliceDeg = 360 / count;

  useEffect(() => {
    return () => {
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    };
  }, []);

  const spin = () => {
    if (spinning || options.length === 0) return;
    setSpinning(true);
    setWinnerIdx(null);

    const chosen = Math.floor(Math.random() * count);
    // Pointer is at top (0 deg). Wedge i spans [i*sliceDeg, (i+1)*sliceDeg] clockwise from top.
    const targetMod = 360 - (chosen * sliceDeg + sliceDeg / 2);
    const currentMod = ((rotation % 360) + 360) % 360;
    const deltaMod = (targetMod - currentMod + 360) % 360;
    const nextRotation = rotation + 360 * 5 + deltaMod;

    setRotation(nextRotation);

    tickTimerRef.current = window.setInterval(() => {
      playWheelTick();
    }, 180);

    window.setTimeout(() => {
      if (tickTimerRef.current) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      setSpinning(false);
      setWinnerIdx(chosen);
      triggerCelebrationBurst('confetti');
      playFanfare();
    }, 4200);
  };

  const describeArc = (idx: number) => {
    const startAngle = (idx * sliceDeg - 90) * (Math.PI / 180);
    const endAngle = ((idx + 1) * sliceDeg - 90) * (Math.PI / 180);
    const r = 140;
    const cx = 150;
    const cy = 150;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const winner = winnerIdx !== null ? options[winnerIdx] : null;

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-[#C5A46D]/35 bg-[#1E191E] p-6 sm:p-8 text-[#F5EBDD]">
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
        <div className="relative flex flex-col items-center md:col-span-6">
          {/* Top Pointer */}
          <div
            aria-hidden="true"
            className="z-20 -mb-3 h-0 w-0 border-x-[10px] border-t-[18px] border-x-transparent border-t-[#C5A46D] drop-shadow"
          />

          <svg
            viewBox="0 0 300 300"
            className="h-72 w-72 sm:h-80 sm:w-80 drop-shadow-2xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4.2s cubic-bezier(0.16, 1, 0.25, 1)' : 'none',
            }}
          >
            <circle cx="150" cy="150" r="146" fill="#292329" stroke="#C5A46D" strokeWidth="4" />
            {options.map((opt, idx) => {
              const midAngle = (idx * sliceDeg + sliceDeg / 2 - 90) * (Math.PI / 180);
              const tx = 150 + 88 * Math.cos(midAngle);
              const ty = 150 + 88 * Math.sin(midAngle);
              const textRot = idx * sliceDeg + sliceDeg / 2;
              return (
                <g key={opt.id}>
                  <path d={describeArc(idx)} fill={opt.color} stroke="#292329" strokeWidth="1.5" />
                  <text
                    x={tx}
                    y={ty}
                    fill="#F5EBDD"
                    fontSize="10.5"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRot}, ${tx}, ${ty})`}
                  >
                    {pickText(opt.label, lang).slice(0, 16)}
                  </text>
                </g>
              );
            })}
            <circle cx="150" cy="150" r="20" fill="#C5A46D" stroke="#292329" strokeWidth="3" />
          </svg>
        </div>

        <div className="md:col-span-6 space-y-5 text-center md:text-start">
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C5A46D] px-6 py-3.5 text-sm font-semibold text-[#292329] hover:bg-[#D4B47F] disabled:opacity-60 transition-colors min-h-[44px]"
          >
            <RotateCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
            <span>{spinning ? t.wheelSpinning : t.wheelSpin}</span>
          </button>

          {winner && (
            <div className="rounded-xl border border-[#C5A46D]/40 bg-[#292329] p-5">
              <p className="text-xs font-medium text-[#C5A46D]">{t.wheelResultTitle}</p>
              <h4 className="mt-1 font-display text-2xl font-semibold text-[#F5EBDD]">
                {pickText(winner.label, lang)}
              </h4>
              <p className="mt-2 text-sm text-[#F5EBDD]/85">{pickText(winner.message, lang)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GamesHub({ edition, lang }: { edition: BirthdayEdition; lang: Language }) {
  const [activeTab, setActiveTab] = useState<GameTab>('quiz');
  const t = UI_STRINGS[lang].games;
  const copy = pickChapterCopy(
    edition.chapterCopy?.games,
    { kicker: t.kicker, title: t.title, subtitle: t.subtitle },
    lang,
  );

  return (
    <section
      id="section-games"
      className="bg-[#F5EBDD] text-[#292329] py-16 sm:py-24 border-b border-[#C5A46D]/30"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium text-[#713F50] tracking-wide">{copy.kicker}</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-[#292329] sm:text-5xl text-balance">
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[#292329]/80 sm:text-base">{copy.subtitle}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl bg-[#292329]/8 p-1.5">
            {(
              [
                ['quiz', t.tabQuiz],
                ['guess', t.tabGuess],
                ['puzzle', t.tabPuzzle],
                ['wheel', t.tabWheel],
              ] as [GameTab, string][]
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tabKey
                    ? 'bg-[#713F50] text-[#F5EBDD] shadow-sm'
                    : 'text-[#292329]/75 hover:text-[#292329]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {activeTab === 'quiz' && <BirthdayQuiz edition={edition} lang={lang} />}
          {activeTab === 'guess' && <MemoryGuessGame edition={edition} lang={lang} />}
          {activeTab === 'puzzle' && <PhotoPuzzleGame edition={edition} lang={lang} />}
          {activeTab === 'wheel' && <LuckyWheelGame edition={edition} lang={lang} />}
        </div>
      </div>
    </section>
  );
}
