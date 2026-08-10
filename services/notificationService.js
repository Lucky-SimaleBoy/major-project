const nodemailer = require("nodemailer");

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function buildReceiptHtml({ customerName, listing, booking, transactionId }) {
  const amount = booking.amount || 0;
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #6366f1;">Wanderlust — Booking Receipt</h2>
      <p>Hi ${customerName},</p>
      <p>Your room is booked. Details are below.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Receipt ID</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${transactionId}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Property</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${listing.title}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Location</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${listing.location || "-"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Check-in</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(booking.checkIn)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Check-out</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(booking.checkOut)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Nights</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.nights}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Rooms</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.rooms}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Guests</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.adults} adults, ${booking.children} children</td></tr>
        <tr><td style="padding: 8px;"><strong>Total</strong></td><td style="padding: 8px;">₹${amount.toLocaleString("en-IN")}</td></tr>
      </table>
      <p style="font-size: 12px; color: #666;">Thank you for booking with Wanderlust.</p>
    </body>
    </html>
  `;
}

function buildSmsText({ customerName, listing, booking, transactionId }) {
  return (
    `Wanderlust Receipt ${transactionId}: Hi ${customerName}, room "${listing.title}" is BOOKED. ` +
    `Check-in ${formatDate(booking.checkIn)}, Check-out ${formatDate(booking.checkOut)}. ` +
    `Rs.${booking.amount || 0}, ${booking.nights} night(s).`
  );
}

function toE164India(phone) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return null;
  return `+91${digits}`;
}

function getEmailTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return { sent: false, reason: "email_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: `"Wanderlust" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return { sent: true };
  } catch (err) {
    console.error("Email failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendFast2Sms(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return null;

  const numbers = phone.replace(/\D/g, "").slice(-10);
  if (numbers.length !== 10) {
    return { sent: false, reason: "invalid_phone" };
  }

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: apiKey
      },
      body: JSON.stringify({
        route: "q",
        message,
        language: "english",
        flash: 0,
        numbers
      })
    });
    const data = await response.json();
    if (data.return === true) {
      return { sent: true, provider: "fast2sms" };
    }
    const reason = data.message || "fast2sms_failed";
    console.error("Fast2SMS error:", data);
    return { sent: false, reason, provider: "fast2sms" };
  } catch (err) {
    console.error("Fast2SMS request failed:", err.message);
    return { sent: false, reason: err.message, provider: "fast2sms" };
  }
}

async function sendWhatsAppCallMeBot(phone, message) {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!apiKey) return null;

  const phoneIntl = toE164India(phone);
  if (!phoneIntl) {
    return { sent: false, reason: "invalid_phone" };
  }

  try {
    const url =
      "https://api.callmebot.com/whatsapp.php?" +
      new URLSearchParams({
        phone: phoneIntl,
        text: message,
        apikey: apiKey
      });

    const response = await fetch(url);
    const body = await response.text();
    const ok =
      body.toLowerCase().includes("queued") ||
      body.toLowerCase().includes("sent") ||
      body.toLowerCase().includes("ok");

    if (ok) {
      return { sent: true, provider: "whatsapp" };
    }
    console.error("CallMeBot WhatsApp error:", body);
    return { sent: false, reason: body.slice(0, 120), provider: "whatsapp" };
  } catch (err) {
    console.error("CallMeBot failed:", err.message);
    return { sent: false, reason: err.message, provider: "whatsapp" };
  }
}

async function sendTwilioSms(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;

  const e164 = toE164India(phone);
  if (!e164) return { sent: false, reason: "invalid_phone" };

  try {
    const twilio = require("twilio")(accountSid, authToken);
    await twilio.messages.create({
      body: message,
      from: fromNumber,
      to: e164
    });
    return { sent: true, provider: "twilio" };
  } catch (err) {
    console.error("Twilio SMS failed:", err.message);
    return { sent: false, reason: err.message, provider: "twilio" };
  }
}

async function sendSms({ phone, message }) {
  if (!phone) {
    return { sent: false, reason: "no_phone" };
  }

  const fast2sms = await sendFast2Sms(phone, message);
  if (fast2sms?.sent) return fast2sms;

  const whatsapp = await sendWhatsAppCallMeBot(phone, message);
  if (whatsapp?.sent) return whatsapp;

  const twilio = await sendTwilioSms(phone, message);
  if (twilio?.sent) return twilio;

  if (fast2sms && !fast2sms.sent) return fast2sms;
  if (whatsapp && !whatsapp.sent) return whatsapp;
  if (twilio && !twilio.sent) return twilio;

  if (!process.env.FAST2SMS_API_KEY && !process.env.CALLMEBOT_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
    return {
      sent: false,
      reason: "Add FAST2SMS_API_KEY, CALLMEBOT_API_KEY (free WhatsApp), or Twilio in .env"
    };
  }

  return { sent: false, reason: "All SMS/WhatsApp providers failed" };
}

function userFriendlySmsError(reason) {
  if (!reason) return null;
  if (reason.includes("100 INR")) {
    return "Fast2SMS needs ₹100+ wallet recharge before SMS works. Use email/WhatsApp options below.";
  }
  return reason;
}

async function sendBookingConfirmation({ customerName, customerEmail, customerPhone, listing, booking, transactionId }) {
  const subject = `Room booked — Receipt ${transactionId}`;
  const html = buildReceiptHtml({ customerName, listing, booking, transactionId });
  const smsText = buildSmsText({ customerName, listing, booking, transactionId });

  const results = { email: null, sms: null };

  if (customerEmail) {
    results.email = await sendEmail({ to: customerEmail, subject, html });
  }

  if (customerPhone) {
    results.sms = await sendSms({ phone: customerPhone, message: smsText });
    results.sms.userMessage = userFriendlySmsError(results.sms.reason);
  }

  return results;
}

module.exports = {
  sendBookingConfirmation,
  buildReceiptHtml,
  buildSmsText
};
