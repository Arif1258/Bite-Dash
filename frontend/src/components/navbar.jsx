import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";

const Navbar = () => {
  const { isAuth, city, quauntity } = useAppData();
  const currLocation = useLocation();

  const isHomePage = currLocation.pathname === "/";

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);
  return (
    <div className="w-full bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          to={"/"}
          className="text-2xl font-bold text-[#E23744] cursor-pointer"
        >
          BiteDash
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="#surplus-section"
            onClick={(e) => {
              if (currLocation.pathname === "/") {
                e.preventDefault();
                document.getElementById("surplus-section")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Surplus Food & Waste Reduction Deals"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            🌱 <span className="hidden sm:inline">Surplus Deals</span><span className="sm:hidden">Deals</span>
          </a>

          <Link to={"/cart"} className="relative">
            <CgShoppingCart className="h-6 w-6 text-[#E23744]" />
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E23744] text-xs font-semibold text-white">
              {quauntity}
            </span>
          </Link>

          {isAuth ? (
            <>
              <Link to="/orders" className="font-medium text-gray-700 hover:text-[#E23744] text-sm">
                Orders
              </Link>
              <Link to="/account" className="font-medium text-[#E23744] text-sm">
                Account
              </Link>
            </>
          ) : (
            <Link to="/login" className="font-medium text-[#E23744] text-sm">
              Login
            </Link>
          )}
        </div>
      </div>

      {/* search bar */}
      {isHomePage && (
        <div className="border-t px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r text-gray-700">
              <BiMapPin className="h-4 w-4 text-[#E23744]" />
              <span className="text-sm truncate max-w-35">{city}</span>
            </div>
            <div className="flex flex-1 items-center gap-2 px-3">
              <BiSearch className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for restaurant"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
