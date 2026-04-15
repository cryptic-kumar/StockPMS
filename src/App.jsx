// src/App.jsx
import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";

// Import Firebase authentication tools
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This Firebase listener automatically checks for active sessions
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, phone: currentUser.phoneNumber });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup the listener when the app unmounts
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: "sans-serif",
        }}
      >
        Loading Secure Session...
      </div>
    );
  }

  return (
    <div>
      {/* Top Navigation Bar */}
      {user && (
        <nav
          style={{
            padding: "15px 20px",
            backgroundColor: "#1a202c",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", letterSpacing: "1px" }}>
            SPMS Enterprise
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
              Logged in: {user.phone}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 15px",
                backgroundColor: "#e53e3e",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Main Routing Logic */}
      {user ? (
        <Dashboard user={user} />
      ) : (
        <AuthScreen onLoginSuccess={(userData) => setUser(userData)} />
      )}
    </div>
  );
}
