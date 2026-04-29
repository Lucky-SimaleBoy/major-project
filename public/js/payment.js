// Payment Form Handler
document.addEventListener('DOMContentLoaded', function() {
  // Format card number with spaces
  const cardNumberInput = document.getElementById('cardNumber');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\s+/g, '');
      let formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
      e.target.value = formattedValue;
    });
  }

  // Format expiry date as MM/YY
  const expiryDateInput = document.getElementById('expiryDate');
  if (expiryDateInput) {
    expiryDateInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
    });
  }

  // CVV - only numbers
  const cvvInput = document.getElementById('cvv');
  if (cvvInput) {
    cvvInput.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
  }

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

      // Get form data
      const formData = {
        cardholderName: document.getElementById('cardholderName').value,
        email: document.getElementById('paymentEmail').value,
        cardNumber: document.getElementById('cardNumber').value.replace(/\s+/g, ''),
        expiryDate: document.getElementById('expiryDate').value,
        cvv: document.getElementById('cvv').value,
        billingAddress: document.getElementById('billingAddress').value,
        timestamp: new Date().toISOString()
      };

      // Show loading state
      const originalText = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
      this.disabled = true;

      // Simulate payment processing
      setTimeout(() => {
        // Success message
        showPaymentSuccess(formData);
        
        // Reset form and close modal
        paymentForm.classList.remove('was-validated');
        paymentForm.reset();
        this.innerHTML = originalText;
        this.disabled = false;

        // Close modal after success
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        if (modal) {
          modal.hide();
        }
      }, 2000);
    });
  }
});

// Show payment success notification
function showPaymentSuccess(formData) {
  const successMessage = document.createElement('div');
  successMessage.className = 'alert alert-success alert-dismissible fade show payment-success-alert';
  successMessage.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>
    <strong>Payment Successful!</strong>
    <br>
    <small>Cardholder: ${formData.cardholderName} | Email: ${formData.email}</small>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.insertBefore(successMessage, document.body.firstChild);

  // Auto dismiss after 5 seconds
  setTimeout(() => {
    successMessage.remove();
  }, 5000);
}

// Validate card number using Luhn algorithm (optional)
function validateCardNumber(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Validate email format
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate expiry date
function validateExpiryDate(expiryDate) {
  const [month, year] = expiryDate.split('/');
  if (!month || !year) return false;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;
  
  const expYear = parseInt(year, 10);
  const expMonth = parseInt(month, 10);
  
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
}
