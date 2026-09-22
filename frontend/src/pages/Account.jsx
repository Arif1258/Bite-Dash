import { useNavigate, Link } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { 
  User, Package, MapPin, RefreshCw, LogOut, 
  ShieldCheck, Leaf, Heart, Bell, Settings, ChevronRight, Sparkles 
} from "lucide-react";
import { useState } from "react";

const Account = () => {
  const { user, logout } = useAppData();
  const navigate = useNavigate();

  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const logoutHandler = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
            {firstLetter}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                {user?.name || "Customer"}
              </h1>
              <span className="text-xs font-black uppercase tracking-wider bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200/60 w-fit mx-auto sm:mx-0">
                {user?.role || "Customer Account"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">{user?.email}</p>
            <p className="text-[11px] text-slate-400 font-semibold pt-1 flex items-center justify-center sm:justify-start gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified BiteDash Member
            </p>
          </div>
        </div>

        {/* Eco-Impact Spotlight Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-md flex items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-200" /> Green Dining Champion
            </span>
            <h3 className="text-base sm:text-lg font-black">Zero-Waste Sustainability</h3>
            <p className="text-xs text-emerald-100 leading-relaxed font-medium">
              Every surplus meal you order helps reduce kitchen waste and saves ~2.5 kg of greenhouse emissions!
            </p>
          </div>

          <Link
            to="/surplus-deals"
            className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl text-xs font-black transition shadow-sm flex-shrink-0"
          >
            Explore Deals
          </Link>
        </div>

        {/* Menu Navigation Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          
          {/* Orders */}
          <div
            onClick={() => navigate("/orders")}
            className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition">My Orders</h3>
                <p className="text-xs text-slate-400 font-medium">Track live orders and view past receipts</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Addresses */}
          <div
            onClick={() => navigate("/address")}
            className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">Saved Addresses</h3>
                <p className="text-xs text-slate-400 font-medium">Manage home, work, and family delivery locations</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Role Switcher */}
          <div
            onClick={() => navigate("/select-role")}
            className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition">Switch Account Role</h3>
                <p className="text-xs text-slate-400 font-medium">Toggle between Customer, Rider Partner, and Restaurant Seller</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* AI Support */}
          <div
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-support"))}
            className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">BiteDash AI Support</h3>
                <p className="text-xs text-slate-400 font-medium">Instant answers for orders, refunds, and menu queries</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Logout */}
          <div
            onClick={logoutHandler}
            className="p-5 flex items-center justify-between hover:bg-red-50/60 transition cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-600">Sign Out</h3>
                <p className="text-xs text-slate-400 font-medium">Securely log out of this device</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Account;
