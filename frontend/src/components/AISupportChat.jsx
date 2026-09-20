import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import { 
  Bot, Send, X, Sparkles, Clock, Package, 
  MapPin, HelpCircle, ChevronRight, MessageSquare, ShieldCheck, Minimize2 
} from "lucide-react";

const AISupportChat = ({ orderId, isFloating = false }) => {
  const { user } = useAppData();
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "👋 Hi! I'm **BiteDash AI Order Assistant**.\n\nPowered by live order telemetry and our intelligent ETA engine, I can look up your preparation status, live ETA, rider updates, or recent food receipts.\n\nHow can I help you right now?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(!isFloating);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  // Global event listener to open chat from navbar or hero CTA
  useEffect(() => {
    const handleOpenAi = () => setIsOpen(true);
    window.addEventListener("open-ai-support", handleOpenAi);
    return () => window.removeEventListener("open-ai-support", handleOpenAi);
  }, []);

  const quickPrompts = [
    orderId ? `Where is order #${orderId.slice(-6).toUpperCase()}?` : "Where is my order?",
    "What's my ETA?",
    "What did I order?",
    "Show me my latest order.",
    "What is the cancellation policy?",
  ];

  const sendMessage = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend || !textToSend.trim() || loading) return;

    const userMessage = {
      role: "user",
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.role === "user" || m.role === "model")
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const finalPrompt =
        orderId && !textToSend.includes(orderId)
          ? `${textToSend} (Referencing Order ID: ${orderId})`
          : textToSend;

      const { data } = await axios.post(
        `${restaurantService}/api/support/chat`,
        {
          message: finalPrompt,
          history: historyPayload,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const botReply = {
        role: "model",
        text: data.reply || data.message || "I found your order information.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error("AI chat error:", err);
      const errorMessage =
        err.response?.data?.message ||
        "I'm having trouble connecting to support right now. Please make sure you are logged in and try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `⚠️ ${errorMessage}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // If floating and closed, render the floating trigger pill
  if (isFloating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-white/20 cursor-pointer group"
        aria-label="Open BiteDash AI Support Chat"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse"></span>
        </div>
        <span className="text-xs font-black tracking-wide">AI Order Support</span>
      </button>
    );
  }

  const containerClasses = isFloating
    ? "fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200/80 bg-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    : "w-full h-[520px] rounded-3xl border border-slate-200/80 bg-white flex flex-col overflow-hidden shadow-sm";

  return (
    <div className={containerClasses}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 bg-gradient-to-tr from-red-500 via-rose-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 ring-2 ring-white/10">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">BiteDash Copilot</h3>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                Live Tools
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Real-time Order &amp; ETA Telemetry</p>
          </div>
        </div>

        {isFloating && (
          <button
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Actions Carousel */}
      <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 overflow-x-auto flex gap-1.5 no-scrollbar">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => sendMessage(prompt)}
            disabled={loading}
            className="flex-shrink-0 text-[11px] font-semibold bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-300 rounded-full px-3 py-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                msg.role === "user"
                  ? "bg-red-600 text-white rounded-br-none"
                  : "bg-white text-slate-800 rounded-bl-none border border-slate-200/70"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold p-2.5 bg-indigo-50/70 rounded-2xl w-fit border border-indigo-100 animate-pulse">
            <div className="h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Inspecting live kitchen orders &amp; rider telemetry...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask: "Where is my food?", "What is my ETA?"...'
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-9 w-9 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shadow-md shadow-red-600/20 flex-shrink-0 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AISupportChat;
