// Firestore 데이터베이스 서비스
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Session, Team, TurnRecord, GamePhase, SessionStatus } from '../types';

// 컬렉션 이름
const SESSIONS_COLLECTION = 'sessions';
const GAME_STATE_COLLECTION = 'gameState';

// ========================
// 세션(Session) 관련 함수
// ========================

// 새 세션 생성
export async function createSession(session: Session): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, session.id);
  await setDoc(sessionRef, {
    ...session,
    createdAt: serverTimestamp(),
  });
}

// 세션 가져오기
export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const snapshot = await getDoc(sessionRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt
    } as Session;
  }
  return null;
}

// 접근 코드로 세션 찾기
export async function getSessionByAccessCode(accessCode: string): Promise<Session | null> {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(sessionsRef, where('accessCode', '==', accessCode));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const data = snapshot.docs[0].data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt
    } as Session;
  }
  return null;
}

// 모든 세션 가져오기
export async function getAllSessions(): Promise<Session[]> {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const snapshot = await getDocs(sessionsRef);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt
    } as Session;
  });
}

// 세션 업데이트
export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, updates);
}

// 세션 삭제
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(sessionRef);

  // 게임 상태도 삭제
  const gameStateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  await deleteDoc(gameStateRef);
}

// 세션 상태 변경
export async function updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
  await updateSession(sessionId, { status });
}

// ========================
// 팀(Team) 관련 함수
// ========================

// 팀 정보 업데이트 (세션 내의 teams 배열 업데이트)
export async function updateTeams(sessionId: string, teams: Team[]): Promise<void> {
  await updateSession(sessionId, { teams });
}

// 특정 팀 업데이트
export async function updateTeam(sessionId: string, teamId: string, updates: Partial<Team>): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const updatedTeams = session.teams.map(team =>
    team.id === teamId ? { ...team, ...updates } : team
  );

  await updateTeams(sessionId, updatedTeams);
}

// 팀 턴 기록 추가
export async function addTurnRecord(sessionId: string, teamId: string, record: TurnRecord): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const updatedTeams = session.teams.map(team => {
    if (team.id === teamId) {
      return {
        ...team,
        history: [...team.history, record]
      };
    }
    return team;
  });

  await updateTeams(sessionId, updatedTeams);
}

// ========================
// 게임 상태(GameState) 관련 함수
// ========================

export interface GameState {
  sessionId: string;
  phase: string; // GamePhase
  currentTeamIndex: number;
  currentTurn: number;
  diceValue: [number, number];
  // 현재 턴의 카드 및 응답 정보
  currentCard: any | null;
  selectedChoice: { id: string; text: string } | null;
  reasoning: string;
  aiResult: {
    feedback: string;
    scoreChanges: {
      capital?: number;
      energy?: number;
      reputation?: number;
      trust?: number;
      competency?: number;
      insight?: number;
    };
  } | null;
  isSubmitted: boolean; // 제출 완료 여부
  isAiProcessing: boolean;
  isGameStarted?: boolean; // 게임 시작 여부
  // 다른 팀 참여 투표 (옵션별 투표한 팀 이름 목록)
  spectatorVotes?: { [optionId: string]: string[] };
  // 로그
  gameLogs: string[];
  lastUpdated: number;
}

// 게임 상태 저장/업데이트
export async function saveGameState(state: GameState): Promise<void> {
  const stateRef = doc(db, GAME_STATE_COLLECTION, state.sessionId);
  await setDoc(stateRef, {
    ...state,
    lastUpdated: Date.now()
  }, { merge: true });
}

// 게임 상태 부분 업데이트 (문서가 없으면 생성)
export async function updateGameState(sessionId: string, updates: Partial<GameState>): Promise<void> {
  const stateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  // setDoc with merge: true 사용하여 문서가 없으면 생성, 있으면 업데이트
  await setDoc(stateRef, {
    ...updates,
    lastUpdated: Date.now()
  }, { merge: true });
}

// 게임 상태 가져오기
export async function getGameState(sessionId: string): Promise<GameState | null> {
  const stateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  const snapshot = await getDoc(stateRef);

  if (snapshot.exists()) {
    return snapshot.data() as GameState;
  }
  return null;
}

// 게임 로그 추가
export async function addGameLog(sessionId: string, log: string): Promise<void> {
  const state = await getGameState(sessionId);
  const currentLogs = state?.gameLogs || [];
  await updateGameState(sessionId, {
    gameLogs: [...currentLogs, `[${new Date().toLocaleTimeString()}] ${log}`]
  });
}

// 관람자 투표 업데이트 (옵션 선택 - 팀 이름 저장)
export async function updateSpectatorVote(
  sessionId: string,
  optionId: string,
  previousOptionId: string | null,
  teamName: string
): Promise<void> {
  const state = await getGameState(sessionId);
  const currentVotes: { [key: string]: string[] } = {};

  // 기존 투표 복사
  if (state?.spectatorVotes) {
    Object.keys(state.spectatorVotes).forEach(key => {
      currentVotes[key] = [...(state.spectatorVotes![key] || [])];
    });
  }

  // 이전 선택에서 팀 이름 제거
  if (previousOptionId && currentVotes[previousOptionId]) {
    currentVotes[previousOptionId] = currentVotes[previousOptionId].filter(name => name !== teamName);
  }

  // 새 선택에 팀 이름 추가
  if (!currentVotes[optionId]) {
    currentVotes[optionId] = [];
  }
  if (!currentVotes[optionId].includes(teamName)) {
    currentVotes[optionId].push(teamName);
  }

  await updateGameState(sessionId, {
    spectatorVotes: currentVotes
  });
}

// ========================
// 실시간 리스너 함수
// ========================

// 세션 실시간 구독
export function subscribeToSession(
  sessionId: string,
  callback: (session: Session | null) => void
): Unsubscribe {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);

  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt
      } as Session);
    } else {
      callback(null);
    }
  });
}

// 게임 상태 실시간 구독
export function subscribeToGameState(
  sessionId: string,
  callback: (state: GameState | null) => void
): Unsubscribe {
  const stateRef = doc(db, GAME_STATE_COLLECTION, sessionId);

  return onSnapshot(stateRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GameState);
    } else {
      callback(null);
    }
  });
}

// 모든 세션 실시간 구독
export function subscribeToAllSessions(
  callback: (sessions: Session[]) => void
): Unsubscribe {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);

  return onSnapshot(sessionsRef, (snapshot) => {
    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt
      } as Session;
    });
    callback(sessions);
  });
}
