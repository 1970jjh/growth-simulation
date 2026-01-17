// AI 평가 서비스 (Google Gemini API 사용)
import { GameCard, TeamAnswer, AIEvaluationResult } from '../types';

// Gemini API 키 (실제 배포 시에는 환경변수로 관리)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// gemini-1.5-flash 사용 (gemini-pro는 더 이상 지원되지 않음)
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

// AI 평가 프롬프트 생성 (개선된 버전: 상황 맞춤 분석 + 공정한 점수 부여)
function createReasoningPrompt(card: GameCard, answer: TeamAnswer): string {
  const selectedChoice = card.choices.find(c => c.id === answer.choiceId);
  const choiceText = selectedChoice?.text || '';
  const choiceBaseScore = selectedChoice?.score ?? 80;

  // 선택지별 점수 정보 포함
  const choicesWithScores = card.choices.map(c =>
    `${c.id}. ${c.text}${c.score ? ` [기본점수: ${c.score}점]` : ''}`
  ).join('\n');

  return `당신은 기업 교육 전문가이자 공정한 평가자입니다.
주어진 직장 상황에 대해 참가자의 선택과 그 이유를 심층 분석하여 점수를 부여해야 합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 상황 설명
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${card.situation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 선택지 (기본점수는 해당 선택의 적절성을 반영)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${choicesWithScores}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 참가자의 선택
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
선택한 답: ${answer.choiceId}. ${choiceText}
선택지 기본 점수: ${choiceBaseScore}점

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 참가자가 작성한 선택 이유
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${answer.reasoning}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 평가 기준
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**이유 점수 (reasoningScore) 부여 기준:**
- 90-100점: 상황을 정확히 이해하고, 선택의 장단점을 깊이있게 분석함. 구체적인 근거와 실행 방안 제시
- 80-89점: 상황을 잘 이해하고 합리적인 이유를 제시함. 다소 일반적이지만 타당함
- 70-79점: 기본적인 이해는 있으나 분석이 피상적임. 더 깊은 고찰 필요
- 60-69점: 상황 이해가 부족하거나, 이유가 선택과 잘 맞지 않음. 논리적 연결 부족

**중요: 이유의 질이 좋으면 선택이 차선책이더라도 높은 이유점수를, 이유가 부실하면 최적 선택이라도 낮은 이유점수를 부여하세요.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 응답 형식 (JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

다음 JSON 형식으로만 응답하세요:

{
  "situationAnalysis": "이 상황에서 핵심적으로 고려해야 할 점이 무엇인지 1-2문장으로 설명",
  "choiceEvaluation": "참가자가 선택한 답변이 이 상황에 얼마나 적절한지 1-2문장으로 평가",
  "reasoningEvaluation": "참가자가 작성한 이유가 얼마나 논리적이고 깊이있는지 1-2문장으로 평가",
  "reasoningScore": 60-100 사이의 정수 (위의 기준에 따라 부여),
  "summary": "이 참가자에게 해주고 싶은 총평 (상황과 선택에 맞춤으로 2-3문장)",
  "modelAnswer": "이 상황에서 가장 이상적인 대응과 그 이유를 구체적으로 2-3문장으로",
  "metrics": {
    "resource": -5에서 +5 사이 정수,
    "energy": -5에서 +5 사이 정수,
    "trust": -5에서 +5 사이 정수,
    "competency": -5에서 +5 사이 정수,
    "insight": -5에서 +5 사이 정수
  }
}

**지표 설명:**
- resource: 업무 자원(시간, 비용 등)에 미치는 영향
- energy: 개인 에너지/스트레스에 미치는 영향
- trust: 조직 내 신뢰/평판에 미치는 영향
- competency: 역량 발휘/성장 가능성
- insight: 상황 파악력/판단력

JSON만 응답하세요. 다른 텍스트는 포함하지 마세요.`;
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
    return createDummyResult(answer.teamId, baseScore, answer.choiceId, card);
  }

  console.log('AI 평가 시작 - API 키 존재:', !!GEMINI_API_KEY);

  try {
    const prompt = createReasoningPrompt(card, answer);
    const apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

    console.log('API 호출 URL:', GEMINI_API_URL);

    const response = await fetch(apiUrl, {
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
          maxOutputTokens: 1500,
        }
      })
    });

    console.log('API 응답 상태:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 오류 응답:', errorText);
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

    // 지표 값 추출 (기본값 0)
    const metrics = parsed.metrics || {};
    const resource = Math.min(5, Math.max(-5, Number(metrics.resource) || 0));
    const energy = Math.min(5, Math.max(-5, Number(metrics.energy) || 0));
    const trust = Math.min(5, Math.max(-5, Number(metrics.trust) || 0));
    const competency = Math.min(5, Math.max(-5, Number(metrics.competency) || 0));
    const insight = Math.min(5, Math.max(-5, Number(metrics.insight) || 0));

    // 새로운 형식의 상세 피드백 구성 (상황 맞춤 분석 포함)
    const situationAnalysis = parsed.situationAnalysis || '';
    const choiceEvaluation = parsed.choiceEvaluation || '';
    const reasoningEvaluation = parsed.reasoningEvaluation || '';

    const detailedFeedback = `[상황분석]
${situationAnalysis}

[선택평가]
${choiceEvaluation}

[이유평가]
${reasoningEvaluation}

[총평]
${parsed.summary || '전반적으로 적절한 대응입니다.'}

[모범답안]
${parsed.modelAnswer || '상황에 따라 유연하게 대처하는 것이 좋습니다.'}

[METRICS]
RESOURCE:${resource >= 0 ? '+' : ''}${resource}|ENERGY:${energy >= 0 ? '+' : ''}${energy}|TRUST:${trust >= 0 ? '+' : ''}${trust}|COMPETENCY:${competency >= 0 ? '+' : ''}${competency}|INSIGHT:${insight >= 0 ? '+' : ''}${insight}

[SCORES]
선택:${baseScore}|이유:${reasoningScore}|총점:${finalScore}`;

    return {
      teamId: answer.teamId,
      score: finalScore,
      feedback: detailedFeedback,
      evaluatedAt: Date.now()
    };

  } catch (error) {
    console.error('AI 평가 오류:', error);
    return createDummyResult(answer.teamId, baseScore, answer.choiceId, card);
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
function createDummyResult(teamId: string, baseScore: number, choiceId: string, card?: GameCard): AIEvaluationResult {
  const reasoningScore = Math.floor(Math.random() * 30) + 70; // 70-100점
  const finalScore = Math.round((baseScore + reasoningScore) / 2);

  // 랜덤 지표 생성
  const randomMetric = () => Math.floor(Math.random() * 11) - 5; // -5 to +5
  const resource = randomMetric();
  const energy = randomMetric();
  const trust = randomMetric();
  const competency = randomMetric();
  const insight = randomMetric();

  const choiceText = card?.choices.find(c => c.id === choiceId)?.text || '';

  // 선택지별 피드백 템플릿
  const feedbackTemplates: Record<string, { strength: string; risk: string; summary: string; modelAnswer: string }> = {
    'A': {
      strength: '자신의 한계를 객관적으로 파악하여 무리한 시도로 인한 업무 사고를 방지하고, 자료 보완을 통해 실질적인 지원에 집중함으로써 팀의 전체적인 성과를 보호했습니다.',
      risk: '결정적인 순간에 전면에 나서지 않음으로써 상사나 동료들에게 도전 정신이 부족하다는 인상을 줄 수 있으며, 본인의 역량을 크게 도약시킬 수 있는 \'주인공\'의 기회를 다른 사람에게 양보하게 되었습니다.',
      summary: '리스크 관리 차원에서는 합리적인 선택일 수 있으나, 커리어 성장의 관점에서는 두려움을 극복하고 한계를 깨뜨릴 기회를 놓친 아쉬운 결정입니다.',
      modelAnswer: '"내용은 제가 가장 잘 아는 만큼, 부족하더라도 제가 직접 발표하겠습니다. 대신 발표 경험이 많은 선배님께 리허설 피드백을 부탁드려 완성도를 높이고 싶습니다."라고 말하며 기회를 잡는 것이 가장 효과적입니다.'
    },
    'B': {
      strength: '적극적으로 의견을 제시하고 상황을 해결하려는 주도적인 자세가 돋보입니다. 책임감 있는 태도로 조직에 기여하려는 의지를 보여주었습니다.',
      risk: '독단적인 결정이 될 수 있어 팀원들의 반발을 살 수 있으며, 모든 상황을 혼자 감당하려다 번아웃이 올 수 있습니다.',
      summary: '리더십을 발휘하려는 좋은 시도이나, 팀원들과의 협의 과정을 더 강화하면 더욱 효과적인 결과를 얻을 수 있습니다.',
      modelAnswer: '"제가 이 부분을 담당하되, 팀원들의 의견을 먼저 듣고 함께 방향을 정한 후 진행하겠습니다."라고 말하며 협업적 리더십을 보여주는 것이 좋습니다.'
    },
    'C': {
      strength: '팀워크를 중시하고 다양한 의견을 존중하는 협업적 자세가 좋습니다. 함께 문제를 해결하려는 접근이 조직 문화에 긍정적입니다.',
      risk: '결정을 미루거나 책임을 분산시키는 것으로 보일 수 있어, 리더십 발휘 기회를 놓칠 수 있습니다.',
      summary: '협업은 중요하지만, 때로는 명확한 의사결정과 책임을 지는 모습도 필요합니다. 상황에 맞는 균형이 중요합니다.',
      modelAnswer: '"우선 제 의견을 말씀드리면, 이렇게 진행하면 좋겠습니다. 다만 팀원들의 의견도 들어보고 최종 결정하겠습니다."라고 말하며 주도성과 협업을 균형있게 보여주세요.'
    }
  };

  const template = feedbackTemplates[choiceId] || feedbackTemplates['A'];

  const detailedFeedback = `[장점]
${template.strength}

[리스크]
${template.risk}

[총평]
${template.summary}

[모범답안]
${template.modelAnswer}

[METRICS]
RESOURCE:${resource >= 0 ? '+' : ''}${resource}|ENERGY:${energy >= 0 ? '+' : ''}${energy}|TRUST:${trust >= 0 ? '+' : ''}${trust}|COMPETENCY:${competency >= 0 ? '+' : ''}${competency}|INSIGHT:${insight >= 0 ? '+' : ''}${insight}

[SCORES]
선택:${baseScore}|이유:${reasoningScore}|총점:${finalScore}`;

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
