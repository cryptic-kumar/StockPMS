// src/models/Portfolio.js

/**
 * CLASS: Portfolio
 * Manages an array of Stocks and implements sorting algorithms.
 */
export class Portfolio {
  #holdings; // Encapsulated array of Stock objects
  #transactionHistory;

  constructor(portfolioName) {
    this.#transactionHistory = [];
    this.id = `PORT-${Date.now()}`;
    this.name = portfolioName;
    this.#holdings = []; // Linear Data Structure: Array to store stock holdings
  }

  // Add a new stock or update an existing one
  addStock(newStock) {
    // Edge Case Handling: Prevent duplicate stock entries by merging them
    const existingStock = this.#holdings.find(
      (s) => s.symbol === newStock.symbol,
    );

    if (existingStock) {
      // FIX: Use the new OOP method to safely average the price and add quantity
      existingStock.addShares(newStock.quantity, newStock.purchasePrice);
    } else {
      this.#holdings.push(newStock);
    }
  }

  // Deduct shares or remove stock if sold out
  sellStock(symbol, sellQuantity) {
    // Find the stock in our array
    const existingStockIndex = this.#holdings.findIndex(
      (s) => s.symbol === symbol.toUpperCase(),
    );

    // Edge Case: Selling a stock we don't own
    if (existingStockIndex === -1) {
      throw new Error(`Cannot sell ${symbol}. You do not own this stock.`);
    }

    const existingStock = this.#holdings[existingStockIndex];

    // FIX: Use the new OOP method to safely reduce shares
    existingStock.reduceShares(sellQuantity);

    // If we sold all our shares, remove the stock from the portfolio array entirely
    if (existingStock.quantity === 0) {
      this.#holdings.splice(existingStockIndex, 1);
    }
  }

  // Returns a safe copy of the array so the UI cannot mutate it directly
  getStocks() {
    return [...this.#holdings];
  }

  // --- FINANCIAL CALCULATIONS ---

  calculateTotalInvested() {
    return this.#holdings.reduce((total, stock) => {
      return total + stock.purchasePrice * stock.quantity;
    }, 0);
  }

  calculateCurrentValue() {
    return this.#holdings.reduce((total, stock) => {
      return total + stock.currentMarketPrice * stock.quantity;
    }, 0);
  }

  calculateOverallProfitLoss() {
    const invested = this.calculateTotalInvested();
    if (invested === 0) return 0; // Prevent divide-by-zero error

    const currentValue = this.calculateCurrentValue();
    const profitLoss = currentValue - invested;
    return Number(((profitLoss / invested) * 100).toFixed(2)); // Returns percentage
  }

  // --- SORTING ALGORITHMS ---
  // JavaScript's built-in .sort() uses an optimized TimSort (merge/insertion hybrid)

  sortByHighestProfit() {
    return [...this.#holdings].sort((a, b) => {
      return b.calculateReturn() - a.calculateReturn(); // Descending order
    });
  }

  sortByCurrentValue() {
    return [...this.#holdings].sort((a, b) => {
      const valueA = a.currentMarketPrice * a.quantity;
      const valueB = b.currentMarketPrice * b.quantity;
      return valueB - valueA; // Descending order
    });
  }

  // --- IDENTIFYING ASSETS ---

  getTopPerformingAsset() {
    if (this.#holdings.length === 0) return null;
    const sorted = this.sortByHighestProfit();
    return sorted[0]; // Highest profit at index 0
  }

  getWorstPerformingAsset() {
    if (this.#holdings.length === 0) return null;
    const sorted = this.sortByHighestProfit();
    return sorted[sorted.length - 1]; // Lowest profit at last index
  }
  addTransactionRecord(transaction) {
    this.#transactionHistory.push(transaction);
  }

  getTransactionHistory() {
    return [...this.#transactionHistory];
  }

  // Fulfills the "Sort transactions by date" rubric requirement
  sortTransactionsByDate(newestFirst = true) {
    return [...this.#transactionHistory].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return newestFirst ? dateB - dateA : dateA - dateB;
    });
  }
}

/**
 * CLASS: PortfolioManager
 * Demonstrates Static Methods and Advanced Features (Risk & Diversification)
 */
export class PortfolioManager {
  // Static utility to categorize the risk level of a portfolio based on diversity
  static analyzeRiskLevel(portfolio) {
    const stocks = portfolio.getStocks();
    if (stocks.length === 0) return "N/A";

    // Example logic: A portfolio heavily reliant on a single stock is "High Risk"
    const totalValue = portfolio.calculateCurrentValue();
    let maxWeight = 0;

    stocks.forEach((stock) => {
      const stockValue = stock.currentMarketPrice * stock.quantity;
      const weight = stockValue / totalValue;
      if (weight > maxWeight) maxWeight = weight;
    });

    if (maxWeight > 0.6) return "High Risk (Lacks Diversification)";
    if (maxWeight > 0.3) return "Moderate Risk";
    return "Low Risk (Well Diversified)";
  }

  // Static utility to trigger an alert if a stock drops significantly
  static checkLossAlerts(stock, thresholdPercentage = -10) {
    const invested = stock.purchasePrice * stock.quantity;
    const profit = stock.calculateReturn();
    const profitPercentage = (profit / invested) * 100;

    if (profitPercentage <= thresholdPercentage) {
      return `ALERT: ${stock.symbol} has dropped by ${Math.abs(profitPercentage.toFixed(2))}%.`;
    }
    return null;
  }
}
