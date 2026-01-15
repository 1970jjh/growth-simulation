import React, { useEffect, useRef, useState } from 'react';

interface Dice3DProps {
  value: number;
  rolling: boolean;
  onRollComplete?: () => void;
  size?: number;
}

const Dice3D: React.FC<Dice3DProps> = ({ value, rolling, onRollComplete, size = 80 }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 각 면의 회전값 매핑
  const faceRotations: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 180, y: 0 },
  };

  useEffect(() => {
    if (rolling) {
      // 주사위 굴리는 음향 효과 시작
      try {
        // Web Audio API로 주사위 소리 생성
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playDiceSound = () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 200 + Math.random() * 300;
          oscillator.type = 'square';
          gainNode.gain.value = 0.1;
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
        };

        // 반복 재생
        const soundInterval = setInterval(playDiceSound, 100);

        let frame = 0;
        const maxFrames = 50; // 약 5초 (100ms * 50)
        let speed = 20;

        const animate = () => {
          frame++;
          // 속도 점점 감소
          if (frame > maxFrames * 0.7) {
            speed = Math.max(2, speed * 0.95);
          }

          setRotation(prev => ({
            x: prev.x + speed + Math.random() * 10,
            y: prev.y + speed + Math.random() * 10,
          }));

          if (frame < maxFrames) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            // 최종 값으로 설정
            const finalRotation = faceRotations[value] || { x: 0, y: 0 };
            setRotation(finalRotation);
            clearInterval(soundInterval);
            if (onRollComplete) onRollComplete();
          }
        };

        animate();

        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          clearInterval(soundInterval);
          audioContext.close();
        };
      } catch (e) {
        console.warn('Audio not supported');
      }
    } else {
      // 롤링이 아닐 때 해당 값으로 설정
      const finalRotation = faceRotations[value] || { x: 0, y: 0 };
      setRotation(finalRotation);
    }
  }, [rolling, value]);

  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
  };

  const getDotStyle = (position: string, dotSize: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: dotSize,
      height: dotSize,
      borderRadius: '50%',
      backgroundColor: '#1a1a1a',
    };

    switch (position) {
      case 'center':
        return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'top-left':
        return { ...base, top: '20%', left: '20%' };
      case 'top-right':
        return { ...base, top: '20%', right: '20%' };
      case 'middle-left':
        return { ...base, top: '50%', left: '20%', transform: 'translateY(-50%)' };
      case 'middle-right':
        return { ...base, top: '50%', right: '20%', transform: 'translateY(-50%)' };
      case 'bottom-left':
        return { ...base, bottom: '20%', left: '20%' };
      case 'bottom-right':
        return { ...base, bottom: '20%', right: '20%' };
      default:
        return base;
    }
  };

  const renderFace = (faceValue: number, transform: string) => {
    const dotSize = size * 0.15;
    return (
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          backgroundColor: '#fff',
          border: '3px solid #000',
          borderRadius: size * 0.1,
          transform,
          backfaceVisibility: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
        }}
      >
        {dotPositions[faceValue]?.map((pos, i) => (
          <div key={i} style={getDotStyle(pos, dotSize)} />
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        perspective: 300,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: rolling ? 'none' : 'transform 0.5s ease-out',
        }}
      >
        {/* Front - 1 */}
        {renderFace(1, `translateZ(${size / 2}px)`)}
        {/* Back - 6 */}
        {renderFace(6, `rotateY(180deg) translateZ(${size / 2}px)`)}
        {/* Right - 5 */}
        {renderFace(5, `rotateY(90deg) translateZ(${size / 2}px)`)}
        {/* Left - 2 */}
        {renderFace(2, `rotateY(-90deg) translateZ(${size / 2}px)`)}
        {/* Top - 3 */}
        {renderFace(3, `rotateX(90deg) translateZ(${size / 2}px)`)}
        {/* Bottom - 4 */}
        {renderFace(4, `rotateX(-90deg) translateZ(${size / 2}px)`)}
      </div>
    </div>
  );
};

export default Dice3D;
