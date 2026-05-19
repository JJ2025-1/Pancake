import React, { useState, useEffect } from 'react';

interface StudyCompanionProps {
  isFocusing: boolean;
  isCompleted: boolean;
  topic: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const StudyCompanion: React.FC<StudyCompanionProps> = ({ isFocusing, isCompleted, topic }) => {
  const [message, setMessage] = useState<string>("Hi! I'm Chef Flippy.");
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      const state = isCompleted ? 'completed' : (isFocusing ? 'focusing' : 'idle');
      try {
        const res = await fetch(`/api/companion?state=${state}`);
        const data = await res.json();
        setMessage(data.message);
      } catch {
        setMessage("Let's cook!");
      }
    };
    fetchMessage();
  }, [isFocusing, isCompleted]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          topic,
          history: chatHistory
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Chat failed');
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error("StudyCompanion Chat Error:", error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, my recipe failed. Try again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`companion-container ${isExpanded ? 'expanded' : ''}`}>
      {isExpanded ? (
        <div className="chat-window">
          <div className="chat-header">
            <h4>Chef Flippy Chat</h4>
            <button onClick={() => setIsExpanded(false)} className="close-chat">&times;</button>
          </div>
          <div className="chat-messages">
            {chatHistory.length === 0 && <p className="empty-chat">Ask me anything about your study!</p>}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && <div className="chat-message assistant typing">...</div>}
          </div>
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input 
              type="text" 
              placeholder="Ask Chef Flippy..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={isLoading}>Send</button>
          </form>
        </div>
      ) : (
        <div className="companion-bubble" onClick={() => setIsExpanded(true)}>
          {message}
        </div>
      )}
      
      <div className="companion-avatar" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="chef-hat"></div>
        <div className="pancake-face">
          <div className="eye left"></div>
          <div className="eye right"></div>
          <div className="mouth"></div>
        </div>
      </div>
    </div>
  );
};

export default StudyCompanion;
