import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  CreditCard, Banknote, ShieldCheck, MapPin, 
  Plus, CheckCircle2, ChevronRight, Store, ArrowLeft, Loader2, Sparkles 
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const Checkout = () => {
  const { cart, subTotal, quauntity } = useAppData();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setselectedAddressId] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(true);

  const [selectedPayment, setSelectedPayment] = useState("stripe"); // 'stripe' | 'razorpay' | 'cod'
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [loadingCOD, setLoadingCOD] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(
          `${restaurantService}/api/address/all`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        const addrList = data || [];
        setAddresses(addrList);
        if (addrList.length > 0) {
          setselectedAddressId(addrList[0]._id);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center bg-white p-8 rounded-3xl border border-slate-200/70 shadow-xs max-w-sm">
          <p className="text-slate-500 text-sm font-medium mb-4">Your cart is currently empty</p>
          <Link to="/" className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md">
            Find Food
          </Link>
        </div>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId;
  const restaurantName = cart[0].item?.restaurantName || "Partner Restaurant";
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;

  const createOrder = async (paymentMethod) => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return null;
    }

    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod,
          addressId: selectedAddressId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create order");
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);
      const order = await createOrder("razorpay");
      if (!order) return;

      const { orderId, amount } = order;
      const { data } = await axios.post(`${utilsService}/api/payment/create`, { orderId });
      const { razorpayOrderId, key } = data;

      const options = {
        key,
        amount: amount * 100,
        currency: "INR",
        name: "BiteDash",
        description: "Food Order Payment",
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });

            toast.success("Payment successful 🎉");
            navigate("/paymentsuccess/" + response.razorpay_payment_id);
          } catch (error) {
            toast.error("Payment verification failed");
          }
        },
        theme: { color: "#E23744" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error("Razorpay initiation failed");
    } finally {
      setLoadingRazorpay(false);
    }
  };

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder("stripe");
      if (!order) return;

      await stripePromise;
      const { data } = await axios.post(`${utilsService}/api/payment/stripe/create`, {
        orderId: order.orderId,
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create Stripe session");
      }
    } catch (error) {
      toast.error("Stripe payment failed to initialize");
    } finally {
      setLoadingStripe(false);
    }
  };

  const payWithCOD = async () => {
    try {
      setLoadingCOD(true);
      const order = await createOrder("cod");
      if (!order) return;
      toast.success("Order placed successfully with Cash on Delivery 🎉");
      navigate(`/order/${order.orderId}`);
    } catch (error) {
      toast.error("Failed to place Cash on Delivery order");
    } finally {
      setLoadingCOD(false);
    }
  };

  const handleProcessPayment = () => {
    if (selectedPayment === "stripe") payWithStripe();
    else if (selectedPayment === "razorpay") payWithRazorpay();
    else if (selectedPayment === "cod") payWithCOD();
  };

  const isProcessing = creatingOrder || loadingStripe || loadingRazorpay || loadingCOD;

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link to="/cart" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Checkout</h1>
            <p className="text-xs text-slate-500 font-medium">Select delivery address and payment method</p>
          </div>
        </div>

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Address & Payment Options */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Delivery Address Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h3 className="font-bold text-base text-slate-900">Delivery Address</h3>
                </div>

                <Link to="/address" className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add Address
                </Link>
              </div>

              {loadingAddress ? (
                <div className="p-4 bg-slate-50 rounded-2xl animate-pulse h-20"></div>
              ) : addresses.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p className="font-semibold">No saved addresses found.</p>
                  <Link
                    to="/address"
                    className="inline-block px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs"
                  >
                    Add Your Delivery Address
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr._id;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => setselectedAddressId(addr._id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? "border-red-600 bg-red-50/40 shadow-xs ring-1 ring-red-600"
                            : "border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? "text-red-600" : "text-slate-400"}`} />
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-slate-900 capitalize block">
                              {addr.addressType || "Home"}
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                              {addr.formattedAddress || addr.address}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? "border-red-600 bg-red-600" : "border-slate-300"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Payment Method Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="font-bold text-base text-slate-900">Payment Option</h3>
              </div>

              <div className="space-y-2.5">
                {/* Stripe / Online Card */}
                <div
                  onClick={() => setSelectedPayment("stripe")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedPayment === "stripe"
                      ? "border-red-600 bg-red-50/40 shadow-xs ring-1 ring-red-600"
                      : "border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Card / NetBanking / Stripe</h4>
                      <p className="text-[11px] text-slate-500">Fast, secure 128-bit encrypted checkout</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPayment === "stripe" ? "border-red-600 bg-red-600" : "border-slate-300"
                  }`}>
                    {selectedPayment === "stripe" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                </div>

                {/* Razorpay Option */}
                <div
                  onClick={() => setSelectedPayment("razorpay")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedPayment === "razorpay"
                      ? "border-red-600 bg-red-50/40 shadow-xs ring-1 ring-red-600"
                      : "border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">UPI / QR Code / Razorpay</h4>
                      <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm, or UPI ID</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPayment === "razorpay" ? "border-red-600 bg-red-600" : "border-slate-300"
                  }`}>
                    {selectedPayment === "razorpay" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                </div>

                {/* Cash on Delivery (COD) */}
                <div
                  onClick={() => setSelectedPayment("cod")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedPayment === "cod"
                      ? "border-red-600 bg-red-50/40 shadow-xs ring-1 ring-red-600"
                      : "border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Cash on Delivery</h4>
                      <p className="text-[11px] text-slate-500">Pay cash or UPI directly to rider upon arrival</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPayment === "cod" ? "border-red-600 bg-red-600" : "border-slate-300"
                  }`}>
                    {selectedPayment === "cod" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Items Summary & Payment Button */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              
              {/* Restaurant Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{restaurantName}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">BiteDash Express Delivery</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {cart.map((c) => (
                  <div key={c._id} className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[200px]">
                      {c.item?.name} × {c.quauntity}
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{(c.item?.price || 0) * c.quauntity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span className="font-bold text-slate-900">₹{subTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  <span className="font-bold text-slate-900">
                    {deliveryFee === 0 ? <span className="text-emerald-600 uppercase text-[10px]">Free</span> : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-bold text-slate-900">₹{platformFee}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline text-sm">
                  <span className="font-black text-slate-900">Grand Total</span>
                  <span className="text-2xl font-black text-slate-900">₹{grandTotal}</span>
                </div>
              </div>

              {/* Confirm & Pay Button */}
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing || !selectedAddressId}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Place Order (₹{grandTotal})</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected by BiteDash Safe Delivery Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
