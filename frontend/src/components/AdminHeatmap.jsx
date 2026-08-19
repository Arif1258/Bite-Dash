import { MapContainer, TileLayer, Circle } from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../main";

const AdminHeatmap = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHeatmapData = async () => {
    try {
      const { data } = await axios.get(`${adminService}/api/v1/admin/heatmap`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch heatmap data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
    // Poll every 10 seconds for real-time demand changes
    const interval = setInterval(fetchHeatmapData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-center text-gray-500 py-12">Loading Heatmap...</p>;
  }

  // Fallback map center (Mumbai coordinates or first order location)
  const mapCenter = orders.length > 0 && orders[0].deliveryAddress?.latitude
    ? [orders[0].deliveryAddress.latitude, orders[0].deliveryAddress.longitude]
    : [19.076, 72.8777];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs">
        <h3 className="font-bold text-gray-800 text-sm">Real-Time Delivery Heatmap (Geographic Order Density)</h3>
        <p className="text-xs text-gray-400 mt-1">Updates live. Red zones indicate high order volumes and active delivery zones.</p>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm h-[450px]">
        <MapContainer center={mapCenter} zoom={12} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {orders.map((order) => {
            if (!order.deliveryAddress?.latitude || !order.deliveryAddress?.longitude) return null;
            return (
              <Circle
                key={order._id}
                center={[order.deliveryAddress.latitude, order.deliveryAddress.longitude]}
                radius={300}
                pathOptions={{
                  color: "#e23744",
                  fillColor: "#e23744",
                  fillOpacity: 0.4,
                  weight: 1,
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default AdminHeatmap;
