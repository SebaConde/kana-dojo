'use client';
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { kana } from '@/features/Kana/data/kana';
import useKanaStore from '@/features/Kana/store/useKanaStore';
import { CircleCheck, CircleX, CircleArrowRight } from 'lucide-react';
import { Random } from 'random-js';
import { useCorrect, useError, useClick } from '@/shared/hooks/useAudio';
import GameIntel from '@/shared/components/Game/GameIntel';
import { getGlobalAdaptiveSelector } from '@/shared/lib/adaptiveSelection';
import Stars from '@/shared/components/Game/Stars';
import { useCrazyModeTrigger } from '@/features/CrazyMode/hooks/useCrazyModeTrigger';
import useStatsStore from '@/features/Progress/store/useStatsStore';
import { useShallow } from 'zustand/react/shallow';
import useStats from '@/shared/hooks/useStats';
import { ActionButton } from '@/shared/components/ui/ActionButton';

const random = new Random();
const adaptiveSelector = getGlobalAdaptiveSelector();

// Duolingo-like spring animation config
const springConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8
};

// Helper function to determine if a kana character is hiragana or katakana
const isHiragana = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309f;
};

const isKatakana = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code >= 0x30a0 && code <= 0x30ff;
};

// Tile styles shared between active and blank tiles
const tileBaseStyles =
  'relative flex items-center justify-center rounded-3xl px-6 sm:px-8 py-3 text-2xl  sm:text-3xl border-b-8';

interface TileProps {
  id: string;
  char: string;
  onClick: () => void;
  isDisabled?: boolean;
}

// Active tile - uses layoutId for smooth position animations
const ActiveTile = memo(({ id, char, onClick, isDisabled }: TileProps) => {
  return (
    <motion.button
      layoutId={id}
      layout='position'
      type='button'
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        tileBaseStyles,
        'cursor-pointer transition-colors',
        // Match ActionButton's smooth press animation: translate down + add margin to prevent layout shift
        'active:mb-[8px] active:translate-y-[8px] active:border-b-0',
        'border-[var(--secondary-color-accent)] bg-[var(--secondary-color)] text-[var(--background-color)]',
        isDisabled && 'cursor-not-allowed opacity-50'
      )}
      transition={springConfig}
    >
      {char}
    </motion.button>
  );
});

ActiveTile.displayName = 'ActiveTile';

// Blank placeholder - no layoutId, just takes up space
const BlankTile = memo(({ char }: { char: string }) => {
  return (
    <div
      className={clsx(
        tileBaseStyles,
        'border-transparent bg-[var(--border-color)]/30',
        'select-none'
      )}
    >
      <span className='opacity-0'>{char}</span>
    </div>
  );
});

BlankTile.displayName = 'BlankTile';

// Bottom bar states
type BottomBarState = 'check' | 'correct' | 'wrong';

interface WordBuildingGameProps {
  isHidden: boolean;
  isReverse: boolean;
  wordLength: number;
  onCorrect: (chars: string[]) => void;
  onWrong: () => void;
}

const WordBuildingGame = ({
  isHidden,
  isReverse,
  wordLength,
  onCorrect,
  onWrong
}: WordBuildingGameProps) => {
  const { playCorrect } = useCorrect();
  const { playErrorTwice } = useError();
  const { playClick } = useClick();
  const { trigger: triggerCrazyMode } = useCrazyModeTrigger();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    score,
    setScore,
    incrementHiraganaCorrect,
    incrementKatakanaCorrect,
    incrementWrongStreak,
    resetWrongStreak
  } = useStatsStore(
    useShallow(state => ({
      score: state.score,
      setScore: state.setScore,
      incrementHiraganaCorrect: state.incrementHiraganaCorrect,
      incrementKatakanaCorrect: state.incrementKatakanaCorrect,
      incrementWrongStreak: state.incrementWrongStreak,
      resetWrongStreak: state.resetWrongStreak
    }))
  );

  const {
    incrementCorrectAnswers,
    incrementWrongAnswers,
    addCharacterToHistory,
    incrementCharacterScore
  } = useStats();

  const kanaGroupIndices = useKanaStore(state => state.kanaGroupIndices);

  // Get all available kana and romaji from selected groups
  const { selectedKana, selectedRomaji, kanaToRomaji, romajiToKana } =
    useMemo(() => {
      const kanaChars = kanaGroupIndices.map(i => kana[i].kana).flat();
      const romajiChars = kanaGroupIndices.map(i => kana[i].romanji).flat();

      const k2r: Record<string, string> = {};
      const r2k: Record<string, string> = {};

      kanaChars.forEach((k, i) => {
        k2r[k] = romajiChars[i];
        r2k[romajiChars[i]] = k;
      });

      return {
        selectedKana: kanaChars,
        selectedRomaji: romajiChars,
        kanaToRomaji: k2r,
        romajiToKana: r2k
      };
    }, [kanaGroupIndices]);

  const [bottomBarState, setBottomBarState] = useState<BottomBarState>('check');

  // Generate a word (array of characters) and distractors
  const generateWord = useCallback(() => {
    const sourceChars = isReverse ? selectedRomaji : selectedKana;
    if (sourceChars.length < wordLength) {
      return { wordChars: [], answerChars: [], allTiles: [] };
    }

    const wordChars: string[] = [];
    const usedChars = new Set<string>();

    for (let i = 0; i < wordLength; i++) {
      const available = sourceChars.filter(c => !usedChars.has(c));
      if (available.length === 0) break;

      const selected = adaptiveSelector.selectWeightedCharacter(available);
      wordChars.push(selected);
      usedChars.add(selected);
      adaptiveSelector.markCharacterSeen(selected);
    }

    const answerChars = isReverse
      ? wordChars.map(r => romajiToKana[r])
      : wordChars.map(k => kanaToRomaji[k]);

    const distractorCount = Math.min(3, sourceChars.length - wordLength);
    const distractorSource = isReverse ? selectedKana : selectedRomaji;
    const distractors: string[] = [];
    const usedAnswers = new Set(answerChars);

    for (let i = 0; i < distractorCount; i++) {
      const available = distractorSource.filter(
        c => !usedAnswers.has(c) && !distractors.includes(c)
      );
      if (available.length === 0) break;
      const selected = available[random.integer(0, available.length - 1)];
      distractors.push(selected);
    }

    const allTiles = [...answerChars, ...distractors].sort(
      () => random.real(0, 1) - 0.5
    );

    return { wordChars, answerChars, allTiles };
  }, [
    isReverse,
    selectedKana,
    selectedRomaji,
    wordLength,
    kanaToRomaji,
    romajiToKana
  ]);

  const [wordData, setWordData] = useState(() => generateWord());
  const [placedTiles, setPlacedTiles] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const resetGame = useCallback(() => {
    const newWord = generateWord();
    setWordData(newWord);
    setPlacedTiles([]);
    setIsChecking(false);
    setBottomBarState('check');
  }, [generateWord]);

  useEffect(() => {
    resetGame();
  }, [isReverse, wordLength, resetGame]);

  // Keyboard shortcut for Enter/Space to trigger button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'Enter') ||
        event.code === 'Space' ||
        event.key === ' '
      ) {
        buttonRef.current?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Check button
  const handleCheck = useCallback(() => {
    if (placedTiles.length === 0) return;

    playClick();
    setIsChecking(true);

    const isCorrect =
      placedTiles.length === wordData.answerChars.length &&
      placedTiles.every((tile, i) => tile === wordData.answerChars[i]);

    if (isCorrect) {
      playCorrect();
      triggerCrazyMode();
      resetWrongStreak();

      wordData.wordChars.forEach(char => {
        addCharacterToHistory(char);
        incrementCharacterScore(char, 'correct');
        adaptiveSelector.updateCharacterWeight(char, true);

        if (isHiragana(char)) {
          incrementHiraganaCorrect();
        } else if (isKatakana(char)) {
          incrementKatakanaCorrect();
        }
      });

      incrementCorrectAnswers();
      setScore(score + wordData.wordChars.length);
      setBottomBarState('correct');
    } else {
      playErrorTwice();
      triggerCrazyMode();
      incrementWrongStreak();
      incrementWrongAnswers();

      wordData.wordChars.forEach(char => {
        incrementCharacterScore(char, 'wrong');
        adaptiveSelector.updateCharacterWeight(char, false);
      });

      if (score - 1 >= 0) {
        setScore(score - 1);
      }

      setBottomBarState('wrong');

      onWrong();
    }
  }, [
    placedTiles,
    wordData,
    playClick,
    playCorrect,
    playErrorTwice,
    triggerCrazyMode,
    resetWrongStreak,
    incrementWrongStreak,
    addCharacterToHistory,
    incrementCharacterScore,
    incrementHiraganaCorrect,
    incrementKatakanaCorrect,
    incrementCorrectAnswers,
    incrementWrongAnswers,
    score,
    setScore,
    onWrong
  ]);

  // Handle Continue button
  const handleContinue = useCallback(() => {
    playClick();
    if (bottomBarState === 'correct') {
      onCorrect(wordData.wordChars);
    }
    resetGame();
  }, [playClick, bottomBarState, onCorrect, wordData.wordChars, resetGame]);

  // Handle tile click - add or remove
  const handleTileClick = useCallback(
    (char: string) => {
      if (isChecking) return;

      if (placedTiles.includes(char)) {
        setPlacedTiles(prev => prev.filter(c => c !== char));
      } else {
        setPlacedTiles(prev => [...prev, char]);
      }
    },
    [isChecking, placedTiles]
  );

  // Not enough characters for word building
  if (selectedKana.length < wordLength || wordData.wordChars.length === 0) {
    return null;
  }

  const canCheck = placedTiles.length > 0 && !isChecking;
  const showContinue =
    bottomBarState === 'correct' || bottomBarState === 'wrong';

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center gap-6 sm:w-4/5 sm:gap-10',
        isHidden && 'hidden'
      )}
    >
      <GameIntel gameMode='word-building' />

      {/* Word Display */}
      <div className='flex flex-row items-center gap-1'>
        <motion.p
          className='text-7xl sm:text-8xl'
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          key={wordData.wordChars.join('')}
        >
          {wordData.wordChars.join('')}
        </motion.p>
      </div>

      {/* Answer Row Area */}
      <div className='flex w-full flex-col items-center'>
        <div className='flex min-h-[5rem] w-full items-center border-b border-[var(--border-color)] px-2 pb-2 md:w-3/4 lg:w-2/3 xl:w-1/2'>
          <div className='flex flex-row flex-wrap justify-start gap-3'>
            {/* Render placed tiles in the answer row */}
            {placedTiles.map(char => (
              <ActiveTile
                key={`tile-${char}`}
                id={`tile-${char}`}
                char={char}
                onClick={() => handleTileClick(char)}
                isDisabled={isChecking}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Available Tiles - 2 rows on mobile, centered */}
      {(() => {
        // Split tiles into 2 rows for mobile (3 per row max)
        const tilesPerRow = 3;
        const topRowTiles = wordData.allTiles.slice(0, tilesPerRow);
        const bottomRowTiles = wordData.allTiles.slice(tilesPerRow);

        const renderTile = (char: string) => {
          const isPlaced = placedTiles.includes(char);

          return (
            <div key={`tile-slot-${char}`} className='relative'>
              {/* Blank tile is ALWAYS rendered underneath (z-0) */}
              <BlankTile char={char} />

              {/* Active tile overlays on top (z-10 + absolute) when NOT placed.
                  This ensures when it animates back here, the blank is already there. */}
              {!isPlaced && (
                <div className='absolute inset-0 z-10'>
                  <ActiveTile
                    id={`tile-${char}`}
                    char={char}
                    onClick={() => handleTileClick(char)}
                    isDisabled={isChecking}
                  />
                </div>
              )}
            </div>
          );
        };

        return (
          <div className='flex flex-col items-center gap-3 sm:gap-4'>
            <div className='flex flex-row justify-center gap-3 sm:gap-4'>
              {topRowTiles.map(renderTile)}
            </div>
            {bottomRowTiles.length > 0 && (
              <div className='flex flex-row justify-center gap-3 sm:gap-4'>
                {bottomRowTiles.map(renderTile)}
              </div>
            )}
          </div>
        );
      })()}

      <Stars />

      {/* Bottom Bar */}
      <div
        className={clsx(
          'w-[100vw]',
          'border-t-2 border-[var(--border-color)] bg-[var(--card-color)]',
          'absolute bottom-0 z-10 px-2 py-4 md:bottom-6 md:px-12 md:py-10',
          'flex flex-row items-center justify-center'
        )}
      >
        {/* Left Container: 50% width, aligned right */}
        <div className='flex w-1/2 items-center justify-end pr-3 md:pr-6'>
          <div
            className={clsx(
              'flex items-center gap-2 transition-all duration-500 sm:gap-3 md:gap-4',
              showContinue
                ? 'translate-x-0 opacity-100'
                : 'pointer-events-none -translate-x-4 opacity-0 sm:-translate-x-8'
            )}
          >
            {bottomBarState === 'correct' ? (
              <CircleCheck className='h-10 w-10 text-[var(--main-color)] sm:h-12 sm:w-12' />
            ) : (
              <CircleX className='h-10 w-10 text-[var(--secondary-color)] sm:h-12 sm:w-12' />
            )}
            <div className='flex flex-col'>
              <span
                className={clsx(
                  'text-lg font-bold sm:text-2xl',
                  bottomBarState === 'correct'
                    ? 'text-[var(--main-color)]'
                    : 'text-[var(--secondary-color)]'
                )}
              >
                {bottomBarState === 'correct'
                  ? 'Nicely done!'
                  : 'Correct solution:'}
              </span>
              <span className='text-sm font-medium text-[var(--secondary-color)]/60 sm:text-lg'>
                {wordData.answerChars.join('')}
              </span>
            </div>
          </div>
        </div>

        {/* Right Container: 50% width, aligned left */}
        <div className='flex w-1/2 items-center justify-start pl-3 md:pl-6'>
          <ActionButton
            ref={buttonRef}
            borderBottomThickness={12}
            borderRadius='3xl'
            className='w-auto min-w-[7rem] px-6 py-2.5 text-lg font-medium sm:min-w-[14rem] sm:px-16 sm:py-4 sm:text-2xl'
            onClick={showContinue ? handleContinue : handleCheck}
            disabled={!canCheck && !showContinue}
          >
            <span>{showContinue ? 'continue' : 'check'}</span>
          </ActionButton>
        </div>
      </div>

      {/* Spacer */}
      <div className='h-40' />
    </div>
  );
};

export default WordBuildingGame;
