// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";

// Import pure OOP classes (The Engine)
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

    // A. Check for Gain/Loss Alerts
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

        if (
          savedData &&
          !Array.isArray(savedData) &&
          Object.keys(savedData).length > 0
        ) {
          for (const [pName, pData] of Object.entries(savedData)) {
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
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
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
    csvContent += `Portfolio Report: ${activeTab}\nGenerated On: ${new Date().toLocaleString()}\n\n`;
    csvContent += "--- SUMMARY METRICS ---\n";
    csvContent += `Total Invested,${metrics.invested.toFixed(2)}\nCurrent Value,${metrics.currentValue.toFixed(2)}\nOverall P/L (%),${metrics.profitLossPercent}%\nRisk Level,${metrics.riskLevel}\n\n`;
    csvContent +=
      "--- CURRENT HOLDINGS ---\nSymbol,Shares,Avg Cost,Current Price\n";
    stocks.forEach((stock) => {
      csvContent += `${stock.symbol},${stock.quantity},${stock.purchasePrice.toFixed(2)},${stock.currentMarketPrice.toFixed(2)}\n`;
    });
    csvContent +=
      "\n--- TRANSACTION LEDGER ---\nDate,Type,Symbol,Quantity,Execution Price\n";
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

  // 7. RENDER THE VIEW (Responsive Mobile UI)
  return (
    <div
      style={{
        padding: "clamp(16px, 3vw, 32px) clamp(12px, 2vw, 20px)",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      {/* MULTI-PORTFOLIO TABS UI */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "32px",
          borderBottom: "1px solid var(--border-light)",
          paddingBottom: "20px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            flex: "1 1 auto",
          }}
        >
          {portfolioList.map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor:
                  activeTab === name ? "var(--primary)" : "transparent",
                borderRadius: "20px",
                overflow: "hidden",
                border:
                  activeTab === name ? "none" : "1px solid var(--border-light)",
              }}
            >
              <button
                onClick={() => {
                  setActiveTab(name);
                  syncUI(name);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "transparent",
                  color: activeTab === name ? "white" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </button>
              {name !== "My Primary Portfolio" && (
                <button
                  onClick={() => handleDeletePortfolio(name)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "transparent",
                    color: activeTab === name ? "#cbd5e1" : "var(--text-muted)",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                  title="Delete Portfolio"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            width: "100%",
            maxWidth: "300px",
          }}
        >
          <input
            type="text"
            placeholder="New Portfolio..."
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
              fontSize: "14px",
              minWidth: "120px",
            }}
          />
          <button
            onClick={handleCreatePortfolio}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* ALERTS SECTION */}
      {alerts.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--warning-bg)",
            color: "var(--warning-text)",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "24px",
            border: "1px solid #fcd34d",
            fontSize: "14px",
          }}
        >
          <strong style={{ display: "block", marginBottom: "8px" }}>
            ⚠️ System Alerts ({activeTab})
          </strong>
          <ul style={{ margin: 0, paddingLeft: "24px" }}>
            {alerts.map((alert, index) => (
              <li key={index} style={{ marginBottom: "4px" }}>
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PORTFOLIO SUMMARY WIDGET (Responsive Grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Total Invested",
            value: formatINR(metrics.invested),
            color: "var(--text-main)",
          },
          {
            label: "Current Value",
            value: formatINR(metrics.currentValue),
            color: "var(--text-main)",
          },
          {
            label: "Overall P/L",
            value: `${metrics.profitLossPercent}%`,
            color:
              metrics.profitLossPercent >= 0
                ? "var(--success)"
                : "var(--danger)",
          },
          {
            label: "Risk Level",
            value: metrics.riskLevel,
            color: "var(--primary)",
          },
        ].map((metric, i) => (
          <div
            key={i}
            style={{
              backgroundColor: "var(--bg-card)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid var(--border-light)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h4
              style={{
                margin: "0 0 8px 0",
                color: "var(--text-muted)",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: "600",
              }}
            >
              {metric.label}
            </h4>
            <p
              style={{
                fontSize: "clamp(20px, 4vw, 28px)",
                margin: 0,
                fontWeight: "700",
                color: metric.color,
              }}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginBottom: "32px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleExportCSV}
          style={{
            flex: "1 1 auto",
            maxWidth: "200px",
            padding: "10px 16px",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-main)",
            border: "1px solid var(--border-light)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          📥 Export CSV
        </button>
        <button
          onClick={handleRefreshMarketPrices}
          disabled={isRefreshing || holdings.length === 0}
          style={{
            flex: "1 1 auto",
            maxWidth: "200px",
            padding: "10px 16px",
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
            boxShadow: "var(--shadow-sm)",
            opacity: isRefreshing || holdings.length === 0 ? 0.6 : 1,
          }}
        >
          {isRefreshing ? "Fetching..." : "🔄 Refresh Market"}
        </button>
      </div>

      {/* MAIN DASHBOARD LAYOUT (Fluid Flexbox) */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          marginBottom: "32px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 300px", width: "100%", minWidth: 0 }}>
          <TradingTerminal
            onPlaceOrder={handlePlaceOrder}
            onUndo={handleUndoLastAction}
            pendingOrders={pendingOrders}
            isUndoDisabled={undoStack.current.isEmpty()}
          />
        </div>
        <div style={{ flex: "2 1 500px", width: "100%", minWidth: 0 }}>
          {investor.current && (
            <HoldingsTable
              holdings={holdings}
              portfolioInstance={investor.current.getPortfolio(activeTab)}
            />
          )}
        </div>
      </div>

      {/* TRANSACTION LEDGER */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-light)",
          boxShadow: "var(--shadow-sm)",
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
            Transaction Ledger ({activeTab})
          </h3>
        </div>
        <div
          className="table-container"
          style={{ overflowX: "auto", width: "100%" }}
        >
          {transactionHistory.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ fontSize: "14px" }}>
                No transactions executed in this portfolio yet.
              </p>
            </div>
          ) : (
            <table style={{ minWidth: "600px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Date & Time</th>
                  <th style={{ textAlign: "left" }}>Transaction ID</th>
                  <th style={{ textAlign: "left" }}>Type</th>
                  <th style={{ textAlign: "left" }}>Symbol</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {transactionHistory.map((txn) => (
                  <tr key={txn.transactionId}>
                    <td>{new Date(txn.date).toLocaleString()}</td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "11px" }}
                    >
                      {txn.transactionId}
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor:
                            txn.type === "BUY" ? "#f0fdf4" : "#fef2f2",
                          color:
                            txn.type === "BUY"
                              ? "var(--success)"
                              : "var(--danger)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: "600" }}>{txn.stockSymbol}</td>
                    <td style={{ textAlign: "right" }}>{txn.quantity}</td>
                    <td style={{ textAlign: "right" }}>
                      {formatINR(txn.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
