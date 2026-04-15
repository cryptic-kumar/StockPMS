import React, { useState } from "react";
import { MarketDataService } from "../services/MarketDataService";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default function TradingTerminal({
  onPlaceOrder,
  onUndo,
  pendingOrders,
  isUndoDisabled,
}) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const handleFetchLivePrice = async () => {
    if (!symbol) {
      alert("Please enter a symbol first (e.g., RELIANCE.NS or AAPL)");
      return;
    }

    setIsLoadingPrice(true);
    try {
      const livePrice = await MarketDataService.getCurrentPrice(symbol);
      setPrice(livePrice);
    } catch (error) {
      alert("Could not fetch price. Check the symbol suffix or API limits.");
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
      style={{
        border: "1px solid #ccc",
        padding: "20px",
        borderRadius: "8px",
        flex: 1,
        backgroundColor: "white",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Trading Terminal</h3>

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
          placeholder="Symbol (e.g., RELIANCE.NS)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={handleFetchLivePrice}
          disabled={isLoadingPrice}
          style={{
            padding: "10px",
            backgroundColor: "#e2e8f0",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {isLoadingPrice ? "Fetching..." : "Get Live Market Price"}
        </button>

        <input
          type="number"
          placeholder="Current Market Price (₹)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => handleSubmit("BUY")}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "10px",
            border: "none",
            cursor: "pointer",
            flex: 1,
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          QUEUE BUY
        </button>
        <button
          onClick={() => handleSubmit("SELL")}
          style={{
            backgroundColor: "#e53e3e",
            color: "white",
            padding: "10px",
            border: "none",
            cursor: "pointer",
            flex: 1,
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          QUEUE SELL
        </button>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: "15px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <h4 style={{ margin: 0 }}>Pending Queue</h4>
          <button
            onClick={onUndo}
            disabled={isUndoDisabled}
            style={{
              padding: "5px 10px",
              backgroundColor: isUndoDisabled ? "#ccc" : "#f6ad55",
              border: "none",
              borderRadius: "4px",
              cursor: isUndoDisabled ? "not-allowed" : "pointer",
            }}
          >
            ↩ Undo Last Action
          </button>
        </div>
        {pendingOrders.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>No orders in queue.</p>
        ) : (
          <ul style={{ paddingLeft: "20px", fontSize: "14px" }}>
            {pendingOrders.map((order, index) => (
              <li key={index}>
                <strong>{order.type}</strong> {order.quantity}{" "}
                {order.stockSymbol} @ {formatINR(order.price)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
