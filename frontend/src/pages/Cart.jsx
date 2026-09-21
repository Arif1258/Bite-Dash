import { useNavigate, Link } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowRight, 
  ShieldCheck, Clock, MapPin, Sparkles, CheckCircle2, 
  Store, AlertCircle, RefreshCw, X 
} from "lucide-react";

const Cart = () => {
  const { cart, subTotal, quauntity, fetchCart, cartLoading, cartError } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState(null);
  const [clearingCart, setClearingCart] = useState(false);

  // 1. Loading State
  if (cartLoading && (!cart || cart.length === 0)) {
    return (
      <div className="min-h-[70vh] bg-slate-50/60 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
              <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse"></div>
            </div>
            <div className="lg:col-span-5">
              <div className="h-80 bg-white rounded-3xl border border-slate-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (cartError && (!cart || cart.length === 0)) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Unable to Load Your Cart</h2>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            {cartError || "We encountered a temporary network issue retrieving your cart items."}
          </p>
          <div className="pt-3 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => fetchCart()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              to="/"
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
            >
              Browse Restaurants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty Cart State
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/70 shadow-xs space-y-4">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100/60">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Cart is Empty</h2>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Good food is always cooking! Explore trending dishes, top culinary hubs, or rescue fresh surplus deals near you.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 text-center"
            >
              Browse Restaurants
            </Link>
            <Link
              to="/surplus-deals"
              className="px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition border border-emerald-200 text-center"
            >
              🌱 View Surplus Deals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Identify Restaurant Reference Safely
  const firstCartItem = cart[0];
  const restaurant = firstCartItem?.restaurantId?._id || firstCartItem?.restaurantId;
  const restaurantName =
    firstCartItem?.restaurantId?.name ||
    firstCartItem?.itemId?.restaurantName ||
    firstCartItem?.item?.restaurantName ||
    "Partner Restaurant";

  const freeDeliveryThreshold = 250;
  const deliveryFee = subTotal < freeDeliveryThreshold ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subTotal);

  const increaseQty = async (itemId) => {
    if (!itemId) return;
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      await fetchCart();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to increase quantity");
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseQty = async (itemId) => {
    if (!itemId) return;
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      await fetchCart();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to decrease quantity");
    } finally {
      setLoadingItemId(null);
    }
  };

  const removeItem = async (itemId, currentQty = 1, cartId = null) => {
    try {
      if (itemId) setLoadingItemId(itemId);
      
      // Attempt explicit remove endpoint, fallback to decrement loop if not supported by older deployment
      let removed = false;
      try {
        const payload = cartId ? { cartId, itemId } : { itemId };
        await axios.post(
          `${restaurantService}/api/cart/remove`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        removed = true;
      } catch (e) {
        // Fallback: decrement until removed
        if (itemId) {
          for (let i = 0; i < currentQty; i++) {
            await axios.put(
              `${restaurantService}/api/cart/dec`,
              { itemId },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              },
            );
          }
          removed = true;
        }
      }

      await fetchCart();
      toast.success("Item removed from cart");
    } catch (error) {
      toast.error("Failed to remove item");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    const confirm = window.confirm("Are you sure you want to clear your cart?");
    if (!confirm) return;
    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      await fetchCart();
      toast.success("Cart cleared successfully");
    } catch (error) {
      toast.error("Failed to clear cart");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review your items and proceed to secure checkout
            </p>
          </div>

          <button
            onClick={clearCart}
            disabled={clearingCart}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearingCart ? "Clearing..." : "Clear Cart"}</span>
          </button>
        </div>

        {/* Free Delivery Threshold Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            {amountToFreeDelivery > 0 ? (
              <span className="text-slate-700">
                Add <strong className="text-red-600">₹{amountToFreeDelivery}</strong> more to unlock <span className="text-emerald-600 font-black">FREE Delivery</span>
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Congratulations! You unlocked <strong className="font-black">FREE Delivery</strong>
              </span>
            )}
            <span className="text-slate-400">Target: ₹{freeDeliveryThreshold}</span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                amountToFreeDelivery === 0 ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, (subTotal / freeDeliveryThreshold) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Two-Column Grid: Items on Left, Bill on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-7 space-y-4">
            {/* Restaurant Banner */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{restaurantName}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Delivering hot &amp; fresh</p>
                </div>
              </div>

              {restaurant && (
                <Link
                  to={`/restaurant/${restaurant}`}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  + Add More Items
                </Link>
              )}
            </div>

            {/* Item Cards List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {cart.map((c) => {
                const item = c.itemId || c.item;
                const cartId = c._id;
                const currentQty = c.quauntity || 1;

                // Handle Missing or Deleted Product Gracefully
                if (!item) {
                  return (
                    <div key={cartId} className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-amber-50/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-900">Product No Longer Available</h4>
                          <p className="text-[11px] text-amber-700">This menu item was removed by the restaurant.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(null, currentQty, cartId)}
                        className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                }

                const itemId = item._id;
                const isItemLoading = loadingItemId === itemId;
                const unitPrice = item.price || 0;
                const itemSubtotal = unitPrice * currentQty;
                const itemImage = item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100";

                return (
                  <div key={cartId} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={itemImage}
                        alt={item.name || "Food"}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100";
                        }}
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`}></span>
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.name || "Food Item"}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-slate-700">₹{unitPrice} <span className="text-slate-400 font-normal text-[11px]">/ unit</span></span>
                          <span className="text-slate-400">•</span>
                          <span className="font-extrabold text-red-600">Total: ₹{itemSubtotal}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls & Remove */}
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
                        <button
                          onClick={() => decreaseQty(itemId)}
                          disabled={isItemLoading}
                          title="Decrease Quantity"
                          className="h-6 w-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs text-slate-900 w-5 text-center">
                          {isItemLoading ? "..." : currentQty}
                        </span>
                        <button
                          onClick={() => increaseQty(itemId)}
                          disabled={isItemLoading}
                          title="Increase Quantity"
                          className="h-6 w-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(itemId, currentQty, cartId)}
                        disabled={isItemLoading}
                        title="Remove Item"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Summary Bill */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Bill Summary
              </h3>

              <div className="space-y-2.5 text-xs font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Item Total ({quauntity} items)</span>
                  <span className="font-bold text-slate-900">₹{subTotal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    Delivery Partner Fee
                    {deliveryFee === 0 && <span className="text-emerald-600 text-[10px] font-bold uppercase">(Free)</span>}
                  </span>
                  <span className="font-bold text-slate-900">
                    {deliveryFee === 0 ? <span className="line-through text-slate-400 mr-1.5">₹49</span> : null}
                    ₹{deliveryFee}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-bold text-slate-900">₹{platformFee}</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>GST &amp; Restaurant Taxes</span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Included in Item Price</span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline text-sm">
                  <span className="font-black text-slate-900">To Pay</span>
                  <span className="text-2xl font-black text-slate-900">₹{grandTotal}</span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={() => navigate("/checkout")}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl transition shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Safe and Secure Encrypted Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
