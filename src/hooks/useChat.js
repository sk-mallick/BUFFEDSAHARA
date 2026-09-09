import { useState } from "react";

/**
 * useChat — state + API logic for the Sahara Support chat window.
 *
 * Owns:
 *  - messages      (what the window renders, incl. the welcome message)
 *  - history       (the conversation_history array sent to POST /api/chat)
 *  - isLoading     (typing indicator while Claude responds)
 *  - crisis        (drives the calm amber crisis banner)
 *  - language      (EN | HI toggle, sent with every request)
 *
 * The welcome message mirrors the system prompt's opening line, so the
 * bot and the API are always in step.
 */

// Same-origin by default (see src/lib/api.js) — one Render URL serves
// the SPA and the API together. Set VITE_API_URL only for local dev.
const API_URL = import.meta.env.VITE_API_URL || "";

const WELCOME = {
  id: "welcome",
  role: "assistant",
  content:
    "Namaste 🙏 I am Sahara, your support companion. This is a safe and " +
    "private space. You can talk to me in Hindi or English. How are you " +
    "feeling today?",
  timestamp: new Date(),
};

export function useChat(userId) {
  const [messages, setMessages] = useState([WELCOME]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [language, setLanguage] = useState("en");

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const newHistory = [...history, { role: "user", content: text }];

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          message: text,
          language,
          conversation_history: history,
        }),
      });

      if (!res.ok) throw new Error(`chat failed: ${res.status}`);
      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setHistory([...newHistory, { role: "assistant", content: data.reply }]);
      if (data.crisis_detected) setCrisis(true);
    } catch (err) {
      // Calm, non-technical failure copy — with the helpline always present.
      const errMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "I am sorry, I could not connect right now. Please try again, " +
          "or call 14566 for immediate support.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissCrisis = () => setCrisis(false);

  return { messages, sendMessage, isLoading, crisis, dismissCrisis, language, setLanguage };
}