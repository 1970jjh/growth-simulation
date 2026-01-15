// 기본 타입 정의

// 세션 상태
export type SessionStatus = 'active' | 'paused' | 'ended';

// 게임 단계
export enum GamePhase {
  WaitingToStart = 'WaitingToStart',
  Idle = 'Idle',
  Rolling = 'Rolling',
  Moving = 'Moving',
  Decision = 'Decision',
  Result = 'Result',
  Paused = 'Paused'
}

// 리소스 상태
export interface ResourceState {
  [key: string]: number;
}

// 플레이어
export interface Player {
  id: string;
  name: string;
}

// 팀
export interface Team {
  id: string;
  name: string;
  color: string;
  position: number;
  resources: ResourceState;
  members: Player[];
  currentMemberIndex: number;
  history: TurnRecord[];
}

// 턴 기록
export interface TurnRecord {
  turn: number;
  cardId?: string;
  cardTitle?: string;
  position?: number;
  choiceId?: string;
  reasoning?: string;
  resourceChanges?: Partial<ResourceState>;
  timestamp: number;
}

// 세션
export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  accessCode: string;
  createdAt: number;
  updatedAt?: number;
  teams: Team[];
  settings?: SessionSettings;
}

// 세션 설정
export interface SessionSettings {
  maxTeams: number;
  turnTimeLimit: number;
  [key: string]: any;
}

// 게임 상태 (Firebase 동기화용)
export interface GameState {
  sessionId: string;
  phase: GamePhase | string;
  currentTeamIndex: number;
  currentTurn: number;
  diceValue: [number, number];
  currentCard: any | null;
  selectedChoice: { id: string; text: string } | null;
  reasoning: string;
  aiResult: any | null;
  isSubmitted: boolean;
  isAiProcessing: boolean;
  isGameStarted?: boolean;
  gameLogs: string[];
  lastUpdated: number;
}

// 카드 선택지
export interface Choice {
  id: string;
  text: string;
  effects?: Partial<ResourceState>;
}

// 게임 카드
export interface GameCard {
  id: string;
  type: string;
  title: string;
  situation: string;
  choices: Choice[];
  learningPoint?: string;
  competency?: string;
}

// 팀 색상
export const TeamColors = {
  Red: '#EF4444',
  Blue: '#3B82F6',
  Green: '#22C55E',
  Yellow: '#EAB308',
  Purple: '#A855F7',
  Pink: '#EC4899',
  Orange: '#F97316',
  Cyan: '#06B6D4'
} as const;

export type TeamColor = keyof typeof TeamColors;
