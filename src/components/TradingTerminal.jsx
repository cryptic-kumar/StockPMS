// src/components/TradingTerminal.jsx
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
  const [searchSymbol, setSearchSymbol] = useState("");
  const [livePrice, setLivePrice] = useState(0);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const [orderType, setOrderType] = useState("BUY");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");

  const fetchLivePrice = async (e) => {
    e.preventDefault();
    if (!searchSymbol) return;
    setLoadingPrice(true);
    try {
      const fetchedPrice =
        await MarketDataService.getCurrentPrice(searchSymbol);
      setLivePrice(fetchedPrice);
      setPrice(fetchedPrice);
    } catch (error) {
      alert("Failed to fetch price. Ensure the symbol is correct.");
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!searchSymbol || !price || quantity <= 0) return;
    onPlaceOrder(
      searchSymbol,
      orderType,
      parseInt(quantity, 10),
      parseFloat(price),
    );
    setQuantity(1);
    setPrice("");
    setSearchSymbol("");
    setLivePrice(0);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        padding: "clamp(16px, 3vw, 24px)",
        borderRadius: "12px",
        border: "1px solid var(--border-light)",
        boxShadow: "var(--shadow-sm)",
        width: "100%",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "20px",
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        Trading Terminal
      </h3>

      {/* Live Price Widget */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Symbol (e.g. AAPL)"
          value={searchSymbol}
          onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
          style={{
            flex: "1 1 150px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid var(--border-light)",
            fontSize: "14px",
            width: "100%",
          }}
        />
        <button
          onClick={fetchLivePrice}
          disabled={loadingPrice || !searchSymbol}
          style={{
            flex: "0 1 auto",
            padding: "10px 16px",
            backgroundColor: "var(--bg-app)",
            border: "1px solid var(--border-light)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
            color: "var(--text-main)",
          }}
        >
          {loadingPrice ? "..." : "Quote"}
        </button>
      </div>

      {livePrice > 0 && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "24px",
            border: "1px solid #bbf7d0",
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--success)",
              fontWeight: "600",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Live Market Price
          </span>
          <strong style={{ fontSize: "24px", color: "var(--text-main)" }}>
            {formatINR(livePrice)}
          </strong>
        </div>
      )}

      {/* Order Entry Form (Responsive Grid) */}
      <form
        onSubmit={handleSubmitOrder}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "6px",
                fontWeight: "500",
              }}
            >
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "14px",
              }}
            >
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "6px",
                fontWeight: "500",
              }}
            >
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              fontWeight: "500",
            }}
          >
            Limit Price (₹)
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              fontSize: "14px",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "14px",
            backgroundColor:
              orderType === "BUY" ? "var(--success)" : "var(--danger)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "15px",
            marginTop: "8px",
            boxShadow: "var(--shadow-sm)",
            width: "100%",
          }}
        >
          Execute {orderType} Order
        </button>
      </form>

      {/* Pending Queue & Undo */}
      <div
        style={{
          marginTop: "32px",
          borderTop: "1px solid var(--border-light)",
          paddingTop: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--text-muted)",
              fontWeight: "600",
            }}
          >
            Order Queue: {pendingOrders.length}
          </h4>
          <button
            onClick={onUndo}
            disabled={isUndoDisabled}
            style={{
              padding: "6px 12px",
              backgroundColor: "transparent",
              border: "1px solid var(--border-light)",
              borderRadius: "6px",
              cursor: isUndoDisabled ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--text-main)",
            }}
          >
            ↩ Undo Last
          </button>
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {pendingOrders.map((order) => (
            <div
              key={order.transactionId}
              style={{
                padding: "10px 0",
                borderBottom: "1px dashed var(--border-light)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <strong
                  style={{
                    color:
                      order.type === "BUY" ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {order.type}
                </strong>{" "}
                {order.quantity} {order.stockSymbol}
              </span>
              <span style={{ fontWeight: "500" }}>
                {formatINR(order.price)}
              </span>
            </div>
          ))}
          {pendingOrders.length === 0 && (
            <span style={{ fontStyle: "italic" }}>No pending orders.</span>
          )}
        </div>
      </div>
    </div>
  );
}
