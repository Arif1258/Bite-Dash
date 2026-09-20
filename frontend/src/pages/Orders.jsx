import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../main";
import AISupportChat from "../components/AISupportChat";

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

    const onOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">No orders yet</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter(
    (o) => !ACTIVE_STATUSES.includes(o.status),
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">My Orders</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active Orders</h2>

        {activeOrders.length === 0 ? (
          <p>No active orders</p>
        ) : (
          activeOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              onClick={() => navigate(`/order/${order._id}`)}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Completed Orders</h2>

        {completedOrders.length === 0 ? (
          <p>No Completed orders</p>
        ) : (
          completedOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              onClick={() => navigate(`/order/${order._id}`)}
            />
          ))
        )}
      </section>

      {/* Gen-AI Customer Support Assistant */}
      <section className="pt-4">
        <AISupportChat />
      </section>
    </div>
  );
};

export default Orders;

// component Order row
const OrderRow = ({ order, onClick }) => {
  return (
    <div
      className="cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</p>
          {order.isBatched && (
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
              📦 Eco-Batch
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {order.dynamicETA && order.status !== "delivered" && (
            <span className="text-xs bg-red-50 text-[#E23744] font-bold px-2 py-0.5 rounded-full">
              ⏱️ ~{order.dynamicETA} mins
            </span>
          )}
          <span className="text-xs capitalize font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        {order.restaurantName && (
          <p className="font-semibold text-gray-800 mb-0.5">{order.restaurantName}</p>
        )}
        {(order.items || []).map((item, i) => (
          <span key={i}>
            {item.name} × {item.quauntity}
            {i < order.items.length - 1 && ", "}
          </span>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>₹{order.totalAmount}</span>
      </div>
    </div>
  );
};
