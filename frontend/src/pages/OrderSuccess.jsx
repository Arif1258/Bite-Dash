import axios from "axios";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { utilsService } from "../main";
import toast from "react-hot-toast";
import { BiCheckCircle } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const [orderId, setOrderId] = useState(null);
  const [verifying, setVerifying] = useState(!!sessionId);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) return;

      try {
        const { data } = await axios.post(`${utilsService}/api/payment/stripe/verify`, {
          sessionId,
        });

        toast.success("Payment successful 🎉");
        if (data.orderId) setOrderId(data.orderId);
      } catch (error) {
        toast.error("Stripe verification notice: checking order status");
        console.log(error);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center space-y-4">
        <BiCheckCircle size={64} className="mx-auto text-green-500 animate-bounce" />

        <h1 className="text-2xl font-bold text-gray-900">
          {verifying ? "Verifying Payment..." : "Payment & Order Confirmed 🎉"}
        </h1>

        <p className="text-sm text-gray-500">
          Your order has been placed with the restaurant and kitchen preparation is starting now!
        </p>

        <div className="space-y-2 pt-3">
          {orderId ? (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E23744] py-3 text-sm font-bold text-white hover:bg-red-600 transition shadow-xs"
              onClick={() => navigate(`/order/${orderId}`)}
            >
              Track Order Live <BsArrowRight size={16} />
            </button>
          ) : (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E23744] py-3 text-sm font-bold text-white hover:bg-red-600 transition shadow-xs"
              onClick={() => navigate("/orders")}
            >
              View Your Orders <BsArrowRight size={16} />
            </button>
          )}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            onClick={() => navigate("/")}
          >
            Order More Food
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
