// src/App.jsx
import React, { useState, useEffect } from "react";

// Import our UI Components
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";

// Import our OOP Authentication Engine
import { UserAuth } from "./models/UserAuth";

export default function App() {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // When the app loads, check localStorage to see if a session is already active
  useEffect(() => {
    const session = UserAuth.getCurrentSession();
    if (session) {
      setUser(session);
    }
    setIsCheckingSession(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    UserAuth.logout();
    setUser(null);
  };

  // Prevent screen flickering while checking localStorage
  if (isCheckingSession) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "100px",
          fontFamily: "Arial",
        }}
      >
        <h2>Loading System Environment...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#eef2f5",
        minHeight: "100vh",
      }}
    >
      {/* Conditional Rendering: Show Dashboard if logged in, else show Login Screen */}
      {user ? (
        <div>
          {/* Global Navigation Bar */}
          <div
            style={{
              backgroundColor: "#1a202c",
              padding: "15px 40px",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "20px",
                letterSpacing: "1px",
              }}
            >
              ProPortfolio<span style={{ color: "#4CAF50" }}>.Sys</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <span style={{ fontSize: "14px", color: "#a0aec0" }}>
                Investor:{" "}
                <strong style={{ color: "white" }}>{user.email}</strong>
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: "#e53e3e",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.target.style.backgroundColor = "#c53030")
                }
                onMouseOut={(e) => (e.target.style.backgroundColor = "#e53e3e")}
              >
                Secure Logout
              </button>
            </div>
          </div>

          {/* Main Dashboard Component Injection */}
          <div
            style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}
          >
            {/* We pass the user object down so the dashboard knows whose data to load */}
            <Dashboard user={user} />
          </div>
        </div>
      ) : (
        <AuthScreen onLoginSuccess={handleLogin} />
      )}
    </div>
  );
}
