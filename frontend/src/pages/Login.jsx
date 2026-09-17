import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
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
      setLoading(false);
      setUser(result.data.user);
      setIsAuth(true);
      navigate("/");
    } catch (error) {
      console.log(error);
      toast.error("Problem while login");
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
      toast.success(data.message);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || (error.code === "ECONNABORTED" ? "The authentication service took too long to respond" : "Unable to reach the authentication service"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-3xl font-bold text-[#E23774]">
          BiteDash
        </h1>

        <p className="text-center text-sm text-gray-500">{mode === "signup" ? "Create your BiteDash account" : "Log in to continue"}</p>

        <form className="space-y-3" onSubmit={submitCredentials}>
          {mode === "signup" && <input required minLength="2" maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full rounded-xl border border-gray-300 px-4 py-3" />}
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full rounded-xl border border-gray-300 px-4 py-3" />
          <input required type="password" minLength="8" maxLength="128" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (8+ characters)" className="w-full rounded-xl border border-gray-300 px-4 py-3" />
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#E23774] px-4 py-3 font-medium text-white disabled:opacity-60">{loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}</button>
        </form>

        <button type="button" disabled={loading} onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="w-full text-sm text-[#E23774]">{mode === "signup" ? "Already have an account? Log in" : "New to BiteDash? Create an account"}</button>

        <div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />or continue with<span className="h-px flex-1 bg-gray-200" /></div>

        <button
          onClick={googleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          <FcGoogle size={20} />
          {loading ? "Signing in ..." : "Continue with Google"}
        </button>

        <p className="text-center text-xs text-gray-400">
          By continuing, you agree with our{" "}
          <span className="text-[#E23774]">Terms of Service</span> &{" "}
          <span className="text-[#E23774]">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
