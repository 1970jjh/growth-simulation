import React, { useState, useEffect } from 'react';
import {
  Session,
  Team,
  GameState,
  GamePhase,
  TeamAnswer,
  TEAM_COLORS,
  Player
} from '../types';
import {
  subscribeToSession,
  subscribeToGameState,
  addTeamMember,
  updateGameState,
  submitTeamAnswer,
  generateId
} from '../lib/firestore';
import BingoBoard from './BingoBoard';
import CardModal from './CardModal';
import { Users, Loader2, Trophy, Hand, Clock, CheckCircle, Download } from 'lucide-react';

interface ParticipantViewProps {
  sessionId: string;
  initialSession: Session;
}

const ParticipantView: React.FC<ParticipantViewProps> = ({ sessionId, initialSession }) => {
  // 세션 및 게임 상태
  const [session, setSession] = useState<Session>(initialSession);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // 참가자 상태
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // UI 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  // 실시간 구독
  useEffect(() => {
    const unsubSession = subscribeToSession(sessionId, (s) => {
      if (s) setSession(s);
    });

    const unsubState = subscribeToGameState(sessionId, (state) => {
      if (state) setGameState(state);
    });

    return () => {
      unsubSession();
      unsubState();
    };
  }, [sessionId]);

  // 현재 팀 정보
  const myTeam = selectedTeamId
    ? session.teams.find(t => t.id === selectedTeamId)
    : null;

  // 현재 턴인 팀
  const currentTurnTeam = gameState
    ? session.teams[gameState.currentTurnTeamIndex]
    : null;

  // 내 팀이 현재 턴인지
  const isMyTurn = myTeam?.id === currentTurnTeam?.id;

  // 내 팀의 답변
  const myAnswer = gameState?.teamAnswers.find(a => a.teamId === selectedTeamId);

  // 답변 단계가 되면 자동으로 팝업 열기
  useEffect(() => {
    if (
      gameState?.phase === GamePhase.AllTeamsAnswering &&
      gameState?.currentCard &&
      !myAnswer &&
      isJoined
    ) {
      setShowCardModal(true);
    }
  }, [gameState?.phase, gameState?.currentCard?.id, myAnswer, isJoined]);

  // 팀 참여 핸들러
  const handleJoinTeam = async () => {
    if (!selectedTeamId || !playerName.trim()) {
      alert('팀과 이름을 입력해주세요.');
      return;
    }

    const newPlayerId = generateId('player');
    const player: Player = {
      id: newPlayerId,
      name: playerName.trim(),
      joinedAt: Date.now()
    };

    try {
      await addTeamMember(sessionId, selectedTeamId, player);
      setPlayerId(newPlayerId);
      setIsJoined(true);
    } catch (error) {
      console.error('팀 참여 오류:', error);
      alert('팀 참여에 실패했습니다.');
    }
  };

  // 빙고 칸 선택 (내 턴일 때만)
  const handleCellSelect = async (cellIndex: number) => {
    if (!gameState || !isMyTurn || gameState.phase !== GamePhase.SelectingCard) return;

    const cell = session.bingoCells[cellIndex];
    if (!cell || cell.isCompleted) return;

    const card = session.bingoCards.find(c => c.id === cell.cardId);
    if (!card) return;

    // 선택된 칸과 카드 설정, 모든 팀 답변 단계로 전환
    await updateGameState(sessionId, {
      selectedCellIndex: cellIndex,
      currentCard: card,
      phase: GamePhase.AllTeamsAnswering,
      teamAnswers: []
    });
    // 팝업은 useEffect에서 gameState 업데이트 감지 후 자동으로 열림
  };

  // 답변 제출
  const handleSubmitAnswer = async (choiceId: string, reasoning: string) => {
    if (!myTeam || !gameState?.currentCard) return;

    setIsSubmitting(true);
    try {
      const answer: TeamAnswer = {
        teamId: myTeam.id,
        teamName: myTeam.name,
        choiceId,
        reasoning,
        submittedAt: Date.now()
      };

      await submitTeamAnswer(sessionId, answer);
      setShowCardModal(false);
    } catch (error) {
      console.error('답변 제출 오류:', error);
      alert('답변 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 참가자용 PDF 다운로드 (내 팀 결과)
  const handleDownloadMyResultPDF = () => {
    if (!session || !gameState || !myTeam) return;

    // 내 팀의 라운드 결과만 추출
    const myTeamResults = gameState.roundResults.map(result => {
      const myAnswer = result.allAnswers.find(a => a.teamId === myTeam.id);
      const card = session.bingoCards.find(c => c.id === result.cardId);
      return { result, myAnswer, card };
    }).filter(r => r.myAnswer);

    // 누적 점수 계산
    let totalScore = 0;
    myTeamResults.forEach(r => {
      if (r.myAnswer?.aiScore) {
        totalScore += r.myAnswer.aiScore;
      }
    });
    totalScore += myTeam.bingoCount * 500;

    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${session.name} - ${myTeam.name} 결과</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; padding: 30px; max-width: 700px; margin: 0 auto; }
    h1 { color: #1f2937; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; font-size: 1.5em; }
    h2 { color: #374151; margin-top: 25px; border-left: 4px solid #7c3aed; padding-left: 10px; font-size: 1.2em; }
    .summary { background: #f3e8ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9d5ff; }
    .summary-item:last-child { border-bottom: none; }
    .round-section { background: #f9fafb; padding: 15px; border-radius: 10px; margin: 15px 0; page-break-inside: avoid; }
    .situation { background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 10px 0; }
    .my-answer { background: #eff6ff; padding: 12px; border-radius: 8px; margin: 10px 0; }
    .ai-feedback { background: #ecfdf5; padding: 12px; border-radius: 8px; margin: 10px 0; }
    .score { color: #7c3aed; font-weight: bold; font-size: 1.3em; }
    .metrics { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
    .metric { background: white; padding: 8px 12px; border-radius: 5px; border: 1px solid #e5e7eb; text-align: center; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <h1>📊 ${session.name}</h1>
  <p style="color: #6b7280;">${myTeam.name} 개인 결과 리포트</p>
  <p style="color: #9ca3af; font-size: 0.9em;">생성일시: ${new Date().toLocaleString('ko-KR')}</p>

  <div class="summary">
    <h2 style="margin-top: 0; border: none; padding: 0;">🏆 최종 성과</h2>
    <div class="summary-item">
      <span>총 획득 점수</span>
      <span class="score">${totalScore}점</span>
    </div>
    <div class="summary-item">
      <span>참여 라운드</span>
      <span>${myTeamResults.length}라운드</span>
    </div>
    <div class="summary-item">
      <span>점령한 칸</span>
      <span>${myTeam.ownedCells.length}개</span>
    </div>
    <div class="summary-item">
      <span>빙고</span>
      <span>${myTeam.bingoCount}줄 ${myTeam.bingoCount > 0 ? `(+${myTeam.bingoCount * 500}점)` : ''}</span>
    </div>
  </div>

  <h2>📝 라운드별 상세 결과</h2>
  ${myTeamResults.map(({ result, myAnswer, card }, idx) => {
    // 피드백 파싱
    const feedback = myAnswer?.aiFeedback || '';
    const summaryMatch = feedback.match(/\\[총평\\]\\n?([\\s\\S]*?)(?=\\[모범답안\\]|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const modelMatch = feedback.match(/\\[모범답안\\]\\n?([\\s\\S]*?)(?=\\[METRICS\\]|$)/);
    const modelAnswer = modelMatch ? modelMatch[1].trim() : '';

    // 메트릭 파싱
    const metricsMatch = feedback.match(/\\[METRICS\\]\\n?([\\s\\S]*?)(?=\\[SCORES\\]|$)/);
    let metrics = { resource: 0, energy: 0, trust: 0, competency: 0, insight: 0 };
    if (metricsMatch) {
      const parts = metricsMatch[1].trim().split('|');
      parts.forEach((part: string) => {
        const [key, value] = part.split(':');
        if (key && value) {
          const k = key.toLowerCase().trim();
          if (k in metrics) (metrics as any)[k] = parseInt(value, 10);
        }
      });
    }

    const selectedChoice = card?.choices.find(c => c.id === myAnswer?.choiceId);

    return `
      <div class="round-section">
        <h3 style="margin-top: 0;">라운드 ${idx + 1}: ${result.cardTitle}</h3>

        <div class="situation">
          <strong>상황:</strong><br/>
          ${card?.situation || ''}
        </div>

        <div class="my-answer">
          <strong>우리 팀의 선택:</strong> ${myAnswer?.choiceId}. ${selectedChoice?.text || ''}<br/>
          <strong>선택 이유:</strong> ${myAnswer?.reasoning || ''}<br/>
          <strong>획득 점수:</strong> <span class="score">${myAnswer?.aiScore || 0}점</span>
        </div>

        ${summary ? `
        <div class="ai-feedback">
          <strong>🤖 AI 분석:</strong><br/>
          ${summary}
        </div>
        ` : ''}

        ${modelAnswer ? `
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 10px 0;">
          <strong>📝 모범 답안:</strong><br/>
          ${modelAnswer}
        </div>
        ` : ''}

        <div class="metrics">
          ${Object.entries(metrics).map(([key, value]) => `
            <div class="metric">
              <div style="font-size: 0.7em; color: #6b7280;">${key.toUpperCase()}</div>
              <div style="font-weight: bold; color: ${Number(value) > 0 ? '#059669' : Number(value) < 0 ? '#dc2626' : '#6b7280'};">
                ${Number(value) > 0 ? '+' : ''}${value}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('')}

  <footer style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 0.8em;">
    Workplace Scenario Bingo - ${myTeam.name} 결과 리포트
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

  // 팀 선택 화면
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border-4 border-black p-6 shadow-hard">
          <h1 className="text-2xl font-black text-center mb-6">Workplace Scenario Bingo</h1>

          <div className="mb-6">
            <p className="text-center text-gray-600 mb-2">세션: {session.name}</p>
            <p className="text-center text-gray-500 text-sm">코드: {session.accessCode}</p>
          </div>

          {/* 팀 선택 */}
          <div className="mb-4">
            <label className="block font-bold mb-2">팀 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {session.teams.map(team => {
                const color = TEAM_COLORS[team.colorIndex];
                const isSelected = selectedTeamId === team.id;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`
                      p-3 rounded-lg border-2 text-left transition-all
                      ${isSelected ? 'ring-2 ring-offset-2 ring-black' : ''}
                    `}
                    style={{
                      backgroundColor: isSelected ? color.bg : color.light,
                      borderColor: color.bg,
                      color: isSelected ? color.text : color.bg
                    }}
                  >
                    <div className="font-bold">{team.name}</div>
                    <div className="text-sm opacity-80">
                      {team.members.length}명 참여중
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이름 입력 */}
          <div className="mb-6">
            <label className="block font-bold mb-2">이름</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full p-3 border-2 border-black font-bold"
            />
          </div>

          <button
            onClick={handleJoinTeam}
            disabled={!selectedTeamId || !playerName.trim()}
            className="w-full py-4 bg-blue-600 text-white font-bold text-lg border-2 border-black shadow-hard hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            참여하기
          </button>
        </div>
      </div>
    );
  }

  // 게임 대기 화면
  if (session.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">게임 시작을 기다리는 중...</h2>
          <p className="text-gray-600">관리자가 게임을 시작하면 자동으로 진행됩니다.</p>
          {myTeam && (
            <div
              className="mt-4 inline-block px-4 py-2 rounded-lg font-bold"
              style={{
                backgroundColor: TEAM_COLORS[myTeam.colorIndex].bg,
                color: TEAM_COLORS[myTeam.colorIndex].text
              }}
            >
              {myTeam.name}으로 참여중
            </div>
          )}
        </div>
      </div>
    );
  }

  // 게임 진행 화면
  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 p-4 border-b-4 border-black"
        style={{
          backgroundColor: myTeam ? TEAM_COLORS[myTeam.colorIndex].bg : '#3B82F6',
          color: myTeam ? TEAM_COLORS[myTeam.colorIndex].text : '#FFFFFF'
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black">{session.name}</h1>
            <p className="text-sm opacity-90">
              {myTeam?.name} | 라운드 {gameState?.currentRound || 1}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">점령: {myTeam?.ownedCells.length}칸</div>
            <div className="text-sm opacity-80">빙고: {myTeam?.bingoCount}줄</div>
          </div>
        </div>
      </header>

      {/* 게임 상태 알림 */}
      <div className="p-4">
        {/* 카드 선택 단계 */}
        {gameState?.phase === GamePhase.SelectingCard && (
          <div className={`
            p-4 rounded-lg mb-4 text-center font-bold
            ${isMyTurn ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'}
          `}>
            {isMyTurn ? (
              <div className="flex items-center justify-center gap-2">
                <Hand className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-700">당신의 차례입니다! 빙고 칸을 선택하세요.</span>
              </div>
            ) : (
              <span className="text-gray-600">
                {currentTurnTeam?.name}이(가) 카드를 선택하고 있습니다...
              </span>
            )}
          </div>
        )}

        {/* 모든 팀 답변 단계 */}
        {gameState?.phase === GamePhase.AllTeamsAnswering && (
          <div className="mb-4">
            <div className="bg-blue-100 border-2 border-blue-400 p-4 rounded-lg text-center mb-4">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="font-bold text-blue-700">모든 팀이 답변 중입니다!</p>
              <p className="text-sm text-blue-600">아래 버튼을 눌러 답변을 작성하세요.</p>
            </div>

            {/* 답변 현황 */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {session.teams.map(team => {
                const hasAnswered = gameState.teamAnswers.some(a => a.teamId === team.id);
                const color = TEAM_COLORS[team.colorIndex];

                return (
                  <span
                    key={team.id}
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      hasAnswered ? '' : 'opacity-40'
                    }`}
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {team.name} {hasAnswered && <CheckCircle className="inline w-4 h-4 ml-1" />}
                  </span>
                );
              })}
            </div>

            {!myAnswer && (
              <button
                onClick={() => setShowCardModal(true)}
                className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-lg border-2 border-black shadow-hard hover:bg-blue-700"
              >
                답변 작성하기
              </button>
            )}

            {myAnswer && !myAnswer.aiScore && (
              <div className="bg-green-100 border-2 border-green-400 p-4 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-700">답변이 제출되었습니다!</p>
                <p className="text-sm text-green-600">AI 평가 결과를 기다리고 있습니다...</p>
              </div>
            )}
          </div>
        )}

        {/* 결과 표시 단계 */}
        {gameState?.phase === GamePhase.ShowingResults && myAnswer && (
          <div className="mb-4">
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 p-4 rounded-lg">
              <h3 className="text-lg font-black text-purple-800 mb-3 text-center">
                AI 분석 결과
              </h3>

              {/* 내 팀 결과 - 점수만 표시 */}
              <div className="bg-white p-4 rounded-lg mb-4 text-center">
                <p className="text-sm text-gray-500 mb-1">{myTeam?.name}</p>
                <p className="text-4xl font-black text-purple-600 mb-2">
                  {myAnswer.aiScore}점
                </p>
                <button
                  onClick={() => setShowCardModal(true)}
                  className="text-sm text-purple-600 underline hover:text-purple-800"
                >
                  상세 분석 보기
                </button>
              </div>

              {/* 전체 순위 */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-purple-700">전체 순위</p>
                {[...gameState.teamAnswers]
                  .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                  .map((answer, idx) => {
                    const team = session.teams.find(t => t.id === answer.teamId);
                    const color = team ? TEAM_COLORS[team.colorIndex] : null;
                    const isWinner = idx === 0;
                    const isMe = answer.teamId === myTeam?.id;

                    return (
                      <div
                        key={answer.teamId}
                        className={`
                          flex items-center justify-between p-2 rounded
                          ${isWinner ? 'bg-yellow-100 border border-yellow-400' : 'bg-gray-50'}
                          ${isMe ? 'ring-2 ring-blue-400' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color?.bg }}
                          />
                          <span className={`font-bold ${isMe ? 'text-blue-600' : ''}`}>
                            {answer.teamName}
                          </span>
                        </div>
                        <span className={`font-black ${isWinner ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {answer.aiScore}점
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* 게임 종료 */}
        {gameState?.phase === GamePhase.GameEnded && (
          <div className="text-center py-8">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black mb-4">게임 종료!</h2>

            <div className="space-y-3">
              {[...session.teams]
                .sort((a, b) => b.bingoCount - a.bingoCount)
                .map((team, idx) => {
                  const color = TEAM_COLORS[team.colorIndex];
                  const isMe = team.id === myTeam?.id;

                  return (
                    <div
                      key={team.id}
                      className={`
                        p-4 rounded-lg border-2
                        ${idx === 0 ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200'}
                        ${isMe ? 'ring-2 ring-blue-400' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black">{idx + 1}위</span>
                          <span
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color.bg }}
                          />
                          <span className="font-bold">{team.name}</span>
                        </div>
                        <span className="font-black">빙고 {team.bingoCount}줄</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* PDF 다운로드 버튼 */}
            <button
              onClick={handleDownloadMyResultPDF}
              className="mt-6 px-6 py-4 bg-purple-600 text-white font-bold text-lg rounded-xl border-2 border-black shadow-hard hover:bg-purple-700 flex items-center justify-center gap-2 mx-auto"
            >
              <Download className="w-6 h-6" />
              내 결과 PDF 다운로드
            </button>
          </div>
        )}

        {/* 빙고판 */}
        <BingoBoard
          cells={session.bingoCells}
          cards={session.bingoCards}
          teams={session.teams}
          selectedCellIndex={gameState?.selectedCellIndex ?? null}
          onCellClick={isMyTurn && gameState?.phase === GamePhase.SelectingCard ? handleCellSelect : undefined}
          isSelectable={isMyTurn && gameState?.phase === GamePhase.SelectingCard}
          currentTurnTeamId={currentTurnTeam?.id}
          completedLines={gameState?.completedBingoLines.map((_, i) => i) || []}
        />
      </div>

      {/* 카드 모달 */}
      {showCardModal && gameState?.currentCard && myTeam && (
        <CardModal
          card={gameState.currentCard}
          team={myTeam}
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          onSubmit={handleSubmitAnswer}
          existingAnswer={myAnswer}
          isSubmitting={isSubmitting}
          showResults={gameState.phase === GamePhase.ShowingResults}
          allAnswers={gameState.teamAnswers}
        />
      )}

      {/* 결과 보기 버튼 (제출 후) */}
      {myAnswer && gameState?.phase === GamePhase.ShowingResults && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-4 border-black">
          <button
            onClick={() => setShowCardModal(true)}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg border-2 border-black shadow-hard"
          >
            AI 분석 결과 상세보기
          </button>
        </div>
      )}
    </div>
  );
};

export default ParticipantView;
