import React, { useState } from "react";
import { MarketDataService } from "../services/MarketDataService"; // Import the new service

export default function TradingTerminal({
  onPlaceOrder,
  onUndo,
  pendingOrders,
  isUndoDisabled,
}) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false); // Loading state

  // New function to fetch live data
  const handleFetchLivePrice = async () => {
    if (!symbol) {
      alert("Please enter a symbol first (e.g., AAPL)");
      return;
    }

    setIsLoadingPrice(true);
    try {
      const livePrice = await MarketDataService.getCurrentPrice(symbol);
      setPrice(livePrice); // Auto-fill the input box with the real price
    } catch (error) {
      alert("Could not fetch price. Check symbol or API limit.");
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleSubmit = (type) => {
    if (!symbol || quantity <= 0 || price <= 0) {
      alert("Please enter a valid symbol, positive quantity, and price.");
      return;
    }
    onPlaceOrder(symbol, type, Number(quantity), Number(price));
    setSymbol("");
    setQuantity("");
    setPrice("");
  };

  return (
    <div
      className="trading-terminal"
      style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}
    >
      <h3>Trading Terminal</h3>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <input
          type="text"
          placeholder="Stock Symbol (e.g. AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />

        {/* NEW: Button to trigger the API Call */}
        <button
          onClick={handleFetchLivePrice}
          disabled={isLoadingPrice}
          style={{
            padding: "8px",
            backgroundColor: "#e2e8f0",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
          }}
        >
          {isLoadingPrice ? "Fetching..." : "Get Live Market Price"}
        </button>

        <input
          type="number"
          placeholder="Current Market Price ($)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => handleSubmit("BUY")}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "10px",
            border: "none",
            cursor: "pointer",
            flex: 1,
          }}
        >
          QUEUE BUY
        </button>
        <button
          onClick={() => handleSubmit("SELL")}
          style={{
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px",
            border: "none",
            cursor: "pointer",
            flex: 1,
          }}
        >
          QUEUE SELL
        </button>
      </div>

      {/* ... (Undo and Queue UI remains exactly the same below here) ... */}
    </div>
  );
}
