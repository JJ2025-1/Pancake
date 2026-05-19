import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import IsometricGrid from './components/IsometricGrid';
import MotivationalQuote from './components/MotivationalQuote';
import StatsDisplay from './components/StatsDisplay';
import StudyCompanion from './components/StudyCompanion';

interface PancakeItem {
  id: string;
  size: number;
  isReady: boolean;
  position: { x: number; y: number };
}

interface SessionData {
  date: string;
  score: number;
}

const PANCAKE_READY_TIME = 30 * 60; // 30 minutes in seconds

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [pancakes, setPancakes] = useState<PancakeItem[]>([]);
  const [isFocusing, setIsFocusing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentPancakeId, setCurrentPancakeId] = useState<string | null>(null);
  
  // New State
  const [focusTopic, setFocusTopic] = useState('');
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch('/api/user-data?username=default_user');
      const data = await response.json();
      setStreak(data.streak);
      setSessions(data.sessions);
    } catch (error) {
      console.error("Failed to fetch user data", error);
    }
  }, []);

  const completeSession = useCallback(async () => {
    try {
      await fetch('/api/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: focusTopic })
      });
      setIsCompleted(true);
      fetchUserData();
      // Reset isCompleted after some time
      setTimeout(() => setIsCompleted(false), 10000);
    } catch (error) {
      console.error("Failed to complete session", error);
    }
  }, [focusTopic, fetchUserData]);

  // Load saved pancakes from localStorage on mount
  useEffect(() => {
    const init = () => {
      const saved = localStorage.getItem('pancakes');
      if (saved) {
        setPancakes(JSON.parse(saved));
      }
      fetchUserData();
    };
    init();
  }, [fetchUserData]);

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
    let interval: ReturnType<typeof setInterval>;
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

            if (nextTime >= PANCAKE_READY_TIME) {
              completeSession();
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
  }, [isFocusing, currentPancakeId, findEmptyCell, completeSession]);

  const startFocus = () => {
    if (!focusTopic) {
      alert("Please enter what you're studying first!");
      return;
    }
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
    setIsCompleted(false);
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
        <div className="side-panel">
          <MotivationalQuote />
          <div className="stats-panel">
            <StatsDisplay streak={streak} sessions={sessions} />
            
            <div className="topic-input-container">
              <label>Focus Topic</label>
              <input 
                type="text" 
                placeholder="What are you studying?" 
                className="topic-input"
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                disabled={isFocusing}
              />
            </div>

            <div className="timer-display">
              <h2>{formatTime(isFocusing ? timer : 0)}</h2>
              <p>{isFocusing ? `Cooking: ${focusTopic}` : "Ready to cook?"}</p>
            </div>
            
            <button 
              className={`btn-action ${isFocusing ? 'stop' : 'start'}`}
              onClick={isFocusing ? stopFocus : startFocus}
            >
              {isFocusing ? "Stop Session" : "Start Focus Session"}
            </button>
          </div>
        </div>

        <IsometricGrid items={pancakes} />
        
        <StudyCompanion isFocusing={isFocusing} isCompleted={isCompleted} topic={focusTopic} />
      </main>

      <footer className="app-footer">
        <p>Every 30 minutes of focus grows a new pancake!</p>
      </footer>
    </div>
  );
}

export default App;
