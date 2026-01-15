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
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Session,
  Team,
  GameState,
  GameCard,
  BingoCell,
  TeamAnswer,
  RoundResult,
  BingoLine,
  SessionSettings,
  GamePhase
} from '../types';

// 컬렉션 이름
const SESSIONS_COLLECTION = 'bingo_sessions';
const GAME_STATE_COLLECTION = 'bingo_game_state';

// ========================
// 세션 관련 함수
// ========================

// 새 세션 생성
export async function createSession(session: Session): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, session.id);
  await setDoc(sessionRef, {
    ...session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// 세션 조회
export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const snapshot = await getDoc(sessionRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt
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
    const docData = snapshot.docs[0];
    const data = docData.data();
    return {
      ...data,
      id: docData.id,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt
    } as Session;
  }
  return null;
}

// 모든 세션 조회
export async function getAllSessions(): Promise<Session[]> {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const snapshot = await getDocs(sessionsRef);

  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toMillis()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : data.updatedAt
    } as Session;
  });
}

// 세션 업데이트
export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

// 세션 삭제
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(sessionRef);

  // 게임 상태도 삭제
  const gameStateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  await deleteDoc(gameStateRef);
}

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
        id: snapshot.id,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toMillis()
          : data.updatedAt
      } as Session);
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
    const sessions = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toMillis()
          : data.updatedAt
      } as Session;
    });
    callback(sessions);
  });
}

// ========================
// 팀 관련 함수
// ========================

// 팀 목록 업데이트
export async function updateTeams(sessionId: string, teams: Team[]): Promise<void> {
  await updateSession(sessionId, { teams });
}

// 팀 추가
export async function addTeamMember(
  sessionId: string,
  teamId: string,
  player: { id: string; name: string; joinedAt: number }
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const updatedTeams = session.teams.map(team => {
    if (team.id === teamId) {
      return {
        ...team,
        members: [...team.members, player]
      };
    }
    return team;
  });

  await updateTeams(sessionId, updatedTeams);
}

// ========================
// 빙고 카드 관련 함수
// ========================

// 카드 업로드 및 빙고판 초기화
export async function uploadCardsAndInitBingo(
  sessionId: string,
  allCards: GameCard[]
): Promise<void> {
  // 카드 셔플
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);

  // 25개는 빙고판에, 나머지는 스페어
  const bingoCards = shuffled.slice(0, 25);
  const spareCards = shuffled.slice(25);

  // 빙고 셀 초기화
  const bingoCells: BingoCell[] = bingoCards.map((card, index) => ({
    index,
    cardId: card.id,
    ownerTeamId: null,
    isSelected: false,
    isCompleted: false
  }));

  await updateSession(sessionId, {
    allCards,
    bingoCards,
    spareCards,
    bingoCells
  });
}

// 카드 교체 (스페어에서 하나 가져오기)
export async function replaceCard(
  sessionId: string,
  cellIndex: number
): Promise<GameCard | null> {
  const session = await getSession(sessionId);
  if (!session || session.spareCards.length === 0) return null;

  // 스페어에서 랜덤 카드 선택
  const spareIndex = Math.floor(Math.random() * session.spareCards.length);
  const newCard = session.spareCards[spareIndex];
  const oldCard = session.bingoCards[cellIndex];

  // 카드 교체
  const newBingoCards = [...session.bingoCards];
  newBingoCards[cellIndex] = newCard;

  const newSpareCards = [...session.spareCards];
  newSpareCards.splice(spareIndex, 1);
  newSpareCards.push(oldCard); // 기존 카드는 스페어로

  // 빙고 셀 업데이트
  const newBingoCells = session.bingoCells.map(cell => {
    if (cell.index === cellIndex) {
      return { ...cell, cardId: newCard.id };
    }
    return cell;
  });

  await updateSession(sessionId, {
    bingoCards: newBingoCards,
    spareCards: newSpareCards,
    bingoCells: newBingoCells
  });

  return newCard;
}

// 카드 내용 수정
export async function updateCard(
  sessionId: string,
  cardId: string,
  updates: Partial<GameCard>
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const updateCardInList = (cards: GameCard[]) =>
    cards.map(card => card.id === cardId ? { ...card, ...updates } : card);

  await updateSession(sessionId, {
    allCards: updateCardInList(session.allCards),
    bingoCards: updateCardInList(session.bingoCards),
    spareCards: updateCardInList(session.spareCards)
  });
}

// ========================
// 게임 상태 관련 함수
// ========================

// 게임 상태 초기화
export async function initGameState(sessionId: string): Promise<void> {
  const gameStateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  const initialState: GameState = {
    sessionId,
    phase: 'WaitingToStart' as GamePhase,
    currentTurnTeamIndex: 0,
    currentRound: 0,
    selectedCellIndex: null,
    currentCard: null,
    teamAnswers: [],
    isAiProcessing: false,
    roundResults: [],
    completedBingoLines: [],
    lastUpdated: Date.now()
  };

  await setDoc(gameStateRef, initialState);
}

// 게임 상태 조회
export async function getGameState(sessionId: string): Promise<GameState | null> {
  const stateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  const snapshot = await getDoc(stateRef);

  if (snapshot.exists()) {
    return snapshot.data() as GameState;
  }
  return null;
}

// 게임 상태 업데이트
export async function updateGameState(
  sessionId: string,
  updates: Partial<GameState>
): Promise<void> {
  const stateRef = doc(db, GAME_STATE_COLLECTION, sessionId);
  await setDoc(stateRef, {
    ...updates,
    lastUpdated: Date.now()
  }, { merge: true });
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

// 팀 답변 제출
export async function submitTeamAnswer(
  sessionId: string,
  answer: TeamAnswer
): Promise<void> {
  const state = await getGameState(sessionId);
  if (!state) return;

  // 기존 답변 중 같은 팀 답변이 있으면 교체
  const existingIndex = state.teamAnswers.findIndex(a => a.teamId === answer.teamId);
  let newAnswers: TeamAnswer[];

  if (existingIndex >= 0) {
    newAnswers = [...state.teamAnswers];
    newAnswers[existingIndex] = answer;
  } else {
    newAnswers = [...state.teamAnswers, answer];
  }

  await updateGameState(sessionId, { teamAnswers: newAnswers });
}

// 빙고 셀 소유권 업데이트
export async function updateCellOwner(
  sessionId: string,
  cellIndex: number,
  ownerTeamId: string
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const newBingoCells = session.bingoCells.map(cell => {
    if (cell.index === cellIndex) {
      return { ...cell, ownerTeamId, isCompleted: true, isSelected: false };
    }
    return cell;
  });

  // 팀의 소유 칸 업데이트
  const newTeams = session.teams.map(team => {
    if (team.id === ownerTeamId) {
      return {
        ...team,
        ownedCells: [...team.ownedCells, cellIndex]
      };
    }
    return team;
  });

  await updateSession(sessionId, {
    bingoCells: newBingoCells,
    teams: newTeams
  });
}

// 라운드 결과 추가
export async function addRoundResult(
  sessionId: string,
  result: RoundResult
): Promise<void> {
  const state = await getGameState(sessionId);
  if (!state) return;

  await updateGameState(sessionId, {
    roundResults: [...state.roundResults, result]
  });
}

// 빙고 라인 완성 추가
export async function addCompletedBingoLine(
  sessionId: string,
  line: BingoLine
): Promise<void> {
  const state = await getGameState(sessionId);
  if (!state) return;

  await updateGameState(sessionId, {
    completedBingoLines: [...state.completedBingoLines, line]
  });

  // 팀의 빙고 카운트도 업데이트
  if (line.completedByTeamId) {
    const session = await getSession(sessionId);
    if (session) {
      const newTeams = session.teams.map(team => {
        if (team.id === line.completedByTeamId) {
          return { ...team, bingoCount: team.bingoCount + 1 };
        }
        return team;
      });
      await updateTeams(sessionId, newTeams);
    }
  }
}

// ========================
// 유틸리티 함수
// ========================

// 고유 ID 생성
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// 접근 코드 생성 (6자리 숫자)
export function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
