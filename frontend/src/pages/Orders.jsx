import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../main";
import AISupportChat from "../components/AISupportChat";
import { 
  Package, Clock, CheckCircle2, ChevronRight, 
  MapPin, ShoppingBag, ArrowRight, Sparkles, RefreshCw, Store 
} from "lucide-react";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'completed'
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/myorder`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onOrderUpdate = () => fetchOrders();

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading your orders...</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Your Orders</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Track live food deliveries or review past meals
            </p>
          </div>

          <Link
            to="/"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Order Food</span>
          </Link>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs w-fit">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Active Deliveries</span>
            {activeOrders.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "active" ? "bg-white text-red-600" : "bg-red-100 text-red-700"
              }`}>
                {activeOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "completed"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Past History</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
              {completedOrders.length}
            </span>
          </button>
        </div>

        {/* Orders List */}
        {activeTab === "active" ? (
          activeOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Active Deliveries</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You don't have any orders en route right now. Craving something fresh?
              </p>
              <Link
                to="/"
                className="inline-block px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-red-700 transition"
              >
                Browse Restaurants
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => navigate(`/order/${order._id}`)}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition truncate max-w-[200px] sm:max-w-md">
                          {order.restaurantName || "Partner Restaurant"}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">Order #{order._id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.dynamicETA && (
                        <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> ~{order.dynamicETA}m
                        </span>
                      )}
                      <span className="text-xs font-bold capitalize bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl flex justify-between items-center">
                    <span className="truncate max-w-[260px] font-medium">
                      {(order.items || []).map((it) => `${it.name} × ${it.quauntity}`).join(", ")}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">₹{order.totalAmount}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-red-600 pt-1">
                    <span>Track Live Delivery →</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          completedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-xs space-y-3">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Past Orders Yet</h3>
              <p className="text-xs text-slate-500">Your completed food deliveries will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedOrders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => navigate(`/order/${order._id}`)}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition">
                        {order.restaurantName || "Restaurant Meal"}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold capitalize bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full">
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-black text-slate-900">₹{order.totalAmount}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 truncate">
                    {(order.items || []).map((it) => `${it.name} × ${it.quauntity}`).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* AI Order Copilot Section */}
        <section className="pt-6">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            BiteDash Customer AI Assistant
          </div>
          <AISupportChat />
        </section>

      </div>
    </div>
  );
};

export default Orders;
