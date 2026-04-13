// src/models/Stock.js

/**
 * BASE CLASS: Stock
 * Demonstrates Encapsulation and Static Methods
 */
export class Stock {
  static generateStockId(symbol) {
    return `${symbol.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  #purchasePrice;
  #quantity;

  constructor(symbol, companyName, purchasePrice, quantity) {
    this.stockId = Stock.generateStockId(symbol);
    this.symbol = symbol.toUpperCase();
    this.companyName = companyName;

    if (quantity <= 0) throw new Error("Quantity must be greater than zero.");
    if (purchasePrice < 0) throw new Error("Invalid stock price.");

    this.#purchasePrice = purchasePrice;
    this.#quantity = quantity;

    this.currentMarketPrice = purchasePrice;
    this.dateOfTransaction = new Date().toISOString();
    this.transactionHistory = [];
  }

  // Getters (Read-Only access)
  get purchasePrice() {
    return this.#purchasePrice;
  }
  get quantity() {
    return this.#quantity;
  }

  // NEW OOP METHOD: Safely adds shares and recalculates average purchase price
  addShares(amount, newPurchasePrice) {
    const totalCost =
      this.#purchasePrice * this.#quantity + newPurchasePrice * amount;
    this.#quantity += amount;
    this.#purchasePrice = totalCost / this.#quantity;
  }

  // NEW OOP METHOD: Safely removes shares
  reduceShares(amount) {
    if (amount > this.#quantity) {
      throw new Error(
        `Cannot sell ${amount} shares. You only own ${this.#quantity}.`,
      );
    }
    this.#quantity -= amount;
  }

  updateMarketPrice(newPrice) {
    if (newPrice < 0) throw new Error("Market price cannot be negative.");
    this.currentMarketPrice = newPrice;
  }

  calculateReturn() {
    throw new Error(
      "Method 'calculateReturn()' must be implemented in derived classes.",
    );
  }
}

/**
 * DERIVED CLASS: EquityStock
 */
export class EquityStock extends Stock {
  calculateReturn() {
    const totalInvested = this.purchasePrice * this.quantity;
    const currentValue = this.currentMarketPrice * this.quantity;
    return Number((currentValue - totalInvested).toFixed(2));
  }
}

/**
 * DERIVED CLASS: DividendStock
 */
export class DividendStock extends Stock {
  constructor(symbol, companyName, purchasePrice, quantity, dividendYield) {
    super(symbol, companyName, purchasePrice, quantity);
    this.dividendYield = dividendYield;
  }

  calculateReturn() {
    const totalInvested = this.purchasePrice * this.quantity;
    const currentValue = this.currentMarketPrice * this.quantity;

    const capitalGains = currentValue - totalInvested;
    const dividendEarnings = totalInvested * this.dividendYield;

    return Number((capitalGains + dividendEarnings).toFixed(2));
  }
}
