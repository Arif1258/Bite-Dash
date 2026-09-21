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
import ErrorBoundary from "./components/ErrorBoundary";

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
    return (
      <ErrorBoundary title="Restaurant Portal Error" message="Unable to load the restaurant partner portal. Please retry.">
        <Restaurant />
      </ErrorBoundary>
    );
  }
  if (user && user.role === "rider") {
    return (
      <ErrorBoundary title="Delivery Partner Error" message="Unable to load the delivery partner dashboard. Please retry.">
        <RiderDashboard />
      </ErrorBoundary>
    );
  }
  if (user && user.role === "admin") {
    return (
      <ErrorBoundary title="Admin Console Error" message="Unable to load admin console. Please retry.">
        <Admin />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary title="Application Error" message="An unexpected error occurred in the application.">
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50/50">
          <Navbar />
          <div className="flex-1">
            <Routes>
              {/* Public Auth */}
              <Route element={<PublicRoute />}>
                <Route
                  path="/login"
                  element={
                    <ErrorBoundary title="Sign In Error">
                      <Login />
                    </ErrorBoundary>
                  }
                />
              </Route>

              {/* Public Discovery Routes (Guests can browse freely) */}
              <Route
                path="/"
                element={
                  <ErrorBoundary title="Home Page Error">
                    <Home />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/surplus-deals"
                element={
                  <ErrorBoundary title="Surplus Deals Error">
                    <SurplusDeals />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/restaurant/:id"
                element={
                  <ErrorBoundary title="Restaurant Menu Error" message="Unable to display restaurant menu. Please retry.">
                    <RestaurantPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/cart"
                element={
                  <ErrorBoundary title="Unable to load your cart" message="We encountered an unexpected error loading your cart.">
                    <Cart />
                  </ErrorBoundary>
                }
              />

              {/* Protected Routes (Checkout, Orders, Account require login) */}
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/checkout"
                  element={
                    <ErrorBoundary title="Checkout Error" message="Unable to load checkout details. Please retry.">
                      <Checkout />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ErrorBoundary title="Orders History Error">
                      <Orders />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/order/:id"
                  element={
                    <ErrorBoundary title="Order Tracking Error" message="Unable to load order status. Please retry.">
                      <OrderPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/ordersuccess"
                  element={
                    <ErrorBoundary title="Order Success Error">
                      <OrderSuccess />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/paymentsuccess/:paymentId"
                  element={
                    <ErrorBoundary title="Payment Status Error">
                      <PaymentSuccess />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/address"
                  element={
                    <ErrorBoundary title="Address Management Error">
                      <AddAddressPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/select-role"
                  element={
                    <ErrorBoundary title="Role Selection Error">
                      <SelectRole />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ErrorBoundary title="Account Profile Error">
                      <Account />
                    </ErrorBoundary>
                  }
                />
              </Route>
            </Routes>
          </div>
          <AISupportChat isFloating={true} />
          <Footer />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
