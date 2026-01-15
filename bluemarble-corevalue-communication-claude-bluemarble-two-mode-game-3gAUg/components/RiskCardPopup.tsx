import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ticket, X, Users, ArrowRight, Skull } from 'lucide-react';
import { Team } from '../types';

interface RiskCardPopupProps {
  visible: boolean;
  teamName: string;
  chanceCardNumber: number; // 2 또는 4
  teams: Team[];
  currentTeamId: string;
  onSelectTeam: (targetTeamId: string) => void;
  onSkip: () => void;
  duration?: number;
}

const RiskCardPopup: React.FC<RiskCardPopupProps> = ({
  visible,
  teamName,
  chanceCardNumber,
  teams,
  currentTeamId,
  onSelectTeam,
  onSkip,
  duration = 10000,
}) => {
  const [animateIn, setAnimateIn] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const otherTeams = teams.filter(t => t.id !== currentTeamId);

  useEffect(() => {
    if (visible) {
      // 애니메이션 시작
      setTimeout(() => setAnimateIn(true), 100);

      // 경고 음향 효과
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 불길한 소리
        const playNote = (freq: number, startTime: number, dur: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
          osc.start(startTime);
          osc.stop(startTime + dur);
        };

        const now = audioContext.currentTime;
        playNote(150, now, 0.3);
        playNote(130, now + 0.3, 0.3);
        playNote(110, now + 0.6, 0.5);

        setTimeout(() => audioContext.close(), 1500);
      } catch (e) {}

      // duration 후 자동 랜덤 양도 (선택 안 하면)
      const timer = setTimeout(() => {
        const availableTeams = teams.filter(t => t.id !== currentTeamId);
        if (!confirmed && availableTeams.length > 0) {
          // 랜덤 팀 선택
          const randomIndex = Math.floor(Math.random() * availableTeams.length);
          const randomTeam = availableTeams[randomIndex];
          onSelectTeam(randomTeam.id);
        } else if (!confirmed) {
          // 다른 팀이 없으면 건너뛰기
          onSkip();
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      setSelectedTeam(null);
      setConfirmed(false);
    }
  }, [visible, duration, onSkip, onSelectTeam, confirmed, teams, currentTeamId]);

  if (!visible) return null;

  const handleConfirm = () => {
    if (selectedTeam) {
      setConfirmed(true);
      onSelectTeam(selectedTeam);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm">
      {/* 건너뛰기 버튼 */}
      <button
        onClick={onSkip}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all border-2 border-white/30"
        title="건너뛰기"
      >
        <X size={24} />
      </button>

      <div className={`transform transition-all duration-500 ${animateIn ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        {/* 배경 빛 효과 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-gradient-radial from-red-500/30 to-transparent rounded-full animate-pulse" />
        </div>

        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-1 rounded-3xl shadow-2xl max-w-lg mx-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl">
            {/* 경고 아이콘 */}
            <div className="flex justify-center gap-4 mb-4">
              <Skull className="text-red-400 animate-pulse" size={40} />
              <AlertTriangle className="text-red-400 animate-bounce" size={48} />
              <Skull className="text-red-400 animate-pulse" size={40} />
            </div>

            {/* 제목 */}
            <div className="text-center mb-6">
              <div className="text-red-400 text-sm font-bold uppercase tracking-widest mb-2">
                ⚠️ RISK CARD! ⚠️
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                리스크 카드!
              </h2>
              <div className="text-xl text-red-300 font-bold">
                {teamName}
              </div>
            </div>

            {/* 경고 메시지 */}
            <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-4 mb-6 text-center">
              <div className="text-white/90 text-sm mb-2">
                <span className="text-xl font-black text-red-400">{chanceCardNumber}번째</span> 찬스 카드
              </div>
              <div className="text-red-300 font-bold text-lg mb-2">
                💀 이번 카드는 모든 점수가 마이너스!
              </div>
              <div className="text-white/70 text-sm">
                어떤 선택을 해도 손해를 입게 됩니다.
              </div>
            </div>

            {/* 복권 양도 선택 */}
            <div className="bg-black/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Ticket className="text-yellow-400" size={24} />
                <span className="text-white font-bold">복권 양도 패널티</span>
              </div>
              <div className="text-white/70 text-sm text-center mb-4">
                보유한 복권 1장을 다른 팀에게 넘겨야 합니다.
                <br />
                (복권이 없으면 건너뛰기)
              </div>

              {otherTeams.length > 0 ? (
                <div className="space-y-2">
                  {otherTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        selectedTeam === team.id
                          ? 'bg-yellow-500 border-yellow-400 text-black'
                          : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                      }`}
                    >
                      <Users size={20} />
                      <span className="font-bold">{team.name}</span>
                      {selectedTeam === team.id && (
                        <ArrowRight className="ml-auto" size={20} />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  양도할 다른 팀이 없습니다
                </div>
              )}
            </div>

            {/* 확인 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
              >
                건너뛰기
              </button>
              {selectedTeam && (
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Ticket size={20} />
                  복권 양도
                </button>
              )}
            </div>

            {/* 진행 바 */}
            <div className="mt-4">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-red-600"
                  style={{
                    animation: `progress ${duration}ms linear forwards`,
                  }}
                />
              </div>
              <div className="text-center text-white/50 text-xs mt-2">
                ⚠️ 시간 내 선택하지 않으면 랜덤 팀에게 자동 양도됩니다!
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

export default RiskCardPopup;
