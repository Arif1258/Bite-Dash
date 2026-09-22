import { useState } from "react";
import { FiEyeOff } from "react-icons/fi";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";
import { getAuthToken } from "../utils/authStorage";

const MenuItems = ({ items, onItemDeleted, isSeller }) => {
  const [loadingItemId, setLoadingItemId] = useState(null);
  const { fetchCart } = useAppData();

  const handleDelete = async (itemId) => {
    const confirm = window.confirm("Are you sure you want to delete this item?");
    if (!confirm) return;

    try {
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      toast.success("Item deleted successfully");
      if (onItemDeleted) onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to delete item");
    }
  };

  const toggleAvailiblity = async (itemId) => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        },
      );

      toast.success(data.message || "Item availability updated");
      if (onItemDeleted) onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const addToCart = async (restaurantId, itemId) => {
    try {
      setLoadingItemId(itemId);

      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId,
          itemId,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        },
      );

      toast.success(data.message || "Item added to cart");
      await fetchCart();
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to add item to cart";
      toast.error(errMsg);
    } finally {
      setLoadingItemId(null);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 font-medium">
        No menu items available at the moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {safeItems.map((item) => {
        const isLoading = loadingItemId === item._id;
        const itemImg = item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";

        return (
          <div
            className={`relative flex gap-4 rounded-2xl bg-white p-4 shadow-2xs border border-slate-100 hover:shadow-xs transition ${
              !item.isAvailable ? "opacity-75" : ""
            }`}
            key={item._id}
          >
            <div className="relative shrink-0">
              <img
                src={itemImg}
                alt={item.name || "Food item"}
                className={`h-20 w-20 rounded-xl object-cover border border-slate-100 ${
                  !item.isAvailable ? "grayscale brightness-75" : ""
                }`}
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                }}
              />

              {!item.isAvailable && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 text-[10px] font-bold text-white uppercase tracking-wider">
                  Sold Out
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between min-w-0">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.name}</h3>
                {item.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="font-black text-sm text-slate-900">₹{item.price}</p>

                {isSeller && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleAvailiblity(item._id)}
                      title={item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                    >
                      {item.isAvailable ? (
                        <BsEye size={16} />
                      ) : (
                        <FiEyeOff size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      title="Delete Item"
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 cursor-pointer transition"
                    >
                      <BiTrash size={16} />
                    </button>
                  </div>
                )}

                {!isSeller && (
                  <button
                    disabled={!item.isAvailable || isLoading}
                    onClick={() => addToCart(item.restaurantId, item._id)}
                    title={item.isAvailable ? "Add to Cart" : "Item Sold Out"}
                    className={`flex items-center justify-center rounded-xl p-2 font-bold transition cursor-pointer ${
                      !item.isAvailable || isLoading
                        ? "cursor-not-allowed text-slate-300 bg-slate-50"
                        : "text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20"
                    }`}
                  >
                    {isLoading ? (
                      <VscLoading size={16} className="animate-spin" />
                    ) : (
                      <BsCartPlus size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuItems;
