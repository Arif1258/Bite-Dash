import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState, useRef } from "react";
import { 
  ShoppingBag, MapPin, Search, Bot, User, 
  Menu, X, Sparkles, ChevronDown, LogOut, Package, 
  Leaf, Tag, RefreshCw, Compass 
} from "lucide-react";

const Navbar = () => {
  const { isAuth, user, setUser, setIsAuth, city, quauntity, cart, subTotal } = useAppData();
  const currLocation = useLocation();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else if (currLocation.pathname === "/") {
        setSearchParams({});
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleOpenAiSupport = () => {
    window.dispatchEvent(new CustomEvent("open-ai-support"));
    setMobileMenuOpen(false);
  };

  const isCurrent = (path) => currLocation.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-slate-200/80 transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 gap-4">
        {/* Left: Brand Logo & City Location */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 bg-gradient-to-tr from-red-600 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-white text-lg tracking-wider">B</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-red-600 transition">
                Bite<span className="text-red-600">Dash</span>
              </span>
            </div>
          </Link>

          {/* Location Selector Pill */}
          <div 
            onClick={() => {
              if (currLocation.pathname !== "/") navigate("/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200/60 transition"
            title="Current delivery location"
          >
            <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <span className="truncate max-w-[130px] font-medium">{city || "Select Location"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isCurrent("/") ? "text-red-600 bg-red-50/80" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Home
          </Link>

          <a
            href="/#restaurants"
            onClick={(e) => {
              if (currLocation.pathname === "/") {
                e.preventDefault();
                document.getElementById("restaurants")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition"
          >
            Restaurants
          </a>

          <a
            href="/#explore"
            onClick={(e) => {
              if (currLocation.pathname === "/") {
                e.preventDefault();
                document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition"
          >
            Explore
          </a>

          <Link
            to="/surplus-deals"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isCurrent("/surplus-deals")
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200/80"
                : "text-emerald-700 hover:bg-emerald-50/80"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 badge-pulse"></span>
            <span>Surplus Deals</span>
          </Link>

          <a
            href="/#offers"
            onClick={(e) => {
              if (currLocation.pathname === "/") {
                e.preventDefault();
                document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition flex items-center gap-1"
          >
            <Tag className="w-3 h-3 text-purple-600" />
            <span>Offers</span>
          </a>

          {isAuth && (
            <Link
              to="/orders"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                isCurrent("/orders") ? "text-red-600 bg-red-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </Link>
          )}

          <button
            onClick={handleOpenAiSupport}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50/80 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Support</span>
          </button>
        </nav>

        {/* Right Section: Search, Cart & Auth Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search Input (Compact) */}
          <div className="hidden sm:flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full px-3 py-1.5 text-xs w-44 md:w-56 focus-within:w-64 focus-within:bg-white focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search dishes or cuisines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Cart Icon Button with Count Pill */}
          <div 
            className="relative"
            onMouseEnter={() => setCartPreviewOpen(true)}
            onMouseLeave={() => setCartPreviewOpen(false)}
          >
            <Link
              to="/cart"
              className="h-10 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center gap-2 text-xs font-bold transition relative"
            >
              <ShoppingBag className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Cart</span>
              {quauntity > 0 && (
                <span className="bg-red-600 text-white text-[11px] font-black h-5 w-5 rounded-full flex items-center justify-center -ml-0.5 shadow-xs">
                  {quauntity}
                </span>
              )}
            </Link>

            {/* Cart Hover Preview Dropdown */}
            {cartPreviewOpen && cart && cart.length > 0 && (
              <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 text-xs font-bold text-slate-800">
                  <span>Order Summary ({quauntity} items)</span>
                  <span className="text-red-600">₹{subTotal}</span>
                </div>
                <div className="py-2.5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {cart.map((c) => (
                    <div key={c._id} className="flex justify-between items-center text-xs text-slate-600">
                      <span className="truncate max-w-[170px] font-medium">{c.item?.name} × {c.quauntity}</span>
                      <span className="font-bold text-slate-900">₹{(c.item?.price || 0) * c.quauntity}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/cart"
                  className="w-full block text-center py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  View Full Cart & Checkout
                </Link>
              </div>
            )}
          </div>

          {/* User Authentication Actions */}
          {isAuth ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 transition cursor-pointer"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="hidden md:inline text-xs font-bold text-slate-800 max-w-[90px] truncate">
                  {user?.name || "Account"}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 px-2 py-0.2 rounded-full">
                      {user?.role || "Customer"}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      My Profile
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                      My Orders
                    </Link>
                    <Link
                      to="/address"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      Saved Addresses
                    </Link>
                    <Link
                      to="/select-role"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      Switch Role
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Log In
              </Link>
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-sm shadow-red-600/20"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white/98 backdrop-blur-xl px-4 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-4 duration-200">
          {/* Mobile Search */}
          <div className="flex items-center bg-slate-100 rounded-2xl px-3.5 py-2.5 text-xs">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search for restaurants or dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800"
            />
          </div>

          {/* Mobile Links */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2"
            >
              🍽️ Home
            </Link>
            <Link
              to="/surplus-deals"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-800 flex items-center gap-2"
            >
              🌱 Surplus Deals
            </Link>
            <a
              href="/#restaurants"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2"
            >
              🏪 Restaurants
            </a>
            <button
              onClick={handleOpenAiSupport}
              className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-800 flex items-center gap-2 text-left"
            >
              🤖 AI Support
            </button>
            {isAuth && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2"
                >
                  📦 Track Orders
                </Link>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2"
                >
                  👤 My Profile
                </Link>
              </>
            )}
          </div>

          {/* Mobile Auth Bottom Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span className="truncate max-w-[180px] font-medium">{city}</span>
            </div>
            {isAuth ? (
              <button
                onClick={handleLogout}
                className="text-red-600 font-bold hover:underline cursor-pointer"
              >
                Log Out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl"
              >
                Log In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
