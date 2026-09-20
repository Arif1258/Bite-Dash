import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { Link } from "react-router-dom";

const RecommendationSection = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      const headers = {};
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const { data: res } = await axios.get(
        `${restaurantService}/api/recommendation/get`,
        { headers }
      );
      if (res.success) {
        setData(res.recommendations);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading || !data) return null;

  const timeBased = data.timeBased;
  const showTimeBased = timeBased?.items?.length > 0;
  const showBecauseOrdered = data.becauseYouOrdered?.items?.length > 0;
  const showSurplus = data.surplusDeals?.length > 0;

  if (!showTimeBased && !showBecauseOrdered && !showSurplus) return null;

  return (
    <div className="space-y-8 my-6">
      {/* 1. Time-Based Meal Recommendations (Rule-Based Engine) */}
      {showTimeBased && (
        <div className="space-y-3 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-yellow-50/60 p-4 rounded-2xl border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {timeBased.period} Specials
                </span>
                <span className="text-xs text-orange-700 font-medium hidden sm:inline">
                  • {timeBased.description}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mt-1">
                Recommended for <span className="text-[#E23744] font-extrabold">{timeBased.mealType}</span>
              </h2>
            </div>
            <span className="text-2xl">🍽️</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {timeBased.items.map((item) => (
              <Link
                to={`/restaurant/${item.restaurantId?._id || item.restaurantId}`}
                key={item._id}
                className="group rounded-xl bg-white border border-gray-100 p-3 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-28 w-full object-cover rounded-lg group-hover:scale-102 transition duration-200"
                    />
                  ) : (
                    <div className="h-28 w-full bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                      🍲
                    </div>
                  )}
                  <h3 className="font-semibold text-sm mt-2 text-gray-800 truncate">{item.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{item.restaurantId?.name || "BiteDash Vendor"}</p>
                  <p className="text-[10px] text-orange-600 font-medium mt-1 line-clamp-1">
                    {item.ruleExplanation}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                  <span className="text-sm font-bold text-[#E23744]">₹{item.price}</span>
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                    Order
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. Because You Ordered / Personalized Preferences */}
      {showBecauseOrdered && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              {data.becauseYouOrdered.badge}
            </h2>
            <span className="text-xs text-gray-400 font-medium">Personalized for you</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.becauseYouOrdered.items.map((item) => (
              <Link
                to={`/restaurant/${item.restaurantId?._id || item.restaurantId}`}
                key={item._id}
                className="group rounded-xl bg-white border border-gray-100 p-3 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-28 w-full object-cover rounded-lg group-hover:scale-102 transition duration-200"
                    />
                  )}
                  <h3 className="font-semibold text-sm mt-2 text-gray-800 truncate">{item.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{item.restaurantId?.name || "BiteDash Vendor"}</p>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                    {item.ruleExplanation}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                  <span className="text-sm font-bold text-[#E23744]">₹{item.price}</span>
                  <span className="text-[10px] bg-red-50 text-[#E23744] px-2 py-0.5 rounded-full font-bold">
                    Add
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. Sustainable Surplus Deals Cross-Promotion */}
      {showSurplus && (
        <div className="space-y-3 bg-green-50/70 p-4 rounded-2xl border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] bg-green-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                🌱 Waste Reduction Specials
              </span>
              <h3 className="font-bold text-gray-800 text-base mt-1">
                Featured Surplus Meals Available Right Now
              </h3>
            </div>
            <span className="text-xs text-green-700 font-semibold">Save 30-70%</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.surplusDeals.map((deal) => (
              <div
                key={deal._id}
                className="rounded-xl bg-white border border-green-100 p-3 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-green-100 text-green-800 font-extrabold px-1.5 py-0.5 rounded">
                      {Math.round(((deal.originalPrice - deal.discountPrice) / deal.originalPrice) * 100)}% OFF
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {deal.quantity} left
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-800 mt-1 truncate">{deal.name}</h4>
                  <p className="text-[11px] text-gray-500 truncate">{deal.restaurantId?.name}</p>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                  <div>
                    <span className="text-xs line-through text-gray-400 mr-1">₹{deal.originalPrice}</span>
                    <span className="text-sm font-extrabold text-green-600">₹{deal.discountPrice}</span>
                  </div>
                  <Link
                    to="/"
                    className="text-[10px] bg-green-600 text-white px-2 py-1 rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Claim
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationSection;
