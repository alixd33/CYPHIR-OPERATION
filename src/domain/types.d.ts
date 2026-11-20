/**
 * OPERATION: CIPHER v2.0 — Core Domain Type Definitions
 */

export type CampaignDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type ScreenId =
  | 'boot'
  | 'main_menu'
  | 'profile_select'
  | 'character_create'
  | 'main_lobby'
  | 'campaign_select'
  | 'difficulty_select'
  | 'hq'
  | 'briefing'
  | 'operation'
  | 'stage'
  | 'task'
  | 'solution'
  | 'evidence_board'
  | 'operation_results'
  | 'save_recovery'
  | 'campaign_progression';

export interface AccessibilitySettings {
  extraTime: boolean;
  highContrastMath: boolean;
  reducedMotion: boolean;
  audioEnabled: boolean;
  soundVolume: number;
}

export interface CharacterAppearance {
  appearanceIndex: number; // 0..3
  outfitIndex: number;     // 0..2
  codename: string;
}

export interface LearningHistoryEntry {
  questionId: string;
  chapter: number;
  topic: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  hintsUsed: number[];
  eliminatedCount: number;
  timeSpentSec: number;
  timestamp: string;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  appearance: CharacterAppearance;
  createdAt: string;
  updatedAt: string;
  learningHistory: LearningHistoryEntry[];
  totalCorrect: number;
  totalAttempted: number;
}

export type EvidenceCategory = 'confirmed_fact' | 'interpretation' | 'unverified_hypothesis';
export type EvidenceType = 'document' | 'photo' | 'log' | 'audio' | 'keycard';

export interface EvidenceRecord {
  id: string;
  name: string;
  type: EvidenceType;
  source: string;
  acquisitionStage: string;
  description: string;
  fullText: string;
  reliability: number; // 0..100
  provenance: string;
  relatedCharacters: string[];
  relatedLocations: string[];
  relatedEvents: string[];
  contradictsIds: string[];
  category: EvidenceCategory;
  isRedHerring?: boolean;
}

export interface HypothesisNode {
  id: string;
  title: string;
  summary: string;
  isUserCreated: boolean;
  isRedHerring?: boolean;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
}

export interface BoardPosition {
  x: number;
  y: number;
}

export interface BoardConnection {
  id: string;
  fromId: string;
  toId: string;
  relation: 'supports' | 'contradicts' | 'related';
  note?: string;
}

export interface EvidenceBoardState {
  placedIds: string[];
  positions: Record<string, BoardPosition>;
  connections: BoardConnection[];
  hypotheses: HypothesisNode[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  npcIndex: number;
  portraitIndex: number;
  attributes: {
    analysis: number;
    technical: number;
    communication: number;
    composure: number;
  };
  primarySpec: string;
  secondarySpecs: string[];
  fatigue: number;   // 0..100
  stress: number;    // 0..100
  available: boolean;
  assignedToStage: boolean;
}

export interface HelpActionLog {
  taskId: string;
  questionId: string;
  type: 'hint_1' | 'hint_2' | 'hint_3' | 'elim_1' | 'elim_2';
  costOC: number;
  timestamp: string;
}

export interface TaskAttemptState {
  taskId: string;
  questionId: string;
  selectedIndex: number | null;
  submitted: boolean;
  isCorrect: boolean | null;
  eliminatedIndices: number[];
  unlockedHints: number[]; // 1, 2, 3
  remainingSec: number;
  elapsedSec: number;
}

export interface GameState {
  version: string;
  profileId: string;
  campaignId: string;
  difficulty: CampaignDifficulty;
  currentChapter: number;
  currentOperation: number;
  currentStageIndex: number; // 0..3
  currentTaskIndex: number;  // 0..2
  stability: number;         // 0..100
  operationalCredits: number;
  temporalCredits: number;
  performanceScore: number;
  claimedRewardIds: string[];
  unlockedEvidenceIds: string[];
  completedStageIds: string[];
  completedOperationIds: string[];
  stageRetryCounts: Record<string, number>;
  activeTask: TaskAttemptState | null;
  helpLog: HelpActionLog[];
  team: TeamMember[];
  board: EvidenceBoardState;
  failureLevel: 'none' | 'minor' | 'serious' | 'critical';
  lastUpdated: string;
}

export interface SaveSlot {
  slotId: string;
  name: string;
  isAutoSave: boolean;
  isCheckpoint: boolean;
  savedAt: string;
  profileId: string;
  profileName: string;
  campaignTitle: string;
  stageLabel: string;
  checksum: string;
  state: GameState;
}
