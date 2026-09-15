import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";

const RestaurantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppData();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [surplusItems, setSurplusItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick claim state
  const [claimingItem, setClaimingItem] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setRestaurant(data || null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setMenuItems(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSurplusItems = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/surplus/active?restaurantId=${id}`
      );
      if (data.success) {
        setSurplusItems(data.surplusItems || []);
      }
    } catch (error) {
      console.log("Error loading surplus for restaurant:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchMenuItems();
      fetchSurplusItems();
    }
  }, [id]);

  const handleOpenClaim = async (item) => {
    if (!user) {
      toast.error("Please login to claim surplus meals");
      navigate("/login");
      return;
    }
    setClaimingItem(item);
    setOrderQuantity(1);

    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setAddresses(data || []);
      if (data && data.length > 0) setSelectedAddressId(data[0]._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmSurplusOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
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
          paymentMethod: "online",
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(data.message || "Surplus meal ordered!");
      setClaimingItem(null);
      navigate(`/order/${data.orderId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to order surplus meal");
      fetchSurplusItems();
      setClaimingItem(null);
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading restaurant...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">No Restaurant with this id</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6">
      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={false}
      />

      {/* Active Surplus Food Deals Banner */}
      {surplusItems.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <div>
                <h3 className="text-sm font-extrabold text-green-900">
                  Save Food Discount: Surplus Meals Available Now!
                </h3>
                <p className="text-[11px] text-green-700">
                  Fresh meals nearing preparation cutoff. Huge discounts, zero food waste!
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase bg-green-600 text-white px-2.5 py-1 rounded-full">
              Limited Portions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {surplusItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-xl border border-green-100 p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-gray-800">{item.name}</h4>
                    <span className="text-[10px] bg-red-50 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                      Exp: {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                  <div>
                    <span className="text-[11px] text-gray-400 line-through mr-1">₹{item.originalPrice}</span>
                    <span className="text-sm font-black text-green-600">₹{item.discountPrice}</span>
                    <p className="text-[10px] text-gray-400">{item.quantity} portions left</p>
                  </div>
                  <button
                    onClick={() => handleOpenClaim(item)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Claim & Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Menu */}
      <div className="rounded-xl bg-white shadow-sm p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Regular Menu</h2>
        <MenuItems
          isSeller={false}
          items={menuItems}
          onItemDeleted={() => {}}
        />
      </div>

      {/* Claim Modal */}
      {claimingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-gray-800">Claim Surplus Meal</h3>
                <p className="text-xs text-green-600 font-semibold">{restaurant.name}</p>
              </div>
              <button
                onClick={() => setClaimingItem(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-800">{claimingItem.name}</p>
                <p className="text-gray-500">Discounted Surplus Meal</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400 line-through mr-1">₹{claimingItem.originalPrice}</span>
                <span className="font-extrabold text-green-600 text-sm">₹{claimingItem.discountPrice}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700">Quantity:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded border font-bold flex items-center justify-center hover:bg-gray-100"
                >
                  -
                </button>
                <span className="font-bold">{orderQuantity}</span>
                <button
                  onClick={() => setOrderQuantity((q) => Math.min(claimingItem.quantity, q + 1))}
                  className="w-7 h-7 rounded border font-bold flex items-center justify-center hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-gray-700">Delivery Address:</label>
              {addresses.length === 0 ? (
                <div className="p-2 bg-amber-50 text-amber-800 rounded">
                  No address saved.{" "}
                  <button onClick={() => navigate("/address")} className="underline font-bold">
                    Add Address
                  </button>
                </div>
              ) : (
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs bg-white"
                >
                  {addresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.formattedAddress || a.address} ({a.mobile})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="pt-2 border-t text-xs space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Meal Subtotal:</span>
                <span>₹{claimingItem.discountPrice * orderQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery & Fees:</span>
                <span>₹25</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-1 border-t">
                <span>Total:</span>
                <span className="text-green-600">
                  ₹{claimingItem.discountPrice * orderQuantity + 25}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClaimingItem(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingOrder || addresses.length === 0}
                onClick={handleConfirmSurplusOrder}
                className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {submittingOrder ? "Ordering..." : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantPage;
