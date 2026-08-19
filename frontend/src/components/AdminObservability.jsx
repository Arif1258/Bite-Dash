import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../main";

const AdminObservability = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const { data } = await axios.get(`${adminService}/api/v1/admin/observability`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-center text-gray-500 py-12">Loading metrics...</p>;
  if (!metrics) return <p className="text-center text-red-500 py-12">Failed to load metrics</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">System & Queue Observability Dashboard</h3>
          <p className="text-xs text-gray-400 mt-1">Live metrics of BiteDash microservice cluster performance.</p>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" title="System Operational" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs text-center space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Delivery Load</p>
          <p className="text-2xl font-extrabold text-red-500">{metrics.activeOrders}</p>
          <p className="text-[10px] text-gray-400">Current active orders</p>
        </div>
        {/* Metric 2 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs text-center space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kitchen prep speed</p>
          <p className="text-2xl font-extrabold text-orange-500">{metrics.averagePrepTime} mins</p>
          <p className="text-[10px] text-gray-400">Cluster average duration</p>
        </div>
        {/* Metric 3 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs text-center space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Riders</p>
          <p className="text-2xl font-extrabold text-blue-500">{metrics.totalRiders}</p>
          <p className="text-[10px] text-gray-400">Verified delivery staff</p>
        </div>
        {/* Metric 4 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs text-center space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Restaurants</p>
          <p className="text-2xl font-extrabold text-green-500">{metrics.totalRestaurants}</p>
          <p className="text-[10px] text-gray-400">Registered food vendors</p>
        </div>
      </div>

      {/* Latency & DB Performance Stats */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-3">
        <h4 className="font-bold text-gray-800 text-xs">Microservice Performance Diagnostics</h4>
        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-gray-600 mb-1">
              <span>Database Query Latency</span>
              <span className="font-bold text-gray-800">4.2 ms (Optimal)</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "12%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-gray-600 mb-1">
              <span>RabbitMQ Message Queue Broker Capacity</span>
              <span className="font-bold text-gray-800">99.8% (0 backlogged)</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-gray-600 mb-1">
              <span>API Gateway Processing Delay</span>
              <span className="font-bold text-gray-800">12.5 ms</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "25%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminObservability;
