import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash } from "react-icons/bi";
import { useAppData } from "../context/AppContext";

// Fix leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Click-to-select location
const LocationPicker = ({ setLocation }) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Locate me button with safe permission handling
const LocateMeButton = ({ onLocate }) => {
  const map = useMap();
  const { location, requestLocation, permissionStatus } = useAppData();
  const [locating, setLocating] = useState(false);

  const locateUser = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    if (permissionStatus === "denied") {
      toast.error(
        "Location permission is blocked. Please enable it in browser settings or click on the map directly."
      );
      return;
    }

    setLocating(true);
    try {
      const coords = await requestLocation(true);
      if (coords?.latitude && coords?.longitude) {
        map.flyTo([coords.latitude, coords.longitude], 16, { animate: true });
        onLocate(coords.latitude, coords.longitude);
        toast.success("Location updated");
      }
    } catch {
      toast.error("Could not determine your exact position");
    } finally {
      setLocating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={locateUser}
      disabled={locating}
      className="absolute right-3 top-3 z-1000 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100 disabled:opacity-50"
    >
      <LuLocateFixed size={16} className={locating ? "animate-spin text-red-500" : "text-gray-700"} />
      {locating ? "Locating..." : "Use current location"}
    </button>
  );
};

const AddAddressPage = () => {
  const { location } = useAppData();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [mobile, setMobile] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Reverse geocoding
  const fetchFormattedAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();
      setFormattedAddress(data.display_name || "");
    } catch {
      toast.error("Failed to fetch address details");
    }
  };

  const setLocation = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchFormattedAddress(lat, lng);
  };

  // Fetch addresses
  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAddresses(data || []);
    } catch {
      toast.error("Failed to load saved addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Add address
  const addAddress = async () => {
    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length !== 10 || !/^\d{10}$/.test(cleanMobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!formattedAddress || latitude === null || longitude === null) {
      toast.error("Please click on the map or use current location to set your address");
      return;
    }

    try {
      setAdding(true);
      await axios.post(
        `${restaurantService}/api/address/new`,
        {
          formattedAddress,
          mobile: cleanMobile,
          latitude,
          longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success("Address saved successfully");
      setMobile("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);
      fetchAddresses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save address");
    } finally {
      setAdding(false);
    }
  };

  // Delete address
  const deleteAddress = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      setDeletingId(id);
      await axios.delete(`${restaurantService}/api/address/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  const defaultCenter = [
    latitude || location?.latitude || 19.076,
    longitude || location?.longitude || 72.8777,
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Select Delivery Address</h1>
      
      {/* Map */}
      <div className="relative h-96 w-full overflow-hidden rounded-xl border border-gray-200 shadow-xs">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationPicker setLocation={setLocation} />
          <LocateMeButton onLocate={setLocation} />
          {latitude && longitude && <Marker position={[latitude, longitude]} />}
        </MapContainer>
      </div>

      {/* Selected address banner */}
      {formattedAddress && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 flex items-center gap-2">
          <span>📍</span>
          <span className="font-medium">{formattedAddress}</span>
        </div>
      )}

      {/* Mobile input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Contact Phone Number (10 Digits)
        </label>
        <input
          type="tel"
          maxLength={10}
          placeholder="e.g. 9876543210"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#E23744]"
        />
      </div>

      {/* Save Button */}
      <button
        disabled={adding}
        onClick={addAddress}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#E23744] px-6 py-3 font-semibold text-white hover:bg-[#d32f3a] transition disabled:opacity-50 cursor-pointer shadow-sm w-full sm:w-auto"
      >
        {adding ? <BiLoader className="animate-spin text-lg" /> : <BiPlus size={18} />}
        Save Address
      </button>

      {/* Saved Addresses List */}
      <div className="space-y-3 pt-4">
        <h2 className="text-lg font-bold text-gray-900">Saved Addresses</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading saved addresses...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses saved yet. Click on the map above to add one.</p>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr._id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{addr.formattedAddress}</p>
                <p className="text-xs text-gray-500">📞 {addr.mobile}</p>
              </div>
              <button
                onClick={() => deleteAddress(addr._id)}
                disabled={deletingId === addr._id}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 transition cursor-pointer"
                title="Delete address"
              >
                {deletingId === addr._id ? (
                  <BiLoader size={16} className="animate-spin" />
                ) : (
                  <BiTrash size={16} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddAddressPage;
