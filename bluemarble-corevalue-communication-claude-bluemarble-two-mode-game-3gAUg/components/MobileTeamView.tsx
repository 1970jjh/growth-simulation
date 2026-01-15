import React from 'react';
import { Team, GamePhase, GameCard, Choice } from '../types';
import { Battery, Coins, Handshake, Lightbulb, TrendingUp, MapPin, Dice5, Save, CheckCircle, Eye, MessageSquare, LogOut, BookOpen } from 'lucide-react';
import { BOARD_SQUARES, getCharacterImage } from '../constants';

interface MobileTeamViewProps {
  team: Team;
  activeTeamName: string;
  isMyTurn: boolean;
  gamePhase: GamePhase;
  onRollDice: () => void;
  onLogout?: () => void;

  // Active Turn Props
  activeCard: GameCard | null;
  activeInput: { choice: Choice | null, reasoning: string };
  onInputChange: (choice: Choice, reason: string) => void;
  onSubmit: (choice?: Choice | null, reasoning?: string) => void;
  isTeamSaved: boolean;  // 팀이 저장했는지 여부
  isSaving: boolean;     // 저장 중 여부
  isGameStarted?: boolean;  // 게임 시작 여부
  isAiProcessing?: boolean;  // AI 분석 중 여부

  // 관람자 투표 (다른 팀 턴일 때)
  spectatorVote?: Choice | null;  // 관람자의 현재 선택
  onSpectatorVote?: (choice: Choice) => void;  // 관람자 투표 핸들러
  spectatorVotes?: { [optionId: string]: string[] };  // 다른 팀들의 투표 현황

  // 규칙서 보기
  teamNumber?: number;  // 팀 번호 (캐릭터 이미지용)
  onShowRules?: () => void;  // 규칙서 보기 핸들러
}

const MobileTeamView: React.FC<MobileTeamViewProps> = ({
  team,
  activeTeamName,
  isMyTurn,
  gamePhase,
  onRollDice,
  onLogout,
  activeCard,
  activeInput,
  onInputChange,
  onSubmit,
  isTeamSaved,
  isSaving,
  isGameStarted = true,
  isAiProcessing = false,
  spectatorVote,
  onSpectatorVote,
  spectatorVotes = {},
  teamNumber = 1,
  onShowRules
}) => {
  // 로컬 상태: 동시 사용자 입력 충돌 방지를 위해 로컬에서 관리
  const [localChoice, setLocalChoice] = React.useState<Choice | null>(null);
  const [localReasoning, setLocalReasoning] = React.useState('');

  // activeCard가 변경되면 로컬 상태 초기화 (새 카드가 나왔을 때)
  React.useEffect(() => {
    if (activeCard) {
      // 새 카드가 나오면 로컬 상태를 서버 상태로 초기화 (한 번만)
      setLocalChoice(activeInput.choice);
      setLocalReasoning(activeInput.reasoning);
    } else {
      // 카드가 없어지면 초기화
      setLocalChoice(null);
      setLocalReasoning('');
    }
  }, [activeCard?.id]); // activeCard의 id가 변경될 때만 실행

  const currentSquare = BOARD_SQUARES.find(s => s.index === team.position);
  const isOpenEnded = activeCard && (!activeCard.choices || activeCard.choices.length === 0);

  // 저장 핸들러: 로컬 상태를 서버에 직접 전달 (상태 업데이트 지연 문제 해결)
  const handleSave = () => {
    if (localChoice || isOpenEnded) {
      // 로컬 상태를 서버에 동기화 (UI 표시용)
      onInputChange(localChoice!, localReasoning);
      // 로컬 상태를 직접 전달하여 즉시 저장 (한 번 클릭으로 저장)
      onSubmit(localChoice, localReasoning);
    }
  };

  // ROLLER: 현재 주사위를 굴릴 팀원 이름
  const currentRollerName = team.members.length > 0
    ? team.members[team.currentMemberIndex]?.name || team.members[0]?.name || 'Leader'
    : 'Leader';

  const StatBox = ({ icon: Icon, value, label, color, max }: any) => (
    <div className="bg-white border-2 border-black p-3 shadow-hard-sm flex flex-col items-center justify-center relative overflow-hidden">
      <Icon className={`mb-1 ${color}`} size={20} />
      <span className={`text-xl font-black ${value < 0 ? 'text-red-600' : ''}`}>{value}</span>
      <span className="text-[10px] uppercase font-bold text-gray-500">{label}</span>
      {max && (
        <div className="w-full h-1 bg-gray-200 mt-1 relative">
          <div 
             className={`h-full bg-black transition-all duration-300`} 
             style={{ width: `${Math.min(100, Math.max(0, (value/max)*100))}%` }}
          ></div>
        </div>
      )}
      {value > max && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>}
      {value < 0 && <div className="absolute bottom-0 right-0 text-[8px] text-red-500 font-bold px-1">NEG</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-8 flex flex-col font-sans max-w-md mx-auto border-x-4 border-black bg-white">
      {/* Header */}
      <div className={`p-4 border-4 border-black mb-6 shadow-hard bg-${team.color.toLowerCase()}-100`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-bold uppercase text-gray-500">MY TEAM</h2>
            <h1 className="text-2xl font-black uppercase">{team.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 규칙서 보기 버튼 */}
            {onShowRules && (
              <button
                onClick={onShowRules}
                className="p-2 bg-blue-100 border-2 border-black hover:bg-blue-200 transition-colors"
                title="게임 규칙서"
              >
                <BookOpen size={16} />
              </button>
            )}
            {/* 팀 캐릭터 이미지 */}
            <img
              src={getCharacterImage(teamNumber)}
              alt={`Team ${teamNumber}`}
              className="w-10 h-10 object-contain border-2 border-black rounded-lg bg-white p-0.5"
            />
            {onLogout && (
              <button
                onClick={() => {
                  if (window.confirm('정말 로그아웃 하시겠습니까?')) {
                    onLogout();
                  }
                }}
                className="p-2 bg-gray-200 border-2 border-black hover:bg-red-100 transition-colors"
                title="로그아웃"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
        {/* 팀원 목록 표시 */}
        {team.members.length > 0 && (
          <div className="mt-2 text-sm text-gray-600 truncate">
            <span className="font-bold">팀원: </span>
            {team.members.map(m => m.name).join(', ')}
          </div>
        )}
      </div>

      {/* --- DECISION CARD VIEW (Active or Spectator) --- */}
      {activeCard && (
        <div className="mb-6 animate-in slide-in-from-bottom-5">
           {/* Header depends on Turn */}
           {isMyTurn ? (
             <div className="bg-black text-white p-3 border-4 border-black mb-2">
               <h3 className="font-bold text-sm uppercase text-yellow-400">Decision Required</h3>
               <h2 className="text-xl font-black leading-tight">{activeCard.title}</h2>
             </div>
           ) : (
             <div className="bg-purple-100 text-purple-800 p-3 border-4 border-purple-500 mb-2">
               <div className="flex items-center gap-2 mb-1">
                 <Eye size={18} />
                 <h3 className="font-bold text-xs uppercase">Spectating {activeTeamName}</h3>
               </div>
               <h2 className="text-lg font-black leading-tight text-black">{activeCard.title}</h2>
               <p className="text-xs mt-1 text-purple-600">
                 💡 나도 선택에 참여할 수 있습니다! (투표만, 점수 반영 없음)
               </p>
             </div>
           )}

           <div className="bg-white border-4 border-black p-4 mb-4">
             <p className="font-medium text-gray-800 mb-4 text-sm">"{activeCard.situation}"</p>

             {/* AI 분석 중 표시 */}
             {isAiProcessing && (
               <div className="bg-purple-100 border-4 border-purple-500 p-4 text-center mb-4 animate-pulse">
                 <div className="flex items-center justify-center gap-3">
                   <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                   <span className="font-bold text-purple-800">(AI 분석 중...)</span>
                 </div>
               </div>
             )}

             {/* 저장 완료 상태 */}
             {isTeamSaved ? (
               <div className="bg-green-100 border-4 border-green-600 p-6 text-center">
                 <CheckCircle className="mx-auto mb-3 text-green-600" size={48} />
                 <h3 className="text-lg font-black text-green-800 mb-2">저장 완료!</h3>
                 <p className="text-sm text-green-700 font-medium">
                   {isAiProcessing ? (
                     <>AI가 분석 중입니다...<br/>잠시만 기다려주세요.</>
                   ) : (
                     <>관리자가 AI 분석을 진행할 예정입니다.<br/>잠시만 기다려주세요.</>
                   )}
                 </p>
               </div>
             ) : (
               <>
                 {/* Choices (Only if not open ended) - 로컬 상태 사용 */}
                 {!isOpenEnded && activeCard.choices && (
                    <div className="space-y-2 mb-4">
                      {activeCard.choices.map(choice => {
                        // 로컬 상태로 선택 여부 확인 (서버 상태가 아닌 로컬 상태)
                        const isMyChoice = isMyTurn && localChoice?.id === choice.id;
                        const isMySpectatorVote = !isMyTurn && spectatorVote?.id === choice.id;
                        const voterTeams = spectatorVotes[choice.id] || [];
                        const hasOtherVotes = voterTeams.length > 0;

                        return (
                          <button
                            key={choice.id}
                            onClick={() => {
                              if (isMyTurn) {
                                // 로컬 상태만 업데이트 (서버에 즉시 전송하지 않음)
                                setLocalChoice(choice);
                              } else if (onSpectatorVote) {
                                // 관람자 투표
                                onSpectatorVote(choice);
                              }
                            }}
                            className={`w-full text-left p-3 border-2 font-bold text-sm transition-all relative
                              ${isMyChoice
                                  ? 'bg-blue-600 text-white border-black transform -translate-y-1 shadow-md'
                                  : isMySpectatorVote
                                    ? 'bg-purple-500 text-white border-purple-700 transform -translate-y-1'
                                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}
                            `}
                          >
                            <div className="flex gap-2 items-start">
                              <span className={`px-2 ${isMyChoice ? 'bg-white text-blue-600' : 'bg-black text-white'} text-xs flex items-center shrink-0`}>{choice.id}</span>
                              <span className="flex-1">{choice.text}</span>
                              {isMyChoice && (
                                <span className="bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold">
                                  선택됨
                                </span>
                              )}
                              {isMySpectatorVote && (
                                <span className="bg-purple-700 text-white text-[10px] px-2 py-0.5 rounded-full shrink-0">
                                  MY VOTE
                                </span>
                              )}
                            </div>
                            {/* 다른 팀들의 투표 표시 */}
                            {hasOtherVotes && (
                              <div className="mt-2 flex flex-wrap gap-1 pl-7">
                                {voterTeams.map((voterName, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                  >
                                    👥 {voterName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                 )}

                 {/* Open Ended Indicator */}
                 {isOpenEnded && (
                    <div className="flex items-center gap-2 text-purple-900 font-bold bg-purple-100 p-3 border-2 border-purple-900 mb-4 text-sm">
                      <MessageSquare size={16} />
                      <span>주관식 답변: 자유롭게 작성하세요.</span>
                    </div>
                 )}

                 {/* Reasoning Input - 로컬 상태 사용 (동시 사용자 충돌 방지) */}
                 {(isMyTurn || localChoice || isOpenEnded) && (
                   <>
                     <textarea
                       value={localReasoning}
                       onChange={(e) => isMyTurn && setLocalReasoning(e.target.value)}
                       disabled={!isMyTurn}
                       placeholder={isMyTurn ? (isOpenEnded ? "답변을 입력하세요..." : "선택 사유를 입력하세요...") : "다른 팀이 사유를 입력중입니다..."}
                       className="w-full p-2 border-2 border-black font-medium text-sm focus:outline-none focus:bg-yellow-50 mb-3 h-24 resize-none disabled:bg-gray-100 disabled:text-gray-500"
                     />

                     {isMyTurn ? (
                       <button
                         onClick={handleSave}
                         disabled={(!isOpenEnded && !localChoice) || !localReasoning.trim() || isSaving}
                         className="w-full py-3 bg-blue-600 text-white font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         {isSaving ? (
                           <>
                             <Save className="animate-pulse" size={16} />
                             저장 중...
                           </>
                         ) : (
                           <>
                             <Save size={16} />
                             저장하기
                           </>
                         )}
                       </button>
                     ) : (
                        <div className="w-full py-3 bg-gray-200 text-gray-500 font-bold uppercase text-center border-2 border-transparent">
                           팀 입력 대기 중...
                        </div>
                     )}
                   </>
                 )}
               </>
             )}
           </div>
        </div>
      )}

      {/* --- IDLE STATE (Your Board Info) --- */}
      {!activeCard && (
        <div className="mb-8">
          <div className="mb-4 relative">
             <div className="bg-white border-4 border-black p-6 pt-8 text-center shadow-hard">
                <MapPin className="mx-auto mb-2 text-blue-900" size={32} />
                <h3 className="text-xl font-black uppercase leading-tight">{currentSquare?.name}</h3>
             </div>
          </div>

          {/* ROLLER 표시 - 내 턴일 때만 */}
          {isMyTurn && team.members.length > 0 && (
            <div className="mb-3 bg-yellow-100 border-4 border-yellow-500 p-3 text-center">
              <p className="text-xs text-yellow-700 font-bold uppercase mb-1">🎲 ROLLER</p>
              <p className="text-2xl font-black text-yellow-800">{currentRollerName}</p>
              <p className="text-xs text-yellow-600 mt-1">팀원들과 돌아가며 주사위를 굴려보세요!</p>
            </div>
          )}

          {/* 게임 시작 대기 중 */}
          {!isGameStarted || gamePhase === GamePhase.WaitingToStart ? (
            <div className="w-full py-6 border-4 border-black text-xl font-black shadow-hard uppercase flex flex-col items-center justify-center gap-2 bg-gray-200 text-gray-600">
              <div className="animate-pulse">⏳</div>
              <span>관리자가 게임을 시작하면</span>
              <span>주사위를 굴릴 수 있습니다</span>
            </div>
          ) : gamePhase === GamePhase.Paused ? (
            <div className="w-full py-6 border-4 border-black text-xl font-black shadow-hard uppercase flex flex-col items-center justify-center gap-2 bg-orange-100 text-orange-700">
              <div>⏸️</div>
              <span>게임 일시정지 중</span>
            </div>
          ) : (
            <button
              onClick={onRollDice}
              disabled={!isMyTurn || gamePhase !== GamePhase.Idle}
              className={`w-full py-6 border-4 border-black text-xl font-black shadow-hard uppercase flex items-center justify-center gap-3 transition-all
                ${isMyTurn && gamePhase === GamePhase.Idle
                  ? 'bg-yellow-400 hover:bg-yellow-300 animate-pulse text-black'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              {gamePhase === GamePhase.Rolling ? (
                <>
                  <Dice5 size={28} className="animate-spin" />
                  주사위 굴리는 중...
                </>
              ) : gamePhase === GamePhase.Moving ? (
                <>
                  <MapPin size={28} />
                  이동 중...
                </>
              ) : isMyTurn ? (
                <>
                  <Dice5 size={28} />
                  ROLL DICE
                </>
              ) : (
                `Wait: ${activeTeamName}'s Turn`
              )}
            </button>
          )}
        </div>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox icon={Coins} value={team.resources.capital} label="Resource" color="text-yellow-600" max={100} />
        <StatBox icon={Battery} value={team.resources.energy} label="Energy" color="text-orange-500" max={100} />
        <StatBox icon={Handshake} value={team.resources.trust} label="Trust" color="text-blue-500" max={100} />
        <StatBox icon={TrendingUp} value={team.resources.competency} label="Skill" color="text-green-600" max={100} />
        <StatBox icon={Lightbulb} value={team.resources.insight} label="Insight" color="text-purple-600" max={100} />
      </div>
    </div>
  );
};

export default MobileTeamView;