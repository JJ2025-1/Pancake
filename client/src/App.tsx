import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

interface HeatmapDay {
  date: Date;
  count: number;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [topic, setTopic] = useState('');
  const [resource, setResource] = useState('');
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [testQuestion, setTestQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Generate 53 weeks of data (371 days) to fill the grid properly
    const data: HeatmapDay[] = [];
    const today = new Date();
    // Start from the beginning of the week 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (52 * 7 + today.getDay()));
    
    for (let i = 0; i < 53 * 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      data.push({
        date: d,
        count: 0, 
      });
    }
    setHeatmapData(data);
  }, []);

  const monthLabels = useMemo(() => {
    const labels: { name: string; index: number }[] = [];
    let lastMonth = -1;
    heatmapData.forEach((day, i) => {
      if (i % 7 === 0) { // Check start of each week
        const month = day.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ name: months[month], index: Math.floor(i / 7) });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [heatmapData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username) {
      setIsLoggedIn(true);
      try {
        const response = await fetch(`http://localhost:3001/user-data?username=${username}`);
        const data = await response.json();
        setStreak(data.streak || 0);
        // Map backend dates to heatmap
        if (data.sessions) {
          const sessionsMap = new Map(data.sessions.map((s: any) => [new Date(s.date).toDateString(), s.score]));
          setHeatmapData(prev => prev.map(d => ({
            ...d,
            count: sessionsMap.get(d.date.toDateString()) || 0
          })));
        }
      } catch (e) {
        console.error("Login data fetch failed", e);
      }
    }
  };

  const startTest = async () => {
    if (!topic || !resource) return;
    try {
      const response = await fetch('http://localhost:3001/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, resource }),
      });
      const data = await response.json();
      setTestQuestion(data.question);
    } catch (error) {
      setTestQuestion(`Explain the fundamental concepts of ${topic}.`);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return;
    try {
      const response = await fetch('http://localhost:3001/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, answer: userAnswer }),
      });
      const data = await response.json();
      
      if (data.correct) {
        setStreak(prev => prev + 1);
        const todayStr = new Date().toDateString();
        setHeatmapData(prev => prev.map(d => 
          d.date.toDateString() === todayStr ? { ...d, count: Math.min(d.count + 1, 4) } : d
        ));
        alert('Correct! Your study session has been logged.');
      } else {
        alert('Try a more detailed answer! (Min 3 characters)');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to connect to the backend server. Is it running?');
    } finally {
      setTestQuestion(null);
      setUserAnswer('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <svg height="48" viewBox="0 0 16 16" version="1.1" width="48" className="login-logo">
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
        </svg>
        <div className="login-box">
          <h2>Sign in to StudyHeat</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                className="form-input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn-primary">Sign in</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 400, margin: 0 }}>{username} / <span style={{ color: 'var(--color-fg-muted)' }}>contributions</span></h2>
        <div style={{ fontSize: '14px', color: 'var(--color-accent-fg)' }}>
          🔥 {streak} day streak
        </div>
      </header>

      <div className="heatmap-wrapper">
        <div className="heatmap-header">
          {monthLabels.map((label, i) => (
            <span key={i} className="month-label" style={{ left: `${label.index * 13 + 30}px` }}>
              {label.name}
            </span>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="day-labels">
            <span className="day-label"></span>
            <span className="day-label">Mon</span>
            <span className="day-label"></span>
            <span className="day-label">Wed</span>
            <span className="day-label"></span>
            <span className="day-label">Fri</span>
            <span className="day-label"></span>
          </div>
          <div className="heatmap-grid">
            {heatmapData.map((day, i) => (
              <div 
                key={i} 
                className={`heatmap-day level-${day.count}`} 
                title={`${day.date.toDateString()}: ${day.count} activities`}
              ></div>
            ))}
          </div>
        </div>
        <div className="heatmap-footer">
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Learn how we count contributions</a>
          <div className="legend">
            <span>Less</span>
            <div className="heatmap-day level-0"></div>
            <div className="heatmap-day level-1"></div>
            <div className="heatmap-day level-2"></div>
            <div className="heatmap-day level-3"></div>
            <div className="heatmap-day level-4"></div>
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="study-form">
        <h3>Log a new study session</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '12px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>What are you learning?</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Quantum Physics" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Resource / Book</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Feynman Lectures" 
              value={resource} 
              onChange={(e) => setResource(e.target.value)} 
            />
          </div>
          <button className="btn-primary" onClick={startTest} style={{ height: '32px' }}>Test Me</button>
        </div>
      </div>

      {testQuestion && (
        <div className="test-container">
          <h3 style={{ marginTop: 0, fontSize: '14px', color: 'var(--color-accent-fg)' }}>AI CHALLENGE</h3>
          <p style={{ fontSize: '18px', margin: '12px 0' }}>{testQuestion}</p>
          <div className="form-group">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Type your explanation here..." 
              autoFocus
              value={userAnswer} 
              onChange={(e) => setUserAnswer(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={submitAnswer} style={{ width: 'auto' }}>Submit Answer</button>
            <button className="btn-primary" onClick={() => setTestQuestion(null)} style={{ width: 'auto', backgroundColor: 'var(--color-btn-bg)' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
