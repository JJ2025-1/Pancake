import React from 'react';
import './IsometricGrid.css';
import Pancake from './Pancake';

interface GridItem {
  id: string;
  size: number;
  isReady: boolean;
  position: { x: number; y: number };
}

interface IsometricGridProps {
  items: GridItem[];
  gridSize?: number;
}

const IsometricGrid: React.FC<IsometricGridProps> = ({ items, gridSize = 5 }) => {
  const cells = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      cells.push({ x, y });
    }
  }

  return (
    <div className="isometric-container">
      <div className="isometric-grid">
        {cells.map((cell) => (
          <div key={`${cell.x}-${cell.y}`} className="grid-cell">
            {items.filter(item => item.position.x === cell.x && item.position.y === cell.y).map(item => (
              <Pancake key={item.id} size={item.size} isReady={item.isReady} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IsometricGrid;
