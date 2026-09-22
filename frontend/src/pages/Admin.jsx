import axios from "axios";
import { useEffect, useState } from "react";
import { adminService, restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import RiderAdmin from "../components/RiderAdmin";
import AdminHeatmap from "../components/AdminHeatmap";
import AdminAnomalies from "../components/AdminAnomalies";
import AdminIncidentTimeline from "../components/AdminIncidentTimeline";
import AdminObservability from "../components/AdminObservability";
import { BiLogOut, BiRefresh } from "react-icons/bi";
import toast from "react-hot-toast";

const Admin = () => {
  const { user, logout } = useAppData();
  const [restaurant, setRestaurant] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("restaurant");
  const [inspectedOrderId, setInspectedOrderId] = useState(null);

  // Batching metrics
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `${adminService}/api/v1/admin/restaurant/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const response = await axios.get(
        `${adminService}/api/v1/admin/rider/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurant(data.restaurants || []);
      setRiders(response.data.riders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchMetrics = async () => {
    setLoadingBatches(true);
    try {
      const { data } = await axios.get(`${restaurantService}/api/batch/recommendations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (data.success) {
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.warn("Failed to fetch batch metrics:", err.message);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "admin" && tab === "batching") {
      fetchBatchMetrics();
    }
  }, [tab, user]);

  const logoutHandler = () => {
    logout();
    toast.success("Logged out successfully");
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-4">You must have administrative privileges to access this console.</p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                BiteDash <span className="text-[#E23744]">Operations Admin</span>
              </h1>
              <p className="text-[11px] text-gray-500">Administrator Console • {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                axios
                  .put(
                    `${restaurantService}/api/auth/add/role`,
                    { role: "customer" },
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                  )
                  .then(() => window.location.reload())
                  .catch(() => (window.location.href = "/select-role"));
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-semibold transition"
            >
              Customer View
            </button>
            <button
              onClick={logoutHandler}
              className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold transition"
            >
              <BiLogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "restaurant", label: "Restaurants Verification" },
            { key: "rider", label: "Riders Verification" },
            { key: "batching", label: "Route Batching & Efficiency" },
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 ${
                tab === t.key ? "bg-[#E23744] text-white shadow-xs" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "restaurant" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {restaurant.length === 0 ? (
              <div className="col-span-2 bg-white rounded-xl p-8 text-center text-xs text-gray-500 border border-gray-100">
                No pending restaurants requiring verification.
              </div>
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
              <div className="col-span-2 bg-white rounded-xl p-8 text-center text-xs text-gray-500 border border-gray-100">
                No pending riders requiring verification.
              </div>
            ) : (
              riders.map((r) => (
                <RiderAdmin key={r._id} rider={r} onVerify={fetchData} />
              ))
            )}
          </div>
        )}

        {tab === "batching" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>📦</span> Intelligent Route Batching & Dispatch Optimization
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Active candidate delivery clusters evaluated against proximity, readiness synchronization, and customer delay constraints.
                </p>
              </div>
              <button
                onClick={fetchBatchMetrics}
                disabled={loadingBatches}
                className="flex items-center gap-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-3 py-1.5 rounded-lg transition"
              >
                <BiRefresh className={loadingBatches ? "animate-spin" : ""} size={16} />
                Re-evaluate Routes
              </button>
            </div>

            {loadingBatches ? (
              <p className="text-xs text-gray-400 text-center py-8">Analyzing city-wide route pairings...</p>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-gray-100">
                <p className="font-semibold text-gray-700">No active batches formed at this moment.</p>
                <p className="mt-1 text-[11px]">
                  Batching triggers when 2 or more orders have compatible pickup/dropoff coordinates and synchronised preparation stages.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-purple-700">Formed Route Batches</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{batches.length}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-green-700">Total Distance Saved</p>
                    <p className="text-2xl font-black text-green-900 mt-1">
                      {batches.reduce((acc, b) => acc + (b.metrics.distanceSavedKm || 0), 0).toFixed(1)} km
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-blue-700">Average Route Match</p>
                    <p className="text-2xl font-black text-blue-900 mt-1">
                      {Math.round(batches.reduce((acc, b) => acc + b.score, 0) / batches.length)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {batches.map((b) => (
                    <div key={b.batchId} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-gray-900">{b.batchId}</span>
                          <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                            {b.score}% Compatibility
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                          {b.metrics.distanceSavedKm} km detour savings
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Orders: #{b.orders[0]?.shortId} ({b.orders[0]?.restaurantName}) & #{b.orders[1]?.shortId} ({b.orders[1]?.restaurantName})
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Restaurant gap: {b.metrics.restaurantDistanceKm} km • Customer gap: {b.metrics.customerDistanceKm} km • Max delay added: {b.metrics.additionalDelayMinutes} mins
                      </p>
                    </div>
                  ))}
                </div>
              </div>
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
    </div>
  );
};

export default Admin;
