// src/components/AuthScreen.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export default function AuthScreen({ onLoginSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = Phone Input, 2 = OTP Input
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Initialize invisible Recaptcha safely for React
  useEffect(() => {
    // 1. If a verifier already exists (from a hot-reload), clear it out first
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    // 2. Create a fresh verifier attached to the current DOM
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      },
    );

    // 3. Cleanup function: When you log in or the component unmounts, destroy the verifier
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Format number to include country code (defaulting to India +91)
      const formattedPhone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;
      const appVerifier = window.recaptchaVerifier;

      // Sends the real SMS (or uses Test Number if configured in console)
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier,
      );
      setConfirmationResult(confirmation);
      setStep(2); // Move to OTP screen
    } catch (err) {
      console.error(err);
      setError("Failed to send SMS. Ensure number is valid and check console.");

      // If sending fails, reset the captcha so the user can try clicking the button again
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(function (widgetId) {
          window.grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;

      // Pass the unique Firebase User ID to the app
      onLoginSuccess({ uid: user.uid, phone: user.phoneNumber });
    } catch (err) {
      setError("Invalid OTP Code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f4f4f9",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          width: "320px",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Investor Login
        </h2>

        {/* Invisible Div required for Firebase Recaptcha */}
        <div id="recaptcha-container"></div>

        {error && (
          <p
            style={{
              color: "red",
              fontSize: "14px",
              textAlign: "center",
              backgroundColor: "#ffebee",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            {error}
          </p>
        )}

        {/* STEP 1: PHONE INPUT */}
        {step === 1 && (
          <form
            onSubmit={handleRequestOTP}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <p style={{ fontSize: "13px", color: "gray", margin: 0 }}>
              Enter your mobile number to receive an OTP.
            </p>
            <input
              type="tel"
              placeholder="Mobile Number (e.g. 9876543210)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              style={{
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading ? "Sending..." : "Send Secure OTP"}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 2 && (
          <form
            onSubmit={handleVerifyOTP}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "gray",
                margin: 0,
                textAlign: "center",
              }}
            >
              Enter the 6-digit OTP sent to {phoneNumber}.
            </p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                letterSpacing: "4px",
                textAlign: "center",
                fontSize: "20px",
                fontWeight: "bold",
              }}
              maxLength="6"
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px",
                backgroundColor: loading ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
              }}
              style={{
                padding: "8px",
                backgroundColor: "transparent",
                color: "#666",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                textDecoration: "underline",
              }}
            >
              Cancel / Change Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
