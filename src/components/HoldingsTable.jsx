import React, { useState } from "react";

// Standard formatter for Indian Rupees
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default function HoldingsTable({ holdings, portfolioInstance }) {
  const [sortMethod, setSortMethod] = useState("DEFAULT");

  let displayHoldings = [...holdings];

  if (sortMethod === "PROFIT") {
    displayHoldings = portfolioInstance.sortByHighestProfit();
  } else if (sortMethod === "VALUE") {
    displayHoldings = portfolioInstance.sortByCurrentValue();
  }

  return (
    <div
      style={{
        flex: 2,
        border: "1px solid #ccc",
        padding: "20px",
        borderRadius: "8px",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ margin: 0 }}>Current Holdings</h3>
        <select
          value={sortMethod}
          onChange={(e) => setSortMethod(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        >
          <option value="DEFAULT">Sort: Time Added</option>
          <option value="PROFIT">Sort: Highest Profit</option>
          <option value="VALUE">Sort: Highest Value</option>
        </select>
      </div>

      {displayHoldings.length === 0 ? (
        <p style={{ color: "#888" }}>
          Your portfolio is currently empty. Buy some stocks to get started!
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f8f9fa",
                borderBottom: "2px solid #ddd",
              }}
            >
              <th style={{ padding: "12px" }}>Symbol</th>
              <th style={{ padding: "12px" }}>Shares</th>
              <th style={{ padding: "12px" }}>Avg. Cost</th>
              <th style={{ padding: "12px" }}>Market Price</th>
              <th style={{ padding: "12px" }}>Total Value</th>
              <th style={{ padding: "12px" }}>P/L</th>
            </tr>
          </thead>
          <tbody>
            {displayHoldings.map((stock) => {
              const profitLoss = stock.calculateReturn();
              const isProfit = profitLoss >= 0;
              const totalValue = stock.quantity * stock.currentMarketPrice;

              return (
                <tr
                  key={stock.symbol}
                  style={{ borderBottom: "1px solid #eee" }}
                >
                  <td style={{ padding: "12px", fontWeight: "bold" }}>
                    {stock.symbol}
                  </td>
                  <td style={{ padding: "12px" }}>{stock.quantity}</td>
                  <td style={{ padding: "12px" }}>
                    {formatINR(stock.purchasePrice)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {formatINR(stock.currentMarketPrice)}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>
                    {formatINR(totalValue)}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      color: isProfit ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {isProfit ? "+" : ""}
                    {formatINR(profitLoss)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
