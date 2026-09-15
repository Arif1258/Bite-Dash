import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";

const AISupportChat = ({ orderId, initialMessage }) => {
  const { user } = useAppData();
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "👋 Hi! I'm your BiteS Assistant. Ask me anything about your order, delivery status, ETA, or recent orders!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    orderId ? "Where is this order?" : "Where is my order?",
    "When will my food arrive?",
    "What did I order?",
    "List my recent orders",
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

      // Append orderId context if present
      const finalPrompt = orderId && !textToSend.includes(orderId)
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
        "I'm having trouble connecting to support right now. Please try again in a moment.";
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

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-5 py-3.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-base">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide">BiteS Gen-AI Support</h3>
            <p className="text-[11px] text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"></span>
              Live Order Intelligence
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-white/80 hover:text-white text-xs font-semibold px-2 py-1 rounded hover:bg-white/10 transition"
        >
          {isOpen ? "Minimize" : "Expand"}
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col h-[420px]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-red-500 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-xs py-2 px-1">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Checking live order data...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2.5 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="text-[11px] whitespace-nowrap bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 px-3 py-1.5 rounded-full transition font-medium border border-gray-200/60 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your order, ETA, rider, etc..."
              disabled={loading}
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-bold transition flex items-center justify-center shadow-xs"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AISupportChat;
