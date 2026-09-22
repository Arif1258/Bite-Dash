import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import Navbar from "./components/navbar";
import Footer from "./components/Footer";
import { useAppData } from "./context/AppContext";
import AISupportChat from "./components/AISupportChat";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-load page components for optimal bundle splitting and performance
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const SelectRole = lazy(() => import("./pages/SelectRole"));
const Account = lazy(() => import("./pages/Account"));
const Restaurant = lazy(() => import("./pages/Restaurant"));
const RestaurantPage = lazy(() => import("./pages/RestaurantPage"));
const Cart = lazy(() => import("./pages/Cart"));
const AddAddressPage = lazy(() => import("./pages/Address"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const SurplusDeals = lazy(() => import("./pages/SurplusDeals"));

const LoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 py-12">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white text-lg font-black shadow-md animate-pulse">
      B
    </div>
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loading BiteDash...</p>
  </div>
);

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

  return (
    <ErrorBoundary title="Application Error" message="An unexpected error occurred in the application.">
      <BrowserRouter>
        {/* Role-specific portal views */}
        {user?.role === "seller" ? (
          <ErrorBoundary title="Restaurant Portal Error" message="Unable to load the restaurant partner portal. Please retry.">
            <Suspense fallback={<LoadingFallback />}>
              <Restaurant />
            </Suspense>
          </ErrorBoundary>
        ) : user?.role === "rider" ? (
          <ErrorBoundary title="Delivery Partner Error" message="Unable to load the delivery partner dashboard. Please retry.">
            <Suspense fallback={<LoadingFallback />}>
              <RiderDashboard />
            </Suspense>
          </ErrorBoundary>
        ) : user?.role === "admin" ? (
          <ErrorBoundary title="Admin Console Error" message="Unable to load admin console. Please retry.">
            <Suspense fallback={<LoadingFallback />}>
              <Admin />
            </Suspense>
          </ErrorBoundary>
        ) : (
          /* Customer and Guest View */
          <div className="min-h-screen flex flex-col bg-slate-50/50">
            <Navbar />
            <div className="flex-1">
              <Suspense fallback={<LoadingFallback />}>
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

                  {/* Admin fallback for non-admins */}
                  <Route path="/admin" element={<Navigate to={user ? "/" : "/login"} replace />} />

                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
            <AISupportChat isFloating={true} />
            <Footer />
          </div>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
