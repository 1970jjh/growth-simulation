import React, { useState } from 'react';
import { GameCard, Choice, TeamAnswer, Team, TEAM_COLORS } from '../types';
import { X, Send, Loader2, CheckCircle, Sparkles } from 'lucide-react';

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

// AI 피드백 파싱 함수
function parseAIFeedback(feedback: string) {
  const result = {
    strength: '',
    risk: '',
    summary: '',
    modelAnswer: '',
    metrics: {
      resource: 0,
      energy: 0,
      trust: 0,
      competency: 0,
      insight: 0
    },
    scores: {
      choice: 0,
      reasoning: 0,
      total: 0
    }
  };

  // 장점 파싱
  const strengthMatch = feedback.match(/\[장점\]\n?([\s\S]*?)(?=\[리스크\]|$)/);
  if (strengthMatch) result.strength = strengthMatch[1].trim();

  // 리스크 파싱
  const riskMatch = feedback.match(/\[리스크\]\n?([\s\S]*?)(?=\[총평\]|$)/);
  if (riskMatch) result.risk = riskMatch[1].trim();

  // 총평 파싱
  const summaryMatch = feedback.match(/\[총평\]\n?([\s\S]*?)(?=\[모범답안\]|$)/);
  if (summaryMatch) result.summary = summaryMatch[1].trim();

  // 모범답안 파싱
  const modelMatch = feedback.match(/\[모범답안\]\n?([\s\S]*?)(?=\[METRICS\]|$)/);
  if (modelMatch) result.modelAnswer = modelMatch[1].trim();

  // METRICS 파싱
  const metricsMatch = feedback.match(/\[METRICS\]\n?([\s\S]*?)(?=\[SCORES\]|$)/);
  if (metricsMatch) {
    const metricsLine = metricsMatch[1].trim();
    const parts = metricsLine.split('|');
    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        const keyLower = key.toLowerCase().trim();
        const numValue = parseInt(value, 10);
        if (keyLower in result.metrics) {
          (result.metrics as any)[keyLower] = numValue;
        }
      }
    });
  }

  // SCORES 파싱
  const scoresMatch = feedback.match(/\[SCORES\]\n?([\s\S]*?)$/);
  if (scoresMatch) {
    const scoresLine = scoresMatch[1].trim();
    const parts = scoresLine.split('|');
    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (key && value) {
        const keyTrim = key.trim();
        const numValue = parseInt(value, 10);
        if (keyTrim === '선택') result.scores.choice = numValue;
        if (keyTrim === '이유') result.scores.reasoning = numValue;
        if (keyTrim === '총점') result.scores.total = numValue;
      }
    });
  }

  return result;
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

  // AI 피드백 파싱
  const parsedFeedback = existingAnswer?.aiFeedback ? parseAIFeedback(existingAnswer.aiFeedback) : null;

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
                const isExistingChoice = existingAnswer?.choiceId === choice.id;
                const isDisabled = isReadOnly || isAlreadySubmitted;

                return (
                  <button
                    key={choice.id}
                    onClick={() => !isDisabled && setSelectedChoice(choice.id)}
                    disabled={isDisabled}
                    className={`
                      w-full p-4 text-left rounded-lg border-2 transition-all
                      ${isSelected || isExistingChoice
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
                          ${isSelected || isExistingChoice
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                          }
                        `}
                      >
                        {choice.id}
                      </span>
                      <div className="flex-1">
                        <span className="text-gray-800">{choice.text}</span>
                        {isExistingChoice && showResults && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded">
                            {existingAnswer?.teamName || team.name} 선택
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 팀 응답 섹션 */}
          {isAlreadySubmitted && (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💬</span>
                <h3 className="font-bold text-gray-800">{team.name}의 응답</h3>
              </div>
              <p className="text-sm text-gray-500 mb-1">선택 이유</p>
              <p className="text-gray-800 bg-white p-3 rounded border">{existingAnswer?.reasoning}</p>
            </div>
          )}

          {/* 이유 작성 (제출 전) */}
          {!isAlreadySubmitted && (
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
          )}

          {/* 제출 완료 표시 */}
          {isAlreadySubmitted && !showResults && (
            <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">답변이 제출되었습니다. AI 분석 결과를 기다려주세요.</span>
            </div>
          )}

          {/* AI 결과 표시 - 새로운 형식 */}
          {showResults && existingAnswer?.aiScore !== undefined && parsedFeedback && (
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-gray-800">
                  AI EVALUATION RESULT
                </h3>
              </div>

              {/* 장점 */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-sm font-bold text-orange-600 bg-orange-100 rounded border border-orange-300 mb-2">
                  장점
                </span>
                <p className="text-gray-700 leading-relaxed">
                  {parsedFeedback.strength || '분석 중...'}
                </p>
              </div>

              {/* 리스크 */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-sm font-bold text-red-600 bg-red-100 rounded border border-red-300 mb-2">
                  리스크
                </span>
                <p className="text-gray-700 leading-relaxed">
                  {parsedFeedback.risk || '분석 중...'}
                </p>
              </div>

              {/* 총평 */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-sm font-bold text-blue-600 bg-blue-100 rounded border border-blue-300 mb-2">
                  총평
                </span>
                <p className="text-gray-700 leading-relaxed">
                  {parsedFeedback.summary || '분석 중...'}
                </p>
              </div>

              {/* 모범답안 */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-sm font-bold text-green-600 bg-green-100 rounded border border-green-300 mb-2">
                  모범답안
                </span>
                <p className="text-gray-700 leading-relaxed">
                  {parsedFeedback.modelAnswer || '분석 중...'}
                </p>
              </div>

              {/* 5가지 지표 */}
              <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-gray-200">
                {[
                  { key: 'resource', label: 'RESOURCE', value: parsedFeedback.metrics.resource },
                  { key: 'energy', label: 'ENERGY', value: parsedFeedback.metrics.energy },
                  { key: 'trust', label: 'TRUST', value: parsedFeedback.metrics.trust },
                  { key: 'competency', label: 'COMPETENCY', value: parsedFeedback.metrics.competency },
                  { key: 'insight', label: 'INSIGHT', value: parsedFeedback.metrics.insight },
                ].map((metric) => (
                  <div
                    key={metric.key}
                    className="text-center p-2 bg-gray-50 rounded border"
                  >
                    <p className="text-xs font-bold text-gray-500 mb-1">{metric.label}</p>
                    <p className={`text-xl font-black ${
                      metric.value > 0 ? 'text-green-600' :
                      metric.value < 0 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {metric.value > 0 ? `+${metric.value}` : metric.value}
                    </p>
                  </div>
                ))}
              </div>
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

          {/* ACCEPT & CONTINUE 버튼 (결과 확인 후) */}
          {showResults && onClose && (
            <button
              onClick={onClose}
              className="w-full py-4 bg-gray-900 text-white font-bold text-lg rounded-lg hover:bg-gray-800 transition-colors"
            >
              ACCEPT & CONTINUE
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
