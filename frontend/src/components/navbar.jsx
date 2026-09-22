import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState, useRef } from "react";
import { 
  ShoppingBag, MapPin, Search, Bot, User, 
  Menu, X, ChevronDown, LogOut, Package, 
  Tag, RefreshCw, Sparkles, Store
} from "lucide-react";

const Navbar = () => {
  const { isAuth, user, city, quauntity, cart, subTotal, logout } = useAppData();
  const currLocation = useLocation();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
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
      if (search.trim()) {
        setSearchParams({ search: search.trim() });
      } else {
        setSearchParams({});
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleOpenAiSupport = () => {
    window.dispatchEvent(new CustomEvent("open-ai-support"));
    setMobileMenuOpen(false);
  };

  const handleSearchClick = () => {
    if (currLocation.pathname === "/") {
      const searchBox = document.querySelector("input[placeholder*='Search for restaurants']");
      if (searchBox) {
        searchBox.scrollIntoView({ behavior: "smooth", block: "center" });
        searchBox.focus();
        return;
      }
    }
    setShowSearchModal(true);
  };

  const isCurrent = (path) => currLocation.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-slate-200/80 transition-all shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 gap-2 sm:gap-4">
        
        {/* Left: Brand Logo & City Location */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="h-9 w-9 bg-gradient-to-tr from-red-600 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform shrink-0">
              <span className="font-black text-white text-lg tracking-wider">B</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-red-600 transition">
                Bite<span className="text-red-600">Dash</span>
              </span>
            </div>
          </Link>

          {/* Location Selector Pill (visible on xl+ where width is spacious) */}
          <div 
            onClick={() => {
              if (currLocation.pathname !== "/") navigate("/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200/60 transition shrink-0"
            title="Current delivery location"
          >
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="truncate max-w-[85px] md:max-w-[110px] font-medium">{city || "Select Location"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </div>
        </div>

        {/* Center: Desktop Navigation Links (Responsive, fits comfortably without overcrowding) */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 min-w-0 flex-1 px-1">
          <Link
            to="/"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
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
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition shrink-0"
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
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition shrink-0"
          >
            Explore
          </a>

          <Link
            to="/surplus-deals"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
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
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition flex items-center gap-1 shrink-0"
          >
            <Tag className="w-3 h-3 text-purple-600" />
            <span>Offers</span>
          </a>

          {/* Shown on ultra-wide screens */}
          {isAuth && (
            <Link
              to="/orders"
              className={`hidden 2xl:flex px-2.5 py-1.5 rounded-xl text-xs font-bold transition items-center gap-1 shrink-0 ${
                isCurrent("/orders") ? "text-red-600 bg-red-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </Link>
          )}

          <button
            onClick={handleOpenAiSupport}
            className="hidden xl:flex px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50/80 transition items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Support</span>
          </button>
        </nav>

        {/* Right Section: Search, Cart & User Profile Actions */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Search: Full search bar on extra large screens (2xl) */}
          <div className="hidden 2xl:flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full px-3 py-1.5 text-xs w-44 focus-within:w-56 focus-within:bg-white focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 transition-all shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xs"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Icon Trigger on Laptop/Tablet screens */}
          <button
            onClick={handleSearchClick}
            className="2xl:hidden h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition cursor-pointer shrink-0"
            title="Search dishes & restaurants"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Cart Icon Button with Count Pill */}
          <div 
            className="relative shrink-0"
            onMouseEnter={() => setCartPreviewOpen(true)}
            onMouseLeave={() => setCartPreviewOpen(false)}
          >
            <Link
              to="/cart"
              className="h-9 px-3 sm:px-3.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center gap-1.5 text-xs font-bold transition shrink-0"
            >
              <ShoppingBag className="w-4 h-4 text-red-600 shrink-0" />
              <span className="hidden md:inline">Cart</span>
              {quauntity > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center -ml-0.5 shadow-xs">
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
                  {cart.map((c) => {
                    const item = c.itemId || c.item;
                    if (!item) return null;
                    return (
                      <div key={c._id} className="flex justify-between items-center text-xs text-slate-600">
                        <span className="truncate max-w-[170px] font-medium">{item.name} × {c.quauntity}</span>
                        <span className="font-bold text-slate-900">₹{(item.price || 0) * c.quauntity}</span>
                      </div>
                    );
                  })}
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
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 transition-all cursor-pointer shadow-xs max-w-[130px] sm:max-w-[170px] md:max-w-[200px] shrink-0"
                title={user?.name || "User Profile"}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-xs font-bold text-slate-800 truncate max-w-[65px] sm:max-w-[95px] md:max-w-[120px] text-left leading-tight">
                  {user?.name || "Account"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate" title={user?.name}>
                          {user?.name || "User"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate" title={user?.email}>
                          {user?.email || ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                        {user?.role || "Customer"}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition"
                    >
                      <Package className="w-4 h-4 text-slate-500" />
                      <span>My Orders & Live Tracking</span>
                    </Link>
                    <Link
                      to="/address"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition"
                    >
                      <MapPin className="w-4 h-4 text-slate-500" />
                      <span>Saved Addresses</span>
                    </Link>
                    <Link
                      to="/select-role"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600 transition"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                      <span>Switch Role (Rider / Seller)</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                to="/login"
                className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
              >
                Log In
              </Link>
              <Link
                to="/login"
                className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-sm shadow-red-600/20 shrink-0"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick Search Modal for Tablet / Compact view */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-lg animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Search Food & Restaurants</span>
              <button 
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search for restaurants, biryani, pizza or cuisines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowSearchModal(false);
                    if (currLocation.pathname !== "/") navigate("/");
                  }
                }}
                className="w-full bg-transparent outline-none text-slate-800"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  if (currLocation.pathname !== "/") navigate("/");
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Search Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-3.5 shadow-xl animate-in slide-in-from-top-4 duration-200">
          
          {/* If Logged In, Mobile Profile Banner */}
          {isAuth && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white text-sm font-black flex items-center justify-center shrink-0 shadow-xs">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "User"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || ""}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 px-2 py-0.5 rounded-full shrink-0">
                {user?.role || "Customer"}
              </span>
            </div>
          )}

          {/* Mobile Search Input */}
          <div className="flex items-center bg-slate-100 rounded-2xl px-3.5 py-2.5 text-xs">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
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
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2 transition"
            >
              🍽️ Home
            </Link>
            <Link
              to="/surplus-deals"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-800 flex items-center gap-2 transition"
            >
              🌱 Surplus Deals
            </Link>
            <a
              href="/#restaurants"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2 transition"
            >
              🏪 Restaurants
            </a>
            <button
              onClick={handleOpenAiSupport}
              className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-800 flex items-center gap-2 text-left transition cursor-pointer"
            >
              🤖 AI Support
            </button>
            {isAuth && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2 transition"
                >
                  📦 Track Orders
                </Link>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2 transition"
                >
                  👤 My Profile
                </Link>
                <Link
                  to="/address"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2 transition"
                >
                  📍 Addresses
                </Link>
                <Link
                  to="/select-role"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-800 flex items-center gap-2 transition"
                >
                  🔄 Switch Role
                </Link>
              </>
            )}
          </div>

          {/* Mobile Auth Bottom Bar */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
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
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl shadow-xs"
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
