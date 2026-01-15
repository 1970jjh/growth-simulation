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

// AI 평가 프롬프트 생성
function createEvaluationPrompt(card: GameCard, answer: TeamAnswer): string {
  const choiceText = card.choices.find(c => c.id === answer.choiceId)?.text || '';

  return `당신은 기업 교육 전문가입니다. 다음 상황에 대한 참가자의 답변을 평가해주세요.

## 상황
${card.situation}

## 선택지
${card.choices.map(c => `${c.id}. ${c.text}`).join('\n')}

## 참가자가 선택한 답변
선택: ${answer.choiceId}. ${choiceText}

## 선택 이유
${answer.reasoning}

## 평가 기준
1. 상황 이해도 (20점): 상황을 정확히 파악했는가?
2. 논리적 근거 (30점): 선택의 이유가 논리적인가?
3. 실무 적용 가능성 (25점): 실제 업무에서 적용 가능한 답변인가?
4. 창의성 및 통찰력 (25점): 새로운 관점이나 깊은 통찰이 있는가?

## 응답 형식 (반드시 다음 JSON 형식으로만 응답)
{
  "score": 0-100 사이의 숫자,
  "feedback": "구체적이고 건설적인 피드백 (3-4문장)"
}

JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.`;
}

// AI 평가 실행
export async function evaluateAnswer(
  card: GameCard,
  answer: TeamAnswer
): Promise<AIEvaluationResult> {
  // API 키가 없으면 더미 결과 반환
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API 키가 설정되지 않았습니다. 더미 결과를 반환합니다.');
    return createDummyResult(answer.teamId);
  }

  try {
    const prompt = createEvaluationPrompt(card, answer);

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

    return {
      teamId: answer.teamId,
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      feedback: parsed.feedback || '평가를 완료했습니다.',
      evaluatedAt: Date.now()
    };

  } catch (error) {
    console.error('AI 평가 오류:', error);
    return createDummyResult(answer.teamId);
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
function createDummyResult(teamId: string): AIEvaluationResult {
  const randomScore = Math.floor(Math.random() * 40) + 50; // 50-90점
  const feedbacks = [
    '상황을 잘 이해하고 적절한 선택을 했습니다. 다만, 더 구체적인 근거를 제시하면 좋겠습니다.',
    '논리적인 접근이 돋보입니다. 실무 적용 시 고려해야 할 추가 사항들도 있습니다.',
    '창의적인 관점이 있습니다. 조금 더 체계적인 분석이 추가되면 완벽할 것 같습니다.',
    '실용적인 답변입니다. 팀워크와 커뮤니케이션 측면도 고려해보면 좋겠습니다.',
  ];

  return {
    teamId,
    score: randomScore,
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
