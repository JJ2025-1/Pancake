import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import IsometricGrid from './components/IsometricGrid';

interface PancakeItem {
  id: string;
  size: number;
  isReady: boolean;
  position: { x: number; y: number };
}

const PANCAKE_READY_TIME = 30 * 60; // 30 minutes in seconds

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [pancakes, setPancakes] = useState<PancakeItem[]>([]);
  const [isFocusing, setIsFocusing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentPancakeId, setCurrentPancakeId] = useState<string | null>(null);

  // Load saved pancakes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pancakes');
    if (saved) {
      setPancakes(JSON.parse(saved));
    }
  }, []);

  // Save pancakes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pancakes', JSON.stringify(pancakes));
  }, [pancakes]);

  const findEmptyCell = useCallback(() => {
    const occupied = new Set(pancakes.map(p => `${p.position.x}-${p.position.y}`));
    const emptyCells = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (!occupied.has(`${x}-${y}`)) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) return null;
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, [pancakes]);

  useEffect(() => {
    let interval: any;
    if (isFocusing) {
      interval = setInterval(() => {
        setTimer(prev => {
          const nextTime = prev + 1;
          
          // Update the growing pancake
          if (currentPancakeId) {
            setPancakes(prevPancakes => prevPancakes.map(p => {
              if (p.id === currentPancakeId) {
                const newSize = Math.min(nextTime / PANCAKE_READY_TIME, 1);
                const isReady = nextTime >= PANCAKE_READY_TIME;
                return { ...p, size: newSize, isReady };
              }
              return p;
            }));

            // If it reached 30 mins, complete it and start a new one if still focusing?
            // User said "every 30 mins the pancake it will ready like a new born"
            if (nextTime >= PANCAKE_READY_TIME) {
              // Current one is ready. Reset timer to start a new one?
              // Or just stop. Let's assume it keeps going for another 30 mins.
              setTimer(0);
              const nextCell = findEmptyCell();
              if (nextCell) {
                const nextId = Math.random().toString(36).substr(2, 9);
                setCurrentPancakeId(nextId);
                setPancakes(prevPancakes => [
                  ...prevPancakes,
                  { id: nextId, size: 0, isReady: false, position: nextCell }
                ]);
              } else {
                setIsFocusing(false);
                alert("Grid is full of delicious pancakes!");
              }
            }
          }
          
          return nextTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusing, currentPancakeId, findEmptyCell]);

  const startFocus = () => {
    const cell = findEmptyCell();
    if (!cell) {
      alert("No space for more pancakes!");
      return;
    }
    const id = Math.random().toString(36).substr(2, 9);
    setCurrentPancakeId(id);
    setPancakes(prev => [...prev, { id, size: 0, isReady: false, position: cell }]);
    setTimer(0);
    setIsFocusing(true);
  };

  const stopFocus = () => {
    setIsFocusing(false);
    // Remove the current growing pancake if it's not ready
    if (currentPancakeId) {
      setPancakes(prev => prev.filter(p => p.id !== currentPancakeId || p.isReady));
      setCurrentPancakeId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username) setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="pancake-logo-container">
             <div className="pancake-top"></div>
             <div className="pancake-filling"></div>
             <div className="pancake-bottom"></div>
          </div>
          <h2>Sign in to Pancake</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Chef Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn-primary">Start Cooking</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="app-header">
        <h1>Pancake</h1>
        <div className="user-info">
          <span>Chef {username}</span>
          <button onClick={() => setIsLoggedIn(false)} className="btn-secondary">Logout</button>
        </div>
      </header>

      <main className="game-area">
        <div className="stats-panel">
          <div className="stat-card">
            <h3>Pancakes Baked</h3>
            <p className="stat-value">{pancakes.filter(p => p.isReady).length}</p>
          </div>
          <div className="timer-display">
            <h2>{formatTime(isFocusing ? timer : 0)}</h2>
            <p>{isFocusing ? "Cooking..." : "Ready to cook?"}</p>
          </div>
          <button 
            className={`btn-action ${isFocusing ? 'stop' : 'start'}`}
            onClick={isFocusing ? stopFocus : startFocus}
          >
            {isFocusing ? "Stop Session" : "Start Focus Session"}
          </button>
        </div>

        <IsometricGrid items={pancakes} />
      </main>

      <footer className="app-footer">
        <p>Every 30 minutes of focus grows a new pancake!</p>
      </footer>
    </div>
  );
}

export default App;
