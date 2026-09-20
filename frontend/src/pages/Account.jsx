import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut, BiMapPin, BiPackage } from "react-icons/bi";

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();

  const firstLetter = user?.name.charAt(0).toUpperCase();

  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("Logged out successfully");
  };
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-md rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 border-b p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E23744] text-xl font-semibold text-white">
            {firstLetter}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="text-xs font-semibold bg-red-50 text-[#E23744] px-2 py-0.5 rounded-full capitalize mt-1 inline-block">
              {user?.role || "Customer"}
            </span>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50 transition"
            onClick={() => navigate("/orders")}
          >
            <BiPackage className="h-5 w-5 text-[#E23744]" />
            <span className="font-medium">Your Orders</span>
          </div>
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50 transition"
            onClick={() => navigate("/address")}
          >
            <BiMapPin className="h-5 w-5 text-[#E23744]" />
            <span className="font-medium">Addresses</span>
          </div>
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50 transition"
            onClick={() => navigate("/select-role")}
          >
            <span className="text-lg">🔄</span>
            <span className="font-medium">Switch / Choose Role (Customer, Rider, Seller)</span>
          </div>
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50 transition"
            onClick={logoutHandler}
          >
            <BiLogOut className="h-5 w-5 text-[#E23744]" />
            <span className="font-medium">Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
