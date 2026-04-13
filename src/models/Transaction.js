// models/Transaction.js

export class Transaction {
  constructor(stockSymbol, type, quantity, price) {
    this.transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.stockSymbol = stockSymbol.toUpperCase();

    // Ensure type is strictly 'BUY' or 'SELL'
    if (type !== "BUY" && type !== "SELL") {
      throw new Error("Transaction type must be 'BUY' or 'SELL'");
    }
    this.type = type;

    if (quantity <= 0)
      throw new Error("Transaction quantity must be positive.");
    this.quantity = quantity;

    if (price < 0) throw new Error("Transaction price cannot be negative.");
    this.price = price;

    this.date = new Date().toISOString();
  }

  // Calculates the total monetary value of this specific transaction
  getTotalValue() {
    return Number((this.quantity * this.price).toFixed(2));
  }
}
