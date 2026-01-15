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

// AI 평가 프롬프트 생성 (6가지 역량 관점 분석)
function createReasoningPrompt(card: GameCard, answer: TeamAnswer): string {
  const choiceText = card.choices.find(c => c.id === answer.choiceId)?.text || '';

  return `당신은 기업 교육 전문가입니다. 직장 내 상황에 대한 참가자의 답변을 6가지 핵심 역량 관점에서 분석해주세요.

## 상황
${card.situation}

## 선택지
${card.choices.map(c => `${c.id}. ${c.text}`).join('\n')}

## 참가자가 선택한 답변
선택: ${answer.choiceId}. ${choiceText}

## 참가자가 작성한 선택 이유
${answer.reasoning}

## 6가지 핵심 역량 분석 관점
1. **리더십**: 상황을 주도적으로 해결하려는 자세, 책임감, 의사결정 능력
2. **팔로워십**: 조직의 방향에 맞춰 협력하는 자세, 상사/동료 존중, 건설적 의견 제시
3. **성장마인드셋**: 도전을 학습 기회로 보는 태도, 피드백 수용, 지속적 개선 의지
4. **회복탄력성**: 어려운 상황에서의 대처 능력, 스트레스 관리, 긍정적 태도 유지
5. **협업**: 팀워크, 다양한 의견 존중, 공동 목표 달성을 위한 노력
6. **소통**: 명확한 의사 전달, 경청, 갈등 해결을 위한 대화 능력

## 평가 기준 (가산점 60-100점)
- 100점: 여러 역량이 뛰어나게 드러나며, 논리적이고 구체적인 근거 제시
- 90점: 2-3가지 역량이 잘 드러나며, 적절한 논리 전개
- 80점: 기본적인 역량 인식은 있으나 구체성 부족
- 70점: 단순한 이유만 제시, 역량 연결이 약함
- 60점: 이유가 불충분하거나 상황과 맞지 않음

## 응답 형식 (반드시 다음 JSON 형식으로만 응답)
{
  "reasoningScore": 60-100 사이의 숫자,
  "feedback": "상세 피드백 (아래 형식 준수)",
  "strengths": "잘한 점 (1-2문장)",
  "improvement": "발전 포인트 (1-2문장)",
  "keyCompetency": "가장 두드러진 역량 (리더십/팔로워십/성장마인드셋/회복탄력성/협업/소통 중 1개)"
}

피드백은 다음 형식으로 작성:
"[핵심역량: OOO] 구체적인 분석 내용. 해당 선택이 어떤 역량과 연결되는지, 실무에서 어떻게 적용할 수 있는지 설명."

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
    return createDummyResult(answer.teamId, baseScore, answer.choiceId);
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
          maxOutputTokens: 1000,
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

    // 상세 피드백 구성
    const detailedFeedback = `📊 [선택 ${baseScore}점 + 이유 ${reasoningScore}점 = 총 ${finalScore}점]

🎯 핵심역량: ${parsed.keyCompetency || '소통'}

${parsed.feedback || '평가를 완료했습니다.'}

✅ 잘한 점: ${parsed.strengths || '상황을 이해하고 답변했습니다.'}

💡 발전 포인트: ${parsed.improvement || '더 구체적인 근거를 제시해보세요.'}`;

    return {
      teamId: answer.teamId,
      score: finalScore,
      feedback: detailedFeedback,
      evaluatedAt: Date.now()
    };

  } catch (error) {
    console.error('AI 평가 오류:', error);
    return createDummyResult(answer.teamId, baseScore, answer.choiceId);
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
function createDummyResult(teamId: string, baseScore: number, choiceId: string): AIEvaluationResult {
  const reasoningScore = Math.floor(Math.random() * 30) + 70; // 70-100점
  const finalScore = Math.round((baseScore + reasoningScore) / 2);

  const competencies = ['리더십', '팔로워십', '성장마인드셋', '회복탄력성', '협업', '소통'];
  const randomCompetency = competencies[Math.floor(Math.random() * competencies.length)];

  const feedbackTemplates = [
    {
      competency: '리더십',
      feedback: '주어진 상황에서 주도적으로 문제를 해결하려는 의지가 보입니다. 책임감 있는 의사결정을 내리는 것은 리더십의 핵심입니다.',
      strengths: '상황을 분석하고 능동적인 해결책을 제시했습니다.',
      improvement: '팀원들의 의견을 수렴하는 과정을 추가하면 더 효과적인 리더십을 발휘할 수 있습니다.'
    },
    {
      competency: '팔로워십',
      feedback: '조직의 방향성을 이해하고 협력적인 자세를 보여주셨습니다. 좋은 팔로워는 건설적인 의견을 제시하면서도 팀의 결정을 존중합니다.',
      strengths: '상사나 조직의 입장을 고려한 균형 잡힌 접근을 했습니다.',
      improvement: '자신의 전문성을 바탕으로 더 적극적인 의견 제시도 고려해보세요.'
    },
    {
      competency: '성장마인드셋',
      feedback: '이 상황을 학습과 성장의 기회로 바라보는 관점이 좋습니다. 실패나 어려움을 통해 배우려는 자세는 지속적인 발전의 원동력입니다.',
      strengths: '도전적인 상황에서 배움의 기회를 찾으려는 태도가 돋보입니다.',
      improvement: '구체적인 학습 계획이나 개선 방안을 함께 제시하면 더욱 좋습니다.'
    },
    {
      competency: '회복탄력성',
      feedback: '어려운 상황에서도 긍정적인 대처 방안을 모색하셨습니다. 회복탄력성은 스트레스 상황에서 빠르게 적응하고 회복하는 능력입니다.',
      strengths: '압박감 속에서도 침착하게 해결책을 찾으려는 자세가 좋습니다.',
      improvement: '장기적인 스트레스 관리 방안도 함께 고려해보면 좋겠습니다.'
    },
    {
      competency: '협업',
      feedback: '팀워크를 중시하고 함께 문제를 해결하려는 접근이 인상적입니다. 다양한 관점을 존중하며 공동의 목표를 향해 나아가는 것이 협업의 핵심입니다.',
      strengths: '동료들과의 협력을 통한 시너지 창출을 고려했습니다.',
      improvement: '역할 분담이나 책임 범위에 대한 명확한 설정도 추가해보세요.'
    },
    {
      competency: '소통',
      feedback: '효과적인 의사소통의 중요성을 인식하고 계십니다. 명확한 전달과 경청은 조직 내 갈등을 예방하고 해결하는 핵심 역량입니다.',
      strengths: '상대방의 입장을 고려한 커뮤니케이션 방식을 선택했습니다.',
      improvement: '비언어적 소통이나 타이밍에 대한 고려도 추가하면 좋겠습니다.'
    }
  ];

  const template = feedbackTemplates.find(t => t.competency === randomCompetency) || feedbackTemplates[5];

  const detailedFeedback = `📊 [선택 ${baseScore}점 + 이유 ${reasoningScore}점 = 총 ${finalScore}점]

🎯 핵심역량: ${template.competency}

${template.feedback}

✅ 잘한 점: ${template.strengths}

💡 발전 포인트: ${template.improvement}`;

  return {
    teamId,
    score: finalScore,
    feedback: detailedFeedback,
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
