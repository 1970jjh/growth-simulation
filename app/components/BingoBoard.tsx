import React from 'react';
import { BingoCell, GameCard, Team, TEAM_COLORS, BINGO_LINES } from '../types';
import { RefreshCw } from 'lucide-react';

interface BingoBoardProps {
  cells: BingoCell[];
  cards: GameCard[];
  teams: Team[];
  selectedCellIndex: number | null;
  onCellClick?: (cellIndex: number) => void;
  onReplaceCard?: (cellIndex: number) => void;
  isAdmin?: boolean;
  isSelectable?: boolean;
  currentTurnTeamId?: string;
  completedLines?: number[];  // 완성된 라인 인덱스들
}

const CENTER_CELL_INDEX = 12; // 가운데 칸 (조커)

const BingoBoard: React.FC<BingoBoardProps> = ({
  cells,
  cards,
  teams,
  selectedCellIndex,
  onCellClick,
  onReplaceCard,
  isAdmin = false,
  isSelectable = false,
  currentTurnTeamId,
  completedLines = []
}) => {
  // 카드 ID로 카드 찾기
  const getCardById = (cardId: string): GameCard | undefined => {
    return cards.find(card => card.id === cardId);
  };

  // 팀 ID로 팀 찾기
  const getTeamById = (teamId: string): Team | undefined => {
    return teams.find(team => team.id === teamId);
  };

  // 셀이 빙고 라인에 포함되어 있는지 확인
  const isInCompletedLine = (cellIndex: number): boolean => {
    return completedLines.some(lineIndex => {
      const line = BINGO_LINES[lineIndex];
      return line.cells.includes(cellIndex);
    });
  };

  // 셀 클릭 핸들러
  const handleCellClick = (cellIndex: number) => {
    const cell = cells[cellIndex];
    if (!cell) return;

    // 관리자는 모든 셀 클릭 가능
    if (isAdmin && onCellClick) {
      onCellClick(cellIndex);
      return;
    }

    // 이미 완료된 칸이면 클릭 불가
    if (cell.isCompleted) return;

    // 선택 가능한 상태일 때만
    if (isSelectable && onCellClick) {
      onCellClick(cellIndex);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 빙고판 그리드 */}
      <div className="grid grid-cols-5 gap-1 md:gap-2 p-2 bg-gray-800 rounded-lg">
        {cells.map((cell, index) => {
          const card = getCardById(cell.cardId);
          const ownerTeam = cell.ownerTeamId ? getTeamById(cell.ownerTeamId) : null;
          const teamColor = ownerTeam ? TEAM_COLORS[ownerTeam.colorIndex] : null;
          const isSelected = selectedCellIndex === index;
          const isCompleted = cell.isCompleted;
          const inCompletedLine = isInCompletedLine(index);
          const isJokerCell = index === CENTER_CELL_INDEX;

          return (
            <div
              key={cell.index}
              className={`
                relative aspect-square rounded-md overflow-hidden
                transition-all duration-200 cursor-pointer
                ${isCompleted
                  ? 'ring-2 ring-offset-1'
                  : 'hover:scale-105 hover:z-10'
                }
                ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 scale-105 z-20' : ''}
                ${inCompletedLine && isCompleted ? 'ring-4 ring-white' : ''}
                ${!isCompleted && isSelectable ? 'hover:ring-2 hover:ring-white' : ''}
              `}
              style={{
                backgroundColor: teamColor ? teamColor.bg : '#374151',
                borderColor: teamColor ? teamColor.bg : 'transparent'
              }}
              onClick={() => handleCellClick(index)}
            >
              {/* 카드 제목 */}
              <div
                className={`
                  absolute inset-0 flex flex-col items-center justify-center p-1 md:p-2
                  ${isCompleted ? 'bg-opacity-90' : 'bg-gray-700'}
                  ${isJokerCell && !isCompleted ? 'bg-gradient-to-br from-purple-600 to-pink-500' : ''}
                `}
                style={{
                  backgroundColor: teamColor ? teamColor.bg : undefined,
                  color: teamColor ? teamColor.text : '#FFFFFF'
                }}
              >
                {/* 조커 표시 */}
                {isJokerCell && (
                  <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 text-[8px] md:text-xs">
                    🃏
                  </span>
                )}
                <span className={`
                  text-[10px] md:text-xs font-bold text-center leading-tight
                  ${isCompleted ? '' : 'text-white'}
                `}>
                  {card?.title || `카드 ${index + 1}`}
                </span>

                {/* 조커 라벨 (미점령 시) */}
                {isJokerCell && !isCompleted && (
                  <span className="mt-0.5 text-[8px] md:text-[10px] font-black text-yellow-300">
                    JOKER
                  </span>
                )}

                {/* 팀 이름 표시 (완료된 칸) */}
                {ownerTeam && (
                  <span className="mt-1 text-[8px] md:text-[10px] font-semibold opacity-90">
                    {ownerTeam.name}
                  </span>
                )}
              </div>

              {/* 칸 번호 */}
              <div className="absolute top-0.5 left-0.5 md:top-1 md:left-1 text-[8px] md:text-xs font-mono text-gray-400 opacity-50">
                {index + 1}
              </div>

              {/* 관리자용 카드 교체 버튼 */}
              {isAdmin && !isCompleted && onReplaceCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplaceCard(index);
                  }}
                  className="absolute top-0.5 right-0.5 md:top-1 md:right-1 p-0.5 md:p-1 bg-black bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                  title="카드 변경"
                >
                  <RefreshCw className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </button>
              )}

              {/* 선택 중 표시 */}
              {isSelected && (
                <div className="absolute inset-0 bg-yellow-400 bg-opacity-30 flex items-center justify-center">
                  <span className="text-yellow-400 font-black text-lg md:text-2xl animate-pulse">
                    !
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {teams.map(team => {
          const color = TEAM_COLORS[team.colorIndex];
          return (
            <div
              key={team.id}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
              style={{ backgroundColor: color.light, color: color.bg }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color.bg }}
              />
              {team.name}: {team.ownedCells.length}칸
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BingoBoard;
