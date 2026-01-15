// ============================================================
// 빙고 교육 게임 타입 정의
// ============================================================

// 세션 상태
export type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

// 게임 단계
export enum GamePhase {
  WaitingToStart = 'WaitingToStart',  // 게임 시작 대기
  SelectingCard = 'SelectingCard',     // 팀이 카드 선택 중
  AllTeamsAnswering = 'AllTeamsAnswering', // 모든 팀 동시 답변 중
  ShowingResults = 'ShowingResults',   // AI 평가 결과 표시 중
  RoundComplete = 'RoundComplete',     // 라운드 완료 (다음 팀 턴으로)
  GameEnded = 'GameEnded',             // 게임 종료
  Paused = 'Paused'                    // 일시정지
}

// 플레이어
export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

// 팀 색상 (눈에 잘 띄는 8가지)
export const TEAM_COLORS = [
  { name: 'Red', bg: '#EF4444', text: '#FFFFFF', light: '#FEE2E2' },
  { name: 'Blue', bg: '#3B82F6', text: '#FFFFFF', light: '#DBEAFE' },
  { name: 'Green', bg: '#22C55E', text: '#FFFFFF', light: '#DCFCE7' },
  { name: 'Yellow', bg: '#EAB308', text: '#000000', light: '#FEF9C3' },
  { name: 'Purple', bg: '#A855F7', text: '#FFFFFF', light: '#F3E8FF' },
  { name: 'Orange', bg: '#F97316', text: '#FFFFFF', light: '#FFEDD5' },
  { name: 'Pink', bg: '#EC4899', text: '#FFFFFF', light: '#FCE7F3' },
  { name: 'Cyan', bg: '#06B6D4', text: '#FFFFFF', light: '#CFFAFE' },
] as const;

export type TeamColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// 팀
export interface Team {
  id: string;
  name: string;
  colorIndex: TeamColorIndex;
  members: Player[];
  totalScore: number;           // 누적 점수
  bingoCount: number;           // 완성한 빙고 줄 수
  ownedCells: number[];         // 차지한 빙고 칸 인덱스들
}

// 카드 선택지
export interface Choice {
  id: string;
  text: string;
  score?: number; // 선택지 기본 점수 (100, 90, 80 등)
}

// 상황 카드
export interface GameCard {
  id: string;
  title: string;
  situation: string;
  choices: Choice[];
  learningPoint?: string;
}

// 빙고 칸 상태
export interface BingoCell {
  index: number;              // 0-24 (5x5)
  cardId: string;             // 해당 칸에 배정된 카드 ID
  ownerTeamId: string | null; // 차지한 팀 ID (null이면 미점령)
  isSelected: boolean;        // 현재 라운드에서 선택된 칸인지
  isCompleted: boolean;       // 이미 플레이 완료된 칸인지
}

// 팀별 답변
export interface TeamAnswer {
  teamId: string;
  teamName: string;
  choiceId: string;
  reasoning: string;
  submittedAt: number;
  aiScore?: number;
  aiFeedback?: string;
}

// 라운드 결과
export interface RoundResult {
  round: number;
  cellIndex: number;
  cardId: string;
  cardTitle: string;
  winnerTeamId: string;
  winnerTeamName: string;
  winnerScore: number;
  allAnswers: TeamAnswer[];
  timestamp: number;
}

// 빙고 라인 정보
export interface BingoLine {
  type: 'row' | 'column' | 'diagonal';
  index: number;              // row/column 번호 또는 diagonal(0: 좌상-우하, 1: 우상-좌하)
  cells: number[];            // 해당 라인의 셀 인덱스들
  completedByTeamId: string | null;  // 완성한 팀 ID
  completedAt: number | null;        // 완성 시간
}

// 게임 상태 (Firebase 실시간 동기화)
export interface GameState {
  sessionId: string;
  phase: GamePhase;
  currentTurnTeamIndex: number;      // 현재 카드 선택 차례인 팀 인덱스
  currentRound: number;              // 현재 라운드
  selectedCellIndex: number | null;  // 현재 선택된 빙고 칸
  currentCard: GameCard | null;      // 현재 표시 중인 카드
  teamAnswers: TeamAnswer[];         // 현재 라운드 팀 답변들
  isAiProcessing: boolean;           // AI 평가 중인지
  roundResults: RoundResult[];       // 전체 라운드 결과
  completedBingoLines: BingoLine[];  // 완성된 빙고 라인들
  lastUpdated: number;
}

// 세션 설정
export interface SessionSettings {
  bingoLinesToWin: number;    // 승리에 필요한 빙고 줄 수 (기본: 3)
  answerTimeLimit: number;    // 답변 제한 시간 (초, 기본: 120)
  maxTeams: number;           // 최대 팀 수 (기본: 8)
  isActive?: boolean;         // 세션 활성화 여부 (기본: true)
}

// 세션
export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  accessCode: string;
  createdAt: number;
  updatedAt?: number;
  settings: SessionSettings;
  teams: Team[];
  // 카드 관리
  allCards: GameCard[];       // 전체 카드 (31개)
  bingoCards: GameCard[];     // 빙고판에 배치된 카드 (25개)
  spareCards: GameCard[];     // 스페어 카드 (6개)
  bingoCells: BingoCell[];    // 빙고 칸 상태 (25개)
}

// AI 평가 요청
export interface AIEvaluationRequest {
  card: GameCard;
  teamAnswer: TeamAnswer;
}

// AI 평가 결과
export interface AIEvaluationResult {
  teamId: string;
  score: number;              // 0-100점
  feedback: string;
  evaluatedAt: number;
}

// 기본 설정값
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  bingoLinesToWin: 3,
  answerTimeLimit: 120,
  maxTeams: 8,
};

// 빙고 라인 정의 (5x5 기준)
export const BINGO_LINES: Omit<BingoLine, 'completedByTeamId' | 'completedAt'>[] = [
  // 가로 5줄
  { type: 'row', index: 0, cells: [0, 1, 2, 3, 4] },
  { type: 'row', index: 1, cells: [5, 6, 7, 8, 9] },
  { type: 'row', index: 2, cells: [10, 11, 12, 13, 14] },
  { type: 'row', index: 3, cells: [15, 16, 17, 18, 19] },
  { type: 'row', index: 4, cells: [20, 21, 22, 23, 24] },
  // 세로 5줄
  { type: 'column', index: 0, cells: [0, 5, 10, 15, 20] },
  { type: 'column', index: 1, cells: [1, 6, 11, 16, 21] },
  { type: 'column', index: 2, cells: [2, 7, 12, 17, 22] },
  { type: 'column', index: 3, cells: [3, 8, 13, 18, 23] },
  { type: 'column', index: 4, cells: [4, 9, 14, 19, 24] },
  // 대각선 2줄
  { type: 'diagonal', index: 0, cells: [0, 6, 12, 18, 24] },
  { type: 'diagonal', index: 1, cells: [4, 8, 12, 16, 20] },
];

// 유틸리티: 팀 색상 가져오기
export const getTeamColor = (colorIndex: TeamColorIndex) => TEAM_COLORS[colorIndex];

// 유틸리티: 랜덤 카드 셔플
export const shuffleCards = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
