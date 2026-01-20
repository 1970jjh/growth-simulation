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
  ChevronUp,
  Download,
  X
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

  // 게임 종료 팝업
  const [showEndGameModal, setShowEndGameModal] = useState(false);

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

    // 종료 팝업 표시
    setShowEndGameModal(true);
  };

  // PDF 다운로드 (전체 결과)
  const handleDownloadPDF = () => {
    if (!currentSession || !gameState) return;

    // PDF 내용 생성
    const rankings = getTeamRankings();
    let pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${currentSession.name} - 게임 결과 리포트</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    h3 { color: #4b5563; }
    .ranking { background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .ranking-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .ranking-item:last-child { border-bottom: none; }
    .team-section { background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0; page-break-inside: avoid; }
    .round-result { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .score { color: #7c3aed; font-weight: bold; font-size: 1.2em; }
    .feedback { background: #eff6ff; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 0.9em; }
    .model-answer { background: #ecfdf5; padding: 10px; border-radius: 5px; margin-top: 10px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>📊 ${currentSession.name}</h1>
  <p>게임 종료 시간: ${new Date().toLocaleString('ko-KR')}</p>
  <p>총 ${currentSession.teams.length}개 팀 참가 | 총 ${gameState.roundResults.length}라운드 진행</p>

  <h2>🏆 최종 순위</h2>
  <div class="ranking">
    ${rankings.map((team, idx) => `
      <div class="ranking-item">
        <span>${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1) + '위'} ${team.name}</span>
        <span class="score">${team.calculatedScore}점 ${team.bingoCount > 0 ? `(빙고 ${team.bingoCount}줄)` : ''}</span>
      </div>
    `).join('')}
  </div>

  <h2>📝 라운드별 상세 결과</h2>
  ${gameState.roundResults.map((result, roundIdx) => {
    const card = currentSession.bingoCards.find(c => c.id === result.cardId);
    return `
      <div class="team-section">
        <h3>라운드 ${roundIdx + 1}: ${result.cardTitle}</h3>
        <p><strong>상황:</strong> ${card?.situation || ''}</p>
        <p><strong>선택지:</strong></p>
        <ul>
          ${card?.choices.map(c => `<li>${c.id}. ${c.text} ${c.score ? `(${c.score}점)` : ''}</li>`).join('') || ''}
        </ul>

        <h4>팀별 답변 및 AI 분석</h4>
        ${result.allAnswers.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)).map((answer, ansIdx) => {
          const feedbackSummary = answer.aiFeedback?.match(/\[총평\]\n?([\s\S]*?)(?=\[모범답안\]|$)/)?.[1]?.trim() || '';
          const modelAnswer = answer.aiFeedback?.match(/\[모범답안\]\n?([\s\S]*?)(?=\[METRICS\]|$)/)?.[1]?.trim() || '';
          return `
            <div class="round-result">
              <p><strong>${ansIdx === 0 ? '🏆 ' : ''}${answer.teamName}</strong> - 선택: ${answer.choiceId} | <span class="score">${answer.aiScore || 0}점</span></p>
              <p><strong>선택 이유:</strong> ${answer.reasoning}</p>
              ${feedbackSummary ? `<div class="feedback"><strong>AI 총평:</strong> ${feedbackSummary}</div>` : ''}
            </div>
          `;
        }).join('')}

        ${(() => {
          const firstAnswer = result.allAnswers[0];
          const modelAnswer = firstAnswer?.aiFeedback?.match(/\[모범답안\]\n?([\s\S]*?)(?=\[METRICS\]|$)/)?.[1]?.trim() || '';
          return modelAnswer ? `<div class="model-answer"><strong>📝 모범 답안:</strong> ${modelAnswer}</div>` : '';
        })()}
      </div>
    `;
  }).join('')}

  <h2>📈 팀별 성과 요약</h2>
  ${rankings.map(team => `
    <div class="team-section">
      <h3>${team.name}</h3>
      <p>최종 점수: <span class="score">${team.calculatedScore}점</span></p>
      <p>획득 칸: ${team.ownedCells.length}개 | 빙고: ${team.bingoCount}줄 ${team.bingoCount > 0 ? `(+${team.bingoCount * 500}점)` : ''}</p>
      <p>참가자 수: ${team.members.length}명</p>
    </div>
  `).join('')}

  <footer style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 0.8em;">
    Workplace Scenario Bingo - 게임 결과 리포트
  </footer>
</body>
</html>`;

    // PDF 다운로드 (HTML을 새 창에서 인쇄)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
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
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                  {/* 왼쪽: 이미지 업로드 영역 (2배 너비) */}
                  <div className="lg:col-span-2">
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
                        <div className="space-y-3">
                          <img
                            src={uploadedImage}
                            alt="업로드된 이미지"
                            className="w-full rounded-lg border-2 border-gray-300 object-contain"
                            style={{ minHeight: '400px', maxHeight: '600px' }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => imageInputRef.current?.click()}
                              className="flex-1 py-2 bg-gray-200 font-bold border-2 border-black hover:bg-gray-300 text-sm"
                            >
                              이미지 변경
                            </button>
                            <button
                              onClick={() => setUploadedImage(null)}
                              className="flex-1 py-2 bg-red-100 font-bold border-2 border-red-300 hover:bg-red-200 text-red-600 text-sm"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                          style={{ minHeight: '400px' }}
                        >
                          <Image className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 font-bold text-lg">클릭하여 이미지 업로드</p>
                          <p className="text-gray-400 text-sm mt-2">상황 설명 이미지를 업로드하세요</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 가운데: 빙고판 */}
                  <div className="lg:col-span-3">
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
                        <p className="font-bold mb-2">답변 현황 ({gameState.teamAnswers.length}/{currentSession.teams.length}팀 제출)</p>
                        <div className="flex gap-2 flex-wrap mb-4">
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

                        {/* 제출된 답변 실시간 표시 */}
                        {gameState.teamAnswers.length > 0 && (
                          <div className="space-y-3 mb-4">
                            <p className="font-bold text-gray-700 flex items-center gap-2">
                              <Eye className="w-4 h-4" /> 제출된 답변 내용
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {gameState.teamAnswers.map(answer => {
                                const team = currentSession.teams.find(t => t.id === answer.teamId);
                                const color = team ? TEAM_COLORS[team.colorIndex] : TEAM_COLORS[0];
                                const selectedChoice = gameState.currentCard?.choices.find(c => c.id === answer.choiceId);
                                return (
                                  <div
                                    key={answer.teamId}
                                    className="p-3 rounded-lg border-2"
                                    style={{ borderColor: color.bg, backgroundColor: color.light }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: color.bg }}
                                        />
                                        <span className="font-bold">{answer.teamName}</span>
                                      </div>
                                      <span className="px-2 py-1 bg-white rounded font-bold text-sm border" style={{ borderColor: color.bg }}>
                                        선택: {answer.choiceId}
                                      </span>
                                    </div>
                                    {selectedChoice && (
                                      <p className="text-xs text-gray-600 mb-2 bg-white p-1 rounded">
                                        {selectedChoice.text}
                                      </p>
                                    )}
                                    <div className="bg-white p-2 rounded border border-gray-200">
                                      <p className="text-xs text-gray-500 font-bold mb-1">선택 이유:</p>
                                      <p className="text-sm text-gray-800 line-clamp-3">{answer.reasoning}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

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

                              // 이유평가 파싱 (하이라이트용 키워드 추출)
                              const reasoningEvalMatch = feedback.match(/\[이유평가\]\n?([\s\S]*?)(?=\[총평\]|$)/);
                              const reasoningEval = reasoningEvalMatch ? reasoningEvalMatch[1].trim() : '';

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

                              // 선택한 선택지 정보
                              const selectedChoice = gameState.currentCard?.choices.find(c => c.id === answer.choiceId);
                              const team = currentSession.teams.find(t => t.id === answer.teamId);
                              const color = team ? TEAM_COLORS[team.colorIndex] : TEAM_COLORS[0];

                              // 이유에서 하이라이트할 키워드들 (AI 평가 기준 관련)
                              const highlightKeywords = [
                                '협업', '팀워크', '소통', '커뮤니케이션', '조직', '화합', '배려', '존중',
                                '팔로워', '팔로워십', '리더', '리더십', '책임', '신뢰', '정직',
                                '구체적', '논리적', '분석', '근거', '합리적', '타당', '적절',
                                '성장', '발전', '개선', '효율', '효과적', '생산성',
                                '문제해결', '해결책', '대안', '방안', '실행', '실천'
                              ];

                              // 이유 텍스트에 하이라이트 적용
                              const highlightReasoning = (text: string) => {
                                let result = text;
                                const foundKeywords: string[] = [];
                                highlightKeywords.forEach(keyword => {
                                  const regex = new RegExp(`(${keyword})`, 'gi');
                                  if (regex.test(result)) {
                                    foundKeywords.push(keyword);
                                  }
                                });
                                return { text: result, keywords: foundKeywords };
                              };

                              const { keywords: foundKeywords } = highlightReasoning(answer.reasoning);

                              return (
                                <div
                                  key={answer.teamId}
                                  className={`p-4 rounded-lg border-2 ${
                                    idx === 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-300'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl font-black">
                                        {idx === 0 && '🏆 '}{answer.teamName}
                                      </span>
                                      <span
                                        className="px-3 py-1 rounded-full text-sm font-bold"
                                        style={{ backgroundColor: color.bg, color: color.text }}
                                      >
                                        선택: {answer.choiceId}
                                      </span>
                                    </div>
                                    <span className="text-2xl font-black text-purple-600">{answer.aiScore}점</span>
                                  </div>

                                  {/* 선택한 선택지 텍스트 */}
                                  {selectedChoice && (
                                    <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                                      <span className="text-xs text-gray-500 font-bold">선택한 답변:</span>
                                      <p className="text-sm text-gray-800">{selectedChoice.text}</p>
                                    </div>
                                  )}

                                  {/* 팀이 작성한 이유 (형광펜 하이라이트) */}
                                  <div className="mb-3 p-3 bg-white rounded border-2 border-blue-200">
                                    <span className="text-xs text-blue-600 font-bold mb-1 block">💬 팀이 작성한 이유:</span>
                                    <p className="text-sm text-gray-800 leading-relaxed">
                                      {answer.reasoning.split(new RegExp(`(${highlightKeywords.join('|')})`, 'gi')).map((part, i) => {
                                        const isHighlight = highlightKeywords.some(k => k.toLowerCase() === part.toLowerCase());
                                        return isHighlight ? (
                                          <mark key={i} className="bg-yellow-300 px-0.5 rounded font-bold">{part}</mark>
                                        ) : (
                                          <span key={i}>{part}</span>
                                        );
                                      })}
                                    </p>
                                    {foundKeywords.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="text-[10px] text-gray-400">핵심 키워드:</span>
                                        {[...new Set(foundKeywords)].slice(0, 5).map((kw, i) => (
                                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                            {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* AI 총평 */}
                                  <p className="text-sm text-gray-700 mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                                    <span className="text-xs text-purple-600 font-bold">🤖 AI 총평: </span>
                                    {summary}
                                  </p>

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

      {/* 게임 종료 팝업 */}
      {showEndGameModal && currentSession && gameState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-t-2xl">
              <button
                onClick={() => setShowEndGameModal(false)}
                className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="text-center">
                <Trophy className="w-20 h-20 text-white mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl font-black text-white">게임 종료!</h2>
                <p className="text-white text-opacity-90 mt-2">{currentSession.name}</p>
              </div>
            </div>

            {/* 최종 순위 */}
            <div className="p-6">
              <h3 className="text-2xl font-black text-gray-800 mb-6 text-center">🏆 최종 순위</h3>

              <div className="space-y-4">
                {getTeamRankings().map((team, idx) => {
                  const color = TEAM_COLORS[team.colorIndex];
                  const isWinner = idx === 0;
                  return (
                    <div
                      key={team.id}
                      className={`
                        p-5 rounded-xl border-4 flex items-center justify-between
                        ${isWinner ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400 shadow-lg' : 'bg-gray-50 border-gray-200'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`}
                        </span>
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color.bg }}
                        />
                        <span className={`text-2xl font-black ${isWinner ? 'text-yellow-700' : 'text-gray-700'}`}>
                          {team.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-3xl font-black ${isWinner ? 'text-yellow-600' : 'text-purple-600'}`}>
                          {team.calculatedScore}점
                        </span>
                        {team.bingoCount > 0 && (
                          <p className="text-sm text-gray-500">빙고 {team.bingoCount}줄 (+{team.bingoCount * 500})</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 통계 */}
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-3xl font-black text-blue-600">{gameState.roundResults.length}</p>
                  <p className="text-sm text-blue-700">총 라운드</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-3xl font-black text-green-600">{currentSession.teams.length}</p>
                  <p className="text-sm text-green-700">참가 팀</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-3xl font-black text-purple-600">
                    {gameState.completedBingoLines.length}
                  </p>
                  <p className="text-sm text-purple-700">완성 빙고</p>
                </div>
              </div>

              {/* 버튼 */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-6 h-6" />
                  결과 리포트 다운로드 (PDF)
                </button>
                <button
                  onClick={() => setShowEndGameModal(false)}
                  className="flex-1 py-4 bg-gray-800 text-white font-bold text-lg rounded-xl hover:bg-gray-900 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
