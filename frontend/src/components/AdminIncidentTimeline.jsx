import { useEffect, useState } from "react";
import axios from "axios";
import { adminService } from "../main";

const AdminIncidentTimeline = ({ orderId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const { data: res } = await axios.get(
          `${adminService}/api/v1/admin/incident/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) {
      fetchTimeline();
    }
  }, [orderId]);

  if (loading) return <p className="text-center text-gray-500 py-12">Loading incident timeline...</p>;
  if (!data) return <p className="text-center text-red-500 py-12">Failed to load timeline details</p>;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Customer Support Incident Timeline</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Order ID: {data.orderId}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-black font-semibold"
        >
          Close
        </button>
      </div>

      <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-5">
        {data.timeline.length === 0 ? (
          <p className="text-xs text-gray-400">No events logged for this order.</p>
        ) : (
          data.timeline.map((step, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[30px] top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-red-300" />
              <div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">
                  {step.status}
                </span>
                <p className="text-xs font-semibold text-gray-800 mt-1">{step.note || "No note recorded"}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(step.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminIncidentTimeline;
