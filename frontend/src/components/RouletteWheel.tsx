import { useEffect, useState } from 'react';
import './RouletteWheel.css';

interface RouletteWheelProps {
  isSpinning: boolean;
  winningNumber: number | null;
  onSpinComplete?: () => void;
}

const RouletteWheel = ({ isSpinning, winningNumber, onSpinComplete }: RouletteWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const wheelNumbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const getNumberColor = (num: number): string => {
    if (num === 0) return 'green';
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(num) ? 'red' : 'black';
  };

  useEffect(() => {
    if (isSpinning && winningNumber !== null) {
      setIsAnimating(true);

      const winningIndex = wheelNumbers.indexOf(winningNumber);
    
      const anglePerNumber = 360 / wheelNumbers.length;
      const targetAngle = winningIndex * anglePerNumber;
      
      const totalRotation = 360 * 5 + (360 - targetAngle);
      
      setRotation(totalRotation);
      

      setTimeout(() => {
        setIsAnimating(false);
        if (onSpinComplete) {
          onSpinComplete();
        }
      }, 4000);
    }
  }, [isSpinning, winningNumber]);

  return (
    <div className="roulette-wheel-wrapper">
      <div className="wheel-pointer">▼</div>
      <div 
        className={`roulette-wheel ${isAnimating ? 'spinning' : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {wheelNumbers.map((num, index) => {
          const angle = (360 / wheelNumbers.length) * index;
          return (
            <div
              key={index}
              className={`wheel-number ${getNumberColor(num)}`}
              style={{
                transform: `rotate(${angle}deg) translateY(-140px)`,
              }}
            >
              <span style={{ transform: `rotate(-${angle}deg)` }}>
                {num}
              </span>
            </div>
          );
        })}
        <div className="wheel-center">
          <div className="wheel-center-inner"></div>
        </div>
      </div>
    </div>
  );
};

export default RouletteWheel;