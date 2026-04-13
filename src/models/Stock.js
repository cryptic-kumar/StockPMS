// models/Stock.js

/**
 * BASE CLASS: Stock
 * Demonstrates Encapsulation and Static Methods
 */
export class Stock {
  // 1. Static utility method for stock ID generation
  static generateStockId(symbol) {
    // Creates a unique ID like "AAPL-1704234567-892"
    return `${symbol.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // 2. Encapsulation: Using ES6 private fields (#) to protect financial data
  // from being altered accidentally outside the class.
  #purchasePrice;
  #quantity;

  constructor(symbol, companyName, purchasePrice, quantity) {
    this.stockId = Stock.generateStockId(symbol);
    this.symbol = symbol.toUpperCase();
    this.companyName = companyName;

    // Edge Case Handling: Prevent negative or zero quantities/prices
    if (quantity <= 0) throw new Error("Quantity must be greater than zero.");
    if (purchasePrice < 0) throw new Error("Invalid stock price.");

    this.#purchasePrice = purchasePrice;
    this.#quantity = quantity;

    this.currentMarketPrice = purchasePrice; // Defaults to purchase price initially
    this.dateOfTransaction = new Date().toISOString();
    this.transactionHistory = [];
  }

  // Getters to allow reading protected data, but not directly overwriting it
  get purchasePrice() {
    return this.#purchasePrice;
  }
  get quantity() {
    return this.#quantity;
  }

  // Safely update market price (handles the 'Invalid stock prices' edge case)
  updateMarketPrice(newPrice) {
    if (newPrice < 0) throw new Error("Market price cannot be negative.");
    this.currentMarketPrice = newPrice;
  }

  // 3. Base method for Polymorphism
  calculateReturn() {
    throw new Error(
      "Method 'calculateReturn()' must be implemented in derived classes.",
    );
  }
}

/**
 * DERIVED CLASS: EquityStock
 * Demonstrates Inheritance and Polymorphism
 */
export class EquityStock extends Stock {
  // Overriding the base method to calculate standard capital gains
  calculateReturn() {
    const totalInvested = this.purchasePrice * this.quantity;
    const currentValue = this.currentMarketPrice * this.quantity;
    return Number((currentValue - totalInvested).toFixed(2)); // Rounding to fix JS float issues
  }
}

/**
 * DERIVED CLASS: DividendStock
 * Demonstrates Inheritance and Polymorphism
 */
export class DividendStock extends Stock {
  constructor(symbol, companyName, purchasePrice, quantity, dividendYield) {
    // Call the parent class constructor
    super(symbol, companyName, purchasePrice, quantity);
    // Dividend yield is a percentage (e.g., 0.05 for 5%)
    this.dividendYield = dividendYield;
  }

  // Overriding the base method to calculate returns DIFFERENTLY
  calculateReturn() {
    const totalInvested = this.purchasePrice * this.quantity;
    const currentValue = this.currentMarketPrice * this.quantity;

    const capitalGains = currentValue - totalInvested;
    const dividendEarnings = totalInvested * this.dividendYield;

    // Returns are capital gains PLUS the dividend payout
    return Number((capitalGains + dividendEarnings).toFixed(2));
  }
}
