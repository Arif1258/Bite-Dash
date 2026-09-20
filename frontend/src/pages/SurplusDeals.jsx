import { useEffect, useState } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { 
  Sparkles, Clock, MapPin, Tag, ShieldCheck, 
  ArrowRight, Leaf, AlertCircle, ShoppingBag, CheckCircle2, ChevronRight, X 
} from "lucide-react";

const SurplusDeals = () => {
  const { location, user } = useAppData();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'veg' | 'deep_discount' | 'urgent'

  // Claim Modal State
  const [claimingItem, setClaimingItem] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Live timer tick
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSurplus = async () => {
    try {
      setLoading(true);
      const params = {};
      if (location?.latitude && location?.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
        params.maxDistanceKm = 10;
      }

      const { data } = await axios.get(`${restaurantService}/api/surplus/active`, { params });
      if (data.success) {
        setItems(data.surplusItems || []);
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

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleNearbySurplus = (data) => {
      toast(
        `🌱 New Surplus Alert: ${data.name} available at ${data.restaurantName} for ₹${data.discountPrice}!`,
        { icon: "⚡", duration: 6000 }
      );
      fetchSurplus();
    };

    socket.on("surplus:nearby_alert", handleNearbySurplus);
    return () => socket.off("surplus:nearby_alert", handleNearbySurplus);
  }, [socket]);

  const getCountdownString = (expiryTime) => {
    const diffMs = new Date(expiryTime) - now;
    if (diffMs <= 0) return "Expired";
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s left`;
  };

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

  const handleConfirmClaim = async () => {
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
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (data.success) {
        toast.success(`🎉 ${data.message || "Surplus meal claimed successfully!"}`);
        setClaimingItem(null);
        fetchSurplus();
        if (data.order?._id) {
          navigate(`/order/${data.order._id}`);
        } else {
          navigate("/orders");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to claim surplus deal");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === "veg") return item.isVeg;
    if (activeFilter === "deep_discount") return item.discountPercent >= 50;
    if (activeFilter === "urgent") {
      const diffMin = (new Date(item.expiryTime) - now) / 60000;
      return diffMin > 0 && diffMin <= 45;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5" />
                Zero Food Waste Initiative
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Rescue Delicious Meals. <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                  Up to 70% Off.
                </span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Top restaurants prepare fresh surplus portions that would otherwise go to waste at closing hours. 
                Claim high-quality chef-prepared food at unbeatable prices before time runs out.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-200 pt-2">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Fresh & Certified
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur">
                  <Clock className="w-4 h-4 text-amber-400" /> Instant Doorstep Delivery
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur">
                  <Leaf className="w-4 h-4 text-emerald-400" /> ~2.5kg CO₂ Saved per Meal
                </div>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-3xl text-center flex flex-row lg:flex-col items-center justify-around gap-6 w-full lg:w-72 shadow-2xl">
              <div>
                <p className="text-3xl font-black text-emerald-400">{items.length}</p>
                <p className="text-xs text-slate-300 font-medium">Deals Near You</p>
              </div>
              <div className="h-10 w-px lg:w-full lg:h-px bg-white/20"></div>
              <div>
                <p className="text-3xl font-black text-amber-300">40-70%</p>
                <p className="text-xs text-slate-300 font-medium">Average Savings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Filters */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Filter Chips Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-6 border-b border-slate-200/80">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "all", label: "All Surplus Deals", icon: Sparkles },
              { id: "veg", label: "Pure Veg Only", icon: Leaf },
              { id: "deep_discount", label: "50%+ Mega Discount", icon: Tag },
              { id: "urgent", label: "Ending Soon (<45 mins)", icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs flex-shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-emerald-600/20"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-emerald-600"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> active meals
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm animate-pulse space-y-3">
                <div className="h-44 bg-slate-200 rounded-2xl w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                <div className="h-8 bg-slate-200 rounded-xl w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 p-8 my-8 shadow-xs max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No surplus deals in this category right now</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              Kitchens usually post surplus meals during mid-afternoon (3:00 - 5:30 PM) and late evening (9:30 - 11:30 PM). 
              Check back soon or browse regular restaurants!
            </p>
            <div className="pt-6 flex justify-center gap-3">
              <button
                onClick={() => setActiveFilter("all")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                Reset Filters
              </button>
              <Link
                to="/"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
              >
                Browse All Restaurants
              </Link>
            </div>
          </div>
        ) : (
          /* Deals Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-8">
            {filteredItems.map((item) => {
              const countdown = getCountdownString(item.expiryTime);
              const isUrgent = countdown.includes("m") && !countdown.includes("h");

              return (
                <div
                  key={item._id}
                  className="group bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Image & Tags */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                        alt={item.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="bg-emerald-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.discountPercent}% OFF
                        </span>
                        {item.isVeg && (
                          <span className="bg-white/95 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                            🌱 Veg
                          </span>
                        )}
                      </div>

                      {/* Live Expiry Countdown */}
                      <div className={`absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                        isUrgent ? "bg-red-500/90 text-white animate-pulse" : "bg-black/70 text-white"
                      }`}>
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>{countdown}</span>
                      </div>
                    </div>

                    {/* Meal & Restaurant Info */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition">
                          {item.name}
                        </h3>
                      </div>

                      <Link
                        to={`/restaurant/${item.restaurantId}`}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                      >
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{item.restaurantName}</span>
                      </Link>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description || "Prepared fresh today. Certified safe packaging."}
                      </p>

                      {/* Remaining Portions Bar */}
                      <div className="pt-2">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                          <span>Portions available:</span>
                          <span className="text-emerald-700 font-bold">{item.availableQuantity} left</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(15, (item.availableQuantity / 10) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price & Claim Footer */}
                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-slate-900">₹{item.discountPrice}</span>
                        <span className="text-xs text-slate-400 line-through font-medium">₹{item.originalPrice}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        Save ₹{item.originalPrice - item.discountPrice}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenClaim(item)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Claim Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim Modal Drawer */}
      {claimingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <Leaf className="w-4 h-4" />
                Claim Fresh Surplus Meal
              </div>
              <button
                onClick={() => setClaimingItem(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <img
                src={claimingItem.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100"}
                alt={claimingItem.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-900 truncate">{claimingItem.name}</h4>
                <p className="text-xs text-slate-500 truncate">{claimingItem.restaurantName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-black text-sm text-emerald-600">₹{claimingItem.discountPrice}</span>
                  <span className="text-xs text-slate-400 line-through">₹{claimingItem.originalPrice}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                    {claimingItem.discountPercent}% OFF
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700">Portions to rescue:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                  className="h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center hover:bg-slate-100"
                >
                  -
                </button>
                <span className="font-bold text-sm text-slate-900 w-4 text-center">{orderQuantity}</span>
                <button
                  onClick={() => setOrderQuantity(Math.min(claimingItem.availableQuantity || 5, orderQuantity + 1))}
                  className="h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Address Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Deliver To:</span>
                <Link to="/address" className="text-emerald-700 font-semibold hover:underline">
                  + New Address
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  No saved addresses found. Please add a delivery address to complete your order.
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                  {addresses.map((addr) => (
                    <label
                      key={addr._id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        selectedAddressId === addr._id
                          ? "border-emerald-600 bg-emerald-50/50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="claim-address"
                        checked={selectedAddressId === addr._id}
                        onChange={() => setSelectedAddressId(addr._id)}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block capitalize">{addr.addressType || "Address"}</span>
                        <span className="text-slate-500 line-clamp-1">{addr.formattedAddress || addr.address}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Total & Action Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Total Due:</span>
                <span className="text-xl font-black text-slate-900">
                  ₹{claimingItem.discountPrice * orderQuantity}
                </span>
              </div>
              <button
                onClick={handleConfirmClaim}
                disabled={submittingOrder || !selectedAddressId}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
              >
                {submittingOrder ? "Confirming..." : "Complete Claim"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurplusDeals;
