import { Star, Clock, Tag, Leaf, MapPin, SlidersHorizontal, ArrowUpDown } from "lucide-react";

export const CATEGORIES = [
  { name: "All", icon: "🍽️" },
  { name: "Biryani", icon: "🍲" },
  { name: "Pizza", icon: "🍕" },
  { name: "Burgers", icon: "🍔" },
  { name: "Rolls", icon: "🌯" },
  { name: "Chinese", icon: "🥢" },
  { name: "North Indian", icon: "🥘" },
  { name: "Healthy", icon: "🥗" },
  { name: "Desserts", icon: "🍰" },
  { name: "South Indian", icon: "🥞" },
  { name: "Beverages", icon: "🧋" }
];

const RestaurantFilters = ({
  selectedCategory,
  onSelectCategory,
  activeFilters,
  onToggleFilter,
  sortBy,
  onSelectSort,
  totalCount
}) => {
  return (
    <div className="space-y-4">
      {/* Category Icons Carousel */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                isSelected
                  ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Chips & Sort Row */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200/60">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Rating 4.0+ */}
          <button
            onClick={() => onToggleFilter("rating")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex-shrink-0 ${
              activeFilters.rating
                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${activeFilters.rating ? "fill-white text-white" : "text-amber-500"}`} />
            <span>Ratings 4.0+</span>
          </button>

          {/* Fast Delivery */}
          <button
            onClick={() => onToggleFilter("fastDelivery")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex-shrink-0 ${
              activeFilters.fastDelivery
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Under 30 Mins</span>
          </button>

          {/* Pure Veg */}
          <button
            onClick={() => onToggleFilter("pureVeg")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex-shrink-0 ${
              activeFilters.pureVeg
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>Pure Veg</span>
          </button>

          {/* Offers */}
          <button
            onClick={() => onToggleFilter("offers")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex-shrink-0 ${
              activeFilters.offers
                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Special Offers</span>
          </button>

          {/* Nearby */}
          <button
            onClick={() => onToggleFilter("nearby")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex-shrink-0 ${
              activeFilters.nearby
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Nearby (&lt; 3 km)</span>
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <select
            value={sortBy}
            onChange={(e) => onSelectSort(e.target.value)}
            aria-label="Sort restaurants"
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="rating">Highest Rated</option>
            <option value="distance">Nearest First</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default RestaurantFilters;
