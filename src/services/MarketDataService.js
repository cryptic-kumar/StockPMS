// src/services/MarketDataService.js

export class MarketDataService {
  // Paste your new Alpha Vantage API key here!
  static API_KEY = "C90RNKM4MUW3MFLA";
  static BASE_URL = "https://www.alphavantage.co/query";
  static cachedUsdToInrRate = null;

  /**
   * Fetches the live USD to INR exchange rate.
   */
  static async getUsdToInrRate() {
    if (this.cachedUsdToInrRate) return this.cachedUsdToInrRate;
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await response.json();
      this.cachedUsdToInrRate = data.rates.INR;
      return this.cachedUsdToInrRate;
    } catch (error) {
      console.warn("Could not fetch exchange rate, using fallback of 83.50");
      return 83.5;
    }
  }

  /**
   * Fetches the current live quote from Alpha Vantage
   * @param {string} symbol - The stock ticker (e.g., 'RELIANCE.BSE' or 'AAPL')
   * @returns {Promise<number>} - The current price in INR
   */
  static async getCurrentPrice(symbol) {
    if (!symbol) throw new Error("Symbol is required");

    try {
      // Make sure the symbol is uppercase
      const cleanSymbol = symbol.toUpperCase();

      // Alpha Vantage Global Quote Endpoint
      const response = await fetch(
        `${this.BASE_URL}?function=GLOBAL_QUOTE&symbol=${cleanSymbol}&apikey=${this.API_KEY}`,
      );
      const data = await response.json();

      // Alpha Vantage returns an error message if the limit is reached or symbol is bad
      if (data["Information"] || data["Note"]) {
        throw new Error(
          "API Limit Reached. Please wait a minute or check your key.",
        );
      }

      const quote = data["Global Quote"];
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error(
          "Invalid stock symbol. For Indian stocks, try appending .BSE (e.g., RELIANCE.BSE)",
        );
      }

      // Extract the price (Alpha Vantage returns strings, so we parse it to a float)
      let price = parseFloat(quote["05. price"]);

      // Currency Conversion Logic:
      // Alpha Vantage returns Indian stocks (.BSE or .TRT) in INR. US stocks are in USD.
      const isIndianStock =
        cleanSymbol.endsWith(".BSE") ||
        cleanSymbol.endsWith(".TRT") ||
        cleanSymbol.endsWith(".IND");

      if (!isIndianStock) {
        const exchangeRate = await this.getUsdToInrRate();
        price = price * exchangeRate;
      }

      return price;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw error;
    }
  }
}
