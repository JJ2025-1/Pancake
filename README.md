# Pancake 🥞

An isometric focus app where you grow pancakes while you focus, now featuring an interactive AI Study Buddy!

![Pancake Logo](client/src/assets/react.svg)

## Features
- **Interactive AI Study Buddy:** Meet **Chef Flippy**! Chat with him about your study topic for tips and encouragement.
- **Progress Analytics:** Track your consistency with **Day Streaks** and a visual **Activity Heatmap**.
- **Isometric Grid:** A beautiful 3D-perspective grass grid for your pancake collection.
- **Pancake Growth:** Watch your Dorayaki pancake grow slowly as you stay focused.
- **30-Minute Milestones:** Complete a 30-minute focus session to bake a permanent pancake and update your stats.
- **Persistent Progress:** Your pancake collection and study history are saved.

## How to use
1. Enter your Chef Name to start.
2. Enter your **Focus Topic** (e.g., "Quantum Physics" or "Baking").
3. Click "Start Focus Session" to begin cooking.
4. Chat with **Chef Flippy** in the bottom right if you need a study tip!
5. Reach 30 minutes to finish baking and grow your streak.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, CSS Isometric transforms
- **Backend:** Node.js, Express, SQLite (Better-SQLite3)
- **AI:** OpenRouter (Google Gemini Flash 2.0)
- **Runtime:** tsx (TypeScript Execution)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Environment:
   - Create a `server/.env` file.
   - Add your `OPENROUTER_API_KEY=your_key_here`.
3. Run development server:
   ```bash
   npm run dev
   ```
