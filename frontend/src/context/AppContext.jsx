import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { authService, restaurantService } from "../main";
import { Toaster } from "react-hot-toast";

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [city, setCity] = useState("Fecthing Location...");

  async function fetchUser() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const { data } = await axios.get(`${authService}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 12000,
      });

      setUser(data);
      setIsAuth(true);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const [cart, setCart] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quauntity, setQuauntity] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  async function fetchCart() {
    if (!user || user.role !== "customer") return;
    try {
      setCartLoading(true);
      setCartError(null);
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setCart(data.cart || []);
      setSubTotal(data.subtotal || 0);
      setQuauntity(data.cartLength || 0);
    } catch (error) {
      console.log("Cart fetch error:", error);
      setCartError(error.response?.data?.message || "Failed to load cart");
    } finally {
      setCartLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    }
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: 19.076,
        longitude: 72.8777,
        formattedAddress: "Mumbai, Maharashtra, India",
      });
      setCity("Mumbai");
      return;
    }
    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();

          setLocation({
            latitude,
            longitude,
            formattedAddress: data.display_name || "Current Location",
          });

          setCity(
            data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              "Your Location",
          );
          setLoadingLocation(false);
        } catch (error) {
          setLocation({
            latitude,
            longitude,
            formattedAddress: "Current Location",
          });
          setCity("Your Location");
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.warn(
          "Geolocation failed/blocked. Using default fallback coordinates (Mumbai).",
          error,
        );
        setLocation({
          latitude: 19.076,
          longitude: 72.8777,
          formattedAddress: "Mumbai, Maharashtra, India",
        });
        setCity("Mumbai");
        setLoadingLocation(false);
      },
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        isAuth,
        loading,
        setIsAuth,
        setLoading,
        setUser,
        user,
        location,
        loadingLocation,
        city,
        cart,
        setCart,
        fetchCart,
        cartLoading,
        cartError,
        quauntity,
        subTotal,
      }}
    >
      {children}

      <Toaster />
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};
