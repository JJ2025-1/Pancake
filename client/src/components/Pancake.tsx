import React from 'react';
import './Pancake.css';

interface PancakeProps {
  size: number; // 0 to 1
  isReady?: boolean;
}

const Pancake: React.FC<PancakeProps> = ({ size, isReady }) => {
  const scale = 0.2 + size * 0.8;
  
  return (
    <div className={`pancake-container ${isReady ? 'ready' : ''}`} style={{ transform: `scale(${scale})` }}>
      <div className="pancake-top"></div>
      <div className="pancake-filling"></div>
      <div className="pancake-bottom"></div>
    </div>
  );
};

export default Pancake;
