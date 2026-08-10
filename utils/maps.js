async function geocodePlace({ address, location, country, title }) {
  const query = [address, title, location, country].filter(Boolean).join(", ");
  if (!query.trim()) {
    return { ok: false, message: "Location is required." };
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "wanderlust-listing-geocoder/1.0"
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    return { ok: false, message: "Could not verify address. Try again." };
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return { ok: false, message: "Address not found. Use a real street address, city, and country." };
  }

  const place = results[0];
  return {
    ok: true,
    latitude: parseFloat(place.lat),
    longitude: parseFloat(place.lon),
    formattedAddress: place.display_name
  };
}

function buildMapsUrl(listing) {
  if (!listing) {
    return "https://www.google.com/maps";
  }

  if (listing.latitude != null && listing.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;
  }

  const query = [listing.address, listing.title, listing.location, listing.country]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function applyGeocodeToListingData(listingData, geocode) {
  listingData.latitude = geocode.latitude;
  listingData.longitude = geocode.longitude;
  if (!listingData.address?.trim() && geocode.formattedAddress) {
    listingData.address = geocode.formattedAddress;
  }
  return listingData;
}

function parseCoordinates(listingData) {
  const lat = parseFloat(listingData.latitude);
  const lng = parseFloat(listingData.longitude);
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

async function reverseGeocodeCoords(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "wanderlust-listing-geocoder/1.0" },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return null;
  const result = await response.json();
  if (!result || !result.display_name) return null;
  const addr = result.address || {};
  return {
    formattedAddress: result.display_name,
    location:
      addr.city || addr.town || addr.village || addr.suburb || addr.county || "",
    country: addr.country || ""
  };
}

async function resolveListingLocation(listingData) {
  const coords = parseCoordinates(listingData);
  if (coords) {
    const data = { ...listingData, ...coords };
    if (!data.address?.trim() || !data.location?.trim() || !data.country?.trim()) {
      const reversed = await reverseGeocodeCoords(coords.latitude, coords.longitude);
      if (reversed) {
        if (!data.address?.trim()) data.address = reversed.formattedAddress;
        if (!data.location?.trim()) data.location = reversed.location;
        if (!data.country?.trim()) data.country = reversed.country;
      }
    }
    return { ok: true, data };
  }

  const geocode = await geocodePlace({
    address: listingData.address,
    location: listingData.location,
    country: listingData.country,
    title: listingData.title
  });
  if (!geocode.ok) {
    return { ok: false, message: geocode.message };
  }
  return { ok: true, data: applyGeocodeToListingData({ ...listingData }, geocode) };
}

module.exports = {
  geocodePlace,
  buildMapsUrl,
  applyGeocodeToListingData,
  resolveListingLocation
};
