// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";

// Import our pure OOP classes (The Engine)
import { Portfolio, PortfolioManager } from "../models/Portfolio";
import { TransactionQueue, UndoStack } from "../models/DataStructures";
import { Transaction } from "../models/Transaction";
import { EquityStock } from "../models/Stock";
import { UserAuth } from "../models/UserAuth";
import { MarketDataService } from "../services/MarketDataService";

// Import the React Child Components (The View)
import TradingTerminal from "./TradingTerminal";
import HoldingsTable from "./HoldingsTable";

export default function Dashboard({ user }) {
  const portfolio = useRef(new Portfolio("My Primary Portfolio"));
  const orderQueue = useRef(new TransactionQueue());
  const undoStack = useRef(new UndoStack());

  const [holdings, setHoldings] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [alerts, setAlerts] = useState([]); // New state for Gain/Loss Alerts
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    invested: 0,
    currentValue: 0,
    profitLossPercent: 0,
    riskLevel: "N/A",
  });

  const syncUI = () => {
    const p = portfolio.current;
    const currentStocks = p.getStocks();

    // 1. Check for Gain/Loss Alerts
    const systemAlerts = [];
    currentStocks.forEach((stock) => {
      const alertMsg = PortfolioManager.checkLossAlerts(stock, -5); // Triggers if profit drops to -5%
      if (alertMsg) systemAlerts.push(alertMsg);
    });
    setAlerts(systemAlerts);

    // 2. Serialize data for LocalStorage (including our new transaction history)
    const serializedHoldings = currentStocks.map((stock) => ({
      symbol: stock.symbol,
      companyName: stock.companyName,
      purchasePrice: stock.purchasePrice,
      quantity: stock.quantity,
      currentMarketPrice: stock.currentMarketPrice,
    }));

    const serializedHistory = p.getTransactionHistory();

    if (user) {
      UserAuth.savePortfolio(user.email, {
        holdings: serializedHoldings,
        history: serializedHistory,
      });
    }

    // 3. Update UI State
    setHoldings(currentStocks);
    setTransactionHistory(p.sortTransactionsByDate(true)); // Display newest first
    setMetrics({
      invested: p.calculateTotalInvested(),
      currentValue: p.calculateCurrentValue(),
      profitLossPercent: p.calculateOverallProfitLoss(),
      riskLevel: PortfolioManager.analyzeRiskLevel(p),
    });
    setPendingOrders(orderQueue.current.getQueueState());
  };

  useEffect(() => {
    // --- HYDRATION ---
    if (user) {
      const savedData = UserAuth.getUserPortfolio(user.email);

      if (
        savedData &&
        savedData.holdings &&
        portfolio.current.getStocks().length === 0
      ) {
        savedData.holdings.forEach((data) => {
          const rehydratedStock = new EquityStock(
            data.symbol,
            data.companyName || `${data.symbol} Corp`,
            data.purchasePrice,
            data.quantity,
          );
          rehydratedStock.updateMarketPrice(data.currentMarketPrice);
          portfolio.current.addStock(rehydratedStock);
        });

        // Rehydrate the transaction history
        if (savedData.history) {
          savedData.history.forEach((txn) =>
            portfolio.current.addTransactionRecord(txn),
          );
        }
        syncUI();
      }
    }

    // --- MARKET ENGINE ---
    const marketInterval = setInterval(() => {
      if (!orderQueue.current.isEmpty()) {
        const order = orderQueue.current.dequeue();

        if (order.type === "BUY") {
          const newStock = new EquityStock(
            order.stockSymbol,
            `${order.stockSymbol} Corp`,
            order.price,
            order.quantity,
          );
          portfolio.current.addStock(newStock);

          // NEW: Save the record to the ledger
          portfolio.current.addTransactionRecord(order);

          undoStack.current.push(
            new Transaction(
              order.stockSymbol,
              "SELL",
              order.quantity,
              order.price,
            ),
          );
        } else if (order.type === "SELL") {
          try {
            portfolio.current.sellStock(order.stockSymbol, order.quantity);

            // NEW: Save the record to the ledger
            portfolio.current.addTransactionRecord(order);

            undoStack.current.push(
              new Transaction(
                order.stockSymbol,
                "BUY",
                order.quantity,
                order.price,
              ),
            );
          } catch (error) {
            alert(`Order Failed: ${error.message}`);
          }
        }
        syncUI();
      }
    }, 2000);

    return () => clearInterval(marketInterval);
  }, [user]);

  // ... (handlePlaceOrder, handleUndoLastAction, handleRefreshMarketPrices remain exactly the same) ...
  const handlePlaceOrder = (symbol, type, quantity, price) => {
    const newTxn = new Transaction(symbol, type, quantity, price);
    orderQueue.current.enqueue(newTxn);
    syncUI();
  };

  const handleUndoLastAction = () => {
    if (!undoStack.current.isEmpty()) {
      const inverseTxn = undoStack.current.pop();
      orderQueue.current.enqueue(inverseTxn);
      syncUI();
    }
  };

  const handleRefreshMarketPrices = async () => {
    setIsRefreshing(true);
    const currentStocks = portfolio.current.getStocks();
    for (const stock of currentStocks) {
      try {
        const livePrice = await MarketDataService.getCurrentPrice(stock.symbol);
        stock.updateMarketPrice(livePrice);
      } catch (error) {
        console.error(`Failed to update ${stock.symbol}`);
      }
    }
    syncUI();
    setIsRefreshing(false);
  };

  return (
    <div
      className="dashboard-container"
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        Stock Portfolio Management System
      </h1>

      {/* ALERTS SECTION */}
      {alerts.length > 0 && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "15px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #ffeeba",
          }}
        >
          <strong>⚠️ System Alerts:</strong>
          <ul style={{ margin: "10px 0 0 0", paddingLeft: "20px" }}>
            {alerts.map((alert, index) => (
              <li key={index}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* PORTFOLIO SUMMARY WIDGET */}
      <div
        className="metrics-card"
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          marginBottom: "20px",
          borderRadius: "8px",
          backgroundColor: "#f8f9fa",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>
            Total Invested
          </h4>
          <p style={{ fontSize: "24px", margin: 0, fontWeight: "bold" }}>
            ${metrics.invested.toFixed(2)}
          </p>
        </div>
        <div>
          <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Current Value</h4>
          <p style={{ fontSize: "24px", margin: 0, fontWeight: "bold" }}>
            ${metrics.currentValue.toFixed(2)}
          </p>
        </div>
        <div>
          <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Overall P/L</h4>
          <p
            style={{
              fontSize: "24px",
              margin: 0,
              fontWeight: "bold",
              color: metrics.profitLossPercent >= 0 ? "green" : "red",
            }}
          >
            {metrics.profitLossPercent}%
          </p>
        </div>
        <div>
          <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Risk Level</h4>
          <p style={{ fontSize: "20px", margin: 0 }}>{metrics.riskLevel}</p>
        </div>
      </div>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={handleRefreshMarketPrices}
          disabled={isRefreshing || holdings.length === 0}
          style={{
            padding: "10px 20px",
            backgroundColor:
              isRefreshing || holdings.length === 0 ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              isRefreshing || holdings.length === 0 ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {isRefreshing ? "Fetching Live Data..." : "🔄 Refresh Market Prices"}
        </button>
      </div>

      {/* MAIN DASHBOARD LAYOUT */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
          marginBottom: "30px",
        }}
      >
        <TradingTerminal
          onPlaceOrder={handlePlaceOrder}
          onUndo={handleUndoLastAction}
          pendingOrders={pendingOrders}
          isUndoDisabled={undoStack.current.isEmpty()}
        />
        <HoldingsTable
          holdings={holdings}
          portfolioInstance={portfolio.current}
        />
      </div>

      {/* NEW: TRANSACTION LEDGER */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Transaction Ledger (Sorted by Newest)</h3>
        {transactionHistory.length === 0 ? (
          <p style={{ color: "#666" }}>No transactions executed yet.</p>
        ) : (
          <table
            style={{
              width: "100%",
              textAlign: "left",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "10px" }}>Date & Time</th>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Execution Price</th>
              </tr>
            </thead>
            <tbody>
              {transactionHistory.map((txn) => (
                <tr
                  key={txn.transactionId}
                  style={{ borderBottom: "1px solid #eee" }}
                >
                  <td style={{ padding: "10px" }}>
                    {new Date(txn.date).toLocaleString()}
                  </td>
                  <td style={{ color: "#666", fontSize: "12px" }}>
                    {txn.transactionId}
                  </td>
                  <td
                    style={{
                      fontWeight: "bold",
                      color: txn.type === "BUY" ? "green" : "red",
                    }}
                  >
                    {txn.type}
                  </td>
                  <td style={{ fontWeight: "bold" }}>{txn.stockSymbol}</td>
                  <td>{txn.quantity}</td>
                  <td>${txn.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
