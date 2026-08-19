import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import { Link } from "react-router-dom";

const SurplusSection = () => {
  const { location } = useAppData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSurplus = async () => {
    try {
      const params = {};
      if (location?.latitude && location?.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }

      const { data } = await axios.get(`${restaurantService}/api/surplus/active`, {
        params,
      });

      if (data.success) {
        setItems(data.surplusItems);
      }
    } catch (err) {
      console.error("Failed to load surplus meals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurplus();
  }, [location]);

  // Real-time ticking timers helper
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdownString = (expiryTime) => {
    const diffMs = new Date(expiryTime) - now;
    if (diffMs <= 0) return "Expired";
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s left`;
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-green-50 border border-green-100 p-5 shadow-sm space-y-4 my-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-green-900 flex items-center gap-1.5">
            🌱 Save the Food: Surplus Meals Proximity Discount
          </h2>
          <p className="text-xs text-green-700 font-medium">Delicious meals nearing expiry. Save food waste, buy cheaper!</p>
        </div>
        <span className="bg-green-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Nearby</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item) => {
          const isExpired = new Date(item.expiresAt) - now <= 0;
          if (isExpired) return null;

          return (
            <div
              key={item._id}
              className="rounded-xl bg-white border border-green-100 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                  <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full border border-red-100">
                    {getCountdownString(item.expiresAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                <p className="text-[11px] text-gray-400 mt-2">
                  From: <span className="font-semibold text-gray-600">{item.restaurantId?.name}</span>
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                <div>
                  <span className="text-xs text-gray-400 line-through mr-1.5">₹{item.originalPrice}</span>
                  <span className="text-base font-extrabold text-green-600">₹{item.discountPrice}</span>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{item.quantity} portions left</p>
                </div>
                <Link
                  to={`/restaurant/${item.restaurantId?._id || item.restaurantId}`}
                  className="rounded-lg bg-green-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-green-700 transition"
                >
                  Order
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SurplusSection;
