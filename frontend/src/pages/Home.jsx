import { useSearchParams, Link } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantFilters from "../components/RestaurantFilters";
import SurplusSection from "../components/SurplusSection";
import RecommendationSection from "../components/RecommendationSection";
import { 
  Search, MapPin, Sparkles, Clock, ShieldCheck, 
  Leaf, Tag, ArrowRight, Bot, Compass, UtensilsCrossed 
} from "lucide-react";

const Home = () => {
  const { location, city } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeFilters, setActiveFilters] = useState({
    rating: false,
    fastDelivery: false,
    pureVeg: false,
    offers: false,
    nearby: false
  });
  const [sortBy, setSortBy] = useState("relevance");

  // Track search behavior in background
  useEffect(() => {
    if (search.trim()) {
      axios.post(
        `${restaurantService}/api/recommendation/track`,
        { search: search.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      ).catch(() => {});
    }
  }, [search]);

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 2.4;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(1);
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);

      const params = {
        search,
      };

      if (location?.latitude && location?.longitude) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }

      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [location, search]);

  const handleToggleFilter = (filterKey) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  };

  // Filtered & Sorted Restaurants
  const processedRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Category search / filter
    if (selectedCategory !== "All") {
      result = result.filter((r) => {
        const cat = selectedCategory.toLowerCase();
        return (
          (r.name && r.name.toLowerCase().includes(cat)) ||
          (r.description && r.description.toLowerCase().includes(cat)) ||
          (r.cuisine && r.cuisine.toLowerCase().includes(cat))
        );
      });
    }

    // Rating 4.0+
    if (activeFilters.rating) {
      result = result.filter((r) => (r.rating || 4.2) >= 4.0);
    }

    // Nearby (< 3 km)
    if (activeFilters.nearby && location) {
      result = result.filter((r) => {
        if (!r.autoLocation?.coordinates) return true;
        const [lng, lat] = r.autoLocation.coordinates;
        const d = getDistanceKm(location.latitude, location.longitude, lat, lng);
        return d <= 3.0;
      });
    }

    // Sorting
    if (sortBy === "rating") {
      result.sort((a, b) => (b.rating || 4.2) - (a.rating || 4.2));
    } else if (sortBy === "distance" && location) {
      result.sort((a, b) => {
        const distA = a.autoLocation?.coordinates ? getDistanceKm(location.latitude, location.longitude, a.autoLocation.coordinates[1], a.autoLocation.coordinates[0]) : 0;
        const distB = b.autoLocation?.coordinates ? getDistanceKm(location.latitude, location.longitude, b.autoLocation.coordinates[1], b.autoLocation.coordinates[0]) : 0;
        return distA - distB;
      });
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [restaurants, selectedCategory, activeFilters, sortBy, location]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-b from-red-600 via-rose-600 to-rose-700 text-white overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/20 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Smart Food Delivery &amp; Zero Waste</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Good food. <br />
              <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent">
                Better prices. Less waste.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-rose-100 max-w-xl leading-relaxed font-medium">
              Discover top chef-crafted restaurants near you, enjoy dynamic lightning-fast delivery, 
              and rescue fresh surplus meals at up to 70% off.
            </p>

            {/* Hero Search Box */}
            <div className="bg-white p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-white/20">
              <div className="flex items-center gap-2 px-3 py-2 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-slate-200 text-slate-700">
                <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-xs font-bold truncate max-w-[140px]">
                  {city || "Current City"}
                </span>
              </div>

              <div className="flex-1 flex items-center gap-2 px-3 w-full">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search for restaurants, biryani, pizza or cuisines..."
                  value={search}
                  onChange={(e) => setSearchParams(e.target.value ? { search: e.target.value } : {})}
                  className="w-full py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                />
              </div>

              <button 
                onClick={() => {
                  document.getElementById("restaurants")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition shadow-md shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Find Food</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs font-semibold text-rose-100">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-300" /> ~28 Mins Avg Delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-300" /> 40–70% Off Surplus Deals
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-300" /> Certified Safe Kitchens
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12 pt-8">
        
        {/* 2. Today's Promotions Banner Grid */}
        <section id="offers" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between h-36">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Welcome Deal
              </span>
              <h3 className="text-xl font-black mt-1">Flat 50% OFF</h3>
              <p className="text-xs text-amber-100 font-medium">Use code BITEDASH50 on first 3 orders</p>
            </div>
            <span className="text-xs font-bold underline flex items-center gap-1 cursor-pointer">
              Apply Code Now →
            </span>
          </div>

          <Link 
            to="/surplus-deals"
            className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between h-36 group"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                <Leaf className="w-3 h-3 text-emerald-200" /> Eco Surplus
              </span>
              <h3 className="text-xl font-black mt-1">Save Meals &amp; Money</h3>
              <p className="text-xs text-emerald-100 font-medium">Claim freshly prepared surplus food at 70% off</p>
            </div>
            <span className="text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Explore Surplus Deals →
            </span>
          </Link>

          <div 
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-support"))}
            className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-5 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between h-36 cursor-pointer group"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                <Bot className="w-3 h-3 text-indigo-200" /> 24/7 AI Order Copilot
              </span>
              <h3 className="text-xl font-black mt-1">Need Order Assistance?</h3>
              <p className="text-xs text-indigo-100 font-medium">Ask Zen for live ETA, rider updates &amp; recommendations</p>
            </div>
            <span className="text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Chat with Assistant →
            </span>
          </div>
        </section>

        {/* 3. Surplus Food Deals Section (Highlighted) */}
        <section id="surplus-section">
          <SurplusSection />
        </section>

        {/* 4. Intelligent Recommendations & Time Specials */}
        <section>
          <RecommendationSection />
        </section>

        {/* 5. Restaurant Discovery Header & Interactive Filters */}
        <section id="restaurants" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                Fresh &amp; Local
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                Popular Restaurants Near You
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Explore hand-picked restaurants delivering hot &amp; fresh to {city}
              </p>
            </div>

            <span className="text-xs font-bold text-slate-400">
              {processedRestaurants.length} Restaurants Available
            </span>
          </div>

          {/* Interactive Filters Bar */}
          <div id="explore" className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
            <RestaurantFilters
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              activeFilters={activeFilters}
              onToggleFilter={handleToggleFilter}
              sortBy={sortBy}
              onSelectSort={setSortBy}
              totalCount={processedRestaurants.length}
            />
          </div>

          {/* Restaurant Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs animate-pulse space-y-3">
                  <div className="h-44 bg-slate-200 rounded-2xl w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-8 bg-slate-100 rounded-xl w-full mt-2"></div>
                </div>
              ))}
            </div>
          ) : processedRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-2">
              {processedRestaurants.map((res) => {
                let distance = "2.5";
                if (location && res.autoLocation?.coordinates) {
                  const [resLng, resLat] = res.autoLocation.coordinates;
                  distance = `${getDistanceKm(
                    location.latitude,
                    location.longitude,
                    resLat,
                    resLng,
                  )}`;
                }

                return (
                  <RestaurantCard
                    key={res._id}
                    id={res._id}
                    name={res.name}
                    image={res.image || ""}
                    distance={distance}
                    isOpen={res.isOpen}
                    rating={res.rating || 4.3}
                    cuisine={res.cuisine || "Multi-Cuisine"}
                    deliveryTime={`${Math.round(20 + parseFloat(distance) * 4)}-${Math.round(30 + parseFloat(distance) * 4)} mins`}
                    priceForTwo="₹250 for two"
                    offer="20% OFF up to ₹50"
                  />
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/70 p-8 shadow-xs max-w-lg mx-auto">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No restaurants match your filters</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Try switching categories, clearing search filters, or exploring all culinary partners.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setActiveFilters({ rating: false, fastDelivery: false, pureVeg: false, offers: false, nearby: false });
                  setSearchParams({});
                }}
                className="mt-5 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default Home;
