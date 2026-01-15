import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, Team } from '../types';
import Dice from './Dice';
import { Play, SkipForward, BarChart2, RefreshCcw, ArrowRight, Terminal, Pause, PlayCircle } from 'lucide-react';

interface ControlPanelProps {
  currentTeam: Team;
  phase: GamePhase;
  diceValue: [number, number];
  rolling: boolean;
  onRoll: () => void;
  onManualRoll: (total: number) => void;
  onSkip: () => void;
  onOpenReport: () => void;
  onReset: () => void;
  logs: string[];
  // 새로운 props
  isGameStarted: boolean;
  onStartGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  currentTeam,
  phase,
  diceValue,
  rolling,
  onRoll,
  onManualRoll,
  onSkip,
  onOpenReport,
  onReset,
  logs,
  isGameStarted,
  onStartGame,
  onPauseGame,
  onResumeGame
}) => {
  const [manualInput, setManualInput] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(manualInput);
    if (!isNaN(val) && val >= 2 && val <= 12) {
      onManualRoll(val);
      setManualInput('');
    } else {
      alert("Please enter a value between 2 and 12");
    }
  };

  const currentMemberName = currentTeam.members.length > 0 
    ? currentTeam.members[currentTeam.currentMemberIndex]?.name 
    : 'Leader';

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Title / Admin Section */}
      <div className="bg-white border-4 border-black p-4 shadow-hard">
        <div className="flex justify-between items-center mb-4 pb-4 border-b-4 border-black">
          <h2 className="text-2xl font-black text-blue-900 uppercase italic">Control<br/>Panel</h2>
          <div className="flex gap-2">
            <button onClick={onReset} className="p-2 border-2 border-black bg-gray-200 hover:bg-red-500 hover:text-white transition-colors" title="Reset Game">
              <RefreshCcw size={20} />
            </button>
             <button onClick={onOpenReport} className="p-2 border-2 border-black bg-gray-200 hover:bg-purple-500 hover:text-white transition-colors" title="View Report">
              <BarChart2 size={20} />
            </button>
          </div>
        </div>

        {/* Current Turn Status */}
        <div className="text-center bg-gray-100 border-2 border-black p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Current Turn</p>
          <h3 className={`text-3xl font-black uppercase mb-2 truncate ${
            currentTeam.color === 'Red' ? 'text-red-600' :
            currentTeam.color === 'Blue' ? 'text-blue-600' :
            currentTeam.color === 'Green' ? 'text-green-600' : 'text-yellow-600'
          }`} style={{ color: currentTeam.color === 'Red' ? undefined : undefined }}>
             {currentTeam.name}
          </h3>
          
          <div className="my-2 p-2 bg-white border-2 border-black">
             <p className="text-xs text-gray-400 font-bold uppercase">Roller</p>
             <p className="text-xl font-bold text-black">{currentMemberName}</p>
          </div>

          <div className={`inline-block border-2 border-black px-4 py-1 text-sm font-bold uppercase ${
            phase === GamePhase.Decision ? 'bg-orange-400 text-white animate-pulse' : 'bg-black text-white'
          }`}>
            {phase}
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="flex-1 bg-blue-900 border-4 border-black p-4 shadow-hard flex flex-col gap-4 text-white overflow-y-auto">

        {/* START / PAUSE 버튼 */}
        {!isGameStarted ? (
          <button
            onClick={onStartGame}
            className="w-full py-4 border-4 border-black font-black text-2xl shadow-hard transition-all transform active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-3 bg-green-500 text-white hover:bg-green-400"
          >
            <PlayCircle size={28} />
            START GAME
          </button>
        ) : phase === GamePhase.Paused ? (
          <button
            onClick={onResumeGame}
            className="w-full py-4 border-4 border-black font-black text-2xl shadow-hard transition-all transform active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-3 bg-green-500 text-white hover:bg-green-400"
          >
            <PlayCircle size={28} />
            RESUME
          </button>
        ) : (
          <button
            onClick={onPauseGame}
            disabled={phase === GamePhase.Rolling || phase === GamePhase.Moving || phase === GamePhase.Decision}
            className={`w-full py-3 border-4 border-black font-bold text-lg shadow-hard-sm transition-all flex items-center justify-center gap-2
              ${phase === GamePhase.Rolling || phase === GamePhase.Moving || phase === GamePhase.Decision
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed border-gray-600'
                : 'bg-orange-500 text-white hover:bg-orange-400'}`}
          >
            <Pause size={20} />
            PAUSE
          </button>
        )}

        {/* Dice Display */}
        <div className="flex justify-center gap-6 py-2">
           <Dice value={diceValue[0]} rolling={rolling} />
           <Dice value={diceValue[1]} rolling={rolling} />
        </div>

        {/* Digital Roll Button */}
        <button
          onClick={onRoll}
          disabled={!isGameStarted || phase !== GamePhase.Idle || rolling}
          className={`w-full py-4 border-4 border-black font-black text-2xl shadow-hard transition-all transform active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-3
            ${isGameStarted && phase === GamePhase.Idle && !rolling
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed border-gray-600'}`}
        >
          <Play size={24} fill="currentColor" strokeWidth={3} />
          ROLL DICE
        </button>

        {/* Manual Input */}
        <div className="bg-white p-3 border-4 border-black text-black">
          <label className="block text-xs font-bold uppercase mb-1">Offline Dice Input</label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="number"
              min="2"
              max="12"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="2-12"
              className="w-full border-2 border-black p-1 font-mono font-bold text-lg focus:outline-none focus:bg-yellow-100"
              disabled={!isGameStarted || phase !== GamePhase.Idle || rolling}
            />
            <button
              type="submit"
              disabled={!isGameStarted || phase !== GamePhase.Idle || rolling}
              className="bg-purple-900 text-white border-2 border-black px-4 hover:bg-purple-700 disabled:bg-gray-400"
            >
              <ArrowRight strokeWidth={3} />
            </button>
          </form>
        </div>

        {/* Skip Button - Moved Here */}
        <button
          onClick={onSkip}
          className="w-full py-2 bg-white border-4 border-black text-black font-bold hover:bg-gray-200 shadow-hard-sm flex items-center justify-center gap-2"
        >
          <SkipForward size={20} strokeWidth={2.5} />
          SKIP TURN
        </button>

        {/* Game Log Terminal - 고정 높이 + 스크롤바 (3배 확대) */}
        <div id="game-log-terminal" className="h-[600px] max-h-[600px] bg-black border-4 border-gray-700 p-2 font-mono text-xs overflow-y-auto relative shadow-inner flex flex-col">
          <div className="sticky top-0 bg-black/90 border-b border-gray-700 text-gray-400 font-bold uppercase text-[10px] mb-2 flex items-center gap-1 z-10">
             <Terminal size={10} /> System Log ({logs.length})
          </div>
          <div className="flex-1 flex flex-col gap-1">
             {logs.length === 0 && <span className="text-gray-600 italic">&gt; Waiting for game start...</span>}
             {logs.map((log, i) => (
                <div key={i} className="text-green-400 break-words leading-tight">
                  <span className="opacity-50 mr-1">&gt;</span>{log}
                </div>
             ))}
             <div ref={logEndRef} />
          </div>
          {/* Scrollbar styling specific to this container */}
          <style>{`
            #game-log-terminal::-webkit-scrollbar {
              width: 10px;
            }
            #game-log-terminal::-webkit-scrollbar-track {
              background: #1a1a1a;
            }
            #game-log-terminal::-webkit-scrollbar-thumb {
              background: #d97706;
              border: 2px solid #1a1a1a;
              border-radius: 4px;
            }
            #game-log-terminal::-webkit-scrollbar-thumb:hover {
              background: #f59e0b;
            }
          `}</style>
        </div>

        <div className="text-[10px] text-blue-200 text-center font-mono opacity-60">
          ID: {currentTeam.id.toUpperCase()} | P: {currentTeam.position}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;