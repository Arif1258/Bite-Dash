import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Phone, Mail, MapPin, Sparkles, ShieldCheck, 
  Clock, Leaf, Bot, ArrowUpRight, Heart, Store, 
  Bike, Package, ShoppingBag, User, ExternalLink
} from "lucide-react";
import { FaTwitter, FaInstagram, FaLinkedinIn, FaGithub } from "react-icons/fa6";

const Footer = () => {
  const currLocation = useLocation();

  const handleOpenAiSupport = () => {
    window.dispatchEvent(new CustomEvent("open-ai-support"));
  };

  return (
    <footer className="w-full bg-slate-950 text-slate-300 border-t border-slate-800/80 mt-auto transition-colors">
      {/* Top Value Proposition Strip */}
      <div className="border-b border-slate-800/70 bg-slate-900/50 backdrop-blur-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">~28 Mins Avg Delivery</p>
                <p className="text-[11px] text-slate-400">Hot, fresh & right on time</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Eco Surplus Rescue</p>
                <p className="text-[11px] text-slate-400">Save up to 70% & stop waste</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">24/7 AI Concierge</p>
                <p className="text-[11px] text-slate-400">Live ETA & smart suggestions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Certified Kitchens</p>
                <p className="text-[11px] text-slate-400">100% hygienic food standards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Brand & Mission */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="h-9 w-9 bg-gradient-to-tr from-red-600 to-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
                <span className="font-black text-white text-lg tracking-wider">B</span>
              </div>
              <span className="text-2xl font-black tracking-tight text-white group-hover:text-red-500 transition">
                Bite<span className="text-red-500">Dash</span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Discover top chef-crafted restaurants, enjoy dynamic lightning-fast delivery, and rescue fresh surplus meals at unbeatable discounts.
            </p>

            {/* Social Media Links */}
            <div className="pt-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Connect With Us
              </p>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all duration-200"
                  aria-label="BiteDash on Twitter"
                >
                  <FaTwitter className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 hover:border-rose-600 transition-all duration-200"
                  aria-label="BiteDash on Instagram"
                >
                  <FaInstagram className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all duration-200"
                  aria-label="BiteDash on LinkedIn"
                >
                  <FaLinkedinIn className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all duration-200"
                  aria-label="BiteDash on GitHub"
                >
                  <FaGithub className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Join as Partner Action Button */}
            <div className="pt-2">
              <Link
                to="/select-role"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Join as Partner / Rider</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Quick Navigation & Discover */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Discover & Order
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Home & Cuisines</span>
                </Link>
              </li>
              <li>
                <a 
                  href="/#restaurants" 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Featured Restaurants
                </a>
              </li>
              <li>
                <Link 
                  to="/surplus-deals" 
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>🌱 Surplus Food Deals</span>
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.2 rounded-full">
                    70% OFF
                  </span>
                </Link>
              </li>
              <li>
                <a 
                  href="/#offers" 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Daily Offers & Coupons
                </a>
              </li>
              <li>
                <Link to="/cart" className="text-slate-400 hover:text-white transition-colors">
                  Your Cart Summary
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Services */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Support & Services
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={handleOpenAiSupport}
                  className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Support Copilot</span>
                  <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-1.5 py-0.2 rounded-full">
                    Online
                  </span>
                </button>
              </li>
              <li>
                <Link to="/orders" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span>Track Live Orders</span>
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer Profile</span>
                </Link>
              </li>
              <li>
                <Link to="/select-role" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rider & Merchant Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/address" className="text-slate-400 hover:text-white transition-colors">
                  Delivery Address Book
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Information */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Contact & Locations
            </h4>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Customer Helpline (24/7)</p>
                  <a href="tel:+918371801715" className="text-slate-200 hover:text-red-400 font-semibold transition-colors">
                    +91 8371801715
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-medium">Support Email</p>
                  <a href="mailto:skarifahmedma490@gmail.com" className="text-slate-200 hover:text-red-400 font-semibold transition-colors truncate block">
                    skarifahmedma490@gmail.com
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Headquarters</p>
                  <p className="text-slate-300 font-medium">Mumbai, Maharashtra, India</p>
                </div>
              </li>
            </ul>

            {/* Security Guarantee Pill */}
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>256-Bit SSL Encrypted & Verified</span>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright & Legal Sub-Footer */}
      <div className="border-t border-slate-900 bg-slate-950/80 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} <span className="text-white font-semibold">BiteDash Technologies Inc</span>. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <span className="text-slate-800">•</span>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
            <span className="text-slate-800">•</span>
            <a href="#" className="hover:text-slate-300 transition-colors">Cookie Policy</a>
            <span className="text-slate-800">•</span>
            <span className="text-slate-400 flex items-center gap-1">
              Crafted with <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" /> for food lovers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
