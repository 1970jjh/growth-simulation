import React, { useEffect, useState } from 'react';
import { Gift, PartyPopper, Ticket, X } from 'lucide-react';

interface LotteryBonusPopupProps {
  visible: boolean;
  teamName: string;
  chanceCardNumber: number; // 1, 3, 또는 5
  onComplete: () => void;
  duration?: number;
}

const LotteryBonusPopup: React.FC<LotteryBonusPopupProps> = ({
  visible,
  teamName,
  chanceCardNumber,
  onComplete,
  duration = 5000,
}) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visible) {
      // 애니메이션 시작
      setTimeout(() => setAnimateIn(true), 100);

      // 빵빠레 음향 효과
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 승리 팡파레 멜로디
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        // 팡파레 멜로디
        playNote(392, now, 0.12);        // G4
        playNote(523, now + 0.12, 0.12); // C5
        playNote(659, now + 0.24, 0.12); // E5
        playNote(784, now + 0.36, 0.12); // G5
        playNote(659, now + 0.48, 0.12); // E5
        playNote(784, now + 0.6, 0.4);   // G5 (long)

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

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
      {/* 건너뛰기 버튼 */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all border-2 border-white/30"
        title="건너뛰기"
      >
        <X size={24} />
      </button>

      <div className={`transform transition-all duration-500 ${animateIn ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        {/* 배경 빛 효과 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-gradient-radial from-yellow-400/30 to-transparent rounded-full animate-pulse" />
        </div>

        <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-1 rounded-3xl shadow-2xl">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl">
            {/* 파티 아이콘 */}
            <div className="flex justify-center gap-4 mb-4">
              <PartyPopper className="text-yellow-400 animate-bounce" size={40} />
              <Ticket className="text-yellow-400 animate-pulse" size={48} />
              <PartyPopper className="text-yellow-400 animate-bounce" size={40} style={{ animationDelay: '0.2s' }} />
            </div>

            {/* 제목 */}
            <div className="text-center mb-6">
              <div className="text-green-400 text-sm font-bold uppercase tracking-widest mb-2">
                🎫 LOTTERY BONUS! 🎫
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                팀 복권 당첨!
              </h2>
              <div className="text-xl text-yellow-300 font-bold">
                {teamName}
              </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="bg-black/30 rounded-2xl p-6 mb-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 rounded-full animate-bounce">
                  <Gift className="text-white" size={48} />
                </div>
              </div>
              <div className="text-white/90 text-lg mb-2">
                <span className="text-2xl font-black text-yellow-400">{chanceCardNumber}번째</span> 찬스 카드!
              </div>
              <div className="text-white font-bold text-xl">
                🎁 강사님에게 팀 복권을 받으세요!
              </div>
              <div className="text-green-300 text-sm mt-3 font-medium">
                게임 종료 시 복권으로 추가 보상을 받을 수 있습니다
              </div>
            </div>

            {/* 진행 바 */}
            <div className="mt-4">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
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

export default LotteryBonusPopup;
