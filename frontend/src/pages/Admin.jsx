import axios from "axios";
import { useEffect, useState } from "react";
import { adminService } from "../main";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import RiderAdmin from "../components/RiderAdmin";
import AdminHeatmap from "../components/AdminHeatmap";
import AdminAnomalies from "../components/AdminAnomalies";
import AdminIncidentTimeline from "../components/AdminIncidentTimeline";
import AdminObservability from "../components/AdminObservability";

const Admin = () => {
  const [restaurant, setRestaurant] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("restaurant");
  const [inspectedOrderId, setInspectedOrderId] = useState(null);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `${adminService}/api/v1/admin/restaurant/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const response = await axios.get(
        `${adminService}/api/v1/admin/rider/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setRestaurant(data.restaurants || []);
      setRiders(response.data.riders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading admin panel...</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "restaurant", label: "Restaurants Verification" },
          { key: "rider", label: "Riders Verification" },
          { key: "heatmap", label: "Demand Heatmap" },
          { key: "anomalies", label: "Anomaly Detection" },
          { key: "observability", label: "System Monitoring" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setInspectedOrderId(null);
            }}
            className={`px-4 py-2 rounded text-xs font-bold transition duration-150 ${
              tab === t.key ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "restaurant" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {restaurant.length === 0 ? (
            <p className="text-xs text-gray-500">No pending restaurants</p>
          ) : (
            restaurant.map((r) => (
              <AdminRestaurantCard
                key={r._id}
                restaurant={r}
                onVerify={fetchData}
              />
            ))
          )}
        </div>
      )}
      {tab === "rider" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {riders.length === 0 ? (
            <p className="text-xs text-gray-500">No pending riders</p>
          ) : (
            riders.map((r) => (
              <RiderAdmin key={r._id} rider={r} onVerify={fetchData} />
            ))
          )}
        </div>
      )}
      {tab === "heatmap" && <AdminHeatmap />}
      {tab === "anomalies" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2">
            <AdminAnomalies onInspectOrder={setInspectedOrderId} />
          </div>
          {inspectedOrderId && (
            <div className="md:col-span-1">
              <AdminIncidentTimeline
                orderId={inspectedOrderId}
                onClose={() => setInspectedOrderId(null)}
              />
            </div>
          )}
        </div>
      )}
      {tab === "observability" && <AdminObservability />}
    </div>
  );
};

export default Admin;
