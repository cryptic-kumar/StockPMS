// src/models/UserAuth.js

export class UserAuth {
  // Simulated database key
  static DB_KEY = "portfolio_users_db";
  static SESSION_KEY = "portfolio_current_session";

  // Helper to get all users from localStorage
  static _getUsers() {
    const users = localStorage.getItem(this.DB_KEY);
    return users ? JSON.parse(users) : {};
  }

  // Register a new user
  static register(email, password) {
    const users = this._getUsers();

    if (users[email]) {
      throw new Error("User already exists with this email.");
    }

    // Create a new user record with a blank portfolio
    users[email] = {
      id: `USR-${Date.now()}`,
      email: email,
      password: password, // In a real app, this would be hashed!
      portfolioData: [], // Where we will save their stock holdings
    };

    localStorage.setItem(this.DB_KEY, JSON.stringify(users));
    return true;
  }

  // Login an existing user
  static login(email, password) {
    const users = this._getUsers();
    const user = users[email];

    if (!user || user.password !== password) {
      throw new Error("Invalid email or password.");
    }

    // Create a session token
    const session = { email: user.email, id: user.id, loginTime: Date.now() };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

    return user;
  }

  // Logout
  static logout() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Check if someone is currently logged in
  static getCurrentSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }

  // --- NEW: Data Persistence Methods ---

  // Save the serialized portfolio array to the specific user's profile
  static savePortfolio(email, serializedHoldings) {
    const users = this._getUsers();
    if (users[email]) {
      users[email].portfolioData = serializedHoldings;
      localStorage.setItem(this.DB_KEY, JSON.stringify(users));
    }
  }

  // Retrieve the saved portfolio data for the user
  static getUserPortfolio(email) {
    const users = this._getUsers();
    return users[email] ? users[email].portfolioData : [];
  }
}
