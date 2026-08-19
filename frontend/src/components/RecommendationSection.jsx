import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { Link } from "react-router-dom";

const RecommendationSection = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      const { data: res } = await axios.get(
        `${restaurantService}/api/recommendation/get`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
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

  const showBecauseOrdered = data.becauseYouOrdered?.items?.length > 0;
  const showTimeBased = data.popularTimeBased?.items?.length > 0;
  const showRestaurants = data.restaurantsYouMayLike?.length > 0;
  const showTryDifferent = data.trySomethingDifferent?.restaurants?.length > 0;

  if (!showBecauseOrdered && !showTimeBased && !showRestaurants && !showTryDifferent) return null;

  return (
    <div className="space-y-8 my-6">
      {/* 1. Because you ordered X */}
      {showBecauseOrdered && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">
            Because you ordered <span className="text-red-500 font-extrabold capitalize">"{data.becauseYouOrdered.dish}"</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.becauseYouOrdered.items.map((item) => (
              <Link
                to={`/restaurant/${item.restaurantId?._id || item.restaurantId}`}
                key={item._id}
                className="group rounded-xl bg-white border border-gray-100 p-3 shadow-xs hover:shadow-md transition duration-200"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-28 w-full object-cover rounded-lg group-hover:scale-102 transition duration-200"
                  />
                )}
                <h3 className="font-semibold text-sm mt-2 text-gray-800 truncate">{item.name}</h3>
                <p className="text-xs text-gray-500 truncate">{item.restaurantId?.name || "BiteDash Vendor"}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-red-600">₹{item.price}</span>
                  <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Order Again</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. Popular during Dinner/Lunch/Breakfast */}
      {showTimeBased && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">
            Popular during your usual <span className="text-orange-500 font-extrabold">{data.popularTimeBased.timeOfDay}</span> time
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.popularTimeBased.items.map((item) => (
              <Link
                to={`/restaurant/${item.restaurantId?._id || item.restaurantId}`}
                key={item._id}
                className="group rounded-xl bg-white border border-gray-100 p-3 shadow-xs hover:shadow-md transition duration-200"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-28 w-full object-cover rounded-lg group-hover:scale-102 transition duration-200"
                  />
                )}
                <h3 className="font-semibold text-sm mt-2 text-gray-800 truncate">{item.name}</h3>
                <p className="text-xs text-gray-500 truncate">{item.restaurantId?.name || "BiteDash Vendor"}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-red-600">₹{item.price}</span>
                  <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Trending</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. Try something different */}
      {showTryDifferent && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">
            Try something different: Explore <span className="text-purple-600 font-extrabold">{data.trySomethingDifferent.cuisine}</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.trySomethingDifferent.restaurants.map((res) => (
              <Link
                to={`/restaurant/${res._id}`}
                key={res._id}
                className="group rounded-xl bg-white border border-gray-100 p-3 shadow-xs hover:shadow-md transition duration-200"
              >
                {res.image && (
                  <img
                    src={res.image}
                    alt={res.name}
                    className="h-28 w-full object-cover rounded-lg group-hover:scale-102 transition duration-200"
                  />
                )}
                <h3 className="font-semibold text-sm mt-2 text-gray-800 truncate">{res.name}</h3>
                <p className="text-xs text-purple-600 mt-1 truncate">Explore New Tastes</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationSection;
