import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useSocket } from "../context/SocketContext";

const SurplusSection = () => {
  const { location, user } = useAppData();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Claim Modal State
  const [claimingItem, setClaimingItem] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchSurplus = async () => {
    try {
      const params = {};
      if (location?.latitude && location?.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
        params.maxDistanceKm = 5; // 5 km radius
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

  // Real-time nearby surplus alert listener
  useEffect(() => {
    if (!socket) return;
    const handleNearbySurplus = (data) => {
      toast(
        `🌱 Nearby Deal Alert: ${data.name} is available at ${data.restaurantName} for ₹${data.discountPrice} (${data.discountPercent}% OFF, ~${data.distanceKm} km)!`,
        { icon: "⚡", duration: 7000 }
      );
      fetchSurplus();
    };

    socket.on("surplus:nearby_alert", handleNearbySurplus);
    return () => socket.off("surplus:nearby_alert", handleNearbySurplus);
  }, [socket]);

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

  const handleOpenClaimModal = async (item) => {
    if (!user) {
      toast.error("Please login to claim surplus meals");
      navigate("/login");
      return;
    }

    setClaimingItem(item);
    setOrderQuantity(1);

    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAddresses(data || []);
      if (data && data.length > 0) {
        setSelectedAddressId(data[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    }
  };

  const handleConfirmSurplusOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select or add a delivery address");
      return;
    }

    setSubmittingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/surplus/order`,
        {
          surplusId: claimingItem._id,
          addressId: selectedAddressId,
          quantity: orderQuantity,
          paymentMethod: "cod",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message || "Surplus meal ordered successfully!");
      setClaimingItem(null);
      navigate(`/order/${data.orderId}`);
    } catch (err) {
      console.error("Failed to place surplus order:", err);
      const errMsg = err.response?.data?.message || "Failed to order surplus meal";
      toast.error(errMsg);
      // Refresh listings in case item expired or ran out of stock
      fetchSurplus();
      setClaimingItem(null);
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-green-50 border border-green-100 p-5 shadow-sm space-y-4 my-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-green-900 flex items-center gap-1.5">
            🌱 Save the Food: Surplus Meals Proximity Discount
          </h2>
          <p className="text-xs text-green-700 font-medium">
            Delicious freshly prepared meals nearing selling window. Save food waste, buy cheaper!
          </p>
        </div>
        <span className="bg-green-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          Nearby Deals
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item) => {
          const isExpired = new Date(item.expiresAt) - now <= 0;
          if (isExpired) return null;

          const discountPercent = Math.round(
            ((item.originalPrice - item.discountPrice) / item.originalPrice) * 100
          );

          return (
            <div
              key={item._id}
              className="rounded-xl bg-white border border-green-100 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                    <span className="text-[10px] bg-green-100 text-green-800 font-extrabold px-1.5 py-0.5 rounded">
                      {discountPercent}% OFF
                    </span>
                  </div>
                  <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full border border-red-100 animate-pulse">
                    ⏳ {getCountdownString(item.expiresAt)}
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
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                    {item.quantity} portions left
                  </p>
                </div>
                <button
                  onClick={() => handleOpenClaimModal(item)}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                >
                  Claim & Order
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim & Instant Checkout Modal */}
      {claimingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-800">Claim Surplus Meal</h3>
                <p className="text-xs text-green-600 font-semibold">
                  {claimingItem.restaurantId?.name} • ⏳ {getCountdownString(claimingItem.expiresAt)}
                </p>
              </div>
              <button
                onClick={() => setClaimingItem(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm text-gray-800">{claimingItem.name}</h4>
                <p className="text-xs text-gray-500">Special discounted surplus pricing</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 line-through mr-1">₹{claimingItem.originalPrice}</span>
                <span className="text-base font-extrabold text-green-600">₹{claimingItem.discountPrice}</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">Portions to Claim:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="font-bold text-sm">{orderQuantity}</span>
                <button
                  onClick={() =>
                    setOrderQuantity((q) => Math.min(claimingItem.quantity, q + 1))
                  }
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-gray-700">Select Delivery Address:</label>
              {addresses.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                  No delivery address saved.{" "}
                  <button
                    onClick={() => navigate("/address")}
                    className="font-bold underline text-amber-900"
                  >
                    Add Address First
                  </button>
                </div>
              ) : (
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                >
                  {addresses.map((addr) => (
                    <option key={addr._id} value={addr._id}>
                      {addr.formattedAddress || addr.address || "Saved Address"} ({addr.mobile})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="pt-2 border-t text-xs space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Meal Subtotal ({orderQuantity}x):</span>
                <span className="font-medium">₹{claimingItem.discountPrice * orderQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery & Platform Fee:</span>
                <span className="font-medium">₹25</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-1 border-t">
                <span>Total Amount:</span>
                <span className="text-green-600">
                  ₹{claimingItem.discountPrice * orderQuantity + 25}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClaimingItem(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingOrder || addresses.length === 0}
                onClick={handleConfirmSurplusOrder}
                className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs"
              >
                {submittingOrder ? "Confirming..." : "Confirm & Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurplusSection;
