import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../main";

const AdminAnomalies = ({ onInspectOrder }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    try {
      const { data } = await axios.get(`${adminService}/api/v1/admin/anomalies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAnomalies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  if (loading) return <p className="text-center text-gray-500 py-12">Loading anomalies...</p>;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-4">
      <h3 className="font-bold text-gray-800 border-b pb-2 text-sm">Suspicious Order Behavior & Risk Analysis</h3>
      {anomalies.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No order anomalies detected. System is secure.</p>
      ) : (
        <div className="space-y-3">
          {anomalies.map((order) => {
            const isHighRisk = order.anomalyStatus === "HIGH_RISK";
            const tagColor = isHighRisk ? "bg-red-50 text-red-700 border-red-100" : "bg-yellow-50 text-yellow-700 border-yellow-100";

            return (
              <div key={order._id} className="flex justify-between items-start border border-gray-100 rounded-lg p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-800">Order #{order._id.slice(-6)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagColor}`}>
                      {order.anomalyStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">User ID: {order.userId}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {order.anomalyReasons?.map((reason, i) => (
                      <span key={i} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md border border-gray-100">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-xs font-bold text-gray-800">₹{order.totalAmount}</p>
                  <button
                    onClick={() => onInspectOrder(order._id)}
                    className="text-[10px] bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition"
                  >
                    Inspect Timeline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAnomalies;
