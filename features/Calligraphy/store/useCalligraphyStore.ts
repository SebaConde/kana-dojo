import { create } from 'zustand';

export type BrushType = 'brush' | 'pen' | 'pencil';
export type KanaType = 'hiragana' | 'katakana';
export type LearningStage = 'stroke' | 'full' | 'word';

export interface IStrokeData {
  id: number;
  name: string;
  pathData: string;
  startX: number;
  startY: number;
}

export interface ICharacterData {
  character: string;
  romaji: string;
  strokes: IStrokeData[];
}

export interface IWordData {
  word: string;
  reading: string;
  meaning: string;
}

// NEW: Track stroke results for progress graph
export interface IStrokeResult {
  index: number;
  isCorrect: boolean;
  timestamp: number;
}

interface ICalligraphyState {
  completedHiragana: string[];
  completedKatakana: string[];

  // Kana type
  selectedKanaType: KanaType;
  setSelectedKanaType: (type: KanaType) => void;

  // Character
  selectedCharacter: ICharacterData | null;
  setSelectedCharacter: (character: ICharacterData | null) => void;

  // Brush
  selectedBrushType: BrushType;
  setSelectedBrushType: (brush: BrushType) => void;

  // Stage
  currentStage: LearningStage;
  setCurrentStage: (stage: LearningStage) => void;

  // Stroke progress
  currentStrokeIndex: number;
  setCurrentStrokeIndex: (index: number) => void;
  incrementStroke: () => void;
  resetStrokes: () => void;

  // Guide visibility
  showGuide: boolean;
  toggleGuide: () => void;
  setShowGuide: (show: boolean) => void;

  // Stats
  correctStrokes: number;
  missedStrokes: number;
  incrementCorrect: () => void;
  incrementMissed: () => void;
  resetStats: () => void;

  // NEW: Stroke results for progress graph
  strokeResults: IStrokeResult[];
  addStrokeResult: (isCorrect: boolean) => void;
  clearStrokeResults: () => void;

  // Completed characters
  completedCharacters: string[];
  addCompletedCharacter: (character: string) => void;
  clearCompletedCharacters: () => void;

  // Word practice
  currentWord: IWordData | null;
  setCurrentWord: (word: IWordData | null) => void;
  currentWordCharIndex: number;
  setCurrentWordCharIndex: (index: number) => void;
  incrementWordCharIndex: () => void;

  // UI States
  showCharacterSelector: boolean;
  setShowCharacterSelector: (show: boolean) => void;
  showHowToUse: boolean;
  setShowHowToUse: (show: boolean) => void;
  showWrongStroke: boolean;
  setShowWrongStroke: (show: boolean) => void;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;

  // Canvas state
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;

  // Active step for vertical bar navigation (0 = default, 1 = character, 2 = brush, 3 = practice)
  activeStep: number;
  setActiveStep: (step: number) => void;
}

const useCalligraphyStore = create<ICalligraphyState>(set => ({
  // Completed kana tracking
  completedHiragana: [],
  completedKatakana: [],

  // Kana type
  selectedKanaType: 'hiragana',
  setSelectedKanaType: type => set({ selectedKanaType: type }),

  // Character
  selectedCharacter: null,
  setSelectedCharacter: character =>
    set({
      selectedCharacter: character,
      currentStrokeIndex: 0,
      currentStage: 'stroke',
      strokeResults: []
    }),

  // Brush
  selectedBrushType: 'brush',
  setSelectedBrushType: brush => set({ selectedBrushType: brush }),

  // Stage
  currentStage: 'stroke',
  setCurrentStage: stage => set({ currentStage: stage }),

  // Stroke progress
  currentStrokeIndex: 0,
  setCurrentStrokeIndex: index => set({ currentStrokeIndex: index }),
  incrementStroke: () =>
    set(state => ({ currentStrokeIndex: state.currentStrokeIndex + 1 })),
  resetStrokes: () => set({ currentStrokeIndex: 0 }),

  // Guide
  showGuide: true,
  toggleGuide: () => set(state => ({ showGuide: !state.showGuide })),
  setShowGuide: show => set({ showGuide: show }),

  // Stats
  correctStrokes: 0,
  missedStrokes: 0,
  incrementCorrect: () =>
    set(state => ({ correctStrokes: state.correctStrokes + 1 })),
  incrementMissed: () =>
    set(state => ({ missedStrokes: state.missedStrokes + 1 })),
  resetStats: () => set({ correctStrokes: 0, missedStrokes: 0 }),

  // NEW: Stroke results for progress graph
  strokeResults: [],
  addStrokeResult: (isCorrect: boolean) =>
    set(state => ({
      strokeResults: [
        ...state.strokeResults,
        { index: state.strokeResults.length, isCorrect, timestamp: Date.now() }
      ]
    })),
  clearStrokeResults: () => set({ strokeResults: [] }),

  // Completed
  completedCharacters: [],
  addCompletedCharacter: character =>
    set(state => ({
      completedCharacters: state.completedCharacters.includes(character)
        ? state.completedCharacters
        : [...state.completedCharacters, character]
    })),
  clearCompletedCharacters: () => set({ completedCharacters: [] }),

  // Word
  currentWord: null,
  setCurrentWord: word => set({ currentWord: word, currentWordCharIndex: 0 }),
  currentWordCharIndex: 0,
  setCurrentWordCharIndex: index => set({ currentWordCharIndex: index }),
  incrementWordCharIndex: () =>
    set(state => ({ currentWordCharIndex: state.currentWordCharIndex + 1 })),

  // UI States
  showCharacterSelector: false,
  setShowCharacterSelector: show => set({ showCharacterSelector: show }),
  showHowToUse: false,
  setShowHowToUse: show => set({ showHowToUse: show }),
  showWrongStroke: false,
  setShowWrongStroke: show => set({ showWrongStroke: show }),
  showCelebration: false,
  setShowCelebration: show => set({ showCelebration: show }),

  // Canvas
  isDrawing: false,
  setIsDrawing: drawing => set({ isDrawing: drawing }),

  // Active step for vertical bar navigation
  activeStep: 0,
  setActiveStep: step => set({ activeStep: step })
}));

export default useCalligraphyStore;
