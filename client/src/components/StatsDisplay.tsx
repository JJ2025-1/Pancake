import React from 'react';

interface Session {
  date: string;
  score: number;
}

interface StatsDisplayProps {
  streak: number;
  sessions: Session[];
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ streak, sessions }) => {
  // Generate last 30 days
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const sessionMap = new Map(sessions.map(s => [s.date, s.score]));

  return (
    <div className="stats-display">
      <div className="streak-badge">
        <span className="streak-count">{streak}</span>
        <span className="streak-label">Day Streak 🔥</span>
      </div>
      <div className="heatmap-container">
        <h4>Activity (Last 30 Days)</h4>
        <div className="heatmap-grid">
          {days.map(day => {
            const count = sessionMap.get(day) || 0;
            let intensity = 'low';
            if (count > 0) intensity = 'med';
            if (count > 2) intensity = 'high';
            
            return (
              <div 
                key={day} 
                className={`heatmap-cell ${intensity}`}
                title={`${day}: ${count} sessions`}
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatsDisplay;
