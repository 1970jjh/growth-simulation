import React from 'react';

interface DiceProps {
  value: number;
  rolling: boolean;
}

const Dice: React.FC<DiceProps> = ({ value, rolling }) => {
  const dots: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[20, 20], [80, 80]],
    3: [[20, 20], [50, 50], [80, 80]],
    4: [[20, 20], [20, 80], [80, 20], [80, 80]],
    5: [[20, 20], [20, 80], [50, 50], [80, 20], [80, 80]],
    6: [[20, 20], [20, 50], [20, 80], [80, 20], [80, 50], [80, 80]],
  };

  return (
    <div
      className={`w-16 h-16 bg-white border-4 border-black flex relative overflow-hidden transition-transform duration-500 shadow-hard-sm ${
        rolling ? 'animate-spin' : ''
      }`}
    >
      {dots[value]?.map(([left, top], i) => (
        <div
          key={i}
          className="absolute w-3 h-3 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${left}%`, top: `${top}%` }}
        />
      ))}
    </div>
  );
};

export default Dice;