(function () {
  const container = document.getElementById("listingMapPicker");
  if (!container || typeof L === "undefined") return;

  const addressInput = document.getElementById("address");
  const cityInput = document.getElementById("location");
  const countryInput = document.getElementById("country");
  const latInput = document.getElementById("listingLatitude");
  const lngInput = document.getElementById("listingLongitude");
  const searchBtn = document.getElementById("mapSearchBtn");
  const statusEl = document.getElementById("mapPickerStatus");
  const form = container.closest("form");

  const initialLat = parseFloat(container.dataset.lat);
  const initialLng = parseFloat(container.dataset.lng);
  const defaultLat = parseFloat(container.dataset.defaultLat) || 20.5937;
  const defaultLng = parseFloat(container.dataset.defaultLng) || 78.9629;

  const startLat = !isNaN(initialLat) ? initialLat : defaultLat;
  const startLng = !isNaN(initialLng) ? initialLng : defaultLng;
  const startZoom = !isNaN(initialLat) ? 15 : 5;

  const map = L.map("listingMap").setView([startLat, startLng], startZoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  let marker = null;

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `small mt-2 map-picker-status text-${type || "muted"}`;
  }

  function setCoordinates(lat, lng) {
    latInput.value = Number(lat).toFixed(6);
    lngInput.value = Number(lng).toFixed(6);
    setStatus("Location selected on map.", "success");
  }

  function placeMarker(lat, lng, pan) {
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", function () {
        const pos = marker.getLatLng();
        setCoordinates(pos.lat, pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });
    }
    if (pan) {
      map.setView([lat, lng], Math.max(map.getZoom(), 15));
    }
    setCoordinates(lat, lng);
  }

  function pickCity(address) {
    return (
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.state_district ||
      ""
    );
  }

  function fillFromNominatim(result) {
    if (!result) return;
    const addr = result.address || {};
    if (result.display_name && addressInput) {
      addressInput.value = result.display_name;
    }
    if (cityInput) {
      cityInput.value = pickCity(addr) || cityInput.value;
    }
    if (countryInput && addr.country) {
      countryInput.value = addr.country;
    }
  }

  let geocodeTimer = null;

  async function nominatimFetch(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Location service unavailable");
    return response.json();
  }

  async function forwardGeocode(query) {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
      encodeURIComponent(query);
    const results = await nominatimFetch(url);
    if (!Array.isArray(results) || !results.length) {
      throw new Error("Address not found. Try a more complete address.");
    }
    return results[0];
  }

  async function reverseGeocode(lat, lng) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const result = await nominatimFetch(url);
      fillFromNominatim(result);
    } catch (err) {
      console.warn("Reverse geocode:", err);
    }
  }

  async function searchAddress() {
    const query = [addressInput?.value, cityInput?.value, countryInput?.value]
      .filter(Boolean)
      .join(", ");
    if (!query.trim()) {
      setStatus("Type an address or city first, then search.", "warning");
      return;
    }
    setStatus("Searching…", "muted");
    searchBtn.disabled = true;
    try {
      const place = await forwardGeocode(query);
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      placeMarker(lat, lng, true);
      fillFromNominatim(place);
      setStatus("Found! You can drag the pin to fine-tune.", "success");
    } catch (err) {
      setStatus(err.message || "Could not find that address.", "danger");
    } finally {
      searchBtn.disabled = false;
    }
  }

  map.on("click", function (e) {
    placeMarker(e.latlng.lat, e.latlng.lng, false);
    reverseGeocode(e.latlng.lat, e.latlng.lng);
  });

  if (searchBtn) {
    searchBtn.addEventListener("click", function (e) {
      e.preventDefault();
      searchAddress();
    });
  }

  if (addressInput) {
    addressInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchAddress();
      }
    });
  }

  function scheduleSearchFromFields() {
    clearTimeout(geocodeTimer);
    geocodeTimer = setTimeout(() => {
      const q = [addressInput?.value, cityInput?.value, countryInput?.value]
        .filter((v) => v && v.length > 2)
        .join(", ");
      if (q.length > 8) searchAddress();
    }, 1200);
  }

  [addressInput, cityInput, countryInput].forEach((el) => {
    if (el) el.addEventListener("input", scheduleSearchFromFields);
  });

  if (!isNaN(initialLat) && !isNaN(initialLng)) {
    placeMarker(initialLat, initialLng, false);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      if (!latInput.value || !lngInput.value) {
        e.preventDefault();
        e.stopPropagation();
        setStatus("Please click the map or use “Find on map” to set the hotel location.", "danger");
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  setTimeout(() => map.invalidateSize(), 200);
})();
