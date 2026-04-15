// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";

// Import our pure OOP classes (The Engine)
import { Investor } from "../models/Investor";
import { PortfolioManager } from "../models/Portfolio";
import { TransactionQueue, UndoStack } from "../models/DataStructures";
import { Transaction } from "../models/Transaction";
import { EquityStock } from "../models/Stock";
import { UserAuth } from "../models/UserAuth";
import { MarketDataService } from "../services/MarketDataService";

// Import the React Child Components (The View)
import TradingTerminal from "./TradingTerminal";
import HoldingsTable from "./HoldingsTable";

// Standard formatter for Indian Rupees
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

export default function Dashboard({ user }) {
  // 1. OOP INSTANTIATION
  const investor = useRef(null);
  const orderQueue = useRef(new TransactionQueue());
  const undoStack = useRef(new UndoStack());

  // Initialize the Investor class once when the user loads (using UID)
  if (!investor.current && user && user.uid) {
    investor.current = new Investor(user.uid, user.phone);
  }

  // 2. REACT STATE
  const [activeTab, setActiveTab] = useState("");
  const [portfolioList, setPortfolioList] = useState([]);
  const [newPortfolioName, setNewPortfolioName] = useState("");

  const [holdings, setHoldings] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    invested: 0,
    currentValue: 0,
    profitLossPercent: 0,
    riskLevel: "N/A",
  });

  // 3. THE BRIDGE: Syncing OOP data to React State & Cloud Database
  const syncUI = (overrideTab = null) => {
    if (!investor.current) return;

    const allPorts = investor.current.getAllPortfolios();
    setPortfolioList(allPorts.map((p) => p.name));

    const currentTab =
      overrideTab ||
      activeTab ||
      (allPorts.length > 0 ? allPorts[0].name : null);
    if (!currentTab) return;

    const activeP = investor.current.getPortfolio(currentTab);
    if (!activeP) return;

    // A. Check for Gain/Loss Alerts on the active portfolio
    const systemAlerts = [];
    activeP.getStocks().forEach((stock) => {
      const alertMsg = PortfolioManager.checkLossAlerts(stock, -5);
      if (alertMsg) systemAlerts.push(alertMsg);
    });
    setAlerts(systemAlerts);

    // B. Serialize ALL portfolios for Firebase Storage
    const serializedData = {};
    allPorts.forEach((p) => {
      serializedData[p.name] = {
        holdings: p.getStocks().map((s) => ({
          symbol: s.symbol,
          companyName: s.companyName,
          purchasePrice: s.purchasePrice,
          quantity: s.quantity,
          currentMarketPrice: s.currentMarketPrice,
        })),
        // Map the custom Transaction class into a plain object so Firebase accepts it
        history: p.getTransactionHistory().map((tx) => ({
          transactionId: tx.transactionId,
          stockSymbol: tx.stockSymbol,
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          date: tx.date,
        })),
      };
    });

    // Send to Firebase Cloud Database (Fire and Forget)
    if (user && user.uid) {
      UserAuth.savePortfolio(user.uid, serializedData);
    }

    // C. Update UI State strictly for the ACTIVE tab
    setHoldings(activeP.getStocks());
    setTransactionHistory(activeP.sortTransactionsByDate(true));
    setMetrics({
      invested: activeP.calculateTotalInvested(),
      currentValue: activeP.calculateCurrentValue(),
      profitLossPercent: activeP.calculateOverallProfitLoss(),
      riskLevel: PortfolioManager.analyzeRiskLevel(activeP),
    });
    setPendingOrders(orderQueue.current.getQueueState());
  };

  // 4. HYDRATION (Load saved data on mount from Firebase)
  useEffect(() => {
    const loadCloudData = async () => {
      if (user && user.uid && investor.current) {
        const savedData = await UserAuth.getUserPortfolio(user.uid);

        // Check if they have multi-portfolio data saved
        if (
          savedData &&
          !Array.isArray(savedData) &&
          Object.keys(savedData).length > 0
        ) {
          for (const [pName, pData] of Object.entries(savedData)) {
            // Check if portfolio exists to prevent React StrictMode double-mounting crash
            let p = investor.current.getPortfolio(pName);

            if (!p) {
              p = investor.current.createPortfolio(pName);

              if (pData.holdings) {
                pData.holdings.forEach((data) => {
                  const rehydratedStock = new EquityStock(
                    data.symbol,
                    data.companyName || `${data.symbol} Corp`,
                    data.purchasePrice,
                    data.quantity,
                  );
                  rehydratedStock.updateMarketPrice(data.currentMarketPrice);
                  p.addStock(rehydratedStock);
                });
              }
              if (pData.history) {
                // Convert plain JSON back into Transaction class objects
                pData.history.forEach((txData) => {
                  const rehydratedTxn = new Transaction(
                    txData.stockSymbol,
                    txData.type,
                    txData.quantity,
                    txData.price,
                  );
                  rehydratedTxn.date = txData.date;
                  rehydratedTxn.transactionId = txData.transactionId;
                  p.addTransactionRecord(rehydratedTxn);
                });
              }
            }
          }
          const firstPortfolioName = Object.keys(savedData)[0];
          setActiveTab(firstPortfolioName);
          syncUI(firstPortfolioName);
        } else {
          // Brand new user: Check if Primary exists before creating
          if (!investor.current.getPortfolio("My Primary Portfolio")) {
            investor.current.createPortfolio("My Primary Portfolio");
          }
          setActiveTab("My Primary Portfolio");
          syncUI("My Primary Portfolio");
        }
      }
    };
    loadCloudData();
  }, [user]);

  // 5. THE MARKET ENGINE (Queue processing)
  useEffect(() => {
    const marketInterval = setInterval(() => {
      if (!orderQueue.current.isEmpty()) {
        const order = orderQueue.current.dequeue();

        const targetP = investor.current.getPortfolio(order.targetPortfolio);

        if (targetP) {
          if (order.type === "BUY") {
            const newStock = new EquityStock(
              order.stockSymbol,
              `${order.stockSymbol} Corp`,
              order.price,
              order.quantity,
            );
            targetP.addStock(newStock);
            targetP.addTransactionRecord(order);

            const inverseTxn = new Transaction(
              order.stockSymbol,
              "SELL",
              order.quantity,
              order.price,
            );
            inverseTxn.targetPortfolio = order.targetPortfolio;
            undoStack.current.push(inverseTxn);
          } else if (order.type === "SELL") {
            try {
              targetP.sellStock(order.stockSymbol, order.quantity);
              targetP.addTransactionRecord(order);

              const inverseTxn = new Transaction(
                order.stockSymbol,
                "BUY",
                order.quantity,
                order.price,
              );
              inverseTxn.targetPortfolio = order.targetPortfolio;
              undoStack.current.push(inverseTxn);
            } catch (error) {
              alert(`Order Failed: ${error.message}`);
            }
          }
        }
        syncUI();
      }
    }, 2000);

    return () => clearInterval(marketInterval);
  }, []);

  // 6. USER ACTIONS
  const handleCreatePortfolio = () => {
    if (!newPortfolioName.trim()) return;
    try {
      investor.current.createPortfolio(newPortfolioName.trim());
      setActiveTab(newPortfolioName.trim());
      setNewPortfolioName("");
      syncUI(newPortfolioName.trim());
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeletePortfolio = (name) => {
    if (name === "My Primary Portfolio") {
      alert("You cannot delete your primary portfolio.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to permanently delete the "${name}" portfolio? All stocks and transaction history will be lost.`,
      )
    ) {
      try {
        investor.current.deletePortfolio(name);
        setActiveTab("My Primary Portfolio");
        syncUI("My Primary Portfolio");
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handlePlaceOrder = (symbol, type, quantity, price) => {
    const newTxn = new Transaction(symbol, type, quantity, price);
    newTxn.targetPortfolio = activeTab;
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
    const activeP = investor.current.getPortfolio(activeTab);
    for (const stock of activeP.getStocks()) {
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

  const handleExportCSV = () => {
    if (!investor.current) return;
    const activeP = investor.current.getPortfolio(activeTab);
    if (!activeP) return;

    const history = activeP.getTransactionHistory();
    const stocks = activeP.getStocks();

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Portfolio Report: ${activeTab}\n`;
    csvContent += `Generated On: ${new Date().toLocaleString()}\n\n`;

    csvContent += "--- SUMMARY METRICS ---\n";
    csvContent += `Total Invested,${metrics.invested.toFixed(2)}\n`;
    csvContent += `Current Value,${metrics.currentValue.toFixed(2)}\n`;
    csvContent += `Overall P/L (%),${metrics.profitLossPercent}%\n`;
    csvContent += `Risk Level,${metrics.riskLevel}\n\n`;

    csvContent += "--- CURRENT HOLDINGS ---\n";
    csvContent += "Symbol,Shares,Avg Cost,Current Price\n";
    stocks.forEach((stock) => {
      csvContent += `${stock.symbol},${stock.quantity},${stock.purchasePrice.toFixed(2)},${stock.currentMarketPrice.toFixed(2)}\n`;
    });
    csvContent += "\n";

    csvContent += "--- TRANSACTION LEDGER ---\n";
    csvContent += "Date,Type,Symbol,Quantity,Execution Price\n";
    history.forEach((txn) => {
      const dateStr = new Date(txn.date).toLocaleString().replace(/,/g, "");
      csvContent += `${dateStr},${txn.type},${txn.stockSymbol},${txn.quantity},${txn.price.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${activeTab.replace(/\s+/g, "_")}_Report.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 7. RENDER THE VIEW
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
      {/* MULTI-PORTFOLIO TABS UI */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "30px",
          borderBottom: "2px solid #ccc",
          paddingBottom: "15px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {portfolioList.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: activeTab === name ? "#1a202c" : "#e2e8f0",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => {
                setActiveTab(name);
                syncUI(name);
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "transparent",
                color: activeTab === name ? "white" : "#1a202c",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {name}
            </button>
            {name !== "My Primary Portfolio" && (
              <button
                onClick={() => handleDeletePortfolio(name)}
                style={{
                  padding: "10px",
                  backgroundColor: "#e53e3e",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                title="Delete Portfolio"
              >
                X
              </button>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <input
            type="text"
            placeholder="New Portfolio Name"
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={handleCreatePortfolio}
            style={{
              padding: "10px 15px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            + Add Portfolio
          </button>
        </div>
      </div>

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
          <strong>⚠️ System Alerts for {activeTab}:</strong>
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
            {formatINR(metrics.invested)}
          </p>
        </div>
        <div>
          <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Current Value</h4>
          <p style={{ fontSize: "24px", margin: 0, fontWeight: "bold" }}>
            {formatINR(metrics.currentValue)}
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
          gap: "10px",
        }}
      >
        <button
          onClick={handleExportCSV}
          style={{
            padding: "10px 20px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📥 Download CSV Report
        </button>
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
        {investor.current && (
          <HoldingsTable
            holdings={holdings}
            portfolioInstance={investor.current.getPortfolio(activeTab)}
          />
        )}
      </div>

      {/* TRANSACTION LEDGER */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Transaction Ledger ({activeTab})</h3>
        {transactionHistory.length === 0 ? (
          <p style={{ color: "#666" }}>
            No transactions executed in this portfolio yet.
          </p>
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
                  <td>{formatINR(txn.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
