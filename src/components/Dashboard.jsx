// components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";

// Import our pure OOP classes (The Engine)
import { Portfolio, PortfolioManager } from "../models/Portfolio";
import { TransactionQueue, UndoStack } from "../models/DataStructures";
import { Transaction } from "../models/Transaction";
import { EquityStock } from "../models/Stock";

// Import the new Market Data Service
import { MarketDataService } from "../services/MarketDataService";

// Import the React Child Components (The View)
import TradingTerminal from "./TradingTerminal";
import HoldingsTable from "./HoldingsTable";

export default function Dashboard() {
  // --------------------------------------------------------
  // 1. OOP INSTANTIATION (React refs keep these alive between renders)
  // --------------------------------------------------------
  const portfolio = useRef(new Portfolio("My Primary Portfolio"));
  const orderQueue = useRef(new TransactionQueue());
  const undoStack = useRef(new UndoStack());

  // --------------------------------------------------------
  // 2. REACT STATE (Forcing the UI to update when OOP data changes)
  // --------------------------------------------------------
  const [holdings, setHoldings] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // New state for loading button
  const [metrics, setMetrics] = useState({
    invested: 0,
    currentValue: 0,
    profitLossPercent: 0,
    riskLevel: "N/A",
  });

  // --------------------------------------------------------
  // 3. THE BRIDGE: Syncing OOP data to React State
  // --------------------------------------------------------
  const syncUI = () => {
    const p = portfolio.current;
    setHoldings(p.getStocks()); // Gets a safe copy of the array
    setMetrics({
      invested: p.calculateTotalInvested(),
      currentValue: p.calculateCurrentValue(),
      profitLossPercent: p.calculateOverallProfitLoss(),
      riskLevel: PortfolioManager.analyzeRiskLevel(p),
    });
    setPendingOrders(orderQueue.current.getQueueState());
  };

  // --------------------------------------------------------
  // 4. THE MARKET ENGINE (Processing the FIFO Queue)
  // --------------------------------------------------------
  useEffect(() => {
    const marketInterval = setInterval(() => {
      if (!orderQueue.current.isEmpty()) {
        // Dequeue the oldest order (FIFO)
        const order = orderQueue.current.dequeue();

        // Process the transaction
        if (order.type === "BUY") {
          const newStock = new EquityStock(
            order.stockSymbol,
            `${order.stockSymbol} Corp`, // Mock company name
            order.price,
            order.quantity,
          );
          portfolio.current.addStock(newStock);

          // Push inverse action to LIFO Stack for undo functionality
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
            // 1. ACTUALLY deduct the stock from the OOP portfolio
            portfolio.current.sellStock(order.stockSymbol, order.quantity);

            console.log(
              `Executed SELL order for ${order.quantity} of ${order.stockSymbol}`,
            );

            // 2. Push inverse action to LIFO Stack for undo functionality
            undoStack.current.push(
              new Transaction(
                order.stockSymbol,
                "BUY",
                order.quantity,
                order.price,
              ),
            );
          } catch (error) {
            // 3. Handle the error if they try to sell 50 shares but only own 10
            console.error(error.message);
            alert(`Order Failed: ${error.message}`);
          }
        }

        // Update the React UI to reflect the processed order
        syncUI();
      }
    }, 2000); // Processes one order every 2 seconds

    // Cleanup interval if the component unmounts to prevent memory leaks
    return () => clearInterval(marketInterval);
  }, []);

  // --------------------------------------------------------
  // 5. USER ACTIONS
  // --------------------------------------------------------
  const handlePlaceOrder = (symbol, type, quantity, price) => {
    const newTxn = new Transaction(symbol, type, quantity, price);
    orderQueue.current.enqueue(newTxn);
    syncUI(); // Update UI to show the order is pending in the queue
  };

  const handleUndoLastAction = () => {
    if (!undoStack.current.isEmpty()) {
      const inverseTxn = undoStack.current.pop(); // LIFO

      // Re-queue the inverse transaction to execute
      orderQueue.current.enqueue(inverseTxn);
      console.log("Undoing last action via inverse transaction:", inverseTxn);
      syncUI();
    }
  };

  // NEW FUNCTION: Fetch live prices for all owned stocks
  const handleRefreshMarketPrices = async () => {
    setIsRefreshing(true);
    const currentStocks = portfolio.current.getStocks();

    // Loop through every stock you own and fetch the live price
    for (const stock of currentStocks) {
      try {
        const livePrice = await MarketDataService.getCurrentPrice(stock.symbol);

        // Use the encapsulated OOP method you already built!
        stock.updateMarketPrice(livePrice);
      } catch (error) {
        console.error(`Failed to update ${stock.symbol}`);
      }
    }

    // Once all network requests finish, sync the UI to show the new profits/losses
    syncUI();
    setIsRefreshing(false);
  };

  // --------------------------------------------------------
  // 6. RENDER THE VIEW
  // --------------------------------------------------------
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

      {/* NEW: REFRESH MARKET PRICES BUTTON */}
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
            backgroundColor: isRefreshing ? "#ccc" : "#007bff",
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
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
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
    </div>
  );
}
