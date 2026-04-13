// components/HoldingsTable.jsx
import React, { useState } from "react";

export default function HoldingsTable({ holdings, portfolioInstance }) {
  // Local state to manage how the table is currently sorted
  const [displayHoldings, setDisplayHoldings] = useState(holdings);
  const [sortType, setSortType] = useState("DEFAULT");

  // Sync local state when the parent updates the holdings (e.g., after an order processes)
  React.useEffect(() => {
    setDisplayHoldings(holdings);
    setSortType("DEFAULT");
  }, [holdings]);

  const handleSort = (type) => {
    setSortType(type);
    if (type === "PROFIT") {
      // Calls the pure OOP sorting method
      setDisplayHoldings(portfolioInstance.sortByHighestProfit());
    } else if (type === "VALUE") {
      // Calls the pure OOP sorting method
      setDisplayHoldings(portfolioInstance.sortByCurrentValue());
    } else {
      setDisplayHoldings(holdings);
    }
  };

  return (
    <div
      className="holdings-table"
      style={{
        border: "1px solid #ccc",
        padding: "20px",
        borderRadius: "8px",
        flex: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Current Holdings</h3>

        {/* SORTING CONTROLS */}
        <div>
          <span style={{ marginRight: "10px", fontSize: "14px" }}>
            Sort By:
          </span>
          <button
            onClick={() => handleSort("DEFAULT")}
            disabled={sortType === "DEFAULT"}
          >
            Default
          </button>
          <button
            onClick={() => handleSort("VALUE")}
            disabled={sortType === "VALUE"}
            style={{ margin: "0 5px" }}
          >
            Highest Value
          </button>
          <button
            onClick={() => handleSort("PROFIT")}
            disabled={sortType === "PROFIT"}
          >
            Highest Profit
          </button>
        </div>
      </div>

      {displayHoldings.length === 0 ? (
        <p style={{ color: "#666" }}>
          No stocks in portfolio. Queue a buy order to begin.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            textAlign: "left",
            borderCollapse: "collapse",
            marginTop: "15px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "10px" }}>Symbol</th>
              <th>Quantity</th>
              <th>Avg. Purchase Price</th>
              <th>Current Price</th>
              <th>Total Value</th>
              <th>Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            {displayHoldings.map((stock) => {
              const totalValue = stock.currentMarketPrice * stock.quantity;
              const profit = stock.calculateReturn(); // Polymorphic OOP method

              return (
                <tr
                  key={stock.stockId}
                  style={{ borderBottom: "1px solid #eee" }}
                >
                  <td style={{ padding: "10px", fontWeight: "bold" }}>
                    {stock.symbol}
                  </td>
                  <td>{stock.quantity}</td>
                  <td>${stock.purchasePrice.toFixed(2)}</td>
                  <td>${stock.currentMarketPrice.toFixed(2)}</td>
                  <td>${totalValue.toFixed(2)}</td>
                  <td
                    style={{
                      color: profit >= 0 ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    ${profit.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Top/Worst Performing Asset Identification */}
      {displayHoldings.length > 0 && (
        <div style={{ marginTop: "20px", fontSize: "14px", color: "#555" }}>
          <p>
            <strong>Top Performer:</strong>{" "}
            {portfolioInstance.getTopPerformingAsset()?.symbol}
          </p>
          <p>
            <strong>Worst Performer:</strong>{" "}
            {portfolioInstance.getWorstPerformingAsset()?.symbol}
          </p>
        </div>
      )}
    </div>
  );
}
