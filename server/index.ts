import express from 'express';
import cors from 'cors';
import nlp from 'compromise';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// AI Helper for OpenRouter
async function askAI(prompt: string, history: any[] = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENROUTER_API_KEY is missing!");
    throw new Error('OPENROUTER_API_KEY not found');
  }

  const messages = history.length > 0 ? history : [{ role: "user", content: prompt }];
  
  const body = {
    "model": "google/gemini-2.0-flash-001", // Updated to a more reliable model ID
    "messages": messages
  };

  console.log(`Calling OpenRouter with model: ${body.model}`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000", // Optional, for OpenRouter rankings
      "X-Title": "Pancake Focus App"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json() as any;
  
  if (!response.ok) {
    console.error("OpenRouter API Error:", data);
    throw new Error(data.error?.message || "OpenRouter API request failed");
  }

  if (!data.choices || data.choices.length === 0) {
    console.error("OpenRouter Unexpected Response:", data);
    throw new Error("No response from AI model");
  }

  return data.choices[0].message.content;
}

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
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not found, using fallback.');
    const doc = nlp(topic);
    const nouns = doc.nouns().out('array');
    if (nouns.length > 0) return `What is the primary function of ${nouns[0]} in this context?`;
    return `Can you summarize the main points of ${topic}?`;
  }

  try {
    const prompt = `Generate a short, challenging, and specific question for a student who just finished studying "${topic}" from the resource "${resource}". The question should test their understanding and not be a simple yes/no. Keep it under 20 words.`;
    const result = await askAI(prompt);
    return result;
  } catch (error) {
    console.error('AI Question generation failed:', error);
    return `Explain the fundamental concepts of ${topic}.`;
  }
}

async function evaluateAnswer(topic: string, question: string, answer: string): Promise<boolean> {
  if (!process.env.OPENROUTER_API_KEY) {
    return answer.trim().length >= 10;
  }

  try {
    const prompt = `Topic: ${topic}\nQuestion: ${question}\nUser Answer: ${answer}\n\nIs this answer correct and sufficiently detailed? Respond with only "YES" or "NO".`;
    const result = await askAI(prompt);
    const responseText = result.trim().toUpperCase();
    return responseText.includes('YES');
  } catch (error) {
    console.error('AI Answer evaluation failed:', error);
    return answer.trim().length >= 10;
  }
}

interface StreakRow {
  username: string;
  count: number;
  last_study_date: string;
}

interface SessionRow {
  date: string;
  score: number;
}

app.get('/user-data', (req, res) => {
  const { username } = req.query;
  const sessions = db.prepare('SELECT date, SUM(score) as score FROM study_sessions GROUP BY date').all() as SessionRow[];
  const streak = db.prepare('SELECT count, last_study_date FROM streaks WHERE username = ?').get('default_user') as StreakRow | undefined;
  res.json({ sessions, streak: streak ? streak.count : 0, lastStudyDate: streak ? streak.last_study_date : null });
});

app.get('/quote', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.json({ quote: "Every pancake starts with a single flip. Keep focusing!" });
  }
  try {
    const prompt = "Generate a short, punny, and highly motivational quote for someone focusing. The quote MUST be pancake or cooking themed. Keep it under 15 words.";
    const result = await askAI(prompt);
    res.json({ quote: result.trim() });
  } catch (error) {
    res.json({ quote: "Batter up! You're doing great things today." });
  }
});

app.get('/companion', async (req, res) => {
  const { state } = req.query; // e.g., 'focusing', 'idle', 'completed'
  if (!process.env.OPENROUTER_API_KEY) {
    return res.json({ message: "I'm Chef Flippy! Let's bake some progress together." });
  }
  try {
    let prompt = "You are Chef Flippy, a tiny pancake study companion. ";
    if (state === 'focusing') prompt += "Give a very short (under 10 words) encouraging shout-out to someone currently focusing.";
    else if (state === 'completed') prompt += "Give a very short (under 10 words) congratulatory message for finishing a 30-minute focus session.";
    else prompt += "Give a very short (under 10 words) welcoming message to start focusing.";
    
    const result = await askAI(prompt);
    res.json({ message: result.trim() });
  } catch (error) {
    res.json({ message: "Whip those goals into shape!" });
  }
});

app.post('/chat', async (req, res) => {
  const { message, topic, history } = req.body;
  if (!process.env.OPENROUTER_API_KEY) {
    return res.json({ message: "I'm offline right now, but keep flipping those goals!" });
  }

  try {
    const systemPrompt = `You are Chef Flippy, a tiny, enthusiastic pancake-themed study companion. 
    The user is currently studying: "${topic || 'General Topics'}".
    Your personality: Helpful, encouraging, uses occasional pancake puns (batter, flip, syrup, whisk).
    Keep your answers concise and focused on helping the user learn. 
    If they ask something unrelated to study or pancakes, gently nudge them back to their goals.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: message }
    ];

    const responseContent = await askAI("", messages);
    res.json({ message: responseContent });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "My batter is a bit lumpy... let's try that again!" });
  }
});

app.post('/complete-session', (req, res) => {
  const { topic } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  db.prepare('INSERT INTO study_sessions (topic, date, score) VALUES (?, ?, ?)')
    .run(topic || 'Focus Session', today, 1);
    
  // Update streak logic
  const existing = db.prepare('SELECT * FROM streaks WHERE username = ?').get('default_user') as StreakRow | undefined;
  if (existing) {
     let newCount = existing.count;
     if (existing.last_study_date === today) {
       // Already studied today, streak stays same or we can increment if we want multiple per day
       // Let's just keep it simple: 1 increment per day maximum for streak count, but we track sessions
     } else if (existing.last_study_date === yesterday) {
       newCount += 1;
     } else {
       newCount = 1; // Streak broken
     }
     db.prepare('UPDATE streaks SET count = ?, last_study_date = ? WHERE username = ?')
       .run(newCount, today, 'default_user');
  } else {
     db.prepare('INSERT INTO streaks (username, count, last_study_date) VALUES (?, ?, ?)')
       .run('default_user', 1, today);
  }

  res.json({ success: true });
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
