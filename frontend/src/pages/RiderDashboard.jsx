import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { riderService, restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiUpload, BiLogOut, BiRefresh } from "react-icons/bi";
import audio from "../assets/faaah.mp3";
import RiderOrderRequest from "../components/RiderOrderRequest";
import RiderCurrentOrder from "../components/RiderCurrentOrder";
import RiderOrderMap from "../components/RiderOrderMap";

const RiderDashboard = () => {
  const { user, location, requestLocation, logout } = useAppData();
  const { socket } = useSocket();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [incomingOrders, setIncomingOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);

  // Batching state
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [acceptingBatchId, setAcceptingBatchId] = useState(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef(null);

  const unlockAudio = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setAudioUnlocked(true);
        toast.success("Sound alert ready for new orders");
      }
    } catch (error) {
      toast.error("Tap again to enable sound");
    }
  };

  const logoutHandler = () => {
    logout();
    toast.success("Logged out successfully");
  };

  useEffect(() => {
    if (!socket) return;

    const onOrderAvailable = ({ orderId }) => {
      setIncomingOrders((prev) =>
        prev.includes(orderId) ? prev : [...prev, orderId]
      );

      if (audioUnlocked && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        setIncomingOrders((prev) => prev.filter((id) => id !== orderId));
      }, 10000);
    };

    socket.on("order:available", onOrderAvailable);

    return () => {
      socket.off("order:available", onOrderAvailable);
    };
  }, [socket, audioUnlocked]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${riderService}/api/rider/myprofile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setProfile(data || null);
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "rider") fetchProfile();
    else setLoading(false);
  }, [user]);

  const fetchCurrentOrder = async () => {
    try {
      const { data } = await axios.get(
        `${riderService}/api/rider/order/current`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setCurrentOrder(data.order);
    } catch (error) {
      setCurrentOrder(null);
    }
  };

  useEffect(() => {
    fetchCurrentOrder();
  }, []);

  // Fetch Recommended Batches
  const fetchBatches = async () => {
    if (!profile?.isAvailble || currentOrder) return;
    setLoadingBatches(true);
    try {
      const params = {};
      if (profile?.location?.coordinates) {
        params.riderLng = profile.location.coordinates[0];
        params.riderLat = profile.location.coordinates[1];
      }

      const { data } = await axios.get(`${restaurantService}/api/batch/recommendations`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (data.success) {
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.warn("Failed to fetch batches:", err.message);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (profile?.isAvailble && !currentOrder) {
      fetchBatches();
      const interval = setInterval(fetchBatches, 15000);
      return () => clearInterval(interval);
    }
  }, [profile?.isAvailble, currentOrder]);

  const handleAcceptBatch = async (batch) => {
    if (!batch?.orders || batch.orders.length < 2) return;
    const orderIdA = batch.orders[0].orderId;
    const orderIdB = batch.orders[1].orderId;

    setAcceptingBatchId(batch.batchId);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/batch/accept`,
        {
          orderIdA,
          orderIdB,
          riderName: user.name || profile.name,
          riderPhone: profile.phoneNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message || "Batched delivery accepted!");
      fetchCurrentOrder();
      fetchProfile();
      setBatches([]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to accept batched delivery");
      fetchBatches();
    } finally {
      setAcceptingBatchId(null);
    }
  };

  const toggleAvailiblity = async () => {
    setToggling(true);
    try {
      let coords = location;
      if (!coords || !coords.latitude) {
        coords = await requestLocation();
      }
      const lat = coords?.latitude || 19.076;
      const lng = coords?.longitude || 72.8777;

      await axios.patch(
        `${riderService}/api/rider/toggle`,
        {
          isAvailble: !profile?.isAvailble,
          latitude: lat,
          longitude: lng,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(profile?.isAvailble ? "You are offline" : "You are online");
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle status");
    } finally {
      setToggling(false);
    }
  };

  const [phoneNumber, setPhoneNumber] = useState("");
  const [aadharNumber, setaadharNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const cleanPhone = phoneNumber.trim();
    const cleanAadhar = aadharNumber.trim();
    const cleanDl = drivingLicenseNumber.trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!cleanAadhar || cleanAadhar.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhar number");
      return;
    }
    if (!cleanDl || cleanDl.length < 5) {
      toast.error("Please enter a valid Driving License number");
      return;
    }
    if (!image) {
      toast.error("Please upload your profile photo");
      return;
    }

    setSubmitting(true);
    try {
      let coords = location;
      if (!coords || !coords.latitude) {
        coords = await requestLocation();
      }

      const lat = coords?.latitude || 19.076;
      const lng = coords?.longitude || 72.8777;

      const formData = new FormData();
      formData.append("phoneNumber", cleanPhone);
      formData.append("aadharNumber", cleanAadhar);
      formData.append("drivingLicenseNumber", cleanDl);
      formData.append("latitude", lat.toString());
      formData.append("longitude", lng.toString());
      formData.append("file", image);

      const { data } = await axios.post(`${riderService}/api/rider/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success(data.message || "Rider profile submitted successfully!");
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛵</span>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                BiteDash <span className="text-[#E23744]">Rider Hub</span>
              </h1>
              <p className="text-[11px] text-gray-500">
                {profile?.isAvailble ? "🟢 Online — Ready for Deliveries" : "⚪ Offline"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                axios
                  .put(
                    `${restaurantService}/api/auth/add/role`,
                    { role: "customer" },
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                  )
                  .then(() => window.location.reload())
                  .catch(() => window.location.href = "/select-role");
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-semibold transition"
            >
              Switch Role
            </button>
            <button
              onClick={logoutHandler}
              className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold transition"
            >
              <BiLogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
            Loading rider details...
          </div>
        ) : !profile ? (
          <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
            <h1 className="text-xl font-semibold">Add Your Rider Profile</h1>
            <input
              type="number"
              placeholder="Aadhar number"
              value={aadharNumber}
              onChange={(e) => setaadharNumber(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <input
              type="number"
              placeholder="Contact Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <input
              type="text"
              placeholder="Driving License Number"
              value={drivingLicenseNumber}
              onChange={(e) => setDrivingLicenseNumber(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            />
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
              <BiUpload className="h-5 w-5 text-red-500" />
              {image ? image.name : "Upload your image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>
            <button
              className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#e23744]"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Submit Profile for Approval"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Status Card */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={profile.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                  className="h-16 w-16 rounded-full object-cover border-2 border-red-500"
                  alt=""
                />
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{user?.name}</h2>
                  <p className="text-xs text-gray-500">{profile.phoneNumber}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${profile.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {profile.isVerified ? "✓ Verified Rider" : "⏳ Pending Verification"}
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${profile.isAvailble ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {profile.isAvailble ? "🟢 Online" : "⚪ Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {profile.isVerified && !currentOrder && (
                <button
                  onClick={toggleAvailiblity}
                  disabled={toggling}
                  className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-xs ${
                    toggling ? "bg-gray-400" : profile.isAvailble ? "bg-gray-700 hover:bg-gray-800" : "bg-[#E23744] hover:bg-red-600"
                  }`}
                >
                  {toggling ? "Updating..." : profile.isAvailble ? "Go Offline" : "Go Online"}
                </button>
              )}
            </div>

            {/* Sound Notification Alert */}
            {!audioUnlocked && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <p className="font-bold text-xs text-blue-900">Enable Sound Notification</p>
                    <p className="text-[11px] text-blue-700">Get loud audio alerts when orders arrive</p>
                  </div>
                </div>
                <button
                  onClick={unlockAudio}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Current Active Order */}
            {currentOrder && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800">Current Assigned Delivery</h2>
                  {currentOrder.isBatched && (
                    <span className="bg-purple-100 text-purple-700 border border-purple-200 text-xs px-2.5 py-1 rounded-full font-extrabold flex items-center gap-1">
                      📦 Batched Multi-Stop Route ({currentOrder.batchId || "Active"})
                    </span>
                  )}
                </div>
                <RiderCurrentOrder order={currentOrder} onStatusUpdate={fetchCurrentOrder} />
                <RiderOrderMap order={currentOrder} />
              </div>
            )}

            {/* Incoming Single Orders */}
            {profile.isAvailble && !currentOrder && incomingOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 text-sm">Incoming Dispatch Requests</h3>
                {incomingOrders.map((id) => (
                  <RiderOrderRequest
                    key={id}
                    orderId={id}
                    onAccepted={() => {
                      fetchProfile();
                      fetchCurrentOrder();
                    }}
                  />
                ))}
              </div>
            )}

            {/* ─── Intelligent Route Batching Section ─── */}
            {profile.isAvailble && !currentOrder && (
              <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <span className="text-purple-600 font-extrabold text-base">📦</span>
                      Intelligent Route Batching Opportunities
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Deliver 2 nearby orders together with optimal detour routing and 2x payout!
                    </p>
                  </div>
                  <button
                    onClick={fetchBatches}
                    disabled={loadingBatches}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-bold px-2 py-1 rounded hover:bg-purple-50 transition"
                  >
                    <BiRefresh className={loadingBatches ? "animate-spin" : ""} size={16} />
                    Refresh Batches
                  </button>
                </div>

                {loadingBatches ? (
                  <p className="text-xs text-gray-400 text-center py-6">Calculating optimal routes...</p>
                ) : batches.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-semibold text-gray-600">No batch pairings available right now</p>
                    <p className="mt-1 text-[11px]">
                      Batches are formed automatically when multiple compatible orders arrive in the same cluster.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batches.map((batch) => (
                      <div
                        key={batch.batchId}
                        className="rounded-xl border border-purple-200 bg-purple-50/30 p-4 space-y-3 hover:border-purple-300 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                              {batch.score}% Route Match
                            </span>
                            <span className="text-xs font-bold text-gray-800">{batch.batchId}</span>
                          </div>
                          <span className="text-xs font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            {batch.metrics.distanceSavedKm > 0 ? `${batch.metrics.distanceSavedKm} km saved` : "High Density"}
                          </span>
                        </div>

                        {/* Waypoints sequence */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 space-y-1.5 text-xs">
                          <p className="text-[10px] uppercase font-bold text-gray-400">Optimized Waypoint Sequence:</p>
                          {batch.routeWaypoints.map((wp, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${wp.type === "PICKUP" ? "bg-amber-500" : "bg-green-600"}`}>
                                {wp.step}
                              </span>
                              <span className="font-semibold text-gray-800">{wp.type}:</span>
                              <span className="text-gray-600 truncate">{wp.locationName}</span>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary & Accept Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-purple-100">
                          <div className="text-xs space-y-0.5">
                            <p className="text-gray-600">
                              Orders: <span className="font-bold">#{batch.orders[0]?.shortId}</span> & <span className="font-bold">#{batch.orders[1]?.shortId}</span>
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Est. Total Duration: ~{batch.metrics.estimatedTotalDurationMinutes} mins • Extra customer delay: ~{batch.metrics.additionalDelayMinutes} mins
                            </p>
                          </div>

                          <button
                            onClick={() => handleAcceptBatch(batch)}
                            disabled={acceptingBatchId === batch.batchId}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs disabled:opacity-50"
                          >
                            {acceptingBatchId === batch.batchId ? "Accepting..." : "Accept Batched Route (2 Orders)"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;
