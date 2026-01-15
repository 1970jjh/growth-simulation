import React, { useEffect, useState, useRef } from 'react';

interface SlotMachineProps {
  value1: number;
  value2: number;
  rolling: boolean;
  onRollComplete?: () => void;
}

const SlotMachine: React.FC<SlotMachineProps> = ({ value1, value2, rolling, onRollComplete }) => {
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1]);
  const [slot1Stopped, setSlot1Stopped] = useState(false);
  const [slot2Stopped, setSlot2Stopped] = useState(false);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (rolling) {
      setSlot1Stopped(false);
      setSlot2Stopped(false);

      // 오디오 컨텍스트 생성
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {}

      const playTickSound = () => {
        if (!audioContextRef.current) return;
        try {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.frequency.value = 300 + Math.random() * 200;
          osc.type = 'square';
          gain.gain.value = 0.08;
          gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.05);
          osc.start();
          osc.stop(audioContextRef.current.currentTime + 0.05);
        } catch (e) {}
      };

      const playStopSound = () => {
        if (!audioContextRef.current) return;
        try {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.frequency.value = 600;
          osc.type = 'sine';
          gain.gain.value = 0.2;
          gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);
          osc.start();
          osc.stop(audioContextRef.current.currentTime + 0.2);
        } catch (e) {}
      };

      let frame = 0;
      let speed = 50; // ms per frame
      const slot1StopFrame = 30 + Math.floor(Math.random() * 10);
      const slot2StopFrame = slot1StopFrame + 15 + Math.floor(Math.random() * 10);

      const animate = () => {
        frame++;

        // 속도 점점 느려짐
        if (frame > 20) {
          speed = Math.min(200, speed * 1.05);
        }

        // 슬롯 1 멈춤
        if (frame >= slot1StopFrame && !slot1Stopped) {
          setSlot1Stopped(true);
          setDisplayValues(prev => [value1, prev[1]]);
          playStopSound();
        }

        // 슬롯 2 멈춤
        if (frame >= slot2StopFrame && !slot2Stopped) {
          setSlot2Stopped(true);
          setDisplayValues([value1, value2]);
          playStopSound();

          // 완료 콜백
          setTimeout(() => {
            if (onRollComplete) onRollComplete();
          }, 300);
          return;
        }

        // 돌아가는 중
        setDisplayValues(prev => {
          const newVal1 = slot1Stopped || frame >= slot1StopFrame ? value1 : Math.floor(Math.random() * 6) + 1;
          const newVal2 = slot2Stopped || frame >= slot2StopFrame ? value2 : Math.floor(Math.random() * 6) + 1;
          return [newVal1, newVal2];
        });

        playTickSound();
        animationRef.current = window.setTimeout(animate, speed) as unknown as number;
      };

      animate();

      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    } else {
      setDisplayValues([value1, value2]);
      setSlot1Stopped(true);
      setSlot2Stopped(true);
    }
  }, [rolling, value1, value2]);

  const SlotReel: React.FC<{ value: number; stopped: boolean; index: number }> = ({ value, stopped, index }) => {
    return (
      <div className="relative">
        {/* 슬롯 프레임 */}
        <div className="relative bg-gradient-to-b from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-2 border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
          {/* 내부 그라데이션 오버레이 */}
          <div className="absolute inset-0 rounded-xl pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%)'
            }}
          />

          {/* 숫자 디스플레이 */}
          <div className={`
            w-28 h-36 md:w-36 md:h-44
            bg-gradient-to-b from-white via-gray-100 to-white
            rounded-xl flex items-center justify-center
            border-2 border-gray-400
            shadow-inner
            overflow-hidden
            ${!stopped ? 'animate-pulse' : ''}
          `}>
            <span className={`
              text-7xl md:text-8xl font-black text-gray-900
              transition-all duration-100
              ${!stopped ? 'blur-sm scale-110' : 'blur-0 scale-100'}
            `}
            style={{
              textShadow: '2px 2px 0 #ccc, 4px 4px 8px rgba(0,0,0,0.2)'
            }}
            >
              {value}
            </span>
          </div>

          {/* 멈춤 표시 */}
          {stopped && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg">
              <span className="text-lg">✓</span>
            </div>
          )}
        </div>

        {/* 슬롯 라벨 */}
        <div className="text-center mt-3">
          <span className="text-yellow-400 font-bold text-lg">SLOT {index + 1}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* 슬롯머신 타이틀 */}
      <div className="mb-6 text-center">
        <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black px-8 py-2 rounded-full font-black text-2xl border-4 border-yellow-600 shadow-lg">
          🎰 DICE SLOT 🎰
        </div>
      </div>

      {/* 슬롯 릴들 */}
      <div className="flex gap-6 md:gap-10 items-center">
        <SlotReel value={displayValues[0]} stopped={slot1Stopped && !rolling} index={0} />

        {/* 플러스 기호 */}
        <div className="text-5xl md:text-6xl font-black text-yellow-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          +
        </div>

        <SlotReel value={displayValues[1]} stopped={slot2Stopped && !rolling} index={1} />
      </div>

      {/* 롤링 인디케이터 */}
      {rolling && !slot1Stopped && !slot2Stopped && (
        <div className="mt-6 flex gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

export default SlotMachine;
