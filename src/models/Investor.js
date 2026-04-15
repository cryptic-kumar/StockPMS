// src/models/Investor.js
import { Portfolio } from "./Portfolio";

export class Investor {
  #portfolios; // Encapsulated Map of portfolios

  constructor(email, name = "Investor") {
    this.id = `INV-${Date.now()}`;
    this.email = email;
    this.name = name;
    this.#portfolios = new Map();
  }

  // OOP Method: Safely instantiate and store a new Portfolio
  createPortfolio(name) {
    if (this.#portfolios.has(name)) {
      throw new Error(`A portfolio named '${name}' already exists.`);
    }
    const newPortfolio = new Portfolio(name);
    this.#portfolios.set(name, newPortfolio);
    return newPortfolio;
  }

  // Retrieves a specific portfolio by name
  getPortfolio(name) {
    return this.#portfolios.get(name);
  }

  // Returns an array of all portfolio instances
  getAllPortfolios() {
    return Array.from(this.#portfolios.values());
  }

  // NEW: Delete a portfolio while safeguarding the primary one
  deletePortfolio(name) {
    if (name === "My Primary Portfolio") {
      throw new Error(
        "Action Denied: You cannot delete your primary portfolio.",
      );
    }
    if (!this.#portfolios.has(name)) {
      throw new Error("Portfolio not found.");
    }
    this.#portfolios.delete(name);
  }
}
