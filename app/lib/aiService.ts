// AI 평가 서비스 (Google Gemini API 사용)
import { GameCard, TeamAnswer, AIEvaluationResult } from '../types';

// Gemini API 키 (실제 배포 시에는 환경변수로 관리)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// AI 평가 프롬프트 생성 (이유 분석용)
function createReasoningPrompt(card: GameCard, answer: TeamAnswer): string {
  const choiceText = card.choices.find(c => c.id === answer.choiceId)?.text || '';

  return `당신은 기업 교육 전문가입니다. 참가자가 작성한 '선택 이유'의 품질을 평가해주세요.

## 상황
${card.situation}

## 선택지
${card.choices.map(c => `${c.id}. ${c.text}`).join('\n')}

## 참가자가 선택한 답변
선택: ${answer.choiceId}. ${choiceText}

## 참가자가 작성한 선택 이유
${answer.reasoning}

## 평가 기준 (가산점 0-100점)
- 100점: 논리적이고 구체적이며, 상황 분석이 탁월함
- 90점: 논리적이고 적절한 근거가 있음
- 80점: 기본적인 논리는 있으나 구체성 부족
- 70점: 단순한 이유만 제시
- 60점 이하: 이유가 불충분하거나 상황과 맞지 않음

## 응답 형식 (반드시 다음 JSON 형식으로만 응답)
{
  "reasoningScore": 60-100 사이의 숫자,
  "feedback": "구체적이고 건설적인 피드백 (2-3문장)"
}

JSON만 응답하세요.`;
}

// 선택지 기본 점수 가져오기 (score가 없으면 기본값 80)
function getChoiceBaseScore(card: GameCard, choiceId: string): number {
  const choice = card.choices.find(c => c.id === choiceId);
  return choice?.score ?? 80;
}

// AI 평가 실행 (기본점수 + 이유 가산점)
export async function evaluateAnswer(
  card: GameCard,
  answer: TeamAnswer
): Promise<AIEvaluationResult> {
  // 선택지 기본 점수
  const baseScore = getChoiceBaseScore(card, answer.choiceId);

  // API 키가 없으면 더미 결과 반환
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API 키가 설정되지 않았습니다. 더미 결과를 반환합니다.');
    return createDummyResult(answer.teamId, baseScore);
  }

  try {
    const prompt = createReasoningPrompt(card, answer);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 응답을 찾을 수 없습니다.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const reasoningScore = Math.min(100, Math.max(60, Number(parsed.reasoningScore) || 70));

    // 최종 점수 = 선택지 점수 + 이유 가산점 (평균)
    const finalScore = Math.round((baseScore + reasoningScore) / 2);

    return {
      teamId: answer.teamId,
      score: finalScore,
      feedback: `[선택 ${baseScore}점 + 이유 ${reasoningScore}점] ${parsed.feedback || '평가를 완료했습니다.'}`,
      evaluatedAt: Date.now()
    };

  } catch (error) {
    console.error('AI 평가 오류:', error);
    return createDummyResult(answer.teamId, baseScore);
  }
}

// 여러 팀 답변 동시 평가
export async function evaluateAllAnswers(
  card: GameCard,
  answers: TeamAnswer[]
): Promise<AIEvaluationResult[]> {
  const evaluations = await Promise.all(
    answers.map(answer => evaluateAnswer(card, answer))
  );
  return evaluations;
}

// 더미 결과 생성 (API 키가 없거나 오류 시)
function createDummyResult(teamId: string, baseScore: number): AIEvaluationResult {
  const reasoningScore = Math.floor(Math.random() * 30) + 70; // 70-100점
  const finalScore = Math.round((baseScore + reasoningScore) / 2);

  const feedbacks = [
    `[선택 ${baseScore}점 + 이유 ${reasoningScore}점] 상황을 잘 이해하고 적절한 선택을 했습니다. 이유도 논리적입니다.`,
    `[선택 ${baseScore}점 + 이유 ${reasoningScore}점] 논리적인 접근이 돋보입니다. 좀 더 구체적인 근거가 있으면 좋겠습니다.`,
    `[선택 ${baseScore}점 + 이유 ${reasoningScore}점] 창의적인 관점이 있습니다. 실무 적용 가능성도 고려해보세요.`,
    `[선택 ${baseScore}점 + 이유 ${reasoningScore}점] 실용적인 답변입니다. 다양한 관점을 더 고려하면 좋겠습니다.`,
  ];

  return {
    teamId,
    score: finalScore,
    feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)],
    evaluatedAt: Date.now()
  };
}

// 승자 결정 (가장 높은 점수)
export function determineWinner(results: AIEvaluationResult[]): AIEvaluationResult | null {
  if (results.length === 0) return null;

  return results.reduce((highest, current) =>
    current.score > highest.score ? current : highest
  );
}
