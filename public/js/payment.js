document.addEventListener("DOMContentLoaded", function () {
  const paymentSubmitBtn = document.getElementById("paymentSubmitBtn");
  const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]');
  const upiSection = document.getElementById("upiSection");
  const cardSection = document.getElementById("cardSection");

  function refreshSections() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    if (selectedMethod === "upi") {
      upiSection.style.display = "block";
      cardSection.style.display = "none";
    } else {
      upiSection.style.display = "none";
      cardSection.style.display = "block";
    }
  }

  paymentMethodInputs.forEach((input) => {
    input.addEventListener("change", refreshSections);
  });

  refreshSections();

  if (!paymentSubmitBtn) {
    return;
  }

  paymentSubmitBtn.addEventListener("click", function (event) {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const paymentForm =
      selectedMethod === "upi" ? document.getElementById("upiForm") : document.getElementById("paymentForm");

    if (!paymentForm.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
      paymentForm.classList.add("was-validated");
      return;
    }

    const bookingData = window.currentBookingData || {};
    const listingId = bookingData.listingId || window.location.pathname.split("/")[2];
    const amount =
      bookingData.amount ||
      parseFloat(document.querySelector(".price-highlight")?.textContent.replace(/[^0-9.]/g, "") || "0");
    const customerName =
      selectedMethod === "upi"
        ? document.getElementById("upiName").value
        : document.getElementById("cardholderName").value;
    const customerEmail =
      selectedMethod === "upi"
        ? document.getElementById("upiEmail").value
        : document.getElementById("paymentEmail").value;
    const customerPhone =
      selectedMethod === "upi"
        ? document.getElementById("upiPhone").value
        : document.getElementById("cardPhone").value;

    if (!listingId || !amount || !customerName || !customerEmail) {
      showPaymentError("Please complete all required details.");
      return;
    }

    const phoneDigits = customerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      showPaymentError("Please enter a valid 10-digit phone number.");
      return;
    }

    const originalText = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Booking...';
    this.disabled = true;

    fetch("/payment/confirm-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        customerName,
        customerEmail,
        customerPhone,
        bookingData
      })
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = data.redirectUrl || "/dashboard";
          return;
        }
        showPaymentError(data.message || "Booking could not be completed.");
        this.innerHTML = originalText;
        this.disabled = false;
      })
      .catch((error) => {
        console.error("Booking error:", error);
        showPaymentError("Something went wrong. Please try again.");
        this.innerHTML = originalText;
        this.disabled = false;
      });
  });
});

function showPaymentError(errorMessage) {
  const errorAlert = document.createElement("div");
  errorAlert.className = "alert alert-danger alert-dismissible fade show payment-error-alert";
  errorAlert.innerHTML = `
    <i class="fas fa-exclamation-circle me-2"></i>
    <strong>Booking failed</strong>
    <br>
    <small>${errorMessage}</small>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  document.body.insertBefore(errorAlert, document.body.firstChild);
  setTimeout(() => {
    if (document.body.contains(errorAlert)) {
      errorAlert.remove();
    }
  }, 5000);
}
