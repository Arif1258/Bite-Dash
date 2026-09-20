import { useNavigate } from "react-router-dom";
import { Star, Clock, MapPin, Tag } from "lucide-react";

const RestaurantCard = ({ 
  id, 
  image, 
  name, 
  distance, 
  isOpen, 
  rating = 4.3, 
  cuisine = "Multi-Cuisine", 
  deliveryTime = "25-35 mins",
  priceForTwo = "₹250 for two",
  offer = "Free Delivery" 
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/restaurant/${id}`)}
      className={`group cursor-pointer rounded-3xl bg-white border border-slate-200/70 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between ${
        !isOpen ? "opacity-75" : ""
      }`}
    >
      <div>
        {/* Top Image Container */}
        <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
          <img
            src={image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80"}
            alt={name}
            className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              !isOpen ? "grayscale" : ""
            }`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          {/* Open / Closed Badge */}
          <div className="absolute top-3 left-3">
            {isOpen ? (
              <span className="bg-emerald-500/90 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Open Now
              </span>
            ) : (
              <span className="bg-slate-900/90 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Closed
              </span>
            )}
          </div>

          {/* Rating Pill */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-slate-900 px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{typeof rating === 'number' ? rating.toFixed(1) : "4.2"}</span>
          </div>

          {/* Offer Tag on image */}
          {offer && (
            <div className="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] font-extrabold text-white bg-red-600/90 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs">
              <Tag className="w-3 h-3 text-white" />
              <span>{offer}</span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-red-600 transition">
            {name}
          </h3>

          <p className="text-xs text-slate-500 truncate font-medium">
            {cuisine}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {deliveryTime}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {distance} km
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50/50">
        <span>{priceForTwo}</span>
        <span className="text-red-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
          View Menu →
        </span>
      </div>
    </div>
  );
};

export default RestaurantCard;
