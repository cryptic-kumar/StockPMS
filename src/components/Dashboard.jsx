// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";

// Import our pure OOP classes (The Engine)
import { Portfolio, PortfolioManager } from "../models/Portfolio";
import { TransactionQueue, UndoStack } from "../models/DataStructures";
import { Transaction } from "../models/Transaction";
import { EquityStock } from "../models/Stock";
import { UserAuth } from "../models/UserAuth";

// Import the Market Data Service
import { MarketDataService } from "../services/MarketDataService";

// Import the React Child Components (The View)
import TradingTerminal from "./TradingTerminal";
import HoldingsTable from "./HoldingsTable";

export default function Dashboard({ user }) {
  // Notice the user prop here!
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    invested: 0,
    currentValue: 0,
    profitLossPercent: 0,
    riskLevel: "N/A",
  });

  // --------------------------------------------------------
  // 3. THE BRIDGE: Syncing OOP data to React State & LocalStorage
  // --------------------------------------------------------
  const syncUI = () => {
    const p = portfolio.current;
    const currentStocks = p.getStocks();

    // Serialize data to bypass private field (#) restrictions in JSON
    const serializedHoldings = currentStocks.map((stock) => ({
      symbol: stock.symbol,
      companyName: stock.companyName,
      purchasePrice: stock.purchasePrice, // Uses getter
      quantity: stock.quantity, // Uses getter
      currentMarketPrice: stock.currentMarketPrice,
    }));

    // Save it to LocalStorage for this specific user
    if (user) {
      UserAuth.savePortfolio(user.email, serializedHoldings);
    }

    // Update React State
    setHoldings(currentStocks);
    setMetrics({
      invested: p.calculateTotalInvested(),
      currentValue: p.calculateCurrentValue(),
      profitLossPercent: p.calculateOverallProfitLoss(),
      riskLevel: PortfolioManager.analyzeRiskLevel(p),
    });
    setPendingOrders(orderQueue.current.getQueueState());
  };

  // --------------------------------------------------------
  // 4. HYDRATION & MARKET ENGINE
  // --------------------------------------------------------
  useEffect(() => {
    // --- HYDRATION: Load saved data from LocalStorage ---
    if (user) {
      const savedData = UserAuth.getUserPortfolio(user.email);

      // If they have saved data, and the current portfolio memory is empty
      if (
        savedData &&
        savedData.length > 0 &&
        portfolio.current.getStocks().length === 0
      ) {
        savedData.forEach((data) => {
          // Rebuild the OOP class instances from the raw JSON data
          const rehydratedStock = new EquityStock(
            data.symbol,
            data.companyName || `${data.symbol} Corp`,
            data.purchasePrice,
            data.quantity,
          );
          rehydratedStock.updateMarketPrice(data.currentMarketPrice);
          portfolio.current.addStock(rehydratedStock);
        });
        syncUI(); // Force the screen to show the loaded data
      }
    }

    // --- THE MARKET ENGINE ---
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
            console.log(
              `Executed SELL order for ${order.quantity} of ${order.stockSymbol}`,
            );
            undoStack.current.push(
              new Transaction(
                order.stockSymbol,
                "BUY",
                order.quantity,
                order.price,
              ),
            );
          } catch (error) {
            console.error(error.message);
            alert(`Order Failed: ${error.message}`);
          }
        }
        syncUI();
      }
    }, 2000);

    return () => clearInterval(marketInterval);
  }, [user]); // Re-run if the user changes

  // --------------------------------------------------------
  // 5. USER ACTIONS
  // --------------------------------------------------------
  const handlePlaceOrder = (symbol, type, quantity, price) => {
    const newTxn = new Transaction(symbol, type, quantity, price);
    orderQueue.current.enqueue(newTxn);
    syncUI();
  };

  const handleUndoLastAction = () => {
    if (!undoStack.current.isEmpty()) {
      const inverseTxn = undoStack.current.pop();
      orderQueue.current.enqueue(inverseTxn);
      console.log("Undoing last action via inverse transaction:", inverseTxn);
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

      {/* REFRESH MARKET PRICES BUTTON */}
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
