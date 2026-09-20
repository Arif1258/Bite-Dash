import React from "react";
import { Link } from "react-router-dom";
import { BiPhone, BiEnvelope, BiMap } from "react-icons/bi";

const Footer = () => {
  return (
    <footer className="w-full bg-gray-900 text-gray-350 border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand Section */}
        <div className="space-y-4">
          <Link to="/" className="text-2xl font-bold text-[#E23744] hover:opacity-95 transition-opacity">
            BiteDash
          </Link>
          <p className="text-sm text-gray-400 max-w-xs">
            Delicious food from your favorite local restaurants, delivered fresh and fast to your doorstep.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>
              <Link to="/surplus-deals" className="hover:text-emerald-400 text-emerald-300 font-bold transition-colors flex items-center gap-1">
                🌱 Surplus Deals (Up to 70% Off)
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-white transition-colors">Cart</Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-white transition-colors">Track Orders</Link>
            </li>
            <li>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent("open-ai-support"))}
                className="hover:text-indigo-300 text-left cursor-pointer transition-colors"
              >
                🤖 BiteDash AI Support
              </button>
            </li>
          </ul>
        </div>

        {/* Contact Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Contact & Support</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <BiPhone className="text-[#E23744] h-5 w-5" />
              <span>+91 8371801715</span>
            </li>
            <li className="flex items-center gap-2">
              <BiEnvelope className="text-[#E23744] h-5 w-5" />
              <a href="mailto:skarifahmedma490@gmail.com" className="hover:underline hover:text-white transition-colors">
                skarifahmedma490@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2 text-gray-450">
              <BiMap className="text-[#E23744] h-5 w-5" />
              <span>India</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="border-t border-gray-800 bg-gray-950 py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BiteDash. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
