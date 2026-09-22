import axios from "axios";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService, restaurantService } from "../main";
import { Toaster } from "react-hot-toast";
import { useLocationPermission } from "../hooks/useLocationPermission";

const AppContext = createContext(undefined);

const CART_CACHE_KEY = "bitedash_cart_cache";

const loadCachedCart = () => {
  try {
    const raw = localStorage.getItem(CART_CACHE_KEY);
    if (!raw) return { cart: [], subTotal: 0, quauntity: 0 };
    const parsed = JSON.parse(raw);
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      subTotal: typeof parsed.subTotal === "number" ? parsed.subTotal : 0,
      quauntity: typeof parsed.quauntity === "number" ? parsed.quauntity : 0,
    };
  } catch {
    return { cart: [], subTotal: 0, quauntity: 0 };
  }
};

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

  const cachedCart = loadCachedCart();
  const [cart, setCart] = useState(cachedCart.cart);
  const [subTotal, setSubTotal] = useState(cachedCart.subTotal);
  const [quauntity, setQuauntity] = useState(cachedCart.quauntity);
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
        localStorage.removeItem(CART_CACHE_KEY);
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
        localStorage.removeItem(CART_CACHE_KEY);
        setUser(null);
        setIsAuth(false);
        setCart([]);
        setSubTotal(0);
        setQuauntity(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
      localStorage.removeItem(CART_CACHE_KEY);
      return;
    }
    if (user && user.role !== "customer") {
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
      localStorage.removeItem(CART_CACHE_KEY);
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

      const newCart = data.cart || [];
      const newSubTotal = data.subtotal || 0;
      const newQty = data.cartLength || 0;

      setCart(newCart);
      setSubTotal(newSubTotal);
      setQuauntity(newQty);

      try {
        localStorage.setItem(
          CART_CACHE_KEY,
          JSON.stringify({ cart: newCart, subTotal: newSubTotal, quauntity: newQty }),
        );
      } catch (e) {
        console.warn("Failed to update cart cache:", e);
      }
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
    localStorage.removeItem(CART_CACHE_KEY);
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
    } else if (user && user.role !== "customer") {
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
      localStorage.removeItem(CART_CACHE_KEY);
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
