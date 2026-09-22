import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import { BiLogOut } from "react-icons/bi";
import toast from "react-hot-toast";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";
import RestaurantSurplus from "../components/RestaurantSurplus";
import DemandSuggestions from "../components/DemandSuggestions";

import { setAuthToken } from "../utils/authStorage";

const Restaurant = () => {
  const { logout } = useAppData();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("menu");

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/my`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setRestaurant(data.restaurant || null);

      if (data.token) {
        setAuthToken(data.token);
        window.location.reload();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRestaurant();
  }, []);

  const [menuItems, setMenuItems] = useState([]);

  const fetchMenuItems = async (restaurantId) => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${restaurantId}`,
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

  useEffect(() => {
    if (restaurant?._id) {
      fetchMenuItems(restaurant._id);
    }
  }, [restaurant]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading your restaurant...</p>
      </div>
    );

  if (!restaurant) {
    return <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />;
  }
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              BiteDash <span className="text-[#E23744]">Restaurant Portal</span>
            </h1>
            <p className="text-[11px] text-gray-500">
              Manage your restaurant, menus, orders, and surplus food
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            toast.success("Logged out successfully");
          }}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-red-50 hover:border-red-300 hover:text-[#E23744] transition"
        >
          <BiLogOut className="text-sm" />
          <span>Log Out</span>
        </button>
      </div>

      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={true}
      />

      <RestaurantOrders restaurantId={restaurant._id} />

      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex border-b">
          {[
            { key: "menu", label: "Menu Items" },
            { key: "add-item", label: "Add Item" },
            { key: "surplus", label: "Surplus Food (Save Waste)" },
            { key: "demand", label: "Smart Demand Forecast" },
            { key: "sales", label: "Sales" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                tab === t.key
                  ? "border-b-2 border-red-500 text-red-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "menu" && (
            <MenuItems
              items={menuItems}
              onItemDeleted={() => fetchMenuItems(restaurant._id)}
              isSeller={true}
            />
          )}
          {tab === "add-item" && (
            <AddMenuItem onItemAdded={() => fetchMenuItems(restaurant._id)} />
          )}
          {tab === "surplus" && (
            <RestaurantSurplus restaurantId={restaurant._id} />
          )}
          {tab === "demand" && (
            <DemandSuggestions />
          )}
          {tab === "sales" && <p>Sales Page</p>}
        </div>
      </div>
    </div>
  );
};

export default Restaurant;
