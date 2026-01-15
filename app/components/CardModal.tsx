import React, { useState } from 'react';
import { GameCard, Choice, TeamAnswer, Team, TEAM_COLORS } from '../types';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';

interface CardModalProps {
  card: GameCard;
  team: Team;
  isOpen: boolean;
  onClose?: () => void;
  onSubmit: (choiceId: string, reasoning: string) => void;
  existingAnswer?: TeamAnswer;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
  showResults?: boolean;
  allAnswers?: TeamAnswer[];
}

const CardModal: React.FC<CardModalProps> = ({
  card,
  team,
  isOpen,
  onClose,
  onSubmit,
  existingAnswer,
  isSubmitting = false,
  isReadOnly = false,
  showResults = false,
  allAnswers = []
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string>(existingAnswer?.choiceId || '');
  const [reasoning, setReasoning] = useState<string>(existingAnswer?.reasoning || '');

  if (!isOpen) return null;

  const teamColor = TEAM_COLORS[team.colorIndex];

  const handleSubmit = () => {
    if (!selectedChoice || !reasoning.trim()) {
      alert('선택지와 이유를 모두 입력해주세요.');
      return;
    }
    onSubmit(selectedChoice, reasoning.trim());
  };

  const isAlreadySubmitted = !!existingAnswer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl"
        style={{ borderTop: `6px solid ${teamColor.bg}` }}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b">
          <div>
            <h2 className="text-xl font-black text-gray-800">{card.title}</h2>
            <span
              className="inline-block px-2 py-0.5 mt-1 text-xs font-bold rounded"
              style={{ backgroundColor: teamColor.light, color: teamColor.bg }}
            >
              {team.name}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* 상황 설명 */}
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <h3 className="text-sm font-bold text-gray-500 mb-2">상황</h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {card.situation}
            </p>
          </div>

          {/* 선택지 */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-3">선택지</h3>
            <div className="space-y-2">
              {card.choices.map((choice) => {
                const isSelected = selectedChoice === choice.id;
                const isDisabled = isReadOnly || isAlreadySubmitted;

                return (
                  <button
                    key={choice.id}
                    onClick={() => !isDisabled && setSelectedChoice(choice.id)}
                    disabled={isDisabled}
                    className={`
                      w-full p-4 text-left rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                      ${isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`
                          flex-shrink-0 w-8 h-8 flex items-center justify-center
                          rounded-full font-bold text-sm
                          ${isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                          }
                        `}
                      >
                        {choice.id}
                      </span>
                      <span className="text-gray-800">{choice.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이유 작성 */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-2">
              선택 이유 (AI가 평가합니다)
            </h3>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="왜 이 선택이 적절한지 구체적으로 작성해주세요..."
              disabled={isReadOnly || isAlreadySubmitted}
              className={`
                w-full h-32 p-4 border-2 rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${isReadOnly || isAlreadySubmitted
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-white'
                }
              `}
            />
          </div>

          {/* 제출 완료 표시 */}
          {isAlreadySubmitted && !showResults && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">답변이 제출되었습니다. AI 분석 결과를 기다려주세요.</span>
            </div>
          )}

          {/* AI 결과 표시 */}
          {showResults && existingAnswer?.aiScore !== undefined && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <h3 className="text-lg font-bold text-purple-800 mb-2">
                AI 분석 결과
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-black text-purple-600">
                  {existingAnswer.aiScore}점
                </div>
                <div className="text-sm text-gray-600">
                  / 100점
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {existingAnswer.aiFeedback}
              </p>
            </div>
          )}

          {/* 다른 팀 결과 (결과 화면에서) */}
          {showResults && allAnswers.length > 1 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-3">모든 팀 결과</h3>
              <div className="space-y-2">
                {allAnswers
                  .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                  .map((answer, idx) => (
                    <div
                      key={answer.teamId}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        ${idx === 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="text-yellow-500">🏆</span>}
                        <span className="font-bold">{answer.teamName}</span>
                        <span className="text-sm text-gray-500">
                          선택: {answer.choiceId}
                        </span>
                      </div>
                      <span className={`font-black ${idx === 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {answer.aiScore || 0}점
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          {!isReadOnly && !isAlreadySubmitted && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedChoice || !reasoning.trim()}
              className={`
                w-full py-4 flex items-center justify-center gap-2
                font-bold text-lg rounded-lg transition-all
                ${isSubmitting || !selectedChoice || !reasoning.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-98'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  제출 중...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  답변 제출하기
                </>
              )}
            </button>
          )}

          {/* 학습 포인트 */}
          {card.learningPoint && showResults && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-bold text-blue-600 mb-1">학습 포인트</h3>
              <p className="text-blue-800">{card.learningPoint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardModal;
