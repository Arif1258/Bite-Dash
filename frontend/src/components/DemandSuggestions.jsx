import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";

const DemandSuggestions = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDemand = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${restaurantService}/api/demand/suggestions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Demand suggestions fetch error:", err);
      setError(err.response?.data?.message || "Failed to load demand suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemand();
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500 space-y-3">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs">Analyzing historical orders & peak hours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 p-6 text-center text-red-600 space-y-2">
        <p className="font-semibold text-sm">⚠️ {error}</p>
        <button
          onClick={fetchDemand}
          className="text-xs bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { currentWindow, upcomingWindow, restaurant, dayInfo } = data;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-black tracking-tight">Smart Demand Predictions</h2>
              <span className="text-[10px] bg-white/20 backdrop-blur-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Rule-Based Model
              </span>
            </div>
            <p className="text-xs text-white/90 mt-1 max-w-xl">
              Deterministic predictions based on 30-day historical order volume, time-of-day bucketing, and weekend multipliers.
            </p>
          </div>
          <div className="text-left md:text-right bg-black/10 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/20">
            <p className="text-[11px] text-white/80">{dayInfo.dayName} {dayInfo.isWeekend ? "• 🏖️ Weekend Boost (1.35×)" : "• 🏢 Weekday Pace"}</p>
            <p className="text-base font-extrabold">{dayInfo.currentTime} Current Time</p>
          </div>
        </div>
      </div>

      {/* Grid: Current Window vs Upcoming Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Window */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentWindow.emoji}</span>
              <div>
                <h3 className="font-bold text-sm text-gray-800">Current Slot: {currentWindow.bucket}</h3>
                <p className="text-[11px] text-gray-500">Peak expected around {currentWindow.peakHour}</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
              Active Now
            </span>
          </div>

          <div className="space-y-3">
            {currentWindow.suggestions.map((sug, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  sug.demandLevel === "HIGH"
                    ? "bg-red-50/70 border-red-200"
                    : sug.demandLevel === "MEDIUM"
                    ? "bg-amber-50/70 border-amber-200"
                    : "bg-gray-50/80 border-gray-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-800">{sug.title}</h4>
                  {sug.metric && (
                    <span className="font-black text-xs text-gray-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                      {sug.metric.value} {sug.metric.unit}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-[11px]">{sug.description}</p>

                {sug.items && (
                  <div className="mt-2 space-y-1 pt-1 border-t border-gray-200/50">
                    {sug.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-gray-700 font-medium">
                        <span>• {item.name}</span>
                        <span className="text-orange-600 font-semibold">{item.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Window */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{upcomingWindow.emoji}</span>
              <div>
                <h3 className="font-bold text-sm text-gray-800">Next Slot: {upcomingWindow.bucket}</h3>
                <p className="text-[11px] text-gray-500">Peak expected around {upcomingWindow.peakHour}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Preparation Plan
            </span>
          </div>

          <div className="space-y-3">
            {upcomingWindow.suggestions.map((sug, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/80 text-xs space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-800">{sug.title}</h4>
                  {sug.metric && (
                    <span className="font-black text-xs text-gray-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                      {sug.metric.value} {sug.metric.unit}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-[11px]">{sug.description}</p>

                {sug.items && (
                  <div className="mt-2 space-y-1 pt-1 border-t border-gray-200/50">
                    {sug.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-gray-700 font-medium">
                        <span>• {item.name}</span>
                        <span className="text-blue-600 font-semibold">{item.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanatory Footer */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-[11px] text-amber-800 flex items-start gap-2.5">
        <span className="text-base">💡</span>
        <p>
          <strong>Inventory Tip:</strong> Preparing high-demand items ahead of peak hours reduces customer wait times by up to 40% and boosts your restaurant's reliability score. Items nearing end-of-service can be posted to the <strong>Surplus Food</strong> tab at a discount to prevent waste!
        </p>
      </div>
    </div>
  );
};

export default DemandSuggestions;
