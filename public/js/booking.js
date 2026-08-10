document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  const checkInInput = document.getElementById("checkIn");
  const checkOutInput = document.getElementById("checkOut");
  const nightsInput = document.getElementById("nightsCount");
  const roomsInput = document.getElementById("roomsCount");
  const adultsInput = document.getElementById("adultsCount");
  const childrenInput = document.getElementById("childrenCount");
  const totalGuestsInput = document.getElementById("totalGuests");
  const bookingAmount = document.getElementById("bookingAmount");
  const bookingError = document.getElementById("bookingError");
  const bookingSuccess = document.getElementById("bookingSuccess");
  const bookingSubmitBtn = document.getElementById("bookingSubmitBtn");
  const listingPriceInput = document.getElementById("bookingPrice");
  const listingIdInput = document.getElementById("bookingListingId");

  if (!bookingForm || !checkInInput || !checkOutInput) {
    return;
  }

  const pricePerNight = Number(listingPriceInput?.value || "0");
  const listingId = listingIdInput?.value;

  // Store current booking details for payment
  window.currentBookingData = {};

  const formatDate = (date) => date.toISOString().split("T")[0];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  checkInInput.min = formatDate(today);
  checkOutInput.min = formatDate(tomorrow);
  if (!checkInInput.value) {
    checkInInput.value = formatDate(today);
  }
  if (!checkOutInput.value) {
    checkOutInput.value = formatDate(tomorrow);
  }

  const updateBookingSummary = () => {
    const checkInDate = new Date(checkInInput.value);
    const checkOutDate = new Date(checkOutInput.value);
    const rooms = Number(roomsInput.value) || 1;
    const adults = Number(adultsInput.value) || 1;
    const children = Number(childrenInput.value) || 0;

    if (!isNaN(checkInDate)) {
      const minCheckOut = new Date(checkInDate);
      minCheckOut.setDate(minCheckOut.getDate() + 1);
      checkOutInput.min = formatDate(minCheckOut);
      if (new Date(checkOutInput.value) <= checkInDate) {
        checkOutInput.value = formatDate(minCheckOut);
      }
    }

    let nights = Math.ceil((new Date(checkOutInput.value) - new Date(checkInInput.value)) / (1000 * 60 * 60 * 24));
    if (isNaN(nights) || nights < 1) nights = 1;
    nightsInput.value = nights;

    const totalGuests = adults + children;
    totalGuestsInput.value = `${adults} adult${adults !== 1 ? "s" : ""}, ${children} child${children !== 1 ? "ren" : ""}`;
    bookingAmount.textContent = `₹${(pricePerNight * nights * rooms).toLocaleString("en-in")}`;
  };

  const showError = (message) => {
    if (!bookingError) return;
    bookingError.textContent = message;
    bookingError.classList.remove("d-none");
    bookingSuccess.classList.add("d-none");
  };

  const showSuccess = (message) => {
    if (!bookingSuccess) return;
    bookingSuccess.textContent = message;
    bookingSuccess.classList.remove("d-none");
    bookingError.classList.add("d-none");
  };

  [checkInInput, checkOutInput, roomsInput, adultsInput, childrenInput].forEach((input) => {
    input.addEventListener("input", updateBookingSummary);
    input.addEventListener("change", updateBookingSummary);
  });

  updateBookingSummary();

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    bookingForm.classList.add("was-validated");

    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const rooms = roomsInput.value;
    const adults = adultsInput.value;
    const children = childrenInput.value;

    if (!bookingForm.checkValidity()) {
      showError("Please fill in all required booking details.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      showError("Check-out date must be after check-in date.");
      return;
    }

    if (!listingId) {
      showError("Unable to find the listing. Please reload the page.");
      return;
    }

    // Calculate nights and amount
    let nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (isNaN(nights) || nights < 1) nights = 1;
    const totalAmount = pricePerNight * nights * Number(rooms);

    // Store booking data for payment
    window.currentBookingData = {
      listingId,
      checkIn,
      checkOut,
      rooms: Number(rooms),
      adults: Number(adults),
      children: Number(children),
      nights,
      amount: totalAmount
    };

    // Update payment modal with booking details
    document.getElementById("paymentCheckIn").textContent = checkIn;
    document.getElementById("paymentCheckOut").textContent = checkOut;
    document.getElementById("paymentRoomsNights").textContent = `${rooms} room${rooms > 1 ? "s" : ""} × ${nights} night${nights > 1 ? "s" : ""}`;
    document.getElementById("paymentAmount").textContent = `₹${totalAmount.toLocaleString("en-in")}`;
    document.getElementById("paymentButtonAmount").textContent = `₹${totalAmount.toLocaleString("en-in")}`;

    // Hide booking modal and show payment modal
    const bookingModal = bootstrap.Modal.getInstance(document.getElementById("bookingModal"));
    const paymentModal = new bootstrap.Modal(document.getElementById("paymentModal"));
    
    if (bookingModal) {
      bookingModal.hide();
    }
    
    setTimeout(() => {
      paymentModal.show();
    }, 300);
  });

  // Back button in payment modal returns to booking modal
  const paymentBackBtn = document.getElementById("paymentBackBtn");
  if (paymentBackBtn) {
    paymentBackBtn.addEventListener("click", () => {
      const paymentModal = bootstrap.Modal.getInstance(document.getElementById("paymentModal"));
      const bookingModal = new bootstrap.Modal(document.getElementById("bookingModal"));
      
      if (paymentModal) {
        paymentModal.hide();
      }
      
      setTimeout(() => {
        bookingModal.show();
      }, 300);
    });
  }
});