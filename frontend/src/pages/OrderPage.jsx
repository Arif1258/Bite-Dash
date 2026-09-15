import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import UserOrderMap from "../components/UserOrderMap";
import { useAppData } from "../context/AppContext";
import AISupportChat from "../components/AISupportChat";

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
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrder();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !user) return;
    // Join the correct room: user:<userId> (not order id)
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
      console.log("Rider Location:", latitude, longitude);
      setRiderLocation([latitude, longitude]);
    };

    socket.on("rider:location", onRiderLocation);

    return () => {
      socket.off("rider:location", onRiderLocation);
    };
  }, [socket]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading order...</p>;
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">No order Found</p>
      </div>
    );
  }
  const steps = [
    { key: "placed", label: "Order Placed" },
    { key: "accepted", label: "Restaurant Accepted" },
    { key: "preparing", label: "Food Being Prepared" },
    { key: "ready_for_rider", label: "Food Ready" },
    { key: "rider_assigned", label: "Rider Assigned" },
    { key: "picked_up", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Order #{order._id.slice(-6)}</h1>

      {order.status !== "delivered" && order.status !== "cancelled" && (
        <div className="rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 p-5 text-white shadow-md flex justify-between items-center animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-wider font-bold opacity-90">Dynamic Live ETA</p>
              <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full font-semibold">
                {order.etaDetails?.readable || `${order.dynamicETA || 30} mins`}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold mt-1">
              {order.dynamicETA || 30} <span className="text-lg font-normal">mins</span>
            </h2>
            <p className="text-xs mt-1 opacity-90">
              {order.etaDetails?.targetDeliveryTime
                ? `Expected arrival around ${order.etaDetails.targetDeliveryTime}`
                : "Recalculating live based on restaurant kitchen load & transit distance"}
            </p>
            {order.etaDetails?.breakdown && (
              <div className="flex gap-2 mt-2 text-[10px] font-medium opacity-85">
                <span className="bg-black/15 px-2 py-0.5 rounded">
                  🍳 Prep: ~{order.etaDetails.breakdown.prepTime + (order.etaDetails.breakdown.prepDelay || 0)}m
                </span>
                <span className="bg-black/15 px-2 py-0.5 rounded">
                  🛵 Transit: ~{order.etaDetails.breakdown.travelTime}m
                </span>
              </div>
            )}
          </div>
          <div className="text-4xl animate-bounce">🛵</div>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-800 border-b pb-2 text-base">Delivery Timeline</h2>
        <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-5">
          {steps.map((step, idx) => {
            const timelineEntry = order.timeline?.find((t) => t.status === step.key);
            const isCompleted = timelineEntry || idx <= currentStepIndex;
            const isActive = order.status === step.key;

            return (
              <div key={step.key} className="relative">
                <div className={`absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full border-2 ${
                  isActive ? "bg-red-500 border-red-500 animate-ping" : ""
                }`} />
                <div className={`absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full border-2 ${
                  isActive ? "bg-red-500 border-red-500" :
                  isCompleted ? "bg-green-500 border-green-500" :
                  "bg-white border-gray-300"
                }`} />
                <div>
                  <h3 className={`font-semibold text-xs ${isActive ? "text-red-500" : isCompleted ? "text-gray-800" : "text-gray-400"}`}>
                    {step.label}
                  </h3>
                  {timelineEntry && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(timelineEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {timelineEntry.note || "Status updated"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
        <h2 className="font-semibold">Items</h2>
        {order.items.map((item, i) => (
          <div className="flex justify-between text-sm" key={i}>
            <span>
              {item.name} x {item.quauntity}
            </span>
            <span>₹{item.price * item.quauntity}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
        <h2 className="font-semibold">Delivery Address</h2>
        <p className="text-sm text-gray-600">
          {order.deliveryAddress.fromattedAddress}
        </p>
        <p className="text-sm text-gray-600">
          Mobile: {order.deliveryAddress.mobile}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
        <div className="flex justify-between text-sm">
          <span>SubTotal</span> <span>₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span> <span>₹{order.deliveryFee}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>PlatForm Fee</span> <span>₹{order.platfromFee}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total</span> <span>₹{order.totalAmount}</span>
        </div>

        <p className="text-xs text-gray-500">
          Payment Method: {order.paymentMethod}
        </p>
        <p className="text-xs text-gray-500">
          Payment Status: {order.paymentStatus}
        </p>
      </div>

      {(order.status === "rider_assigned" || order.status === "picked_up") &&
        (riderLocation ? (
          <UserOrderMap
            riderLocation={riderLocation}
            deliveryLocation={[
              order.deliveryAddress.latitude,
              order.deliveryAddress.longitude,
            ]}
          />
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">📍 Waiting for rider location updates...</p>
        ))}

      {/* AI Customer Support Chat */}
      <AISupportChat orderId={order._id} />
    </div>
  );
};

export default OrderPage;
