import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import { 
  Bot, Send, X, Sparkles, ShoppingBag, 
  Tag, CheckCircle2, ChevronRight, Minimize2, ArrowRight,
  Terminal, ShieldCheck, Activity, Cpu, Database, ChevronDown, ChevronUp
} from "lucide-react";
import { 
  FoodCard, RestaurantCard, CartCard, OrderCard, CouponCard 
} from "./AgentCards";
import toast from "react-hot-toast";
import { getAuthToken } from "../utils/authStorage";

const ACTION_STEPS = [
  "🔎 Understanding your request...",
  "🍽️ Searching BiteDash...",
  "📍 Finding available restaurants...",
  "💰 Checking your budget...",
  "🛒 Updating your cart...",
  "📦 Checking your order...",
];

const AISupportChat = ({ orderId, isFloating = false }) => {
  const { user, fetchCart } = useAppData();
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "Hey! I'm your **BiteDash AI Copilot** 👋\n\nI can search food, discover restaurants, manage your cart, track orders, find deals, and help you decide what to eat.\n\nTry clicking any suggestion below or ask me naturally!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      cards: [],
      chips: [
        { label: "🍛 Find biryani under ₹300", prompt: "Find biryani under ₹300" },
        { label: "🍕 Highly rated pizza", prompt: "Find pizza from a highly rated restaurant" },
        { label: "🛒 What's in my cart?", prompt: "What's in my cart?" },
        { label: "📦 Where is my order?", prompt: "Where is my order?" },
        { label: "🎟️ Best available discount", prompt: "Find me the best available discount" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [isOpen, setIsOpen] = useState(!isFloating);
  const [showObservability, setShowObservability] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, currentAction, isOpen]);

  // Global event listener to open chat from navbar or hero CTA
  useEffect(() => {
    const handleOpenAi = () => setIsOpen(true);
    window.addEventListener("open-ai-support", handleOpenAi);
    return () => window.removeEventListener("open-ai-support", handleOpenAi);
  }, []);

  // Cycle action status messages while loading
  useEffect(() => {
    if (!loading) return;
    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex = (stepIndex + 1) % ACTION_STEPS.length;
      setCurrentAction(ACTION_STEPS[stepIndex]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  const quickPrompts = [
    "Find biryani under ₹300",
    "What's in my cart?",
    "Apply the best coupon",
    orderId ? `Where is order #${orderId.slice(-6).toUpperCase()}?` : "Where is my order?",
    "Reorder my last meal",
  ];

  const handleAddToCart = async (itemId, restaurantId, name) => {
    try {
      await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId, itemId },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      toast.success(`Added ${name || "dish"} to your cart! 🛒`);
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add item to cart");
    }
  };

  const handleApplyCoupon = async (code) => {
    sendMessage(`Apply coupon ${code}`);
  };

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
    setCurrentAction(ACTION_STEPS[0]);

    try {
      const historyPayload = messages
        .filter((m) => m.role === "user" || m.role === "model")
        .slice(-8)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const finalPrompt =
        orderId && !textToSend.includes(orderId)
          ? `${textToSend} (Context: User is viewing Order #${orderId.slice(-6).toUpperCase()})`
          : textToSend;

      const { data } = await axios.post(
        `${restaurantService}/api/support/chat`,
        {
          message: finalPrompt,
          history: historyPayload,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (Array.isArray(data.actions) && data.actions.length > 0) {
        setCurrentAction(data.actions[data.actions.length - 1]);
      }

      const botReply = {
        role: "model",
        text: data.reply || data.message || "I've updated your request.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        cards: Array.isArray(data.cards) ? data.cards : [],
        metadata: data.metadata || null,
        mode: data.mode || "agentic",
      };

      setMessages((prev) => [...prev, botReply]);

      if (data.cartUpdated) {
        await fetchCart();
      }
    } catch (err) {
      console.error("AI agent error:", err);
      const errorMessage =
        err.response?.data?.message ||
        "I'm having trouble connecting right now. Please make sure you are logged in and try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `⚠️ ${errorMessage}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          cards: [],
        },
      ]);
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const isAwaitingConfirmation =
    lastMessage?.role === "model" &&
    lastMessage?.text?.includes("Would you like me to place the order?");

  if (isFloating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-white/20 cursor-pointer group"
        aria-label="Open BiteDash AI Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse"></span>
        </div>
        <span className="text-xs font-black tracking-wide">BiteDash Copilot</span>
      </button>
    );
  }

  const containerClasses = isFloating
    ? "fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[460px] h-[640px] max-h-[88vh] rounded-3xl shadow-2xl border border-slate-200/90 bg-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    : "w-full h-[600px] rounded-3xl border border-slate-200/90 bg-white flex flex-col overflow-hidden shadow-sm";

  return (
    <div className={containerClasses}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 flex items-center justify-between border-b border-white/10 shadow-sm">
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
                GenAI &bull; RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Conversational Discovery &amp; Live Telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowObservability(!showObservability)}
            title="Toggle Developer & Teacher Observability View"
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border ${
              showObservability
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-800/80 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Activity className="w-3 h-3 text-indigo-400" />
            <span>Telemetry</span>
          </button>

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
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                msg.role === "user"
                  ? "bg-red-600 text-white rounded-br-none"
                  : "bg-white text-slate-800 rounded-bl-none border border-slate-200/80"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Suggestion Chips in Welcome message */}
              {Array.isArray(msg.chips) && msg.chips.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {msg.chips.map((chip, chipIdx) => (
                    <button
                      key={chipIdx}
                      onClick={() => sendMessage(chip.prompt)}
                      disabled={loading}
                      className="text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-full px-2.5 py-1 transition shadow-2xs cursor-pointer text-left flex items-center gap-1"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Observability / Teacher Debug view badge */}
              {showObservability && msg.metadata && (
                <div className="mt-2.5 p-2.5 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono border border-slate-800 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> GenAI / RAG Execution
                    </span>
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      {msg.metadata.executionTimeMs || 0}ms
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    <div>
                      <span className="text-slate-500">Intent: </span>
                      <span className="text-emerald-400 font-semibold">{msg.metadata.intent}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tool: </span>
                      <span className="text-amber-300 font-semibold">{msg.metadata.tool}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Mode: </span>
                      <span className="text-blue-300">{msg.metadata.mode || "semantic_rag"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Retrieved: </span>
                      <span className="text-violet-300 font-semibold">{msg.metadata.retrievedCount || 0} records</span>
                    </div>
                  </div>
                  {msg.metadata.filters && Object.keys(msg.metadata.filters).length > 0 && (
                    <div className="text-slate-400 pt-0.5">
                      <span className="text-slate-500">Filters: </span>
                      <span>{JSON.stringify(msg.metadata.filters)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Render interactive cards attached to model messages */}
              {Array.isArray(msg.cards) && msg.cards.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1">
                  {msg.cards.map((card, cardIdx) => {
                    if (card.type === "food") {
                      return (
                        <FoodCard
                          key={cardIdx}
                          data={card.data}
                          onAddToCart={handleAddToCart}
                        />
                      );
                    }
                    if (card.type === "restaurant") {
                      return <RestaurantCard key={cardIdx} data={card.data} />;
                    }
                    if (card.type === "cart") {
                      return (
                        <CartCard
                          key={cardIdx}
                          data={card.data}
                          onCheckout={() => sendMessage("Place my order")}
                        />
                      );
                    }
                    if (card.type === "order") {
                      return <OrderCard key={cardIdx} data={card.data} />;
                    }
                    if (card.type === "coupon") {
                      return (
                        <CouponCard
                          key={cardIdx}
                          data={card.data}
                          onApply={handleApplyCoupon}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
          </div>
        ))}

        {/* Live Action Status Pill */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold p-2.5 bg-indigo-50/80 rounded-2xl w-fit border border-indigo-100 shadow-2xs animate-pulse">
            <div className="h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span>{currentAction || "Consulting BiteDash live telemetry..."}</span>
          </div>
        )}

        {/* Checkout Confirmation Prompt Buttons */}
        {!loading && isAwaitingConfirmation && (
          <div className="p-3 bg-red-50/90 rounded-2xl border border-red-200/80 space-y-2">
            <p className="text-[11px] font-bold text-red-900">
              Confirm your order placement:
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => sendMessage("Yes, place the order")}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Yes, Place Order 🎉
              </button>
              <button
                onClick={() => sendMessage("Cancel order")}
                className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer"
              >
                Not Now
              </button>
            </div>
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
            placeholder='Ask: "Find biryani under 300", "Where is my order?"...'
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
