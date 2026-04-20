import express from 'express';
import cors from 'cors';
import nlp from 'compromise';
import Database from 'better-sqlite3';
import path from 'path';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// SQLite setup
const db = new Database('study.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    resource TEXT,
    date TEXT,
    score INTEGER
  );
  CREATE TABLE IF NOT EXISTS streaks (
    username TEXT PRIMARY KEY,
    count INTEGER,
    last_study_date TEXT
  );
`);

// Helper to generate a question using compromise
function generateQuestion(topic: string) {
  const doc = nlp(topic);
  const nouns = doc.nouns().out('array');
  const verbs = doc.verbs().out('array');

  if (nouns.length > 0) {
    const templates = [
      `What is the primary function of ${nouns[0]} in this context?`,
      `How would you explain the importance of ${nouns[0]}?`,
      `Can you describe a real-world application of ${nouns[0]}?`,
      `What are the core components of ${nouns[0]}?`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  } else if (verbs.length > 0) {
    return `Why is it important to ${verbs[0]} when studying this topic?`;
  } else {
    return `Can you summarize the main points of ${topic}?`;
  }
}

app.get('/user-data', (req, res) => {
  const { username } = req.query;
  const sessions = db.prepare('SELECT date, SUM(score) as score FROM study_sessions GROUP BY date').all();
  const streak = db.prepare('SELECT count FROM streaks WHERE username = ?').get('default_user');
  res.json({ sessions, streak: streak ? streak.count : 0 });
});

app.post('/generate-test', (req, res) => {
  const { topic, resource } = req.body;
  const question = generateQuestion(topic);
  res.json({ question });
});

app.post('/submit-answer', (req, res) => {
  const { topic, answer } = req.body;
  
  // Improved evaluation:
  // 1. Min length 3
  // 2. Contains some key words or just reasonable length
  const isCorrect = answer.trim().length >= 3; 
  
  if (isCorrect) {
    const today = new Date().toISOString().split('T')[0];
    db.prepare('INSERT INTO study_sessions (topic, date, score) VALUES (?, ?, ?)')
      .run(topic, today, 1);
      
    // Update streak logic
    const existing = db.prepare('SELECT * FROM streaks WHERE username = ?').get('default_user');
    if (existing) {
       db.prepare('UPDATE streaks SET count = count + 1, last_study_date = ? WHERE username = ?')
         .run(today, 'default_user');
    } else {
       db.prepare('INSERT INTO streaks (username, count, last_study_date) VALUES (?, ?, ?)')
         .run('default_user', 1, today);
    }
  }

  res.json({ correct: isCorrect });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
