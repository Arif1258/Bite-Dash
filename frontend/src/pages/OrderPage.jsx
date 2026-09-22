import { useParams, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import UserOrderMap from "../components/UserOrderMap";
import { useAppData } from "../context/AppContext";
import AISupportChat from "../components/AISupportChat";
import { 
  ArrowLeft, Clock, MapPin, Phone, ShieldCheck, 
  Store, CheckCircle2, ChevronRight, Sparkles, User, Package, AlertCircle 
} from "lucide-react";

const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();
  const { user } = useAppData();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setOrder(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      if (order && (order.status === "delivered" || order.status === "cancelled")) {
        return;
      }
      fetchOrder();
    }, 6000);
    return () => clearInterval(interval);
  }, [id, order?.status]);

  useEffect(() => {
    if (!socket) return;
    const onOrderUpdate = () => fetchOrder();

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !user) return;
    const room = `user:${user._id}`;
    socket.emit("join", room);

    return () => {
      socket.emit("leave", room);
    };
  }, [socket, user]);

  const [riderLocation, setRiderLocation] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const onRiderLocation = ({ latitude, longitude }) => {
      setRiderLocation([latitude, longitude]);
    };

    socket.on("rider:location", onRiderLocation);
    return () => socket.off("rider:location", onRiderLocation);
  }, [socket]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Connecting to Kitchen Telemetry...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center bg-white p-8 rounded-3xl border border-slate-200/70 shadow-xs max-w-sm">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-800 font-bold text-sm mb-1">Order Not Found</p>
          <p className="text-slate-500 text-xs mb-4">This order could not be retrieved or has expired.</p>
          <Link to="/orders" className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md">
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: "placed", label: "Order Placed" },
    { key: "accepted", label: "Restaurant Accepted" },
    { key: "preparing", label: "Kitchen Preparing" },
    { key: "ready_for_rider", label: "Ready for Pickup" },
    { key: "rider_assigned", label: "Rider Assigned" },
    { key: "picked_up", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/orders" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Order #{order._id.slice(-6).toUpperCase()}
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-0.5 rounded-full">
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Placed on {new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <button
            onClick={() => fetchOrder()}
            className="text-xs font-bold text-slate-600 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer"
          >
            Refresh Status
          </button>
        </div>

        {/* Dynamic ETA Hero Card */}
        {order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
            <div className="space-y-1.5 z-10 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  Intelligent ETA Engine
                </span>
                <span className="text-xs font-bold text-amber-200">
                  {order.etaDetails?.readable || `~${order.dynamicETA || 25} mins`}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black">
                {order.dynamicETA || 25} <span className="text-lg font-normal text-rose-100">mins away</span>
              </h2>

              <p className="text-xs text-rose-100 font-medium">
                {order.etaDetails?.targetDeliveryTime
                  ? `Target arrival time: around ${order.etaDetails.targetDeliveryTime}`
                  : "Live estimated delivery time based on real-time kitchen preparation and transit"}
              </p>

              {order.etaDetails?.breakdown && (
                <div className="flex flex-wrap gap-2 pt-2 text-[10px] font-bold text-slate-900">
                  <span className="bg-white/90 px-2 py-0.5 rounded-md backdrop-blur">
                    🍳 Prep: ~{order.etaDetails.breakdown.foodPreparationTime}m
                  </span>
                  <span className="bg-white/90 px-2 py-0.5 rounded-md backdrop-blur">
                    🛵 Transit: ~{order.etaDetails.breakdown.riderTravelTime}m
                  </span>
                  {order.etaDetails.trafficLevel && (
                    <span className="bg-white/90 px-2 py-0.5 rounded-md backdrop-blur">
                      🚦 {order.etaDetails.trafficLevel} Flow
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="text-5xl sm:text-6xl animate-bounce flex-shrink-0 z-10">
              🛵
            </div>
          </div>
        )}

        {/* Batched Eco-Route Alert */}
        {order.isBatched && (
          <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4 text-xs text-purple-900 flex items-start gap-3 shadow-xs">
            <span className="text-xl flex-shrink-0">📦</span>
            <div>
              <h4 className="font-bold text-sm text-purple-950">Intelligent Eco-Route Delivery</h4>
              <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                Your rider is on an optimized nearby batched delivery route, minimizing carbon emissions while guaranteeing fast delivery!
              </p>
            </div>
          </div>
        )}

        {/* Step Progress Tracker */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <h3 className="font-bold text-sm text-slate-900">Live Delivery Steps</h3>

          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
            {steps.map((step, idx) => {
              const timelineEntry = order.timeline?.find((t) => t.status === step.key);
              const isCompleted = timelineEntry || idx <= currentStepIndex;
              const isActive = order.status === step.key;

              return (
                <div key={step.key} className="relative">
                  <div className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 transition-all ${
                    isActive ? "bg-red-600 border-red-600 ring-4 ring-red-100" :
                    isCompleted ? "bg-emerald-600 border-emerald-600" :
                    "bg-white border-slate-300"
                  }`} />
                  <div>
                    <h4 className={`text-xs font-bold ${
                      isActive ? "text-red-600" : isCompleted ? "text-slate-800" : "text-slate-400"
                    }`}>
                      {step.label}
                    </h4>
                    {timelineEntry && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(timelineEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {timelineEntry.note || "Updated"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Rider & Map Tracking */}
        {order.riderId && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{order.riderId?.name || "Assigned Rider"}</h4>
                  <p className="text-xs text-slate-400 font-medium">Delivery Partner</p>
                </div>
              </div>

              {order.riderId?.phone && (
                <a
                  href={`tel:${order.riderId.phone}`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Rider</span>
                </a>
              )}
            </div>

            <div className="h-64 w-full">
              <UserOrderMap
                restaurantCoordinates={order.restaurantId?.autoLocation?.coordinates}
                userCoordinates={order.addressId?.location?.coordinates}
                riderCoordinates={riderLocation}
              />
            </div>
          </div>
        )}

        {/* Itemized Order Details & Bill */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
            Items Ordered
          </h3>

          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-slate-800 font-semibold">
                  {item.name} <strong className="text-slate-500 font-normal">× {item.quauntity}</strong>
                </span>
                <span className="font-bold text-slate-900">₹{item.price * item.quauntity}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline text-sm">
            <span className="font-bold text-slate-600">Total Paid:</span>
            <span className="text-xl font-black text-slate-900">₹{order.totalAmount}</span>
          </div>
        </div>

        {/* Order AI Assistant Chat Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI Assistant For This Order
          </div>
          <AISupportChat orderId={order._id} />
        </div>

      </div>
    </div>
  );
};

export default OrderPage;
