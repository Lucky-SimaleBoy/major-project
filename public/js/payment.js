// Razorpay Payment Handler
document.addEventListener('DOMContentLoaded', function() {
  // Payment Submit Button
  const paymentSubmitBtn = document.getElementById('paymentSubmitBtn');
  if (paymentSubmitBtn) {
    paymentSubmitBtn.addEventListener('click', function(event) {
      const paymentForm = document.getElementById('paymentForm');
      
      // Validate form
      if (!paymentForm.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        paymentForm.classList.add('was-validated');
        return;
      }

      // Get listing ID and price
      const listingId = window.location.pathname.split('/')[2];
      const priceText = document.querySelector('.price-highlight').textContent;
      const amount = parseFloat(priceText.replace(/[^0-9]/g, ''));

      // Get form data
      const customerName = document.getElementById('cardholderName').value;
      const email = document.getElementById('paymentEmail').value;
      const description = `Payment for listing: ${document.querySelector('.card-title').textContent.trim()}`;

      // Show loading state
      const originalText = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
      this.disabled = true;

      // Generate UPI URL
      const upiUrl = `upi://pay?pa=${upiId}&pn=Wanderlust&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;

      // Open UPI app
      window.open(upiUrl, '_blank');

      // Show success message
      alert('Payment initiated. Please complete the payment in your UPI app.');

      // Reset button
      this.innerHTML = originalText;
      this.disabled = false;
      paymentForm.classList.remove('was-validated');
    });
  }
});

// Create Razorpay Order
function createRazorpayOrder(orderData, successCallback, errorCallback) {
  fetch('/payment/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      successCallback(data.orderId);
    } else {
      errorCallback(data.message);
    }
  })
  .catch(error => {
    console.error('Order creation error:', error);
    errorCallback(error.message);
  });
}

// Open Razorpay Checkout
function openRazorpayCheckout(options) {
  const {
    orderId,
    amount,
    email,
    cardholderName,
    description,
    paymentForm,
    originalText,
    submitBtn
  } = options;

  const razorpayOptions = {
    key: document.querySelector('meta[name="razorpay-key"]').content,
    order_id: orderId,
    amount: amount * 100, // Razorpay expects amount in paise
    currency: 'INR',
    name: 'Wanderlust',
    description: description,
    customer_id: email,
    prefill: {
      name: cardholderName,
      email: email,
      contact: ''
    },
    notes: {
      description: description
    },
    theme: {
      color: '#6366f1'
    },
    method: {
      card: false,
      netbanking: false,
      wallet: false,
      upi: true
    },
    handler: function(response) {
      // Verify payment
      verifyRazorpayPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        amount: amount
      }, paymentForm, originalText, submitBtn);
    },
    modal: {
      ondismiss: function() {
        showPaymentError('Payment cancelled. Please try again.');
        paymentForm.classList.remove('was-validated');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }
  };

  const rzp = new Razorpay(razorpayOptions);
  rzp.open();
}

// Verify Razorpay Payment
function verifyRazorpayPayment(verificationData, paymentForm, originalText, submitBtn) {
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verifying...';

  fetch('/payment/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verificationData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Show success message
      showPaymentSuccess({
        cardholderName: document.getElementById('cardholderName').value,
        email: document.getElementById('paymentEmail').value,
        transactionId: data.transactionId,
        paymentId: data.paymentId,
        amount: data.amount
      });

      // Reset form and close modal
      paymentForm.classList.remove('was-validated');
      paymentForm.reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;

      // Close modal after success
      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        if (modal) {
          modal.hide();
        }
      }, 1500);
    } else {
      showPaymentError(data.message || 'Payment verification failed.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  })
  .catch(error => {
    console.error('Verification error:', error);
    showPaymentError('Payment verification failed. Please contact support.');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  });
}

// Show payment success notification
function showPaymentSuccess(formData) {
  const successMessage = document.createElement('div');
  successMessage.className = 'alert alert-success alert-dismissible fade show payment-success-alert';
  successMessage.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>
    <strong>Payment Successful!</strong>
    <br>
    <small>
      Transaction ID: <strong>${formData.transactionId}</strong><br>
      Payment ID: <strong>${formData.paymentId}</strong><br>
      Cardholder: ${formData.cardholderName}
    </small>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.insertBefore(successMessage, document.body.firstChild);

  // Auto dismiss after 6 seconds
  setTimeout(() => {
    successMessage.remove();
  }, 6000);
}

// Show payment error notification
function showPaymentError(errorMessage) {
  const errorAlert = document.createElement('div');
  errorAlert.className = 'alert alert-danger alert-dismissible fade show payment-error-alert';
  errorAlert.innerHTML = `
    <i class="fas fa-exclamation-circle me-2"></i>
    <strong>Payment Failed!</strong>
    <br>
    <small>${errorMessage}</small>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.insertBefore(errorAlert, document.body.firstChild);

  // Auto dismiss after 5 seconds
  setTimeout(() => {
    errorAlert.remove();
  }, 5000);
}
