import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, 
  ShieldCheck, Sparkles, Leaf, Utensils 
} from "lucide-react";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const { setUser, setIsAuth } = useAppData();

  const responseGoogle = async (authResult) => {
    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login`, {
        code: authResult["code"],
      }, { timeout: 12000 });

      localStorage.setItem("token", result.data.token);
      toast.success(result.data.message);
      setUser(result.data.user);
      setIsAuth(true);
      if (!result.data.user.role) {
        navigate("/select-role");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.log(error);
      toast.error("Problem during Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: () => {
      setLoading(false);
      toast.error("Google sign-in was cancelled or unavailable");
    },
    flow: "auth-code",
  });

  const submitCredentials = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "signup" : "login";
      const payload = mode === "signup" ? form : { email: form.email, password: form.password };
      const { data } = await axios.post(`${authService}/api/auth/${endpoint}`, payload, { timeout: 12000 });
      
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success(data.message || (mode === "signup" ? "Account created!" : "Welcome back!"));
      
      if (!data.user.role) {
        navigate("/select-role");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || 
        (error.code === "ECONNABORTED" ? "Authentication request timed out" : "Login failed. Please check credentials.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Brand Story & Food Image */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-red-600 via-rose-600 to-indigo-900 text-white p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white text-red-600 flex items-center justify-center font-black text-base shadow-sm">
                B
              </div>
              <span className="text-xl font-black tracking-tight text-white">BiteDash</span>
            </Link>
          </div>

          <div className="relative z-10 space-y-4 my-auto py-8">
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
              <Leaf className="w-3.5 h-3.5 text-emerald-300" /> Save Money, Stop Waste
            </span>
            <h2 className="text-3xl font-black leading-tight">
              Delicious Dining, <br />
              Delivered Faster.
            </h2>
            <p className="text-rose-100 text-xs leading-relaxed max-w-sm">
              Join thousands enjoying chef-crafted restaurants, AI-powered order tracking, and exclusive surplus meals rescued fresh daily.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4 text-[11px] font-bold text-rose-200 border-t border-white/15 pt-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-amber-300" /> Secure Login
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-300" /> Instant Deals
            </span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {mode === "signup" ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {mode === "signup" 
                  ? "Sign up to track orders, save favorites & claim surplus meals" 
                  : "Sign in to access your orders, cart & addresses"}
              </p>
            </div>

            {/* Mode Toggle Pills */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                New Customer
              </button>
            </div>

            {/* Credentials Form */}
            <form onSubmit={submitCredentials} className="space-y-3.5">
              {mode === "signup" && (
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Password (8+ characters)"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {loading ? "Verifying..." : mode === "signup" ? "Create BiteDash Account" : "Sign In"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium">or continue with</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={googleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              <FcGoogle size={18} />
              <span>Continue with Google</span>
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 pt-6">
            By continuing, you agree to BiteDash's{" "}
            <span className="text-red-600 font-semibold cursor-pointer">Terms</span> &amp;{" "}
            <span className="text-red-600 font-semibold cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
