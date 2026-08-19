import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";

const RestaurantSurplus = ({ restaurantId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryHours, setExpiryHours] = useState("1"); // expiry window in hours

  const fetchMySurplus = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/surplus/mine`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load surplus items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySurplus();
  }, []);

  const handleCreateSurplus = async (e) => {
    e.preventDefault();
    if (!name || !originalPrice || !discountPrice || !quantity) {
      return toast.error("Please fill in all required fields");
    }

    const expiresAt = new Date(Date.now() + parseFloat(expiryHours) * 60 * 60 * 1000);

    try {
      const { data } = await axios.post(
        `${restaurantService}/api/surplus/new`,
        {
          name,
          description,
          originalPrice: parseFloat(originalPrice),
          discountPrice: parseFloat(discountPrice),
          quantity: parseInt(quantity),
          expiresAt: expiresAt.toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(data.message);
      setName("");
      setDescription("");
      setOriginalPrice("");
      setDiscountPrice("");
      setQuantity("");
      fetchMySurplus();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create surplus item");
    }
  };

  const handleDeleteSurplus = async (id) => {
    if (!confirm("Are you sure you want to remove this surplus listing?")) return;
    try {
      const { data } = await axios.delete(`${restaurantService}/api/surplus/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success(data.message);
      fetchMySurplus();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove surplus item");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Post Form */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs md:col-span-1 space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2 text-sm">Post Surplus Meal</h3>
        <form onSubmit={handleCreateSurplus} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400">Meal Name *</label>
            <input
              type="text"
              placeholder="e.g. Double Cheese Pizza"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400">Description</label>
            <textarea
              placeholder="Nearing end of preparation slot, fresh condition."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Original Price (₹) *</label>
              <input
                type="number"
                placeholder="250"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Discount Price (₹) *</label>
              <input
                type="number"
                placeholder="99"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Portions Available *</label>
              <input
                type="number"
                placeholder="3"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Expiry (Hours) *</label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
              >
                <option value="0.5">30 Mins</option>
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-xs font-bold transition shadow-xs"
          >
            Publish Discounted Surplus
          </button>
        </form>
      </div>

      {/* Active Listings */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs md:col-span-2 space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2 text-sm">Active Surplus Food Listings</h3>
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">Loading listings...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No active surplus listings. Save waste by adding some!</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex justify-between items-center border border-gray-100 rounded-lg p-3">
                <div>
                  <h4 className="font-bold text-xs text-gray-800">{item.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>
                  <p className="text-[10px] text-green-600 font-semibold mt-1">
                    ₹{item.discountPrice} (Original: ₹{item.originalPrice}) | {item.quantity} Portions
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full inline-block">
                    Expires: {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <br />
                  <button
                    onClick={() => handleDeleteSurplus(item._id)}
                    className="text-[10px] text-red-600 hover:text-red-800 font-bold"
                  >
                    Delete Listing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantSurplus;
