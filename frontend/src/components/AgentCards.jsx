import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Star, Clock, Plus, Check, ShoppingBag, ArrowRight, 
  MapPin, Tag, Utensils, CheckCircle2, AlertCircle, Sparkles 
} from "lucide-react";

export const RestaurantCard = ({ data, onSelect }) => {
  const navigate = useNavigate();
  if (!data) return null;

  const handleClick = () => {
    if (data.restaurantId) {
      navigate(`/restaurant/${data.restaurantId}`);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden my-2 max-w-sm">
      <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
        <img
          src={data.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=70"}
          alt={data.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=70";
          }}
        />
        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>{data.rating || "4.5"}</span>
        </div>
        {data.isOpen === false && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
            Closed Right Now
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-red-600 transition-colors">
            {data.name}
          </h4>
          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5 flex-shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            {data.prepTime || "25 min"}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
          {data.description || "Curated fresh dishes"}
        </p>

        {data.address && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 line-clamp-1">
            <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
            {data.address}
          </p>
        )}

        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-emerald-600 font-bold">Fast Doorstep Delivery</span>
          <button
            onClick={handleClick}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition cursor-pointer"
          >
            View Menu <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const FoodCard = ({ data, onAddToCart }) => {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!data) return null;

  const handleAdd = async () => {
    if (loading || added) return;
    setLoading(true);
    try {
      if (onAddToCart) {
        await onAddToCart(data.itemId, data.restaurantId, data.name);
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // Handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all p-3 my-1.5 flex gap-3 items-center max-w-sm">
      <div className="relative h-16 w-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
        <img
          src={data.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=70"}
          alt={data.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=70";
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
          <h4 className="font-bold text-slate-900 text-xs truncate">{data.name}</h4>
        </div>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">
          {data.restaurantName || "Partner Restaurant"}
        </p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xs font-black text-slate-900">₹{data.price}</span>
        </div>
      </div>

      <button
        onClick={handleAdd}
        disabled={loading || data.isAvailable === false}
        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs ${
          data.isAvailable === false
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : added
            ? "bg-emerald-600 text-white"
            : "bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600"
        }`}
      >
        {data.isAvailable === false ? (
          "Sold Out"
        ) : added ? (
          <>
            <Check className="w-3 h-3" /> Added
          </>
        ) : loading ? (
          <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <Plus className="w-3 h-3" /> Add
          </>
        )}
      </button>
    </div>
  );
};

export const CartCard = ({ data, onCheckout }) => {
  const navigate = useNavigate();
  if (!data) return null;

  if (data.isEmpty) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 my-2 max-w-sm text-center">
        <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
        <p className="text-xs font-bold text-slate-700">Your cart is currently empty</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Add dishes from top restaurants to get started.</p>
      </div>
    );
  }

  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 my-2 max-w-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
          <h4 className="font-bold text-slate-900 text-xs">Your BiteDash Cart</h4>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">
          {data.restaurantName || "Partner Restaurant"}
        </span>
      </div>

      <div className="py-2.5 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs">
            <span className="text-slate-700 truncate pr-2">
              <span className="font-bold text-slate-900">{item.quantity}×</span> {item.name}
            </span>
            <span className="font-semibold text-slate-900 flex-shrink-0">₹{item.itemTotal || item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>₹{data.subtotal}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Coupon Discount ({data.appliedCoupon?.code || "PROMO"})</span>
            <span>-₹{data.discount}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-500">
          <span>Delivery Fee</span>
          <span>{data.deliveryFee > 0 ? `₹${data.deliveryFee}` : "FREE"}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Platform Fee</span>
          <span>₹{data.platformFee || 7}</span>
        </div>
        <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-100">
          <span>Total Amount</span>
          <span className="text-red-600 text-sm">₹{data.totalAmount}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate("/cart")}
          className="py-1.5 px-3 rounded-xl text-[11px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-center cursor-pointer"
        >
          View Cart
        </button>
        <button
          onClick={() => (onCheckout ? onCheckout() : navigate("/checkout"))}
          className="py-1.5 px-3 rounded-xl text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white transition text-center shadow-xs cursor-pointer flex items-center justify-center gap-1"
        >
          Checkout <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const OrderCard = ({ data }) => {
  const navigate = useNavigate();
  if (!data) return null;

  const orderId = data.orderId || "";
  const shortId = data.shortId || (orderId ? orderId.slice(-6).toUpperCase() : "ORDER");

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-xs p-3.5 my-2 max-w-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="font-bold text-slate-900 text-xs">Order #{shortId}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/50">
          {data.status || "PLACED"}
        </span>
      </div>

      <div className="py-2.5">
        <p className="text-xs font-bold text-slate-900 truncate">{data.restaurant || "Partner Restaurant"}</p>
        <div className="flex items-center justify-between mt-1 text-[11px]">
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-600" />
            Estimated Arrival:
          </span>
          <span className="font-black text-indigo-950 text-xs">
            {data.estimatedDeliveryTime || data.totalETA || "25-35 mins"}
          </span>
        </div>
        {data.expectedArrival && (
          <p className="text-[10px] text-slate-400 mt-0.5">Expected around {data.expectedArrival}</p>
        )}
      </div>

      {orderId && (
        <button
          onClick={() => navigate(`/order/${orderId}`)}
          className="w-full mt-1 py-1.5 px-3 rounded-xl text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1 cursor-pointer"
        >
          Track Live Order <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export const CouponCard = ({ data, onApply }) => {
  const [applied, setApplied] = useState(false);
  if (!data) return null;

  const handleApply = () => {
    if (onApply) {
      onApply(data.code);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50/70 to-rose-50/70 rounded-2xl border border-amber-200/70 p-3 my-1.5 flex items-center justify-between gap-3 max-w-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-300/40">
          <Tag className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs text-slate-900 tracking-wide font-mono">{data.code}</span>
            {data.isEligible && (
              <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded-full">
                Eligible
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{data.description}</p>
        </div>
      </div>

      <button
        onClick={handleApply}
        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex-shrink-0 cursor-pointer shadow-2xs ${
          applied
            ? "bg-emerald-600 text-white"
            : "bg-white hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-300"
        }`}
      >
        {applied ? "Applied!" : "Apply"}
      </button>
    </div>
  );
};
