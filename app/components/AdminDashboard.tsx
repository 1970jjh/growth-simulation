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
  Eye,
  Image,
  Edit3,
  ChevronDown,
  ChevronUp
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

  // 카드 상세보기 모달
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // 카드 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 업로드 (빙고 왼쪽에 표시)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 세션 생성 섹션 접기/펼치기
  const [isCreateSectionExpanded, setIsCreateSectionExpanded] = useState(true);

  // 세션 설정 편집 모드
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [editSessionName, setEditSessionName] = useState('');
  const [editTeamCount, setEditTeamCount] = useState(4);

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

    try {
      // 게임 상태 초기화
      await initGameState(currentSession.id);
      await updateSession(currentSession.id, { status: 'active' });
      await updateGameState(currentSession.id, {
        phase: GamePhase.SelectingCard,
        currentRound: 1,
        currentTurnTeamIndex: 0
      });
    } catch (error) {
      console.error('게임 시작 오류:', error);
      alert('게임 시작에 실패했습니다. 다시 시도해주세요.');
    }
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

  // 빙고 라인 체크 (새 규칙: 5칸 모두 같은 팀 색깔이어야 함, 가운데는 조커)
  const checkBingoLines = async (latestWinnerTeamId: string) => {
    if (!currentSession || !gameState) return;

    const CENTER_CELL_INDEX = 12; // 가운데 칸 (조커)

    for (const lineTemplate of BINGO_LINES) {
      // 이미 완성된 라인인지 확인
      const alreadyCompleted = gameState.completedBingoLines.some(
        l => l.type === lineTemplate.type && l.index === lineTemplate.index
      );
      if (alreadyCompleted) continue;

      // 해당 라인에서 가운데 칸을 제외한 다른 셀들의 소유팀 확인
      const nonCenterCells = lineTemplate.cells.filter(idx => idx !== CENTER_CELL_INDEX);
      const nonCenterOwners = nonCenterCells.map(cellIdx => {
        const cell = currentSession.bingoCells[cellIdx];
        return cell?.ownerTeamId;
      });

      // 모든 비-중앙 셀이 점령되어 있고, 같은 팀인지 확인
      if (nonCenterOwners.every(ownerId => ownerId !== null && ownerId === nonCenterOwners[0])) {
        // 중앙 셀이 포함된 라인인 경우
        if (lineTemplate.cells.includes(CENTER_CELL_INDEX)) {
          // 중앙 셀은 조커로 처리 - 어떤 팀이든 상관없음 (점령만 되어 있으면 됨)
          const centerCell = currentSession.bingoCells[CENTER_CELL_INDEX];
          if (!centerCell || !centerCell.isCompleted) continue; // 중앙 셀이 아직 플레이 안됨
        }

        // 빙고 완성! 해당 라인의 소유 팀에게 빙고 부여
        const bingoOwnerTeamId = nonCenterOwners[0]!;
        const line = {
          ...lineTemplate,
          completedByTeamId: bingoOwnerTeamId,
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

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // 세션 편집 시작
  const handleStartEditSession = () => {
    if (!currentSession) return;
    setEditSessionName(currentSession.name);
    setEditTeamCount(currentSession.teams.length);
    setIsEditingSession(true);
  };

  // 세션 편집 저장
  const handleSaveSessionEdit = async () => {
    if (!currentSession || !editSessionName.trim()) return;

    try {
      // 팀 수가 변경된 경우 팀 추가/삭제
      let updatedTeams = [...currentSession.teams];

      if (editTeamCount > currentSession.teams.length) {
        // 팀 추가
        for (let i = currentSession.teams.length; i < editTeamCount; i++) {
          updatedTeams.push({
            id: generateId('team'),
            name: `${i + 1}팀`,
            colorIndex: (i % 8) as TeamColorIndex,
            members: [],
            totalScore: 0,
            bingoCount: 0,
            ownedCells: []
          });
        }
      } else if (editTeamCount < currentSession.teams.length) {
        // 팀 삭제 (게임 진행 중이면 경고)
        if (currentSession.status === 'active') {
          if (!confirm('게임 진행 중에 팀을 줄이면 해당 팀의 데이터가 삭제됩니다. 계속하시겠습니까?')) {
            return;
          }
        }
        updatedTeams = updatedTeams.slice(0, editTeamCount);
      }

      await updateSession(currentSession.id, {
        name: editSessionName.trim(),
        teams: updatedTeams,
        settings: {
          ...currentSession.settings,
          maxTeams: editTeamCount
        }
      });

      setIsEditingSession(false);
    } catch (error) {
      console.error('세션 수정 오류:', error);
      alert('세션 수정에 실패했습니다.');
    }
  };

  // 팀 누적 점수 계산
  const getTeamTotalScore = (team: Team): number => {
    if (!gameState) return team.totalScore;

    // 라운드 결과에서 해당 팀의 모든 점수 합산
    let totalScore = 0;
    gameState.roundResults.forEach(result => {
      const teamAnswer = result.allAnswers.find(a => a.teamId === team.id);
      if (teamAnswer?.aiScore) {
        totalScore += teamAnswer.aiScore;
      }
    });

    // 빙고 보너스 점수 (500점 x 빙고 수)
    totalScore += team.bingoCount * 500;

    return totalScore;
  };

  // 팀 순위 계산 (누적 점수 기준)
  const getTeamRankings = () => {
    if (!currentSession) return [];

    return [...currentSession.teams]
      .map(team => ({
        ...team,
        calculatedScore: getTeamTotalScore(team)
      }))
      .sort((a, b) => b.calculatedScore - a.calculatedScore);
  };

  // 카드 상세보기 (관리자)
  const handleViewCard = (cellIndex: number) => {
    setSelectedCardIndex(cellIndex);
    setShowCardModal(true);
  };

  // 선택된 카드 정보 가져오기
  const getSelectedCard = (): GameCard | null => {
    if (selectedCardIndex === null || !currentSession) return null;
    const cell = currentSession.bingoCells[selectedCardIndex];
    if (!cell) return null;
    return currentSession.bingoCards.find(c => c.id === cell.cardId) || null;
  };

  // 선택된 셀의 답변 가져오기
  const getSelectedCellAnswers = (): TeamAnswer[] => {
    if (selectedCardIndex === null || !gameState) return [];
    // 해당 라운드의 답변 찾기
    const roundResult = gameState.roundResults.find(r => r.cellIndex === selectedCardIndex);
    return roundResult?.allAnswers || [];
  };

  // 게임 종료
  const handleEndGame = async () => {
    if (!currentSession) return;
    if (!confirm('정말 게임을 종료하시겠습니까?')) return;

    await updateSession(currentSession.id, { status: 'ended' });
    await updateGameState(currentSession.id, {
      phase: GamePhase.GameEnded
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-gray-800">Workplace Scenario Bingo - Admin</h1>
          <p className="text-gray-600">세션을 생성하고 게임을 관리하세요</p>
        </header>

        {/* 메인 영역 */}
        <div className="space-y-6">
          {/* 세션 선택 바 */}
          <div className="bg-white border-4 border-black p-3 shadow-hard">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold">세션 선택:</span>
              <select
                value={currentSession?.id || ''}
                onChange={(e) => {
                  const session = sessions.find(s => s.id === e.target.value);
                  setCurrentSession(session || null);
                }}
                className="flex-1 max-w-xs p-2 border-2 border-black font-bold"
              >
                <option value="">세션을 선택하세요</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} ({session.accessCode})
                  </option>
                ))}
              </select>
              {currentSession && (
                <>
                  <button
                    onClick={() => handleCopyCode(currentSession.accessCode)}
                    className="px-3 py-2 bg-gray-200 font-bold border-2 border-black hover:bg-gray-300 flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {currentSession.accessCode}
                  </button>
                  <button
                    onClick={handleStartEditSession}
                    className="px-3 py-2 bg-yellow-400 font-bold border-2 border-black hover:bg-yellow-500 flex items-center gap-1"
                  >
                    <Edit3 className="w-4 h-4" /> 설정 수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(currentSession.id);
                    }}
                    className="px-3 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> 삭제
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 세션이 선택된 경우 메인 컨텐츠 */}
          {currentSession ? (
            <div className="space-y-6">
              {/* 세션 헤더 */}
              <div className="bg-white border-4 border-black p-4 shadow-hard">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    {isEditingSession ? (
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={editSessionName}
                          onChange={(e) => setEditSessionName(e.target.value)}
                          className="text-2xl font-black p-2 border-2 border-black"
                        />
                        <select
                          value={editTeamCount}
                          onChange={(e) => setEditTeamCount(Number(e.target.value))}
                          className="p-2 border-2 border-black"
                        >
                          {[2, 3, 4, 5, 6, 7, 8].map(n => (
                            <option key={n} value={n}>{n}팀</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveSessionEdit}
                          className="px-4 py-2 bg-green-500 text-white font-bold border-2 border-black hover:bg-green-600"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setIsEditingSession(false)}
                          className="px-4 py-2 bg-gray-300 font-bold border-2 border-black hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-black">{currentSession.name}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <span>{currentSession.teams.length}팀</span>
                          <span>|</span>
                          <span>카드: {currentSession.bingoCards.length}/25</span>
                          <span>|</span>
                          <span>스페어: {currentSession.spareCards.length}개</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
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

                    {currentSession.status === 'waiting' && (
                      <button
                        onClick={handleStartGame}
                        disabled={currentSession.bingoCards.length === 0}
                        className={`px-4 py-2 font-bold border-2 border-black flex items-center gap-1 ${
                          currentSession.bingoCards.length > 0
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Play className="w-4 h-4" /> 게임 시작
                      </button>
                    )}

                    {currentSession.status === 'active' && (
                      <>
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
                        <button
                          onClick={handleEndGame}
                          className="px-3 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 flex items-center gap-1"
                        >
                          <Trophy className="w-4 h-4" /> 게임 종료
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 3단 레이아웃: 이미지 | 빙고판 | 실시간 순위 */}
              {currentSession.bingoCells.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* 왼쪽: 이미지 업로드 영역 */}
                  <div className="lg:col-span-1">
                    <div className="bg-white border-4 border-black p-4 shadow-hard h-full">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <Image className="w-5 h-5" /> 상황 이미지
                      </h3>
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {uploadedImage ? (
                        <div className="space-y-2">
                          <img
                            src={uploadedImage}
                            alt="업로드된 이미지"
                            className="w-full rounded-lg border-2 border-gray-300 object-cover"
                            style={{ maxHeight: '300px' }}
                          />
                          <button
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full py-2 bg-gray-200 font-bold border-2 border-black hover:bg-gray-300 text-sm"
                          >
                            이미지 변경
                          </button>
                          <button
                            onClick={() => setUploadedImage(null)}
                            className="w-full py-2 bg-red-100 font-bold border-2 border-red-300 hover:bg-red-200 text-red-600 text-sm"
                          >
                            이미지 삭제
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="border-4 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                        >
                          <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 font-bold">클릭하여 이미지 업로드</p>
                          <p className="text-gray-400 text-sm mt-1">상황 설명 이미지</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 가운데: 빙고판 */}
                  <div className="lg:col-span-2">
                    <div className="bg-white border-4 border-black p-4 shadow-hard">
                      <h3 className="text-xl font-bold mb-4">
                        빙고판
                        <span className="text-sm font-normal text-gray-500 ml-2">(클릭하여 문제 확인)</span>
                        <span className="text-xs font-normal text-purple-500 ml-2">(가운데=조커)</span>
                      </h3>
                      <BingoBoard
                        cells={currentSession.bingoCells}
                        cards={currentSession.bingoCards}
                        teams={currentSession.teams}
                        selectedCellIndex={gameState?.selectedCellIndex ?? null}
                        onCellClick={handleViewCard}
                        onReplaceCard={handleReplaceCard}
                        isAdmin={true}
                        isSelectable={true}
                        completedLines={gameState?.completedBingoLines.map((_, i) => i) || []}
                      />
                    </div>
                  </div>

                  {/* 오른쪽: 실시간 순위 */}
                  <div className="lg:col-span-1">
                    <div className="bg-white border-4 border-black p-4 shadow-hard h-full">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" /> 실시간 순위
                      </h3>
                      <div className="space-y-2">
                        {getTeamRankings().map((team, idx) => {
                          const color = TEAM_COLORS[team.colorIndex];
                          return (
                            <div
                              key={team.id}
                              className={`p-3 rounded-lg border-2 ${
                                idx === 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-lg text-gray-400">
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                                  </span>
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: color.bg }}
                                  />
                                  <span className="font-bold">{team.name}</span>
                                </div>
                                <span className="font-black text-lg">{team.calculatedScore}점</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                <span>칸 {team.ownedCells.length}개</span>
                                {team.bingoCount > 0 && (
                                  <span className="text-purple-600 font-bold">빙고 {team.bingoCount}줄 (+{team.bingoCount * 500})</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 빙고판이 없을 때 */}
              {currentSession.bingoCells.length === 0 && (
                <div className="bg-white border-4 border-black p-12 shadow-hard text-center">
                  <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">카드 JSON 파일을 업로드하여 빙고판을 생성하세요.</p>
                </div>
              )}

              {/* 게임 컨트롤 (빙고판 아래) */}
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
                        {/* 모범 답안 (공통) - 첫 번째 답변에서 추출 */}
                        {gameState.teamAnswers[0]?.aiFeedback && (() => {
                          const feedback = gameState.teamAnswers[0].aiFeedback;
                          const modelMatch = feedback.match(/\[모범답안\]\n?([\s\S]*?)(?=\[METRICS\]|$)/);
                          const modelAnswer = modelMatch ? modelMatch[1].trim() : '';
                          return modelAnswer ? (
                            <div className="mb-6 p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                              <h4 className="text-lg font-black text-green-700 mb-2">📝 모범 답안</h4>
                              <p className="text-lg text-green-800 leading-relaxed">{modelAnswer}</p>
                            </div>
                          ) : null;
                        })()}

                        <p className="font-bold mb-3 text-lg">팀별 결과</p>
                        <div className="space-y-4">
                          {[...gameState.teamAnswers]
                            .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                            .map((answer, idx) => {
                              // 피드백 파싱
                              const feedback = answer.aiFeedback || '';
                              const summaryMatch = feedback.match(/\[총평\]\n?([\s\S]*?)(?=\[모범답안\]|$)/);
                              const summary = summaryMatch ? summaryMatch[1].trim() : '';

                              // 메트릭 파싱
                              const metricsMatch = feedback.match(/\[METRICS\]\n?([\s\S]*?)(?=\[SCORES\]|$)/);
                              let metrics = { resource: 0, energy: 0, trust: 0, competency: 0, insight: 0 };
                              if (metricsMatch) {
                                const parts = metricsMatch[1].trim().split('|');
                                parts.forEach(part => {
                                  const [key, value] = part.split(':');
                                  if (key && value) {
                                    const k = key.toLowerCase().trim();
                                    if (k in metrics) (metrics as any)[k] = parseInt(value, 10);
                                  }
                                });
                              }

                              return (
                                <div
                                  key={answer.teamId}
                                  className={`p-4 rounded-lg border-2 ${
                                    idx === 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-300'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-xl font-black">
                                      {idx === 0 && '🏆 '}{answer.teamName}
                                    </span>
                                    <span className="text-2xl font-black text-purple-600">{answer.aiScore}점</span>
                                  </div>

                                  {/* 총평 */}
                                  <p className="text-base text-gray-700 mb-4 line-clamp-2">{summary}</p>

                                  {/* 5개 지표 */}
                                  <div className="grid grid-cols-5 gap-2">
                                    {[
                                      { key: 'resource', label: 'RESOURCE', value: metrics.resource },
                                      { key: 'energy', label: 'ENERGY', value: metrics.energy },
                                      { key: 'trust', label: 'TRUST', value: metrics.trust },
                                      { key: 'competency', label: 'COMPETENCY', value: metrics.competency },
                                      { key: 'insight', label: 'INSIGHT', value: metrics.insight },
                                    ].map((m) => (
                                      <div key={m.key} className="text-center p-2 bg-white rounded border">
                                        <p className="text-[10px] font-bold text-gray-500">{m.label}</p>
                                        <p className={`text-lg font-black ${
                                          m.value > 0 ? 'text-green-600' : m.value < 0 ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                          {m.value > 0 ? `+${m.value}` : m.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
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
                        <p className="text-gray-600 mb-4">최종 순위 (누적 점수 기준)</p>
                        <div className="mt-4 space-y-2">
                          {getTeamRankings().map((team, idx) => (
                            <div key={team.id} className="flex justify-center gap-4 items-center">
                              <span className="font-black text-xl">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`}
                              </span>
                              <span className="font-bold text-lg">{team.name}</span>
                              <span className="text-purple-600 font-black">{team.calculatedScore}점</span>
                              {team.bingoCount > 0 && (
                                <span className="text-sm text-gray-500">(빙고 {team.bingoCount}줄)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 팀 현황 */}
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
                          <p className="font-bold text-purple-600">누적: {getTeamTotalScore(team)}점</p>
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
                위에서 세션을 선택하거나 아래에서 새로 생성하세요.
              </p>
            </div>
          )}

          {/* 세션 생성 섹션 (접을 수 있음) */}
          <div className="bg-white border-4 border-black shadow-hard">
            <button
              onClick={() => setIsCreateSectionExpanded(!isCreateSectionExpanded)}
              className="w-full p-4 flex items-center justify-between font-bold text-lg hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" /> 새 세션 만들기
              </span>
              {isCreateSectionExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {isCreateSectionExpanded && (
              <div className="p-4 border-t-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="세션 이름"
                    className="p-3 border-2 border-black font-bold"
                  />

                  <div>
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

                  <div>
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

                  <button
                    onClick={handleCreateSession}
                    disabled={isCreating || !newSessionName.trim()}
                    className="py-3 bg-blue-600 text-white font-bold border-2 border-black shadow-hard hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating ? '생성 중...' : '세션 생성'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 카드 상세보기 모달 (관리자용) */}
      {showCardModal && currentSession && selectedCardIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
            {/* 모달 헤더 */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b">
              <div>
                <h2 className="text-xl font-black text-gray-800">
                  {getSelectedCard()?.title || '카드 정보'}
                </h2>
                <span className="text-sm text-gray-500">
                  {selectedCardIndex + 1}번 칸
                </span>
              </div>
              <button
                onClick={() => setShowCardModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 상황 설명 */}
              {getSelectedCard() && (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 mb-2">상황</h3>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {getSelectedCard()?.situation}
                    </p>
                  </div>

                  {/* 선택지 */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 mb-3">선택지</h3>
                    <div className="space-y-2">
                      {getSelectedCard()?.choices.map((choice) => (
                        <div
                          key={choice.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 font-bold text-sm">
                              {choice.id}
                            </span>
                            <div className="flex-1">
                              <span className="text-gray-800">{choice.text}</span>
                              {choice.score && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                                  {choice.score}점
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 학습 포인트 */}
                  {getSelectedCard()?.learningPoint && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-bold text-blue-600 mb-1">학습 포인트</h3>
                      <p className="text-blue-800">{getSelectedCard()?.learningPoint}</p>
                    </div>
                  )}

                  {/* 팀 답변 (있는 경우) */}
                  {getSelectedCellAnswers().length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 mb-3">팀별 답변</h3>
                      <div className="space-y-3">
                        {getSelectedCellAnswers()
                          .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                          .map((answer, idx) => {
                            const team = currentSession.teams.find(t => t.id === answer.teamId);
                            const color = team ? TEAM_COLORS[team.colorIndex] : null;
                            return (
                              <div
                                key={answer.teamId}
                                className={`p-3 rounded-lg border ${idx === 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {idx === 0 && <span>🏆</span>}
                                    <span
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: color?.bg }}
                                    />
                                    <span className="font-bold">{answer.teamName}</span>
                                    <span className="text-sm text-gray-500">선택: {answer.choiceId}</span>
                                  </div>
                                  <span className={`font-black ${idx === 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                    {answer.aiScore}점
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                                  <strong>이유:</strong> {answer.reasoning}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 닫기 버튼 */}
            <div className="sticky bottom-0 p-4 bg-white border-t">
              <button
                onClick={() => setShowCardModal(false)}
                className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
