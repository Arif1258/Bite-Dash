import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_FALLBACK_LOCATION = {
  latitude: 19.076,
  longitude: 72.8777,
  formattedAddress: "Mumbai, Maharashtra, India",
  city: "Mumbai",
};

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache validity

export const useLocationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState("prompt"); // 'granted' | 'prompt' | 'denied' | 'unsupported'
  const [location, setLocation] = useState(() => {
    try {
      const cached = localStorage.getItem("bitedash_last_location");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_FALLBACK_LOCATION;
  });
  const [city, setCity] = useState(() => location?.city || "Mumbai");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  const isFetchingRef = useRef(false);

  // Reverse geocoding helper with timeout and fallback
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();

      const cityName =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "Your Location";

      const formatted = data.display_name || "Current Location";

      return { cityName, formatted };
    } catch {
      return { cityName: "Your Location", formatted: "Current Location" };
    }
  };

  // Internal acquire position
  const acquirePosition = useCallback(async () => {
    if (isFetchingRef.current) return location;
    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      return location;
    }

    isFetchingRef.current = true;
    setLoadingLocation(true);
    setPermissionError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const { cityName, formatted } = await reverseGeocode(latitude, longitude);

          const newLocation = {
            latitude,
            longitude,
            formattedAddress: formatted,
            city: cityName,
          };

          setLocation(newLocation);
          setCity(cityName);
          setPermissionStatus("granted");
          setPermissionError(null);
          setLoadingLocation(false);
          isFetchingRef.current = false;

          try {
            localStorage.setItem(
              "bitedash_last_location",
              JSON.stringify({ data: newLocation, timestamp: Date.now() })
            );
          } catch {
            // ignore
          }

          resolve(newLocation);
        },
        (err) => {
          console.warn("Geolocation warning:", err.message);
          isFetchingRef.current = false;
          setLoadingLocation(false);

          if (err.code === err.PERMISSION_DENIED) {
            setPermissionStatus("denied");
            setPermissionError("Location permission denied by user");
          } else if (err.code === err.TIMEOUT) {
            setPermissionError("Location request timed out");
          } else {
            setPermissionError("Unable to retrieve location");
          }

          resolve(location || DEFAULT_FALLBACK_LOCATION);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000, // Accept 5 minute old cache from OS
        }
      );
    });
  }, [location]);

  // Check Permissions API on mount
  useEffect(() => {
    if (!navigator.permissions || !navigator.permissions.query) {
      // Browser does not support Permissions API
      return;
    }

    let isMounted = true;
    let permStatusObj = null;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (!isMounted) return;
        permStatusObj = status;
        setPermissionStatus(status.state);

        // ONLY automatically fetch if permission is ALREADY granted
        if (status.state === "granted") {
          acquirePosition();
        }

        status.onchange = () => {
          if (!isMounted) return;
          setPermissionStatus(status.state);
          if (status.state === "granted") {
            acquirePosition();
          } else if (status.state === "denied") {
            setPermissionError("Location permission is denied in browser settings");
          }
        };
      })
      .catch(() => {
        // Permissions API error, treat gracefully
      });

    return () => {
      isMounted = false;
      if (permStatusObj) {
        permStatusObj.onchange = null;
      }
    };
  }, [acquirePosition]);

  // Explicit user-triggered request (e.g. clicking 'Use current location' or 'Go Online')
  const requestLocation = useCallback(
    async (force = false) => {
      // If we already have fresh coordinates and user didn't explicitly force re-fetch
      if (!force && location && location.latitude !== DEFAULT_FALLBACK_LOCATION.latitude) {
        return location;
      }

      if (permissionStatus === "denied") {
        setPermissionError(
          "Location access is blocked in your browser settings. Please enable it in browser site settings to use auto-location."
        );
        return location;
      }

      return await acquirePosition();
    },
    [location, permissionStatus, acquirePosition]
  );

  return {
    location,
    city,
    loadingLocation,
    permissionStatus,
    permissionError,
    requestLocation,
    setLocation,
  };
};
