// 음향 효과 유틸리티

class SoundEffects {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // 주사위 굴리는 소리
  playDiceRoll(): void {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 200 + Math.random() * 300;
      oscillator.type = 'square';
      gainNode.gain.value = 0.08;
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 주사위 결과 공개
  playDiceResult(): void {
    try {
      const ctx = this.getContext();
      // 상승 음
      [400, 600, 800].forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.12;
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
        }, i * 100);
      });
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 말 이동 소리 (한 칸)
  playMove(): void {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 300;
      oscillator.type = 'triangle';
      gainNode.gain.value = 0.1;
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 더블 보너스
  playDoubleBonus(): void {
    try {
      const ctx = this.getContext();
      // 팡파레 스타일
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.15;
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
        }, i * 150);
      });
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 한 바퀴 완주
  playLapComplete(): void {
    try {
      const ctx = this.getContext();
      // 더 화려한 팡파레
      const notes = [392, 494, 587, 784, 988, 1175]; // G4, B4, D5, G5, B5, D6
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.12;
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.4);
        }, i * 100);
      });
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 카드 등장
  playCardAppear(): void {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 게임 시작
  playGameStart(): void {
    try {
      const ctx = this.getContext();
      const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = freq;
          oscillator.type = 'triangle';
          gainNode.gain.value = 0.15;
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
        }, i * 200);
      });
    } catch (e) {
      console.warn('Sound not supported');
    }
  }

  // 일시정지
  playPause(): void {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 200;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Sound not supported');
    }
  }
}

export const soundEffects = new SoundEffects();
