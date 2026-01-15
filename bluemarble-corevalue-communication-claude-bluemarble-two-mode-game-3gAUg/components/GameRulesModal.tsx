import React from 'react';
import { X, Dice5, MessageSquare, Trophy, Gift, AlertTriangle, Users, Target, Zap, Star, Award, RefreshCw } from 'lucide-react';
import { GameVersion } from '../types';

interface GameRulesModalProps {
  visible: boolean;
  onClose: () => void;
  gameMode: GameVersion;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({
  visible,
  onClose,
  gameMode
}) => {
  if (!visible) return null;

  // 커스텀 모드 확인
  const isCustomMode = gameMode === GameVersion.Custom;

  // 모드별 제목
  const getModeTitle = () => {
    switch (gameMode) {
      case GameVersion.CoreValue:
        return '핵심가치 리더십 시뮬레이션';
      case GameVersion.Communication:
        return '소통&갈등관리 시뮬레이션';
      case GameVersion.NewEmployee:
        return '신입직원 직장생활 시뮬레이션';
      case GameVersion.Custom:
        return '커스텀 시뮬레이션';
      default:
        return '리더십 시뮬레이션';
    }
  };

  // 모드별 설명
  const getModeDescription = () => {
    switch (gameMode) {
      case GameVersion.CoreValue:
        return '조직의 핵심가치를 실제 상황에서 어떻게 적용하는지 체험하는 게임입니다. 인재제일, 최고지향, 변화선도, 상생추구 등 22개의 핵심가치 상황을 경험하며 올바른 의사결정 역량을 키웁니다.';
      case GameVersion.Communication:
        return '직장 내 다양한 소통 상황과 갈등 상황에서 효과적으로 대처하는 방법을 배우는 게임입니다. 경청, 피드백, 협상, 갈등 해결 등 실제 업무에서 자주 마주하는 상황을 시뮬레이션합니다.';
      case GameVersion.NewEmployee:
        return '신입사원으로서 직장생활 초기에 겪는 다양한 상황을 미리 경험해보는 게임입니다. 비즈니스 매너, 업무 보고, 선후배 관계 등 실무에서 필요한 기본기를 익힙니다.';
      case GameVersion.Custom:
        return '관리자가 업로드한 커스텀 상황 카드로 진행되는 맞춤형 시뮬레이션입니다. 31개의 상황 카드와 특수 효과를 가진 칸들이 있습니다.';
      default:
        return '';
    }
  };

  // 모드별 주요 역량
  const getModeCompetencies = () => {
    switch (gameMode) {
      case GameVersion.CoreValue:
        return ['인재제일', '최고지향', '변화선도', '정도경영', '상생추구', '고객 최우선', '도전적 실행', '소통과 협력', '안전', '글로벌 지향', '윤리', '창의'];
      case GameVersion.Communication:
        return ['경청의 기술', '전달의 기술', '피드백 달인', '갈등 해결사', '협상의 달인', '중재의 기술', '감정 컨트롤', '비언어적 소통', '당당한 표현'];
      case GameVersion.NewEmployee:
        return ['비즈니스 매너', '업무 보고', '일정 관리', '이메일 작성', '회의 참여', '선후배 관계', '실수 대처', '질문 스킬'];
      case GameVersion.Custom:
        return ['커스텀 상황 카드'];
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-200">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 sticky top-0 z-10 border-b-4 border-black">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">게임 규칙서</div>
              <h2 className="text-2xl font-black">{getModeTitle()}</h2>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors border-2 border-white/50"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 게임 소개 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <Target className="text-blue-600" size={20} />
              게임 소개
            </h3>
            <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              {getModeDescription()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {getModeCompetencies().slice(0, 6).map((comp, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 text-sm rounded-lg font-medium">
                  {comp}
                </span>
              ))}
              {getModeCompetencies().length > 6 && (
                <span className="text-gray-500 text-sm py-1">+{getModeCompetencies().length - 6}개 역량</span>
              )}
            </div>
          </section>

          {/* 게임 진행 순서 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <RefreshCw className="text-green-600" size={20} />
              게임 진행 순서
            </h3>
            <div className="space-y-3">
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                <div className="flex items-start gap-3">
                  <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-full font-black shrink-0">1</div>
                  <div>
                    <div className="font-bold text-gray-800">주사위 굴리기 🎲</div>
                    <p className="text-sm text-gray-600 mt-1">
                      자신의 턴이 되면 <strong>ROLLER</strong>로 지정된 팀원이 주사위를 굴립니다.
                      <br />팀원들이 돌아가며 ROLLER가 됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-black shrink-0">2</div>
                  <div>
                    <div className="font-bold text-gray-800">상황 카드 확인 📋</div>
                    <p className="text-sm text-gray-600 mt-1">
                      도착한 칸에 해당하는 상황 카드가 나타납니다.
                      <br />상황을 팀원들과 함께 읽고 토의하세요.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-black shrink-0">3</div>
                  <div>
                    <div className="font-bold text-gray-800">선택 & 이유 작성 ✍️</div>
                    <p className="text-sm text-gray-600 mt-1">
                      제시된 선택지 중 하나를 고르고, <strong>선택 이유를 상세히 작성</strong>합니다.
                      <br />⚠️ <span className="text-red-600 font-bold">성의 있고 구체적인 답변</span>이 AI 평가에서 높은 점수를 받습니다!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <div className="flex items-start gap-3">
                  <div className="bg-green-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-black shrink-0">4</div>
                  <div>
                    <div className="font-bold text-gray-800">AI 평가 & 점수 반영 🤖</div>
                    <p className="text-sm text-gray-600 mt-1">
                      AI가 팀의 응답을 분석하여 자원(시간), 에너지, 신뢰, 역량, 통찰력 점수를 평가합니다.
                      <br />실제 자원과 에너지 소모를 반영하여 현실적인 피드백을 제공합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 더블 찬스 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <Dice5 className="text-yellow-600" size={20} />
              더블 찬스 (주사위 더블)
            </h3>
            <div className="bg-yellow-100 p-4 rounded-lg border-2 border-yellow-400">
              <p className="text-gray-700">
                주사위 두 개가 <strong className="text-yellow-700">같은 숫자</strong>가 나오면 <span className="bg-yellow-400 text-black px-2 py-0.5 rounded font-bold">DOUBLE CHANCE!</span>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                🎲 AI 평가 점수가 <strong className="text-yellow-700">2배</strong>로 적용됩니다! (양수/음수 모두)
              </p>
            </div>
          </section>

          {/* 찬스카드 & 리스크카드 (일반 모드) / 특수 칸 효과 (커스텀 모드) */}
          {isCustomMode ? (
            <section>
              <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
                <Zap className="text-orange-600" size={20} />
                커스텀 모드 특수 칸
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-400">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-blue-700">🎲 2배 찬스</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    해당 팀이 얻는 AI 평가 점수가 <strong>2배</strong>로 적용됩니다.
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-400">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-700">🚀 3배 찬스</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    해당 팀이 얻는 AI 평가 점수가 <strong>3배</strong>로 적용됩니다.
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-400">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-green-700">🤝 나눔카드</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    해당 팀이 얻은 점수가 <strong>모든 팀에게 동일하게</strong> 적용됩니다.
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-2 border-red-400">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-red-700">🔥 번아웃존</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    해당 칸에 도착하면 5개 영역에서 <strong>각각 -10 POINT</strong>를 잃고 시작합니다.
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-400">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-amber-700">📈 성장펀드</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    해당 칸에 도착하면 5개 영역에서 <strong>각각 +10 POINT</strong>를 받고 시작합니다.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
                <Zap className="text-orange-600" size={20} />
                찬스카드 & 리스크카드
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-400">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="text-green-600" size={20} />
                    <span className="font-bold text-green-700">🎫 찬스 카드 (1/2/3번째)</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    복권 보너스! 강사님에게 팀 복권을 받으세요.
                    <br />게임 종료 시 추가 보상 기회!
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-2 border-red-400">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-red-600" size={20} />
                    <span className="font-bold text-red-700">💀 리스크 카드 (2/4번째)</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    위험! 모든 AI 점수가 마이너스로 적용됩니다.
                    <br />보유 복권을 다른 팀에게 양도해야 할 수도!
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 한 바퀴 보너스 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <Star className="text-amber-500" size={20} />
              한 바퀴 완주 보너스
            </h3>
            <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-400">
              <p className="text-gray-700 mb-3">
                보드를 한 바퀴 돌아 <strong>출발점을 지나거나 도착</strong>하면 보너스를 받습니다!
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-sm font-bold">자원 +20</span>
                <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-sm font-bold">에너지 +40</span>
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm font-bold">신뢰 +10</span>
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm font-bold">역량 +10</span>
                <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-sm font-bold">통찰력 +10</span>
              </div>
            </div>
          </section>

          {/* 다른 팀 턴일 때 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <Users className="text-indigo-600" size={20} />
              다른 팀 턴일 때
            </h3>
            <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-300">
              <p className="text-gray-700">
                다른 팀의 턴에도 <strong>관람자 투표</strong>에 참여할 수 있습니다!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                👁️ 상황 카드를 보고 나라면 어떤 선택을 할지 투표해보세요.
                <br />관람자 투표는 점수에 반영되지 않습니다.
              </p>
            </div>
          </section>

          {/* AI 평가 기준 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <MessageSquare className="text-teal-600" size={20} />
              AI 평가 기준
            </h3>
            <div className="bg-teal-50 p-4 rounded-lg border-2 border-teal-300">
              <p className="text-gray-700 mb-3">AI는 다음 기준으로 응답을 평가합니다:</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✅ <strong>성실성</strong>: 구체적이고 상세한 이유 작성</li>
                <li>✅ <strong>논리성</strong>: 상황에 맞는 합리적 판단</li>
                <li>✅ <strong>현실성</strong>: 실제 업무 환경을 고려한 답변</li>
                <li>❌ <strong>성의 없는 답변</strong>: 짧고 모호한 답변은 감점!</li>
                <li>⚠️ <strong>자원/에너지 소모</strong>: 현실적인 자원 소모 반영</li>
              </ul>
            </div>
          </section>

          {/* 우승 조건 */}
          <section>
            <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              우승 조건
            </h3>
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-lg border-2 border-yellow-400">
              <p className="text-gray-700 mb-3">
                게임 종료 시 <strong>총 점수</strong>가 가장 높은 팀이 우승합니다!
              </p>
              <div className="text-sm text-gray-600">
                <p>📊 총 점수 = 자원(시간) + 에너지 + 신뢰 + 역량 + 통찰력</p>
                <p className="mt-2">💡 팁: 모든 자원의 균형 있는 관리가 중요합니다!</p>
              </div>
            </div>
          </section>

          {/* 특수 칸 설명 (일반 모드만) */}
          {!isCustomMode && (
            <section>
              <h3 className="text-lg font-black text-gray-800 mb-3 flex items-center gap-2">
                <Award className="text-pink-600" size={20} />
                특수 칸 안내
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="font-bold w-24">🔥 번아웃 존</span>
                  <span className="text-gray-600">에너지 감소 주의! 번아웃 상황 카드 등장</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="font-bold w-24">🌍 글로벌 기회</span>
                  <span className="text-gray-600">글로벌 상황 카드 등장</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="font-bold w-24">🚀 도전 과제</span>
                  <span className="text-gray-600">도전적인 상황 카드 등장</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="font-bold w-24">📈 성장 펀드</span>
                  <span className="text-gray-600">성장 기회 상황 카드 등장</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-100 p-4 border-t-4 border-black">
          <button
            onClick={onClose}
            className="w-full py-3 bg-black text-white font-black uppercase hover:bg-gray-800 transition-colors"
          >
            규칙서 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameRulesModal;
