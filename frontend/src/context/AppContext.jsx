import axios from "axios";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService, restaurantService } from "../main";
import { Toaster } from "react-hot-toast";
import { useLocationPermission } from "../hooks/useLocationPermission";

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hook-based robust location with Permissions API and caching
  const {
    location,
    city,
    loadingLocation,
    permissionStatus,
    permissionError,
    requestLocation,
    setLocation,
  } = useLocationPermission();

  const [cart, setCart] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quauntity, setQuauntity] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        setIsAuth(false);
        setCart([]);
        setSubTotal(0);
        setQuauntity(0);
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
      console.log("Auth check error:", error?.message);
      // Clean up invalid or expired token
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        setUser(null);
        setIsAuth(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user || user.role !== "customer") {
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
      return;
    }
    try {
      setCartLoading(true);
      setCartError(null);
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
  }, [user]);

  // Centralized logout that sanitizes all global states and storage
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    sessionStorage.clear();
    setUser(null);
    setIsAuth(false);
    setCart([]);
    setSubTotal(0);
    setQuauntity(0);
    setCartError(null);
    window.dispatchEvent(new CustomEvent("bitedash:logout"));
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // When user identity or role changes, update or clear cart
  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    } else {
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
    }
  }, [user, fetchCart]);

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
        permissionStatus,
        permissionError,
        requestLocation,
        setLocation,
        cart,
        setCart,
        fetchCart,
        cartLoading,
        cartError,
        quauntity,
        subTotal,
        logout,
      }}
    >
      {children}
      <Toaster position="top-center" />
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
