// src/components/HoldingsTable.jsx
import React from "react";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default function HoldingsTable({ holdings, portfolioInstance }) {
  if (!portfolioInstance) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border-light)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
          Current Holdings
        </h3>
      </div>

      {holdings.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <p style={{ fontSize: "15px" }}>No stocks in this portfolio yet.</p>
          <p style={{ fontSize: "13px", marginTop: "8px" }}>
            Use the Trading Terminal to place an order.
          </p>
        </div>
      ) : (
        <div
          className="table-container"
          style={{ overflowX: "auto", width: "100%" }}
        >
          <table style={{ minWidth: "600px" }}>
            {" "}
            {/* Forces scroll on tiny phones to prevent data crush */}
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Asset</th>
                <th style={{ textAlign: "right" }}>Shares</th>
                <th style={{ textAlign: "right" }}>Avg Price</th>
                <th style={{ textAlign: "right" }}>LTP</th>
                <th style={{ textAlign: "right" }}>Total Value</th>
                <th style={{ textAlign: "right" }}>P/L (%)</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((stock) => {
                const totalValue = stock.quantity * stock.currentMarketPrice;
                const plData = portfolioInstance.calculateStockProfitLoss(
                  stock.symbol,
                );
                const isProfit = plData.percentage >= 0;

                return (
                  <tr key={stock.symbol}>
                    <td style={{ fontWeight: "600" }}>
                      {stock.symbol}
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          fontWeight: "400",
                          marginTop: "4px",
                        }}
                      >
                        {stock.companyName}
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>
                      {stock.quantity}
                    </td>
                    <td
                      style={{ textAlign: "right", color: "var(--text-muted)" }}
                    >
                      {formatINR(stock.purchasePrice)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>
                      {formatINR(stock.currentMarketPrice)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600" }}>
                      {formatINR(totalValue)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        style={{
                          backgroundColor: isProfit ? "#f0fdf4" : "#fef2f2",
                          color: isProfit ? "var(--success)" : "var(--danger)",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isProfit ? "▲" : "▼"}{" "}
                        {Math.abs(plData.percentage).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
