import React, { useState, useEffect, useRef } from 'react';
import { Team } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { Download, Image as ImageIcon, Sparkles, Loader, FileText, Upload, Printer } from 'lucide-react';

interface ReportViewProps {
  teams: Team[];
  onClose: () => void;
}

// 팀별 AI 피드백 타입
interface TeamFeedbackData {
  overall: string;
  strengths: string[];
  improvements: string[];
  advice: string[];  // 3가지 구체적 액션플랜
  discussion_topics: string[];
}

interface TeamAIFeedback {
  teamName: string;
  feedback: TeamFeedbackData;
}

// 종합 AI 분석 타입
interface OverallAnalysis {
  summary: string[];  // 3가지 종합 요약
  perspectives: {
    self_leadership: PerspectiveAnalysis;
    followership: PerspectiveAnalysis;
    leadership: PerspectiveAnalysis;
    teamship: PerspectiveAnalysis;
  };
  common_mistakes: string[];  // 3가지 공통 실수 및 개선 팁
  discussion_topics: string[];
  conclusion: string;
  encouragement: string;  // 응원 메시지
}

interface PerspectiveAnalysis {
  title: string;
  analysis: string;
  strengths: string;
  improvements: string;
  action_plan: string;
}

const ReportView: React.FC<ReportViewProps> = ({ teams, onClose }) => {
  // --- State ---
  const [photos, setPhotos] = useState<File[]>([]);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [isGeneratingOverall, setIsGeneratingOverall] = useState(false);
  const [isGeneratingTeam, setIsGeneratingTeam] = useState(false);

  // AI 생성 결과 저장
  const [teamFeedbacks, setTeamFeedbacks] = useState<TeamAIFeedback[]>([]);
  const [overallAnalysis, setOverallAnalysis] = useState<OverallAnalysis | null>(null);

  // 리포트 뷰 모드
  const [reportMode, setReportMode] = useState<'summary' | 'team' | 'overall' | null>(null);

  const teamReportRef = useRef<HTMLDivElement>(null);
  const overallReportRef = useRef<HTMLDivElement>(null);

  // --- Calculations ---
  const rankedTeams = [...teams].sort((a, b) => {
    const sumA = a.resources.capital + a.resources.energy + a.resources.trust + a.resources.competency + a.resources.insight;
    const sumB = b.resources.capital + b.resources.energy + b.resources.trust + b.resources.competency + b.resources.insight;
    return sumB - sumA;
  });

  const winningTeam = rankedTeams[0];

  const barData = teams.map(t => ({
    name: t.name,
    Resource: t.resources.capital,
    Energy: t.resources.energy,
    Trust: t.resources.trust,
    Skill: t.resources.competency,
    Insight: t.resources.insight
  }));

  // --- Helpers ---
  const calculateTotal = (t: Team) => {
    return t.resources.capital + t.resources.energy + t.resources.trust + t.resources.competency + t.resources.insight;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // --- Actions ---

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 10);
      setPhotos(newFiles);
    }
  };

  const generatePoster = async () => {
    if (!winningTeam) return;
    if (photos.length === 0) {
      alert("우승팀 사진을 최소 1장 업로드해주세요.");
      return;
    }

    setIsGeneratingPoster(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const imageParts = await Promise.all(
        photos.slice(0, 3).map(async (file) => {
            const base64 = await fileToBase64(file);
            const base64Data = base64.split(',')[1];
            return {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            };
        })
      );

      const prompt = `
        Create a high-quality, cinematic movie poster celebrating the victory of the team named "${winningTeam.name}".
        Theme: Professional, Leadership, Success, Future.
        The poster should feel inspiring and epic.
        Includes text: "${winningTeam.name}" and "CHAMPIONS".
      `;

      const response = await genAI.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            ...imageParts,
            { text: prompt }
          ]
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
           if (part.inlineData) {
               setPosterUrl(`data:image/png;base64,${part.inlineData.data}`);
               break;
           }
        }
      }

    } catch (e) {
      console.error(e);
      alert("포스터 생성에 실패했습니다. API Key를 확인하거나 이미지 수를 줄여보세요.");
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  // 팀별 AI 피드백 생성
  const generateTeamFeedbacks = async () => {
    setIsGeneratingTeam(true);
    setReportMode('team');

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const feedbacks: TeamAIFeedback[] = [];

      for (const team of rankedTeams) {
        const historyContext = team.history.map(h =>
          `[${h.cardTitle}] 선택: ${h.choiceText}, 이유: ${h.reasoning}, AI피드백: ${h.aiFeedback}`
        ).join('\n');

        const feedbackPrompt = `
          당신은 리더십 교육 전문가입니다. 다음 팀의 게임 플레이 기록을 분석하여 종합 피드백을 한글로 작성해주세요.

          팀명: ${team.name}
          최종 점수: ${calculateTotal(team)}점
          리소스 현황: 자원(시간) ${team.resources.capital}, 에너지 ${team.resources.energy}, 신뢰 ${team.resources.trust}, 역량 ${team.resources.competency}, 통찰 ${team.resources.insight}

          게임 기록 (각 상황에서의 옵션 선택, 선택 이유, AI 분석 결과):
          ${historyContext || '기록 없음'}

          다음 JSON 형식으로 한글 종합 피드백을 작성해주세요:
          {
            "overall": "전반적 평가 (2-3문장)",
            "strengths": ["강점 1", "강점 2", "강점 3"],
            "improvements": ["개선점 1", "개선점 2", "개선점 3"],
            "advice": [
              "1) [액션플랜 제목]: 구체적이고 현실적인 실천 방안 (예: 매일 아침 5분 감정일기 작성하기)",
              "2) [액션플랜 제목]: 구체적이고 현실적인 실천 방안 (예: 주 1회 팀원에게 긍정 피드백 전달하기)",
              "3) [액션플랜 제목]: 구체적이고 현실적인 실천 방안 (예: 월 1회 1:1 미팅에서 성장 목표 공유하기)"
            ],
            "discussion_topics": ["토의주제 1", "토의주제 2", "토의주제 3"]
          }

          중요:
          - 마크다운 기호(##, **, * 등)를 절대 사용하지 마세요
          - 토의주제는 팀원들이 함께 대화할 수 있는 열린 질문으로 작성해주세요
          - 모든 내용은 한글로 작성해주세요
          - advice는 반드시 3가지 구체적인 액션플랜으로 작성해주세요
          - 팀의 실제 선택과 선택 이유, AI 분석 결과를 바탕으로 현실적이고 구체적인 조언을 해주세요
          - 각 액션플랜은 "언제, 무엇을, 어떻게" 할 수 있는지 명확하게 제시해주세요
        `;

        try {
          const feedbackResponse = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: feedbackPrompt,
            config: { responseMimeType: "application/json" }
          });

          const parsed = JSON.parse(feedbackResponse.text || '{}');
          feedbacks.push({
            teamName: team.name,
            feedback: parsed
          });
        } catch (err) {
          console.error(`Team ${team.name} feedback failed:`, err);
          feedbacks.push({
            teamName: team.name,
            feedback: {
              overall: '피드백 생성에 실패했습니다.',
              strengths: [],
              improvements: [],
              advice: '',
              discussion_topics: []
            }
          });
        }
      }

      setTeamFeedbacks(feedbacks);

    } catch (error) {
      console.error('Team feedbacks generation failed:', error);
      alert('팀별 피드백 생성에 실패했습니다.');
    } finally {
      setIsGeneratingTeam(false);
    }
  };

  // 종합 AI 분석 생성
  const generateOverallAnalysis = async () => {
    setIsGeneratingOverall(true);
    setReportMode('overall');

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const context = rankedTeams.map(t => {
        const historyStr = t.history.map(h =>
          `[${h.cardTitle}] 선택: ${h.choiceId}, 이유: ${h.reasoning.substring(0, 50)}`
        ).join('; ');
        return `팀 ${t.name}: 총점 ${calculateTotal(t)}. 의사결정: ${historyStr || '없음'}`;
      }).join('\n');

      const prompt = `
        당신은 리더십 교육 전문가입니다. 다음 리더십 시뮬레이션 게임 결과를 분석하여 종합 리포트를 한글로 작성해주세요.

        게임 결과 (각 팀의 의사결정 내용 포함):
        ${context}

        다음 JSON 형식으로 한글로 상세하게 작성해주세요:
        {
          "summary": [
            "1) [핵심 인사이트 1]: 전체 팀들의 의사결정 패턴에서 발견된 주요 특징 (실제 선택 근거 기반)",
            "2) [핵심 인사이트 2]: 점수 분포와 리소스 관리 측면에서의 분석 (구체적 수치 기반)",
            "3) [핵심 인사이트 3]: 이번 게임에서 얻을 수 있는 가장 중요한 교훈 (현업 적용 관점)"
          ],
          "perspectives": {
            "self_leadership": {
              "title": "셀프리더십 관점",
              "analysis": "자기인식, 감정조절, 시간관리, 회복탄력성 등 개인 역량 관점에서의 분석 (3-4문장)",
              "strengths": "잘한 점 (2-3가지)",
              "improvements": "개선점 (2-3가지)",
              "action_plan": "향후 성장을 위한 구체적 액션플랜 (2-3가지)"
            },
            "followership": {
              "title": "팔로워십 관점",
              "analysis": "적극적 경청, 능동적 수행, 비판적 사고, 피드백 수용 등 팔로워십 관점에서의 분석 (3-4문장)",
              "strengths": "잘한 점 (2-3가지)",
              "improvements": "개선점 (2-3가지)",
              "action_plan": "향후 성장을 위한 구체적 액션플랜 (2-3가지)"
            },
            "leadership": {
              "title": "리더십 관점",
              "analysis": "명확한 지시, 동기부여, 임파워먼트, 코칭 등 매니저/리더 관점에서의 분석 (3-4문장)",
              "strengths": "잘한 점 (2-3가지)",
              "improvements": "개선점 (2-3가지)",
              "action_plan": "향후 성장을 위한 구체적 액션플랜 (2-3가지)"
            },
            "teamship": {
              "title": "팀십 관점",
              "analysis": "심리적 안전감, 갈등관리, 다양성 포용, 상호책임 등 팀워크 관점에서의 분석 (3-4문장)",
              "strengths": "잘한 점 (2-3가지)",
              "improvements": "개선점 (2-3가지)",
              "action_plan": "향후 성장을 위한 구체적 액션플랜 (2-3가지)"
            }
          },
          "common_mistakes": [
            "1) [실수 유형]: 구체적인 실수 패턴과 개선 방법 (예: 단기 이익 추구로 인한 신뢰 하락 - 장기적 관점에서 이해관계자 영향 고려하기)",
            "2) [실수 유형]: 구체적인 실수 패턴과 개선 방법 (예: 에너지 소진 무시 - 지속가능한 업무 속도 유지하기)",
            "3) [실수 유형]: 구체적인 실수 패턴과 개선 방법 (예: 소통 부재로 인한 갈등 - 선제적 의사소통 습관화하기)"
          ],
          "discussion_topics": [
            "토의주제 1: 구체적인 토의 질문",
            "토의주제 2: 구체적인 토의 질문",
            "토의주제 3: 구체적인 토의 질문",
            "토의주제 4: 구체적인 토의 질문",
            "토의주제 5: 구체적인 토의 질문",
            "토의주제 6: 구체적인 토의 질문",
            "토의주제 7: 구체적인 토의 질문"
          ],
          "conclusion": "오늘 게임에서 경험한 내용을 현업에서 적용할 때 기억해야 할 핵심 메시지 (2-3문장)",
          "encouragement": "참가자들에게 전하는 따뜻한 응원과 격려의 메시지 (진정성 있고 동기부여가 되는 2-3문장)"
        }

        중요:
        - 모든 내용은 반드시 한글로 작성해주세요
        - summary는 실제 팀들의 선택과 결과를 바탕으로 구체적으로 작성해주세요
        - common_mistakes는 실제 게임에서 관찰된 패턴을 기반으로 현실적인 개선 팁을 제시해주세요
        - 토의주제는 학습자들이 서로 깊이 있는 대화를 나눌 수 있는 열린 질문으로 작성해주세요
        - encouragement는 진심어린 응원의 메시지로 참가자들이 용기를 얻을 수 있도록 작성해주세요
      `;

      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const aiAnalysis = JSON.parse(response.text || '{}') as OverallAnalysis;
      setOverallAnalysis(aiAnalysis);

    } catch (e) {
      console.error(e);
      alert("AI 분석 생성에 실패했습니다.");
    } finally {
      setIsGeneratingOverall(false);
    }
  };

  // 프린트 함수
  const handlePrint = (reportType: 'team' | 'overall') => {
    const printContent = reportType === 'team' ? teamReportRef.current : overallReportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
      return;
    }

    const title = reportType === 'team' ? 'BL 아카데미 - 팀별 리포트' : 'BL 아카데미 - 종합 리포트';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
          * { font-family: 'Noto Sans KR', sans-serif; box-sizing: border-box; }
          body { padding: 20px; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; }
          h1 { color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; }
          h2 { color: #1e3a8a; margin-top: 30px; }
          h3 { color: #374151; }
          .team-section { page-break-inside: avoid; margin-bottom: 40px; padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; }
          .perspective-section { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #3b82f6; }
          .topic-item { padding: 10px; margin: 8px 0; background: #f3f4f6; border-radius: 4px; }
          .score-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .score-table th, .score-table td { border: 1px solid #d1d5db; padding: 8px; text-align: center; }
          .score-table th { background: #1e3a8a; color: white; }
          .history-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
          .history-table th, .history-table td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          .history-table th { background: #374151; color: white; font-weight: bold; }
          .history-table tr:nth-child(even) { background: #f9fafb; }
          .ai-section { padding: 4px 6px; border-radius: 4px; margin: 3px 0; font-size: 10px; }
          .ai-section.strength { background: #dcfce7; color: #166534; }
          .ai-section.risk { background: #fed7aa; color: #9a3412; }
          .ai-section.summary { background: #dbeafe; color: #1e40af; }
          .ai-section.model { background: #e9d5ff; color: #6b21a8; }
          .turn-record { background: #f9fafb; padding: 15px; margin: 10px 0; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
          .turn-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
          .turn-badge { background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .turn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          .turn-item { background: white; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; }
          .turn-label { font-weight: bold; margin-bottom: 4px; font-size: 12px; }
          .ai-analysis { background: linear-gradient(to right, #eef2ff, #eff6ff); padding: 12px; border: 1px solid #c7d2fe; border-radius: 6px; margin-top: 10px; }
          .ai-analysis-title { font-weight: bold; color: #4338ca; margin-bottom: 8px; font-size: 12px; }
          .score-change { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin: 2px; }
          .score-positive { background: #dcfce7; color: #166534; }
          .score-negative { background: #fee2e2; color: #991b1b; }
          .ai-feedback { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; margin-top: 15px; }
          .conclusion-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin-top: 30px; }
          @media print {
            body { padding: 0; }
            .team-section { page-break-after: always; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };


  return (
    <div className="fixed inset-0 bg-blue-900/90 z-[60] overflow-y-auto backdrop-blur-sm">
      <div className="container mx-auto p-4 md:p-8 min-h-screen">
        <div className="bg-white w-full border-4 border-black shadow-[10px_10px_0_0_#000] mb-8">
          <div className="flex justify-between items-center p-6 border-b-4 border-black bg-yellow-400 sticky top-0 z-10">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">미션 리포트</h1>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-black text-white font-bold border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-all"
            >
              닫기 X
            </button>
          </div>

          <div className="p-4 md:p-8 grid gap-8">

             {/* 1. Overall Standings (Ranked) */}
             <div className="grid lg:grid-cols-2 gap-8">
                {/* Score Table */}
                <div className="border-4 border-black p-4 bg-gray-50 shadow-hard">
                  <h2 className="text-2xl font-black mb-6 uppercase border-b-4 border-black pb-2 flex justify-between">
                     <span>최종 순위</span>
                     <span className="text-sm font-normal text-gray-500 normal-case">5개 핵심 지표 합계</span>
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-sm uppercase bg-black text-white">
                          <th className="p-2 border border-black">순위</th>
                          <th className="p-2 border border-black">팀</th>
                          <th className="p-2 border border-black">자원(시간)</th>
                          <th className="p-2 border border-black">에너지</th>
                          <th className="p-2 border border-black">신뢰</th>
                          <th className="p-2 border border-black">역량</th>
                          <th className="p-2 border border-black">통찰</th>
                          <th className="p-2 border border-black text-center bg-blue-900 text-yellow-400">합계</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-mono font-bold">
                        {rankedTeams.map((team, idx) => (
                          <tr key={team.id} className={idx === 0 ? "bg-yellow-100" : "hover:bg-gray-100"}>
                            <td className="p-2 border-2 border-black text-center">{idx + 1}</td>
                            <td className="p-2 border-2 border-black flex items-center gap-2">
                              <div className={`w-3 h-3 border border-black bg-${team.color.toLowerCase()}-600`}></div>
                              {team.name}
                              {idx === 0 && ' (1위)'}
                            </td>
                            <td className="p-2 border-2 border-black">{team.resources.capital}</td>
                            <td className="p-2 border-2 border-black">{team.resources.energy}</td>
                            <td className="p-2 border-2 border-black">{team.resources.trust}</td>
                            <td className="p-2 border-2 border-black">{team.resources.competency}</td>
                            <td className="p-2 border-2 border-black">{team.resources.insight}</td>
                            <td className="p-2 border-2 border-black text-center text-lg bg-white">
                              {calculateTotal(team)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Resource Chart */}
                <div className="border-4 border-black p-4 bg-white shadow-hard flex flex-col">
                  <h2 className="text-2xl font-black mb-6 uppercase border-b-4 border-black pb-2">지표 분석</h2>
                  <div className="flex-1 min-h-[300px] border-2 border-black bg-gray-50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000" />
                        <XAxis dataKey="name" tick={{fill: 'black', fontWeight: 'bold'}} />
                        <YAxis tick={{fill: 'black', fontWeight: 'bold'}} />
                        <Tooltip contentStyle={{ border: '2px solid black', borderRadius: '0', boxShadow: '4px 4px 0 0 #000' }} />
                        <Legend />
                        <Bar dataKey="Resource" fill="#FACC15" stackId="a" stroke="#000" strokeWidth={1} />
                        <Bar dataKey="Energy" fill="#F97316" stackId="a" stroke="#000" strokeWidth={1} />
                        <Bar dataKey="Trust" fill="#3B82F6" stackId="a" stroke="#000" strokeWidth={1} />
                        <Bar dataKey="Skill" fill="#22C55E" stackId="a" stroke="#000" strokeWidth={1} />
                        <Bar dataKey="Insight" fill="#A855F7" stackId="a" stroke="#000" strokeWidth={1} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
             </div>

             {/* 2. Winner Poster Generation */}
             <div className="border-4 border-black p-6 bg-gradient-to-r from-yellow-50 to-white shadow-hard">
                <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-2">
                   <Sparkles className="text-yellow-500" size={32} />
                   <h2 className="text-2xl font-black uppercase">우승팀 기념 AI 포스터</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <p className="font-bold text-gray-700">1. 팀 사진 업로드 (1-10장)</p>
                      <label className="block p-4 border-4 border-dashed border-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors text-center">
                         <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                         <div className="flex flex-col items-center gap-2">
                            <Upload size={24} className="text-gray-400" />
                            <span className="font-bold text-gray-500">{photos.length > 0 ? `${photos.length}개 사진 선택됨` : "클릭하여 사진 업로드"}</span>
                         </div>
                      </label>

                      <button
                        onClick={generatePoster}
                        disabled={photos.length === 0 || isGeneratingPoster}
                        className="w-full py-4 bg-black text-white font-black uppercase text-xl border-4 border-black shadow-hard hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                         {isGeneratingPoster ? <Loader className="animate-spin" /> : <ImageIcon />}
                         {isGeneratingPoster ? "AI 포스터 생성 중..." : "포스터 생성"}
                      </button>
                   </div>

                   <div className="bg-gray-200 border-4 border-black min-h-[300px] flex items-center justify-center relative">
                      {posterUrl ? (
                        <div className="relative group w-full h-full">
                           <img src={posterUrl} alt="Generated Poster" className="w-full h-full object-contain p-2" />
                           <a
                             href={posterUrl}
                             download={`팀_${winningTeam?.name}_우승_포스터.png`}
                             className="absolute bottom-4 right-4 bg-white text-black p-2 border-2 border-black font-bold shadow-hard hover:bg-yellow-400 flex items-center gap-2"
                           >
                              <Download size={16} /> 다운로드
                           </a>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-bold uppercase text-center p-4">
                           포스터 미리보기 영역<br/>(AI 생성)
                        </span>
                      )}
                   </div>
                </div>
             </div>

             {/* 3. Report Generation */}
             <div className="border-4 border-black p-6 bg-white shadow-hard">
                <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2">AI 리포트 생성</h2>
                <div className="flex flex-col md:flex-row gap-4">
                   <button
                     onClick={generateTeamFeedbacks}
                     disabled={isGeneratingTeam}
                     className="flex-1 py-4 bg-blue-100 border-4 border-black font-bold uppercase hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isGeneratingTeam ? <Loader className="animate-spin" /> : <FileText size={24} />}
                     {isGeneratingTeam ? "AI 분석 중..." : "팀별 리포트 생성"}
                   </button>

                   <button
                     onClick={generateOverallAnalysis}
                     disabled={isGeneratingOverall}
                     className="flex-1 py-4 bg-purple-100 border-4 border-black font-bold uppercase hover:bg-purple-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isGeneratingOverall ? <Loader className="animate-spin" /> : <Sparkles size={24} />}
                     {isGeneratingOverall ? "AI 분석 중..." : "종합 리포트 생성"}
                   </button>
                </div>
                <p className="mt-4 text-sm text-gray-500 text-center">
                  * 종합 리포트에는 모드별(셀프리더십/팔로워십/리더십/팀십) AI 분석과 토의주제 7가지가 포함됩니다.
                </p>
             </div>

             {/* 4. Team Report Display */}
             {teamFeedbacks.length > 0 && (
               <div className="border-4 border-black p-6 bg-blue-50 shadow-hard">
                 <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-2">
                   <h2 className="text-2xl font-black uppercase">팀별 AI 리포트</h2>
                   <button
                     onClick={() => handlePrint('team')}
                     className="px-4 py-2 bg-blue-500 text-white border-2 border-black font-bold flex items-center gap-2 hover:bg-blue-600"
                   >
                     <Printer size={18} /> PDF로 저장/인쇄
                   </button>
                 </div>

                 {/* 프린트용 숨겨진 콘텐츠 */}
                 <div ref={teamReportRef} className="space-y-6">
                   <h1 style={{ display: 'none' }}>BL 아카데미 - 팀별 리포트</h1>

                   {rankedTeams.map((team, idx) => {
                     const feedback = teamFeedbacks.find(f => f.teamName === team.name);
                     return (
                       <div key={team.id} className="team-section bg-white p-6 border-2 border-gray-300 rounded-lg">
                         <h3 className="text-xl font-black mb-4 text-blue-900">
                           {idx + 1}위 - {team.name} (총점: {calculateTotal(team)}점)
                         </h3>

                         <table className="score-table w-full mb-4 text-sm">
                           <thead>
                             <tr>
                               <th className="bg-gray-800 text-white p-2">자원(시간)</th>
                               <th className="bg-gray-800 text-white p-2">에너지</th>
                               <th className="bg-gray-800 text-white p-2">신뢰</th>
                               <th className="bg-gray-800 text-white p-2">역량</th>
                               <th className="bg-gray-800 text-white p-2">통찰</th>
                             </tr>
                           </thead>
                           <tbody>
                             <tr>
                               <td className="p-2 border">{team.resources.capital}</td>
                               <td className="p-2 border">{team.resources.energy}</td>
                               <td className="p-2 border">{team.resources.trust}</td>
                               <td className="p-2 border">{team.resources.competency}</td>
                               <td className="p-2 border">{team.resources.insight}</td>
                             </tr>
                           </tbody>
                         </table>

                         {team.history.length > 0 && (
                           <>
                             <h4 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                               📊 턴별 상세 기록
                               <span className="text-xs font-normal text-gray-500">({team.history.length}턴)</span>
                             </h4>

                             {/* 표 형식 턴별 기록 */}
                             <div className="overflow-x-auto mb-4">
                               <table className="history-table w-full border-collapse text-sm">
                                 <thead>
                                   <tr className="bg-gray-800 text-white">
                                     <th className="p-2 border border-gray-600 w-16 text-center">턴</th>
                                     <th className="p-2 border border-gray-600 min-w-[150px]">📖 상황</th>
                                     <th className="p-2 border border-gray-600 min-w-[100px]">📋 선택옵션</th>
                                     <th className="p-2 border border-gray-600 min-w-[120px]">💭 선택이유</th>
                                     <th className="p-2 border border-gray-600 min-w-[180px]">🤖 AI 평가</th>
                                     <th className="p-2 border border-gray-600 w-24">점수변화</th>
                                   </tr>
                                 </thead>
                                 <tbody>
                                   {team.history.map((h, i) => {
                                     // AI 피드백 파싱 (장점/리스크/총평/모범답안)
                                     const parseAiFeedback = (feedback: string) => {
                                       const sections: { label: string; content: string; bgColor: string; textColor: string }[] = [];

                                       // 각 섹션 패턴 매칭
                                       const patterns = [
                                         { regex: /\[장점\]\s*/i, label: '💪 장점', bgColor: 'bg-green-100', textColor: 'text-green-800' },
                                         { regex: /\[리스크\]\s*/i, label: '⚠️ 리스크', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
                                         { regex: /\[총평\]\s*/i, label: '📝 총평', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
                                         { regex: /\[모범답안\]\s*/i, label: '✨ 모범답안', bgColor: 'bg-purple-100', textColor: 'text-purple-800' }
                                       ];

                                       let remaining = feedback;
                                       patterns.forEach(({ regex, label, bgColor, textColor }) => {
                                         const match = remaining.match(regex);
                                         if (match) {
                                           const parts = remaining.split(regex);
                                           if (parts[1]) {
                                             let content = parts[1];
                                             // 다음 섹션 시작 전까지 내용 추출
                                             patterns.forEach(p => {
                                               const nextMatch = content.match(p.regex);
                                               if (nextMatch) {
                                                 content = content.split(p.regex)[0];
                                               }
                                             });
                                             sections.push({ label, content: content.trim(), bgColor, textColor });
                                           }
                                         }
                                       });

                                       return sections.length > 0 ? sections : [{ label: '', content: feedback, bgColor: '', textColor: 'text-gray-700' }];
                                     };

                                     const feedbackSections = h.aiFeedback ? parseAiFeedback(h.aiFeedback) : [];

                                     return (
                                       <tr key={i} className="hover:bg-gray-50 align-top">
                                         <td className="p-2 border border-gray-300 text-center font-bold bg-blue-50">
                                           <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">{h.turnNumber}</span>
                                         </td>
                                         <td className="p-2 border border-gray-300">
                                           <div className="font-bold text-gray-800 mb-1">{h.cardTitle}</div>
                                           <p className="text-gray-600 text-xs leading-relaxed">{h.situation}</p>
                                         </td>
                                         <td className="p-2 border border-gray-300">
                                           <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold inline-block">
                                             {h.choiceText}
                                           </span>
                                         </td>
                                         <td className="p-2 border border-gray-300">
                                           <p className="text-gray-700 text-xs leading-relaxed">{h.reasoning}</p>
                                         </td>
                                         <td className="p-2 border border-gray-300">
                                           <div className="space-y-1">
                                             {feedbackSections.map((section, si) => (
                                               <div key={si} className={`p-1.5 rounded text-xs ${section.bgColor} ${section.textColor}`}>
                                                 {section.label && <strong>{section.label}: </strong>}
                                                 <span className="leading-relaxed">{section.content.substring(0, 80)}{section.content.length > 80 ? '...' : ''}</span>
                                               </div>
                                             ))}
                                           </div>
                                         </td>
                                         <td className="p-2 border border-gray-300">
                                           {h.scoreChanges && Object.keys(h.scoreChanges).length > 0 && (
                                             <div className="flex flex-col gap-1">
                                               {Object.entries(h.scoreChanges).map(([key, value]) => {
                                                 const labels: Record<string, string> = {
                                                   capital: '자원', energy: '에너지', trust: '신뢰',
                                                   competency: '역량', insight: '통찰'
                                                 };
                                                 const numValue = value as number;
                                                 if (numValue === 0) return null;
                                                 const isPositive = numValue > 0;
                                                 return (
                                                   <span
                                                     key={key}
                                                     className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-center ${
                                                       isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                     }`}
                                                   >
                                                     {labels[key]}: {isPositive ? '+' : ''}{numValue}
                                                   </span>
                                                 );
                                               })}
                                             </div>
                                           )}
                                         </td>
                                       </tr>
                                     );
                                   })}
                                 </tbody>
                               </table>
                             </div>
                           </>
                         )}

                         <div className="ai-feedback bg-blue-50 p-5 rounded-lg border-2 border-blue-300">
                           <h4 className="font-bold text-lg mb-4 text-blue-800 border-b border-blue-300 pb-2">AI 종합 피드백</h4>

                           {feedback?.feedback ? (
                             <div className="space-y-4 text-sm">
                               {/* 전반적 평가 */}
                               <div>
                                 <p className="text-gray-800 leading-relaxed">{feedback.feedback.overall}</p>
                               </div>

                               {/* 강점 */}
                               {feedback.feedback.strengths?.length > 0 && (
                                 <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                                   <h5 className="font-bold text-green-800 mb-2">강점</h5>
                                   <ul className="space-y-1">
                                     {feedback.feedback.strengths.map((s: string, i: number) => (
                                       <li key={i} className="text-gray-700">• {s}</li>
                                     ))}
                                   </ul>
                                 </div>
                               )}

                               {/* 개선점 */}
                               {feedback.feedback.improvements?.length > 0 && (
                                 <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                                   <h5 className="font-bold text-orange-800 mb-2">개선점</h5>
                                   <ul className="space-y-1">
                                     {feedback.feedback.improvements.map((s: string, i: number) => (
                                       <li key={i} className="text-gray-700">• {s}</li>
                                     ))}
                                   </ul>
                                 </div>
                               )}

                               {/* 성장을 위한 조언 - 3가지 액션플랜 */}
                               {feedback.feedback.advice?.length > 0 && (
                                 <div className="bg-blue-100 p-3 rounded border-l-4 border-blue-500">
                                   <h5 className="font-bold text-blue-800 mb-2">성장을 위한 조언 (3가지 액션플랜)</h5>
                                   <ol className="space-y-2">
                                     {feedback.feedback.advice.map((item: string, i: number) => (
                                       <li key={i} className="text-gray-700 bg-white p-2 rounded border">
                                         {item}
                                       </li>
                                     ))}
                                   </ol>
                                 </div>
                               )}

                               {/* 팀 토의 주제 3가지 */}
                               {feedback.feedback.discussion_topics?.length > 0 && (
                                 <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-500 mt-4">
                                   <h5 className="font-bold text-purple-800 mb-2">팀 토의 주제</h5>
                                   <ol className="space-y-2">
                                     {feedback.feedback.discussion_topics.map((topic: string, i: number) => (
                                       <li key={i} className="text-gray-700 bg-white p-2 rounded border">
                                         <span className="font-bold text-purple-700">{i + 1}.</span> {topic}
                                       </li>
                                     ))}
                                   </ol>
                                 </div>
                               )}
                             </div>
                           ) : (
                             <p className="text-gray-500">피드백 생성 중...</p>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}

             {/* 5. Overall Report Display */}
             {overallAnalysis && (
               <div className="border-4 border-black p-6 bg-purple-50 shadow-hard">
                 <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-2">
                   <h2 className="text-2xl font-black uppercase">종합 AI 리포트</h2>
                   <button
                     onClick={() => handlePrint('overall')}
                     className="px-4 py-2 bg-purple-500 text-white border-2 border-black font-bold flex items-center gap-2 hover:bg-purple-600"
                   >
                     <Printer size={18} /> PDF로 저장/인쇄
                   </button>
                 </div>

                 {/* 프린트용 콘텐츠 */}
                 <div ref={overallReportRef} className="space-y-6">
                   <h1 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-900 pb-2">BL 아카데미 - 리더십 종합 리포트</h1>

                   {/* 종합 요약 - 3가지 */}
                   <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                     <h2 className="text-xl font-bold mb-3 text-blue-900">1. 종합 요약</h2>
                     <ol className="space-y-3">
                       {overallAnalysis.summary.map((item, idx) => (
                         <li key={idx} className="text-gray-700 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                           {item}
                         </li>
                       ))}
                     </ol>
                   </div>

                   {/* 모드별 분석 */}
                   <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                     <h2 className="text-xl font-bold mb-4 text-blue-900">2. 모드별 심층 분석</h2>

                     {(['self_leadership', 'followership', 'leadership', 'teamship'] as const).map(key => {
                       const perspective = overallAnalysis.perspectives[key];
                       if (!perspective) return null;

                       const colors: Record<string, string> = {
                         self_leadership: 'border-red-500 bg-red-50',
                         followership: 'border-blue-500 bg-blue-50',
                         leadership: 'border-green-500 bg-green-50',
                         teamship: 'border-purple-500 bg-purple-50'
                       };

                       return (
                         <div key={key} className={`perspective-section p-4 mb-4 border-l-4 ${colors[key]} rounded-r-lg`}>
                           <h3 className="font-bold text-lg mb-2">{perspective.title}</h3>
                           <p className="text-sm mb-3">{perspective.analysis}</p>
                           <div className="grid md:grid-cols-3 gap-3 text-sm">
                             <div className="bg-white p-2 rounded border">
                               <strong className="text-green-700">잘한 점:</strong>
                               <p>{perspective.strengths}</p>
                             </div>
                             <div className="bg-white p-2 rounded border">
                               <strong className="text-orange-700">개선점:</strong>
                               <p>{perspective.improvements}</p>
                             </div>
                             <div className="bg-white p-2 rounded border">
                               <strong className="text-blue-700">액션플랜:</strong>
                               <p>{perspective.action_plan}</p>
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>

                   {/* 공통 실수 - 3가지 */}
                   <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                     <h2 className="text-xl font-bold mb-3 text-blue-900">3. 공통 실수 및 개선 팁</h2>
                     <ol className="space-y-3">
                       {overallAnalysis.common_mistakes.map((item, idx) => (
                         <li key={idx} className="text-gray-700 bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                           {item}
                         </li>
                       ))}
                     </ol>
                   </div>

                   {/* 토의주제 7가지 */}
                   <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                     <h2 className="text-xl font-bold mb-4 text-blue-900">4. 팀 토의 주제 (7가지)</h2>
                     <div className="space-y-2">
                       {overallAnalysis.discussion_topics.map((topic, idx) => (
                         <div key={idx} className="topic-item p-3 bg-gray-100 rounded-lg border-l-4 border-blue-500">
                           <span className="font-bold text-blue-800">{idx + 1}.</span> {topic}
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* 결론 및 응원 */}
                   <div className="conclusion-box bg-yellow-100 p-4 rounded-lg border-2 border-yellow-500">
                     <h2 className="text-xl font-bold mb-3 text-yellow-800">마무리</h2>
                     <p className="text-gray-800 font-medium mb-4">{overallAnalysis.conclusion}</p>

                     {/* 응원 메시지 */}
                     {overallAnalysis.encouragement && (
                       <div className="bg-gradient-to-r from-yellow-200 to-orange-200 p-4 rounded-lg border-2 border-yellow-400 mt-4">
                         <p className="text-center text-lg font-bold text-yellow-900 italic">
                           💪 {overallAnalysis.encouragement}
                         </p>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
