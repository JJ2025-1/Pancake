import React, { useState, useEffect, useCallback } from 'react';

const MotivationalQuote: React.FC = () => {
  const [quote, setQuote] = useState<string>("Loading motivation...");

  const fetchQuote = useCallback(async () => {
    try {
      const response = await fetch('/api/quote');
      const data = await response.json();
      setQuote(data.quote);
    } catch {
      setQuote("Keep flipping those goals!");
    }
  }, []);

  useEffect(() => {
    const init = () => {
      fetchQuote();
    };
    init();
    const interval = setInterval(fetchQuote, 300000); // New quote every 5 minutes
    return () => clearInterval(interval);
  }, [fetchQuote]);

  return (
    <div className="quote-container">
      <p className="quote-text">"{quote}"</p>
    </div>
  );
};

export default MotivationalQuote;
