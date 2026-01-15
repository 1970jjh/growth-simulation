import React, { useEffect, useState } from 'react';
import { Trophy, Coins, Battery, Handshake, TrendingUp, Lightbulb, PartyPopper } from 'lucide-react';

interface LapBonusPopupProps {
  visible: boolean;
  teamName: string;
  lapCount: number;
  bonuses: {
    capital: number;
    energy: number;
    trust: number;
    competency: number;
    insight: number;
  };
  onComplete: () => void;
  duration?: number;
}

const LapBonusPopup: React.FC<LapBonusPopupProps> = ({
  visible,
  teamName,
  lapCount,
  bonuses,
  onComplete,
  duration = 5000,
}) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visible) {
      // 애니메이션 시작
      setTimeout(() => setAnimateIn(true), 100);

      // 축하 음향 효과
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 팡파레 효과음
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        playNote(523, now, 0.15);       // C5
        playNote(659, now + 0.15, 0.15); // E5
        playNote(784, now + 0.3, 0.15);  // G5
        playNote(1047, now + 0.45, 0.4); // C6

        setTimeout(() => audioContext.close(), 1500);
      } catch (e) {}

      // duration 후 자동 완료
      const timer = setTimeout(() => {
        setAnimateIn(false);
        setTimeout(onComplete, 300);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [visible, duration, onComplete]);

  if (!visible) return null;

  const bonusItems = [
    { icon: Coins, label: '자원(시간)', value: bonuses.capital, color: 'text-yellow-400' },
    { icon: Battery, label: '에너지', value: bonuses.energy, color: 'text-orange-400' },
    { icon: Handshake, label: '신뢰', value: bonuses.trust, color: 'text-blue-400' },
    { icon: TrendingUp, label: '역량', value: bonuses.competency, color: 'text-green-400' },
    { icon: Lightbulb, label: '통찰력', value: bonuses.insight, color: 'text-purple-400' },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className={`transform transition-all duration-500 ${animateIn ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        {/* 배경 빛 효과 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-gradient-radial from-yellow-400/30 to-transparent rounded-full animate-pulse" />
        </div>

        <div className="relative bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 p-1 rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl">
            {/* 파티 아이콘 */}
            <div className="flex justify-center gap-4 mb-4">
              <PartyPopper className="text-yellow-400 animate-bounce" size={40} />
              <Trophy className="text-yellow-400 animate-pulse" size={48} />
              <PartyPopper className="text-yellow-400 animate-bounce" size={40} style={{ animationDelay: '0.2s' }} />
            </div>

            {/* 제목 */}
            <div className="text-center mb-6">
              <div className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-2">
                🎉 LAP COMPLETE! 🎉
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                한 바퀴 완주!
              </h2>
              <div className="text-xl text-yellow-300 font-bold">
                {teamName} - {lapCount}바퀴 완료
              </div>
            </div>

            {/* 보너스 목록 */}
            <div className="bg-black/30 rounded-2xl p-4 mb-6">
              <div className="text-center text-white/70 text-sm uppercase tracking-wider mb-4">
                획득 보너스
              </div>
              <div className="grid grid-cols-5 gap-2">
                {bonusItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center p-2 bg-white/10 rounded-xl transform transition-all hover:scale-110"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <item.icon className={`${item.color} mb-1`} size={24} />
                    <span className="text-white font-black text-lg">+{item.value}</span>
                    <span className="text-white/60 text-[10px] uppercase">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 진행 바 */}
            <div className="mt-4">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  style={{
                    animation: `progress ${duration}ms linear forwards`,
                  }}
                />
              </div>
              <div className="text-center text-white/50 text-xs mt-2">
                잠시 후 게임이 계속됩니다...
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
      </div>
    </div>
  );
};

export default LapBonusPopup;
