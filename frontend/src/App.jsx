import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";
import AISupportChat from "./components/AISupportChat";
import SurplusDeals from "./pages/SurplusDeals";

const App = () => {
  const { user, loading } = useAppData();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-red-500/30 animate-pulse">
          B
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
          Preparing BiteDash...
        </div>
      </div>
    );
  }

  if (user && user.role === "seller") {
    return <Restaurant />;
  }
  if (user && user.role === "rider") {
    return <RiderDashboard />;
  }
  if (user && user.role === "admin") {
    return <Admin />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50/50">
        <Navbar />
        <div className="flex-1">
          <Routes>
            {/* Public Auth */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Public Discovery Routes (Guests can browse freely) */}
            <Route path="/" element={<Home />} />
            <Route path="/surplus-deals" element={<SurplusDeals />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/cart" element={<Cart />} />

            {/* Protected Routes (Checkout, Orders, Account require login) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/order/:id" element={<OrderPage />} />
              <Route path="/ordersuccess" element={<OrderSuccess />} />
              <Route path="/paymentsuccess/:paymentId" element={<PaymentSuccess />} />
              <Route path="/address" element={<AddAddressPage />} />
              <Route path="/select-role" element={<SelectRole />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Routes>
        </div>
        <AISupportChat isFloating={true} />
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
