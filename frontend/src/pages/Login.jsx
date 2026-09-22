import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService, restaurantService, riderService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, 
  ShieldCheck, Sparkles, Leaf, UtensilsCrossed, Bike, Store, MapPin, Phone, CreditCard, Award
} from "lucide-react";

const ROLES = [
  {
    id: "customer",
    backendRole: "customer",
    label: "Customer",
    sublabel: "Order food & track deliveries",
    icon: User,
    badge: "Foodie",
  },
  {
    id: "restaurant",
    backendRole: "seller",
    label: "Restaurant",
    sublabel: "Manage menu & kitchen orders",
    icon: Store,
    badge: "Partner",
  },
  {
    id: "rider",
    backendRole: "rider",
    label: "Rider",
    sublabel: "Deliver orders & earn daily",
    icon: Bike,
    badge: "Delivery",
  },
  {
    id: "admin",
    backendRole: "admin",
    label: "Admin",
    sublabel: "Platform control & system observability",
    icon: ShieldCheck,
    badge: "Console",
  },
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState("customer"); // 'customer' | 'restaurant' | 'rider' | 'admin'
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Restaurant specific fields
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");

  // Rider specific fields
  const [riderPhone, setRiderPhone] = useState("");
  const [riderAadhar, setRiderAadhar] = useState("");
  const [riderDl, setRiderDl] = useState("");

  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const currentRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    if (roleId === "admin") {
      setMode("login");
    }
  };

  const handleGoogleSuccess = async (authResult) => {
    setLoading(true);
    try {
      const result = await axios.post(
        `${authService}/api/auth/login`,
        {
          code: authResult["code"],
          role: currentRoleConfig.backendRole,
        },
        { timeout: 12000 }
      );

      localStorage.setItem("token", result.data.token);
      toast.success(result.data.message || `Welcome to BiteDash ${currentRoleConfig.label}!`);
      setUser(result.data.user);
      setIsAuth(true);

      // Direct to specific role dashboard
      if (result.data.user?.role === "admin") {
        navigate("/admin");
      } else if (result.data.user?.role === "rider") {
        navigate("/rider");
      } else if (result.data.user?.role === "seller") {
        navigate("/restaurant");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.log(error);
      const msg = error.response?.data?.message || "Problem during Google sign-in";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setLoading(false);
      toast.error("Google sign-in was cancelled or unavailable");
    },
    flow: "auth-code",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field validations
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (mode === "signup") {
      if (selectedRole === "customer") {
        if (!name.trim() || name.trim().length < 2) {
          toast.error("Please enter your full name");
          return;
        }
      } else if (selectedRole === "restaurant") {
        if (!name.trim()) {
          toast.error("Please enter the owner's full name");
          return;
        }
        if (!restaurantName.trim()) {
          toast.error("Please enter the restaurant name");
          return;
        }
        if (!restaurantPhone.trim() || !/^\d{10}$/.test(restaurantPhone.trim())) {
          toast.error("Please enter a valid 10-digit restaurant contact number");
          return;
        }
      } else if (selectedRole === "rider") {
        if (!name.trim()) {
          toast.error("Please enter your full name");
          return;
        }
        if (!riderPhone.trim() || !/^\d{10}$/.test(riderPhone.trim())) {
          toast.error("Please enter a valid 10-digit mobile number");
          return;
        }
        if (!riderAadhar.trim() || !/^\d{12}$/.test(riderAadhar.trim())) {
          toast.error("Please enter a valid 12-digit Aadhar number");
          return;
        }
        if (!riderDl.trim() || riderDl.trim().length < 5) {
          toast.error("Please enter a valid Driving License number");
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        // Send selected role to backend for authorization check
        const { data } = await axios.post(
          `${authService}/api/auth/login`,
          {
            email: cleanEmail,
            password,
            role: currentRoleConfig.backendRole,
          },
          { timeout: 12000 }
        );

        localStorage.setItem("token", data.token);
        setUser(data.user);
        setIsAuth(true);
        toast.success(data.message || `Signed in as ${currentRoleConfig.label}`);

        if (data.user?.role === "admin") {
          navigate("/admin");
        } else if (data.user?.role === "rider") {
          navigate("/rider");
        } else if (data.user?.role === "seller") {
          navigate("/restaurant");
        } else {
          navigate("/");
        }
      } else {
        // Signup flow
        const signupPayload = {
          name: name.trim(),
          email: cleanEmail,
          password,
          role: currentRoleConfig.backendRole,
        };

        const { data } = await axios.post(
          `${authService}/api/auth/signup`,
          signupPayload,
          { timeout: 12000 }
        );

        localStorage.setItem("token", data.token);
        setUser(data.user);
        setIsAuth(true);
        toast.success(data.message || `Account created as ${currentRoleConfig.label}!`);

        if (data.user?.role === "admin") {
          navigate("/admin");
        } else if (data.user?.role === "rider") {
          navigate("/rider");
        } else if (data.user?.role === "seller") {
          navigate("/restaurant");
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.log("Auth error:", error);
      const errorMsg =
        error.response?.data?.message ||
        (error.code === "ECONNABORTED"
          ? "Authentication request timed out"
          : "Authentication failed. Please verify your credentials.");
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Side: Role-Aware Brand Hero Panel */}
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-red-600 via-rose-600 to-indigo-950 text-white p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black text-lg shadow-md">
                B
              </div>
              <span className="text-2xl font-black tracking-tight text-white">BiteDash</span>
            </Link>
          </div>

          <div className="relative z-10 space-y-4 my-auto py-8">
            <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Portal: {currentRoleConfig.label} Access</span>
            </div>

            <h2 className="text-3xl font-black leading-tight">
              {selectedRole === "customer" && (
                <>
                  Hungry? <br />
                  Order Fresh, <br />
                  Track Live.
                </>
              )}
              {selectedRole === "restaurant" && (
                <>
                  Grow Your <br />
                  Restaurant <br />
                  With BiteDash.
                </>
              )}
              {selectedRole === "rider" && (
                <>
                  Deliver With Pride. <br />
                  Earn on Every <br />
                  Delivery Run.
                </>
              )}
              {selectedRole === "admin" && (
                <>
                  Platform Control. <br />
                  Monitor Fleet, <br />
                  Audit System.
                </>
              )}
            </h2>

            <p className="text-rose-100 text-xs leading-relaxed max-w-sm">
              {selectedRole === "customer" &&
                "Explore curated restaurants, rescue discounted surplus meals, and track doorstep deliveries with real-time ETA."}
              {selectedRole === "restaurant" &&
                "Manage live kitchen orders, surplus listings, automated dispatch buffers, and smart restaurant demand analytics."}
              {selectedRole === "rider" &&
                "Accept delivery batches, navigate real-time routes, monitor order earnings, and keep your community fed."}
              {selectedRole === "admin" &&
                "Verify restaurants, approve riders, inspect anomaly telemetry, and monitor platform observability in real time."}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] font-bold text-rose-200 border-t border-white/15 pt-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Role-Verified
            </span>
            <span className="flex items-center gap-1">
              <Leaf className="w-4 h-4 text-emerald-300" /> Zero Waste
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-300" /> Instant Auth
            </span>
          </div>
        </div>

        {/* Right Side: Role Selector & Credentials Form */}
        <div className="w-full lg:w-7/12 p-6 sm:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {mode === "signup" ? `Register as ${currentRoleConfig.label}` : `Welcome to BiteDash`}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {mode === "signup"
                  ? `Complete your details to set up your ${currentRoleConfig.label.toLowerCase()} account.`
                  : `Please select your role and sign in to continue.`}
              </p>
            </div>

            {/* 1. SEPARATE AUTHENTICATION ROLES: 4 Clear Tabs */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`relative flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-red-50/80 border-red-500 text-red-600 shadow-sm ring-2 ring-red-500/20"
                          : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition ${
                          isSelected
                            ? "bg-red-600 text-white shadow-md shadow-red-500/30"
                            : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-black tracking-tight">{role.label}</span>
                      <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5 font-medium leading-tight">
                        {role.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 font-medium pt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                <span>{currentRoleConfig.sublabel}</span>
              </p>
            </div>

            {/* Mode Toggle: Sign In vs Sign Up */}
            {selectedRole === "admin" ? (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Admin accounts must be provisioned by a system administrator.</span>
              </div>
            ) : (
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
                  New {currentRoleConfig.label} Registration
                </button>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Role-Specific Sign Up Fields */}
              {mode === "signup" && (
                <>
                  {/* Customer Signup Fields */}
                  {selectedRole === "customer" && (
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Full Name"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  )}

                  {/* Restaurant Signup Fields */}
                  {selectedRole === "restaurant" && (
                    <>
                      <div className="relative">
                        <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          required
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Restaurant / Outlet Name"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Owner / Manager Full Name"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          required
                          type="tel"
                          maxLength={10}
                          value={restaurantPhone}
                          onChange={(e) => setRestaurantPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="Restaurant Contact Number (10 digits)"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          value={restaurantAddress}
                          onChange={(e) => setRestaurantAddress(e.target.value)}
                          placeholder="Restaurant Address / City (Optional)"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    </>
                  )}

                  {/* Rider Signup Fields */}
                  {selectedRole === "rider" && (
                    <>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Rider Full Name"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          required
                          type="tel"
                          maxLength={10}
                          value={riderPhone}
                          onChange={(e) => setRiderPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="Mobile Number (10 digits)"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            required
                            type="text"
                            maxLength={12}
                            value={riderAadhar}
                            onChange={(e) => setRiderAadhar(e.target.value.replace(/\D/g, ""))}
                            placeholder="Aadhar (12 digits)"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                          />
                        </div>
                        <div className="relative">
                          <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            required
                            type="text"
                            value={riderDl}
                            onChange={(e) => setRiderDl(e.target.value.toUpperCase())}
                            placeholder="Driving License No."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Email Address */}
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === "restaurant" ? "Business Email Address" : "Email Address"}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (8+ characters)"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white text-xs rounded-xl outline-none transition placeholder:text-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E23744] hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {loading
                  ? "Authenticating..."
                  : mode === "signup"
                  ? `Register as ${currentRoleConfig.label}`
                  : `Sign In as ${currentRoleConfig.label}`}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Google OAuth (Available for Customer & Partner accounts) */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-medium">or continue with</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={googleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <FcGoogle size={18} />
                <span>Continue as {currentRoleConfig.label} with Google</span>
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 pt-6">
            By continuing, you agree to BiteDash's{" "}
            <span className="text-[#E23744] font-semibold cursor-pointer">Terms</span> &amp;{" "}
            <span className="text-[#E23744] font-semibold cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
