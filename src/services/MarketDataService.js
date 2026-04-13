// src/services/MarketDataService.js

export class MarketDataService {
  // Paste your actual API key here
  static API_KEY = "d7ei059r01qi33g6b83gd7ei059r01qi33g6b840";
  static BASE_URL = "https://finnhub.io/api/v1";

  /**
   * Fetches the current live quote for a given stock symbol
   * @param {string} symbol - The stock ticker (e.g., 'AAPL')
   * @returns {Promise<number>} - The current price
   */
  static async getCurrentPrice(symbol) {
    if (!symbol) throw new Error("Symbol is required");

    try {
      // The 'quote' endpoint returns current, high, low, open, and previous close prices
      const response = await fetch(
        `${this.BASE_URL}/quote?symbol=${symbol.toUpperCase()}&token=${this.API_KEY}`,
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Finnhub returns current price under the 'c' property.
      // If 'c' is 0, it usually means the symbol was invalid.
      if (data.c === 0) {
        throw new Error("Invalid stock symbol or no data available.");
      }

      return data.c;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw error; // Re-throw to handle it in the UI
    }
  }
}
