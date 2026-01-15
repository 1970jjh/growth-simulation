import React, { useState, useEffect, useRef } from 'react';
import {
  Session,
  Team,
  GameCard,
  GamePhase,
  GameState,
  TeamAnswer,
  TEAM_COLORS,
  DEFAULT_SESSION_SETTINGS,
  BINGO_LINES,
  TeamColorIndex
} from '../types';
import {
  createSession,
  deleteSession,
  updateSession,
  subscribeToSession,
  subscribeToGameState,
  initGameState,
  updateGameState,
  uploadCardsAndInitBingo,
  replaceCard,
  updateCellOwner,
  addRoundResult,
  addCompletedBingoLine,
  generateId,
  generateAccessCode
} from '../lib/firestore';
import { evaluateAllAnswers, determineWinner } from '../lib/aiService';
import BingoBoard from './BingoBoard';
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Upload,
  Settings,
  Users,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Trophy,
  Eye
} from 'lucide-react';

interface AdminDashboardProps {
  sessions: Session[];
  onSessionsChange: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ sessions, onSessionsChange }) => {
  // 세션 생성 폼
  const [newSessionName, setNewSessionName] = useState('');
  const [newTeamCount, setNewTeamCount] = useState(4);
  const [newBingoLines, setNewBingoLines] = useState(3);
  const [isCreating, setIsCreating] = useState(false);

  // 현재 세션 관리
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // 카드 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 세션 실시간 구독
  useEffect(() => {
    if (!currentSession?.id) return;

    const unsubSession = subscribeToSession(currentSession.id, (session) => {
      if (session) setCurrentSession(session);
    });

    const unsubState = subscribeToGameState(currentSession.id, (state) => {
      if (state) setGameState(state);
    });

    return () => {
      unsubSession();
      unsubState();
    };
  }, [currentSession?.id]);

  // 새 세션 생성
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;

    setIsCreating(true);

    const sessionId = generateId('sess');
    const accessCode = generateAccessCode();

    // 팀 생성
    const teams: Team[] = [];
    for (let i = 0; i < newTeamCount; i++) {
      teams.push({
        id: generateId('team'),
        name: `${i + 1}팀`,
        colorIndex: (i % 8) as TeamColorIndex,
        members: [],
        totalScore: 0,
        bingoCount: 0,
        ownedCells: []
      });
    }

    const newSession: Session = {
      id: sessionId,
      name: newSessionName.trim(),
      status: 'waiting',
      accessCode,
      createdAt: Date.now(),
      settings: {
        ...DEFAULT_SESSION_SETTINGS,
        bingoLinesToWin: newBingoLines,
        maxTeams: newTeamCount,
        isActive: true
      },
      teams,
      allCards: [],
      bingoCards: [],
      spareCards: [],
      bingoCells: []
    };

    try {
      await createSession(newSession);
      await initGameState(sessionId);
      setNewSessionName('');
    } catch (error) {
      console.error('세션 생성 오류:', error);
    }

    setIsCreating(false);
  };

  // 세션 삭제
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('정말 이 세션을 삭제하시겠습니까?')) return;

    try {
      await deleteSession(sessionId);
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setGameState(null);
      }
      onSessionsChange();
    } catch (error) {
      console.error('세션 삭제 오류:', error);
    }
  };

  // JSON 카드 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSession) return;

    try {
      const text = await file.text();
      const cards: GameCard[] = JSON.parse(text);

      if (!Array.isArray(cards) || cards.length < 25) {
        alert('최소 25개의 카드가 필요합니다.');
        return;
      }

      // 카드 ID가 없으면 생성
      const processedCards = cards.map((card, idx) => ({
        ...card,
        id: card.id || generateId('card')
      }));

      await uploadCardsAndInitBingo(currentSession.id, processedCards);
      alert(`${processedCards.length}개의 카드가 업로드되었습니다!`);
    } catch (error) {
      console.error('카드 업로드 오류:', error);
      alert('카드 파일 형식이 올바르지 않습니다.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 게임 시작
  const handleStartGame = async () => {
    if (!currentSession || currentSession.bingoCards.length === 0) {
      alert('먼저 카드를 업로드해주세요.');
      return;
    }

    await updateSession(currentSession.id, { status: 'active' });
    await updateGameState(currentSession.id, {
      phase: GamePhase.SelectingCard,
      currentRound: 1,
      currentTurnTeamIndex: 0
    });
  };

  // 게임 일시정지/재개
  const handleTogglePause = async () => {
    if (!currentSession || !gameState) return;

    if (gameState.phase === GamePhase.Paused) {
      await updateGameState(currentSession.id, {
        phase: GamePhase.SelectingCard
      });
    } else {
      await updateGameState(currentSession.id, {
        phase: GamePhase.Paused
      });
    }
  };

  // 카드 교체 (관리자)
  const handleReplaceCard = async (cellIndex: number) => {
    if (!currentSession) return;

    const newCard = await replaceCard(currentSession.id, cellIndex);
    if (newCard) {
      alert(`카드가 "${newCard.title}"로 변경되었습니다.`);
    } else {
      alert('스페어 카드가 없습니다.');
    }
  };

  // AI 평가 실행
  const handleRunAIEvaluation = async () => {
    if (!currentSession || !gameState || !gameState.currentCard) return;

    await updateGameState(currentSession.id, { isAiProcessing: true });

    try {
      const results = await evaluateAllAnswers(
        gameState.currentCard,
        gameState.teamAnswers
      );

      // 답변에 점수 추가
      const updatedAnswers = gameState.teamAnswers.map(answer => {
        const result = results.find(r => r.teamId === answer.teamId);
        return {
          ...answer,
          aiScore: result?.score || 0,
          aiFeedback: result?.feedback || ''
        };
      });

      // 승자 결정
      const winner = determineWinner(results);

      if (winner && gameState.selectedCellIndex !== null) {
        // 셀 소유권 업데이트
        await updateCellOwner(
          currentSession.id,
          gameState.selectedCellIndex,
          winner.teamId
        );

        // 라운드 결과 저장
        const winnerTeam = currentSession.teams.find(t => t.id === winner.teamId);
        await addRoundResult(currentSession.id, {
          round: gameState.currentRound,
          cellIndex: gameState.selectedCellIndex,
          cardId: gameState.currentCard.id,
          cardTitle: gameState.currentCard.title,
          winnerTeamId: winner.teamId,
          winnerTeamName: winnerTeam?.name || '',
          winnerScore: winner.score,
          allAnswers: updatedAnswers,
          timestamp: Date.now()
        });

        // 빙고 라인 체크
        await checkBingoLines(winner.teamId);
      }

      await updateGameState(currentSession.id, {
        teamAnswers: updatedAnswers,
        phase: GamePhase.ShowingResults,
        isAiProcessing: false
      });

    } catch (error) {
      console.error('AI 평가 오류:', error);
      await updateGameState(currentSession.id, { isAiProcessing: false });
    }
  };

  // 빙고 라인 체크
  const checkBingoLines = async (latestWinnerTeamId: string) => {
    if (!currentSession || !gameState) return;

    for (const lineTemplate of BINGO_LINES) {
      // 이미 완성된 라인인지 확인
      const alreadyCompleted = gameState.completedBingoLines.some(
        l => l.type === lineTemplate.type && l.index === lineTemplate.index
      );
      if (alreadyCompleted) continue;

      // 라인의 모든 셀이 점령되었는지 확인
      const allCellsOwned = lineTemplate.cells.every(cellIdx => {
        const cell = currentSession.bingoCells[cellIdx];
        return cell && cell.ownerTeamId !== null;
      });

      if (allCellsOwned) {
        // 마지막 셀을 점령한 팀이 빙고 완성
        const line = {
          ...lineTemplate,
          completedByTeamId: latestWinnerTeamId,
          completedAt: Date.now()
        };
        await addCompletedBingoLine(currentSession.id, line);
      }
    }
  };

  // 다음 라운드로
  const handleNextRound = async () => {
    if (!currentSession || !gameState) return;

    const nextTeamIndex = (gameState.currentTurnTeamIndex + 1) % currentSession.teams.length;

    // 모든 칸이 완료되었는지 확인
    const allCompleted = currentSession.bingoCells.every(cell => cell.isCompleted);

    if (allCompleted) {
      await updateGameState(currentSession.id, {
        phase: GamePhase.GameEnded
      });
      return;
    }

    await updateGameState(currentSession.id, {
      phase: GamePhase.SelectingCard,
      currentRound: gameState.currentRound + 1,
      currentTurnTeamIndex: nextTeamIndex,
      selectedCellIndex: null,
      currentCard: null,
      teamAnswers: []
    });
  };

  // 접속 코드 복사
  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 빙고줄 설정 변경
  const handleUpdateBingoLines = async (lines: number) => {
    if (!currentSession) return;

    await updateSession(currentSession.id, {
      settings: {
        ...currentSession.settings,
        bingoLinesToWin: lines
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-gray-800">빙고 교육 게임 관리자</h1>
          <p className="text-gray-600">세션을 생성하고 게임을 관리하세요</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 세션 목록 & 생성 */}
          <div className="space-y-6">
            {/* 세션 생성 */}
            <div className="bg-white border-4 border-black p-4 shadow-hard">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> 새 세션 만들기
              </h2>

              <div className="space-y-3">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="세션 이름"
                  className="w-full p-3 border-2 border-black font-bold"
                />

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">팀 수</label>
                    <select
                      value={newTeamCount}
                      onChange={(e) => setNewTeamCount(Number(e.target.value))}
                      className="w-full p-2 border-2 border-black"
                    >
                      {[2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n}팀</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">빙고 줄</label>
                    <select
                      value={newBingoLines}
                      onChange={(e) => setNewBingoLines(Number(e.target.value))}
                      className="w-full p-2 border-2 border-black"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n}줄</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="w-full py-3 bg-blue-600 text-white font-bold border-2 border-black shadow-hard hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? '생성 중...' : '세션 생성'}
                </button>
              </div>
            </div>

            {/* 세션 목록 */}
            <div className="bg-white border-4 border-black p-4 shadow-hard">
              <h2 className="text-xl font-bold mb-4">세션 목록 ({sessions.length})</h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSession(session)}
                    className={`
                      p-3 border-2 cursor-pointer transition-all
                      ${currentSession?.id === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-400'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{session.name}</h3>
                        <p className="text-sm text-gray-500">
                          {session.teams.length}팀 | 코드: {session.accessCode}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    생성된 세션이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 세션 상세 */}
          <div className="lg:col-span-2">
            {currentSession ? (
              <div className="space-y-6">
                {/* 세션 헤더 */}
                <div className="bg-white border-4 border-black p-4 shadow-hard">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-black">{currentSession.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-200 font-mono text-sm">
                          {currentSession.accessCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(currentSession.accessCode)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-200 font-bold border-2 border-black hover:bg-gray-300 flex items-center gap-1"
                      >
                        <Upload className="w-4 h-4" /> JSON 업로드
                      </button>

                      {currentSession.status === 'waiting' && currentSession.bingoCards.length > 0 && (
                        <button
                          onClick={handleStartGame}
                          className="px-4 py-2 bg-green-500 text-white font-bold border-2 border-black hover:bg-green-600 flex items-center gap-1"
                        >
                          <Play className="w-4 h-4" /> 게임 시작
                        </button>
                      )}

                      {currentSession.status === 'active' && (
                        <button
                          onClick={handleTogglePause}
                          className="px-3 py-2 bg-yellow-400 font-bold border-2 border-black hover:bg-yellow-500 flex items-center gap-1"
                        >
                          {gameState?.phase === GamePhase.Paused ? (
                            <><Play className="w-4 h-4" /> 재개</>
                          ) : (
                            <><Pause className="w-4 h-4" /> 일시정지</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 설정 */}
                  <div className="flex gap-4 text-sm">
                    <span>팀: {currentSession.teams.length}개</span>
                    <span>카드: {currentSession.bingoCards.length}/25</span>
                    <span>스페어: {currentSession.spareCards.length}개</span>
                    <div className="flex items-center gap-1">
                      <span>빙고:</span>
                      <select
                        value={currentSession.settings.bingoLinesToWin}
                        onChange={(e) => handleUpdateBingoLines(Number(e.target.value))}
                        className="px-1 border border-gray-300 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n}줄</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 빙고판 */}
                {currentSession.bingoCells.length > 0 && (
                  <div className="bg-white border-4 border-black p-4 shadow-hard">
                    <h3 className="text-xl font-bold mb-4">빙고판</h3>
                    <BingoBoard
                      cells={currentSession.bingoCells}
                      cards={currentSession.bingoCards}
                      teams={currentSession.teams}
                      selectedCellIndex={gameState?.selectedCellIndex ?? null}
                      onReplaceCard={handleReplaceCard}
                      isAdmin={true}
                      completedLines={gameState?.completedBingoLines.map((_, i) => i) || []}
                    />
                  </div>
                )}

                {/* 게임 컨트롤 */}
                {gameState && currentSession.status === 'active' && (
                  <div className="bg-white border-4 border-black p-4 shadow-hard">
                    <h3 className="text-xl font-bold mb-4">게임 진행</h3>

                    <div className="space-y-4">
                      <div className="flex gap-4 text-sm">
                        <span>라운드: {gameState.currentRound}</span>
                        <span>
                          현재 턴: {currentSession.teams[gameState.currentTurnTeamIndex]?.name}
                        </span>
                        <span>단계: {gameState.phase}</span>
                      </div>

                      {/* 답변 현황 */}
                      {gameState.phase === GamePhase.AllTeamsAnswering && (
                        <div>
                          <p className="font-bold mb-2">답변 현황</p>
                          <div className="flex gap-2 flex-wrap">
                            {currentSession.teams.map(team => {
                              const hasAnswered = gameState.teamAnswers.some(
                                a => a.teamId === team.id
                              );
                              const color = TEAM_COLORS[team.colorIndex];
                              return (
                                <span
                                  key={team.id}
                                  className={`px-2 py-1 rounded text-sm font-bold ${
                                    hasAnswered ? 'opacity-100' : 'opacity-40'
                                  }`}
                                  style={{ backgroundColor: color.bg, color: color.text }}
                                >
                                  {team.name} {hasAnswered && '✓'}
                                </span>
                              );
                            })}
                          </div>

                          {gameState.teamAnswers.length === currentSession.teams.length && (
                            <button
                              onClick={handleRunAIEvaluation}
                              disabled={gameState.isAiProcessing}
                              className="mt-4 px-4 py-2 bg-purple-600 text-white font-bold border-2 border-black hover:bg-purple-700 disabled:opacity-50"
                            >
                              {gameState.isAiProcessing ? 'AI 평가 중...' : 'AI 평가 실행'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* 결과 표시 */}
                      {gameState.phase === GamePhase.ShowingResults && (
                        <div>
                          <p className="font-bold mb-2">라운드 결과</p>
                          <div className="space-y-2">
                            {[...gameState.teamAnswers]
                              .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                              .map((answer, idx) => (
                                <div
                                  key={answer.teamId}
                                  className={`p-3 rounded border ${
                                    idx === 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50'
                                  }`}
                                >
                                  <div className="flex justify-between">
                                    <span className="font-bold">
                                      {idx === 0 && '🏆 '}{answer.teamName}
                                    </span>
                                    <span className="font-black">{answer.aiScore}점</span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{answer.aiFeedback}</p>
                                </div>
                              ))}
                          </div>

                          <button
                            onClick={handleNextRound}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold border-2 border-black hover:bg-blue-700"
                          >
                            다음 라운드로
                          </button>
                        </div>
                      )}

                      {/* 게임 종료 */}
                      {gameState.phase === GamePhase.GameEnded && (
                        <div className="text-center py-8">
                          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          <h3 className="text-2xl font-black">게임 종료!</h3>
                          <div className="mt-4 space-y-2">
                            {[...currentSession.teams]
                              .sort((a, b) => b.bingoCount - a.bingoCount)
                              .map((team, idx) => (
                                <div key={team.id} className="flex justify-center gap-2">
                                  <span className="font-bold">{idx + 1}위: {team.name}</span>
                                  <span>빙고 {team.bingoCount}줄</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 팀 목록 */}
                <div className="bg-white border-4 border-black p-4 shadow-hard">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" /> 팀 현황
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {currentSession.teams.map(team => {
                      const color = TEAM_COLORS[team.colorIndex];
                      return (
                        <div
                          key={team.id}
                          className="p-3 rounded-lg border-2"
                          style={{ borderColor: color.bg, backgroundColor: color.light }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: color.bg }}
                            />
                            <span className="font-bold">{team.name}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>참가자: {team.members.length}명</p>
                            <p>점령: {team.ownedCells.length}칸</p>
                            <p>빙고: {team.bingoCount}줄</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border-4 border-black p-12 shadow-hard text-center">
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  왼쪽에서 세션을 선택하거나 새로 생성하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
