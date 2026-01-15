import React from 'react';
import { Team, TeamColor } from '../types';
import { Battery, Coins, Star, Handshake, TrendingUp, Lightbulb } from 'lucide-react';

interface TeamStatusProps {
  team: Team;
  active: boolean;
  rank?: number;
  gapFrom1st?: number;
  totalTeams?: number;
}

const TeamStatus: React.FC<TeamStatusProps> = ({ team, active, rank, gapFrom1st, totalTeams }) => {
  const getHeaderColor = (color: TeamColor) => {
    switch (color) {
      case TeamColor.Red: return 'bg-red-600 text-white';
      case TeamColor.Blue: return 'bg-blue-600 text-white';
      case TeamColor.Green: return 'bg-green-600 text-white';
      case TeamColor.Yellow: return 'bg-yellow-400 text-black';
    }
  };

  const ResourceBar = ({ value, max, color, icon: Icon, label }: any) => {
    // Determine bar visual width percentage (clamped 0-100)
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div className="mb-1">
        <div className="flex justify-between text-[10px] font-bold text-black mb-0.5 uppercase tracking-tighter">
          <span className="flex items-center gap-0.5"><Icon size={10} className="stroke-[3]" /> {label}</span>
          {/* Display actual value even if negative or > 100 */}
          <span className={`font-mono ${value < 0 ? 'text-red-600' : ''}`}>{value}/{max}</span>
        </div>
        <div className="h-2 w-full bg-white border border-black relative">
          <div
            className={`h-full ${color} absolute top-0 left-0 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
          {value > max && (
            <div className="absolute top-[-3px] right-0 text-[8px] font-black text-red-600 animate-pulse bg-white border border-black px-0.5">
              {value}
            </div>
          )}
          {value < 0 && (
             <div className="absolute top-0 left-0 w-full h-full bg-red-100/50 flex items-center justify-center text-[7px] font-black text-red-600">
                NEG
             </div>
          )}
        </div>
      </div>
    );
  };

  // 팀 총점 계산
  const totalScore = team.resources.capital + team.resources.energy + team.resources.trust + team.resources.competency + team.resources.insight;

  return (
    <div className={`border-2 border-black bg-white transition-all duration-300 ${active ? 'shadow-hard translate-x-[-1px] translate-y-[-1px] ring-2 ring-yellow-400' : 'opacity-90'}`}>
      <div className={`px-2 py-1 border-b-2 border-black ${getHeaderColor(team.color)}`}>
        <div className="flex justify-between items-center">
          <h3 className="font-black text-sm uppercase truncate">{team.name}</h3>
          <div className="flex items-center gap-1">
            {team.isBurnout && <span className="bg-black text-white text-[8px] px-1 py-0.5 font-bold">BURN</span>}
            {active && <span className="text-sm animate-bounce">▼</span>}
          </div>
        </div>
        {/* 팀원 목록 표시 */}
        {team.members.length > 0 && (
          <div className="text-[9px] opacity-80 truncate">
            {team.members.map(m => m.name).join(', ')}
          </div>
        )}
      </div>

      {/* 순위 및 1위와의 격차 표시 */}
      {rank !== undefined && totalTeams !== undefined && (
        <div className="px-2 py-1.5 bg-gray-100 border-b border-gray-300 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`font-black text-lg ${rank === 1 ? 'text-yellow-600' : rank === 2 ? 'text-gray-500' : rank === 3 ? 'text-orange-600' : 'text-gray-700'}`}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
            </span>
            <span className="text-[10px] text-gray-500">/ {totalTeams}팀</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">총점:</span>
            <span className="font-bold text-sm">{totalScore}</span>
            {rank !== 1 && gapFrom1st !== undefined && gapFrom1st !== 0 && (
              <span className="text-[10px] text-red-500 font-bold">
                ({gapFrom1st > 0 ? `-${gapFrom1st}` : `+${Math.abs(gapFrom1st)}`})
              </span>
            )}
            {rank === 1 && (
              <span className="text-[10px] text-green-600 font-bold">1위</span>
            )}
          </div>
        </div>
      )}

      <div className="p-2 space-y-1">
        {/* Resource (Time) Display */}
        <div className="mb-1">
          <div className="flex justify-between text-[10px] font-bold text-black mb-0.5 uppercase tracking-tighter">
            <span className="flex items-center gap-0.5"><Coins size={10} className="stroke-[3]" /> Resource</span>
            <span className={`font-mono ${team.resources.capital < 0 ? 'text-red-600' : ''}`}>{team.resources.capital}/100</span>
          </div>
          <div className="h-2 w-full bg-white border border-black relative">
            <div
              className="h-full bg-yellow-400 absolute top-0 left-0 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, (team.resources.capital / 100) * 100))}%` }}
            />
            {team.resources.capital < 0 && (
               <div className="absolute inset-0 bg-red-100/50 flex items-center justify-center text-[8px] font-bold text-red-600">DEBT</div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <ResourceBar value={team.resources.energy} max={100} color="bg-orange-500" icon={Battery} label="Energy" />
          <ResourceBar value={team.resources.trust} max={100} color="bg-blue-400" icon={Handshake} label="Trust" />
          <ResourceBar value={team.resources.competency} max={100} color="bg-green-500" icon={TrendingUp} label="Skill" />
          <ResourceBar value={team.resources.insight} max={100} color="bg-purple-500" icon={Lightbulb} label="Insight" />
        </div>
      </div>
    </div>
  );
};

export default TeamStatus;