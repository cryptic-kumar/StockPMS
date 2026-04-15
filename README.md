# SPMS Enterprise: Stock Portfolio Management System

**Developed by:** Aditya Kumar Basant Sah (IT Engineering, Batch of 2026)  
**Location:** Mumbai, Maharashtra

## 🚀 Overview

SPMS Enterprise is a high-performance, front-end-heavy Web Application designed to simulate a professional trading terminal. This project transcends a standard React application by serving as a masterclass in **Pure Object-Oriented Programming (OOP)**, **Custom Data Structures**, and **Cloud Infrastructure**.

It allows users to register securely via mobile OTP, manage multiple isolated stock portfolios, fetch live market data with automatic USD-to-INR (₹) forex conversion, and export financial ledgers—all backed by a real-time Google Firebase cloud database.

---

## 🏗️ Core Architecture & Features

### 1. Pure OOP Engine (The Backend in the Frontend)

Instead of relying on disorganized JSON arrays, the entire business logic is built using strict ES6 JavaScript classes.

- **`Investor` Class:** The root entity. Manages a private map of `Portfolio` instances.
- **`Portfolio` Class:** Encapsulates `Stock` instances and a ledger of `Transaction` records. Contains mathematical methods for calculating Total Invested, Current Value, and overall Profit/Loss.
- **`Stock` Class:** Represents individual equity assets. Calculates dynamic returns based on real-time market ticks.
- **`Transaction` Class:** Immutable records of every buy/sell action stamped with a unique ID and timestamp.

### 2. Algorithmic Data Structures

- **Transaction Queue (FIFO):** Trades are not executed instantly. They are pushed into a `TransactionQueue` and processed asynchronously by a mock market engine interval, simulating real-world broker execution delays.
- **Undo Stack (LIFO):** Every executed trade pushes an inverse transaction into an `UndoStack`. Users can instantly revert their last action (e.g., accidentally buying 10 shares queues a sell order for 10 shares).

### 3. Enterprise Cloud Infrastructure (Google Firebase)

- **Phone/SMS Authentication:** Uses Firebase Auth with invisible reCAPTCHA v2 to send secure 6-digit OTPs to users, bypassing standard telecom blocks via Test Numbers.
- **Firestore NoSQL Database:** Replaced `localStorage` with a live cloud database. The React UI serializes the OOP class instances into plain JSON objects, syncs them to the cloud on every action, and rehydrates them back into OOP classes upon login.

### 4. Real-Time Market Integration & Localization

- **Live Pricing & Forex:** Integrates with external financial APIs (Alpha Vantage/Yahoo Finance proxy) to fetch live stock quotes.
- **Auto-Currency Conversion:** Detects if a stock is US-based (USD) or Indian (NSE/BSE). US stocks are automatically passed through a live Exchange Rate API and converted to Indian Rupees (₹) before entering the OOP engine.
- **Mock Streaming Service:** A custom `MarketStreamer` class attaches a mathematical volatility algorithm to active holdings, ticking prices up and down every 2-4 seconds to simulate a live WebSockets feed.

### 5. Advanced UI/UX Features

- **Multi-Portfolio Management:** Users can create custom portfolios (e.g., "Tech Stocks", "Retirement"). Portfolios can be safely deleted, but the system actively guards the "Primary Portfolio" from deletion.
- **CSV Ledger Export:** A vanilla JavaScript blob generator compiles the active portfolio's metrics, holdings, and transaction history into an Excel-compatible `.csv` file for instant download.

---

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 (Vite)
- **Styling:** Inline CSS / Custom Component styling
- **Database & Auth:** Google Firebase (Firestore, Phone Auth)
- **Data APIs:** Alpha Vantage (Equities), ExchangeRate-API (Forex)
- **Language:** JavaScript (ES6+ Strict OOP)

---

## 💻 Installation & Setup

### Prerequisites

- Node.js (v16+ recommended)
- A free Google Firebase Project (with Phone Auth and Firestore enabled in Test Mode)
- A free Alpha Vantage API Key

### Step-by-step Setup

1. **Clone the repository and install dependencies:**

```bash
   git clone <your-repo-url>
   cd stockpms
   npm install
```

2. **Configure Firebase:**

Create a file at **src/firebase.js.**

Paste your Firebase config object and initialize auth and db.

```bash
(Note: Ensure Phone Auth is enabled in the Firebase Console and your number is added to the Test Numbers list to bypass Indian DND registries).
```

3. **Configure Market Data API:**

Open **src/services/MarketDataService.js.**

Replace the API_KEY placeholder with your actual Alpha Vantage key.

4. **Run the Development Server:**

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

# 🧠 The Development Journey (How it was built)

## Phase 1: The Mathematical Engine

The project began without a UI. The Investor, Portfolio, and Stock classes were built to ensure all financial mathematics (P/L percentages, weighted averages) were perfectly encapsulated and completely decoupled from React.

## Phase 2: The React Bridge

The UI was built using React hooks (useState, useRef). The Dashboard.jsx component was designed strictly as a "View" layer. A powerful syncUI() function was written to act as a bridge—extracting data from the pure OOP classes and pushing it into React state to trigger re-renders.

## Phase 3: Localization & APIs

The application was tailored for the Indian market. The Intl.NumberFormat API was implemented to format all UI elements in Rupees (₹). The MarketDataService was engineered to handle asynchronous fetching and automatic USD-to-INR conversions seamlessly.

## Phase 4: Cloud Migration

In the final phase, the system was upgraded from simple browser localStorage to an enterprise cloud backend. Firebase Recaptcha was integrated to handle SMS verification. A hydration engine was built to pull JSON data from Firestore, parse it, and reinstantiate it back into fully functional JavaScript class objects upon user login.
