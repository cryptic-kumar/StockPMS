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
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
      },
    );

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

      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier,
      );
      setConfirmationResult(confirmation);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError("Failed to send SMS. Ensure number is valid and check console.");

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
        minHeight: "100vh",
        backgroundColor: "var(--bg-app)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          padding: "clamp(24px, 5vw, 40px)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-light)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: "24px",
              fontWeight: "700",
              color: "var(--text-main)",
            }}
          >
            SPMS Enterprise
          </h2>
          <p
            style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}
          >
            Sign in to your trading terminal
          </p>
        </div>

        {/* TEST CREDENTIALS HINT */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px dashed #bbf7d0",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--success)",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            🧪 Test Credentials
          </span>
          <div
            style={{
              fontSize: "14px",
              color: "var(--text-main)",
              fontWeight: "500",
              display: "flex",
              justifyContent: "space-around",
            }}
          >
            <span>
              <strong>Phone:</strong> 9999999999
            </span>
            <span>
              <strong>OTP:</strong> 123456
            </span>
          </div>
        </div>

        {/* Invisible Div required for Firebase Recaptcha */}
        <div id="recaptcha-container"></div>

        {error && (
          <p
            style={{
              backgroundColor: "#fef2f2",
              color: "var(--danger)",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "13px",
              border: "1px solid #fecaca",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* STEP 1: PHONE INPUT */}
        {step === 1 && (
          <form
            onSubmit={handleRequestOTP}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <input
              type="tel"
              placeholder="Mobile Number (e.g. 9876543210)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "15px",
                backgroundColor: "var(--bg-app)",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "var(--shadow-sm)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Securing connection..." : "Send Secure OTP"}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 2 && (
          <form
            onSubmit={handleVerifyOTP}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: 0,
                textAlign: "center",
              }}
            >
              Enter the 6-digit OTP sent to {phoneNumber}.
            </p>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "24px",
                letterSpacing: "8px",
                textAlign: "center",
                fontWeight: "700",
                backgroundColor: "var(--bg-app)",
              }}
              maxLength="6"
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "var(--success)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "15px",
                boxShadow: "var(--shadow-sm)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
                setOtp("");
              }}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "transparent",
                color: "var(--text-muted)",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                marginTop: "4px",
              }}
            >
              ← Change mobile number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
