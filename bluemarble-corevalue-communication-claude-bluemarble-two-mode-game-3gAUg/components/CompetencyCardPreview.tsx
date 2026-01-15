import React, { useEffect, useState } from 'react';
import { GameCard, BoardSquare, SquareType } from '../types';
import { Target, Lightbulb, Users, User, Sparkles, X, Zap, Flame, Globe, Rocket, TrendingUp } from 'lucide-react';

interface CompetencyCardPreviewProps {
  visible: boolean;
  card: GameCard | null;
  square: BoardSquare | null;
  onComplete: () => void;
  duration?: number; // 표시 시간 (ms)
}

const CompetencyCardPreview: React.FC<CompetencyCardPreviewProps> = ({
  visible,
  card,
  square,
  onComplete,
  duration = 5000,
}) => {
  const [showSituation, setShowSituation] = useState(false);

  useEffect(() => {
    // card가 없어도 square가 있으면 미리보기 표시
    if (visible && (card || square)) {
      // 음향 효과 - 카드 등장
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.15;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        setTimeout(() => audioContext.close(), 600);
      } catch (e) {}

      // duration 후에 상황 카드로 전환
      const timer = setTimeout(() => {
        setShowSituation(true);
        onComplete();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShowSituation(false);
    }
  }, [visible, card, square, duration, onComplete]);

  if (!visible || (!card && !square)) return null;

  // 칸 타입에 따른 아이콘 반환
  const getSquareTypeIcon = () => {
    if (!square) return <Sparkles size={48} />;

    switch (square.type) {
      case SquareType.GoldenKey: return <Zap size={48} />;
      case SquareType.Island: return <Flame size={48} />;
      case SquareType.WorldTour: return <Globe size={48} />;
      case SquareType.Space: return <Rocket size={48} />;
      case SquareType.Fund: return <TrendingUp size={48} />;
      default: return <Sparkles size={48} />;
    }
  };

  // 칸 타입에 따른 색상 반환
  const getSquareTypeColor = () => {
    if (!square) return 'from-purple-600 to-purple-900';

    switch (square.type) {
      case SquareType.GoldenKey: return 'from-yellow-500 to-yellow-700';
      case SquareType.Island: return 'from-red-600 to-red-900';
      case SquareType.WorldTour: return 'from-cyan-500 to-cyan-700';
      case SquareType.Space: return 'from-indigo-600 to-indigo-900';
      case SquareType.Fund: return 'from-emerald-500 to-emerald-700';
      default: return 'from-purple-600 to-purple-900';
    }
  };

  // 칸 타입에 따른 라벨 반환
  const getSquareTypeLabel = () => {
    if (!square) return 'SPECIAL';

    switch (square.type) {
      case SquareType.City: return 'COMPETENCY';
      case SquareType.GoldenKey: return 'CHANCE CARD';
      case SquareType.Island: return 'BURNOUT ZONE';
      case SquareType.WorldTour: return 'GLOBAL OPPORTUNITY';
      case SquareType.Space: return 'CHALLENGE';
      case SquareType.Fund: return 'GROWTH FUND';
      default: return 'SPECIAL';
    }
  };

  const getTypeIcon = () => {
    // 카드가 있으면 카드 타입에 따른 아이콘
    if (card) {
      switch (card.type) {
        case 'Self': return <User size={48} />;
        case 'Team': return <Users size={48} />;
        case 'Leader': return <Target size={48} />;
        case 'Follower': return <Lightbulb size={48} />;
        case 'Event': return <Zap size={48} />;
        case 'Burnout': return <Flame size={48} />;
        case 'Challenge': return <Rocket size={48} />;
        case 'Growth': return <TrendingUp size={48} />;
        case 'Custom': return <Sparkles size={48} />;
        default:
          // 커스텀 모드 카드인 경우 (boardIndex가 있으면)
          if (card.boardIndex !== undefined) return <Sparkles size={48} />;
          return <Sparkles size={48} />;
      }
    }
    // 특수 칸인 경우 칸 타입에 따른 아이콘
    return getSquareTypeIcon();
  };

  const getTypeColor = () => {
    // 카드가 있으면 카드 타입에 따른 색상
    if (card) {
      switch (card.type) {
        case 'Self': return 'from-blue-600 to-blue-900';
        case 'Team': return 'from-green-600 to-green-900';
        case 'Leader': return 'from-red-600 to-red-900';
        case 'Follower': return 'from-orange-600 to-orange-900';
        case 'Event': return 'from-yellow-500 to-yellow-700';
        case 'Burnout': return 'from-red-600 to-red-900';
        case 'Challenge': return 'from-indigo-600 to-indigo-900';
        case 'Growth': return 'from-emerald-500 to-emerald-700';
        case 'Custom': return 'from-purple-600 to-purple-900';
        case 'CoreValue': return 'from-purple-600 to-purple-900';
        default:
          // 커스텀 모드 카드인 경우
          if (card.boardIndex !== undefined) return 'from-purple-600 to-purple-900';
          return 'from-purple-600 to-purple-900';
      }
    }
    // 특수 칸인 경우 칸 타입에 따른 색상
    return getSquareTypeColor();
  };

  const getCompetencyName = () => {
    // 카드가 있으면 카드 제목 우선 사용 (커스텀 모드 지원)
    if (card?.title) {
      return card.title;
    }
    // 카드가 없으면 칸 이름 사용
    if (square?.name) {
      // 이름에서 한글 부분만 추출
      const match = square.name.match(/^([^(]+)/);
      return match ? match[1].trim() : square.name;
    }
    return card?.competency || card?.type || 'SPECIAL';
  };

  const getTypeLabel = () => {
    // 카드가 있으면 카드 타입에 따른 라벨
    if (card) {
      if (card.type === 'Custom') return 'CUSTOM CARD';
      if (card.type === 'Event') return 'EVENT CARD';
      if (card.type === 'Burnout') return 'BURNOUT CARD';
      if (card.type === 'Growth') return 'GROWTH CARD';
      if (card.type === 'Challenge') return 'CHALLENGE CARD';
      if (card.type === 'CoreValue') return 'COREVALUE COMPETENCY';
      if (card.type === 'Self') return 'SELF LEADERSHIP';
      if (card.type === 'Team') return 'TEAM COLLABORATION';
      if (card.type === 'Leader') return 'LEADERSHIP';
      if (card.type === 'Follower') return 'FOLLOWERSHIP';
      // 커스텀 모드에서 boardIndex가 있으면 커스텀 카드
      if (card.boardIndex !== undefined) return 'CUSTOM SCENARIO';
      // 기타 역량카드(City)인 경우
      if (square?.type === SquareType.City) {
        return card.type ? `${card.type} COMPETENCY` : 'SITUATION CARD';
      }
    }
    // 특수 칸인 경우
    return getSquareTypeLabel();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
      {/* 닫기(건너뛰기) 버튼 */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all border-2 border-white/30"
        title="건너뛰기"
      >
        <X size={24} />
      </button>

      <div className={`bg-gradient-to-br ${getTypeColor()} p-8 rounded-2xl border-4 border-white shadow-2xl animate-in zoom-in duration-500 max-w-lg mx-4`}>
        {/* 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/20 p-4 rounded-full text-white">
            {getTypeIcon()}
          </div>
        </div>

        {/* 칸/역량 이름 */}
        <div className="text-center mb-4">
          <div className="text-white/70 text-sm uppercase tracking-widest mb-2">
            {getTypeLabel()}
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tight">
            {getCompetencyName()}
          </h2>
        </div>

        {/* 카드 제목 (카드가 있는 경우에만) */}
        {card && (
          <div className="bg-white/10 border-2 border-white/30 rounded-xl p-4 text-center">
            <div className="text-white/70 text-xs uppercase mb-1">Today's Challenge</div>
            <h3 className="text-2xl font-bold text-white">
              {card.title}
            </h3>
          </div>
        )}

        {/* 로딩 바 */}
        <div className="mt-6">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white animate-progress"
              style={{
                animation: `progress ${duration}ms linear forwards`,
              }}
            />
          </div>
          <div className="text-center text-white/50 text-sm mt-2">
            상황 카드 로딩 중...
          </div>
        </div>

        <style>{`
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CompetencyCardPreview;
