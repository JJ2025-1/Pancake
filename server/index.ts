import express from 'express';
import cors from 'cors';
import nlp from 'compromise';
import Database from 'better-sqlite3';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

// Helper to generate a question using AI (with fallback to compromise)
async function generateQuestion(topic: string, resource: string) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not found, using fallback.');
    const doc = nlp(topic);
    const nouns = doc.nouns().out('array');
    if (nouns.length > 0) return `What is the primary function of ${nouns[0]} in this context?`;
    return `Can you summarize the main points of ${topic}?`;
  }

  try {
    const prompt = `Generate a short, challenging, and specific question for a student who just finished studying "${topic}" from the resource "${resource}". The question should test their understanding and not be a simple yes/no. Keep it under 20 words.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('AI Question generation failed:', error);
    return `Explain the fundamental concepts of ${topic}.`;
  }
}

async function evaluateAnswer(topic: string, question: string, answer: string): Promise<boolean> {
  if (!process.env.GEMINI_API_KEY) {
    return answer.trim().length >= 10;
  }

  try {
    const prompt = `Topic: ${topic}\nQuestion: ${question}\nUser Answer: ${answer}\n\nIs this answer correct and sufficiently detailed? Respond with only "YES" or "NO".`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().toUpperCase();
    return responseText.includes('YES');
  } catch (error) {
    console.error('AI Answer evaluation failed:', error);
    return answer.trim().length >= 10;
  }
}

app.get('/user-data', (req, res) => {
  const { username } = req.query;
  const sessions = db.prepare('SELECT date, SUM(score) as score FROM study_sessions GROUP BY date').all();
  const streak = db.prepare('SELECT count FROM streaks WHERE username = ?').get('default_user');
  res.json({ sessions, streak: streak ? streak.count : 0 });
});

app.post('/generate-test', async (req, res) => {
  const { topic, resource } = req.body;
  const question = await generateQuestion(topic, resource);
  res.json({ question });
});

app.post('/submit-answer', async (req, res) => {
  const { topic, question, answer } = req.body;
  
  const isCorrect = await evaluateAnswer(topic, question || '', answer);
  
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
