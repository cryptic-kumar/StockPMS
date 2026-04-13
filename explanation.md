### 1. Project Overview and Objective

**Overview:** The Stock Portfolio Management System is a real-time, interactive frontend web application built using modern React and vanilla JavaScript.
**Objective:** The primary goal of this project is to simulate how real-world investors manage, track, and analyze stock portfolios. More importantly, it serves as an educational exercise to strictly implement **Object-Oriented Programming (OOP) principles**, **Linear Data Structures** (Stacks and Queues), and **Sorting Algorithms** entirely within a client-side environment, without relying on a traditional backend database.

### 2. Components/Modules Used and Their Purpose

The architecture strictly separates business logic (The Engine) from the user interface (The View).

**A. The OOP Engine (Models):**

- **`Investor.js`**: Represents the user. It uses a `Map` to hold and manage multiple `Portfolio` instances (e.g., "Retirement", "Day Trading").
- **`Portfolio.js`**: Manages a collection of stocks and a transaction ledger. It contains the logic for calculating financial metrics and sorting the holdings.
- **`Stock.js`**: The base class for all assets. It enforces data protection using private fields. It is extended by `EquityStock` and `DividendStock` to demonstrate inheritance.
- **`DataStructures.js`**: Contains the custom `TransactionQueue` (FIFO) and `UndoStack` (LIFO) classes.
- **`UserAuth.js`**: A simulated backend service that handles user registration, login, and data persistence using the browser's `localStorage`.

**B. The React View (Components):**

- **`App.jsx`**: The root controller that handles authentication routing.
- **`Dashboard.jsx`**: The "brain" of the UI. It instantiates the OOP classes and runs the background "Market Engine" timer.
- **`TradingTerminal.jsx`**: The form where users input buy/sell orders.
- **`HoldingsTable.jsx`**: The visual table displaying the stocks and providing sorting controls.

**C. External Services:**

- **`MarketDataService.js`**: Connects to the external **Finnhub API** to fetch live, real-time stock market prices.

### 3. Step-by-Step Working Process

1.  **Authentication:** The user registers or logs in via the `AuthScreen`. `UserAuth` saves a session token in `localStorage`.
2.  **Hydration:** Upon loading the `Dashboard`, the system checks `localStorage` for saved portfolios. If found, it "hydrates" the raw JSON data back into living OOP objects (`new EquityStock()`) so the methods function correctly.
3.  **Order Placement:** The user inputs a stock symbol, quantity, and price, and clicks "Buy". The request is pushed into the `TransactionQueue` (FIFO).
4.  **Market Execution:** A background interval (every 2 seconds) pulls the oldest order from the queue. It executes the trade by calling `portfolio.addStock()` or `sellStock()`.
5.  **Reversal Tracking:** Immediately upon execution, an _inverse_ action (e.g., a "Sell" command) is pushed onto the `UndoStack` (LIFO).
6.  **Persistence & UI Sync:** The updated OOP data is serialized and saved to `localStorage`, and the React UI is triggered to re-render the updated values.

### 4. How Each Part is Connected (Flow of System)

The system utilizes a **Client-Side MVC (Model-View-Controller)** pattern:

- **The Model:** Pure JavaScript classes (`Stock.js`, `Portfolio.js`). They hold the financial truth and do all the math. They know nothing about React.
- **The View:** React components (`HoldingsTable`, `TradingTerminal`). They render HTML and capture button clicks. They know nothing about financial math.
- **The Controller (The Bridge):** The `Dashboard.jsx` component connects them. It holds the pure OOP instances in `useRef` hooks so they survive renders. It uses a custom `syncUI()` function to extract data from the OOP models and push it into React `useState`, forcing the View to update safely.

### 5. Code Explanation (Highlighting Core CS Concepts)

- **Encapsulation:** In `Stock.js`, `#purchasePrice` and `#quantity` are declared with the `#` symbol, making them strictly private. The UI cannot accidentally overwrite them. They are modified exclusively through specific mutator methods like `addShares()` and `reduceShares()`.
- **Inheritance & Polymorphism:** The base `Stock` class dictates a `calculateReturn()` method. The `EquityStock` subclass calculates returns based purely on price differences, while the `DividendStock` subclass overrides this method to add historical dividend yields.
- **FIFO (Queue):** Implemented using an array where new orders use `.push()` and the market engine extracts them using `.shift()`.
- **LIFO (Stack):** Implemented with `.push()` and `.pop()`. It includes a `maxSize` edge-case handler to prevent browser memory crashes if the user makes 10,000 trades.

### 6. Hardware Setup / Architecture

- **Hardware:** Requires no specialized hardware; operates entirely within any modern web browser.
- **Software Stack:**
  - **Frontend Library:** React 18+
  - **Build Tool:** Vite (for fast module bundling)
  - **Language:** JavaScript (ES6+)
  - **External API:** Finnhub REST API (JSON over HTTPS)

### 7. Input-Output Behavior

- **Inputs:**
  - Manual form entries: Stock Symbol (e.g., "AAPL"), Quantity (positive integer), Price (float).
  - API Data: Live prices fetched via the Finnhub API.
  - UI Interactions: Sorting toggles, active tab switching for multiple portfolios.
- **Outputs:**
  - **Financial Metrics:** Dynamic calculation of Total Invested, Current Value, and Overall P/L Percentage.
  - **Visual Ledgers:** A table of current holdings and a chronologically sorted Transaction Ledger.
  - **Alerts:** Warning banners trigger if a holding drops below a -5% profit margin.

### 8. Challenges Faced and How They Were Solved

**Challenge 1: The React vs. OOP Conflict**

- _Issue:_ React relies on "immutable state" to trigger UI updates, but traditional OOP classes mutate their internal properties directly. React wouldn't update the screen when a stock price changed.
- _Solution:_ We built a `syncUI()` bridge function. Whenever the OOP classes finished a calculation, `syncUI()` extracted copies of the data and explicitly set them into React state, ensuring perfect synchronization.

**Challenge 2: The "Encapsulation Trap" during Data Persistence**

- _Issue:_ We needed to save the user's portfolio to `localStorage`. However, `JSON.stringify()` completely ignores private class fields (like `#quantity`). Upon refreshing, the stocks would load with `undefined` quantities.
- _Solution:_ We created a custom serialization process inside `syncUI()` that uses the public getter methods (`stock.quantity`) to extract the protected data before saving it to `localStorage`, allowing successful re-hydration on reload.

**Challenge 3: Modifying Protected Data Legally**

- _Issue:_ Initially, the `Portfolio` class tried to subtract shares directly (`stock.quantity -= 5`), which crashed the app because the property was protected by a read-only getter.
- _Solution:_ We implemented proper OOP mutator methods (`addShares` and `reduceShares`) inside the `Stock` class, granting the object autonomy to recalculate its own average purchase price and deduct shares safely.

### 9. Final Result and Conclusion

The final result is a highly robust, production-like simulation. It perfectly fulfills the assignment rubric by integrating strict Java-style Object-Oriented paradigms, custom linear data structures, and sorting algorithms into a modern JavaScript environment.

The application successfully mimics backend processing latency through its queued Market Engine, persists data seamlessly for the user, and connects to real-world live market APIs. It demonstrates a deep understanding of full-stack engineering principles, creatively applied to a frontend-only architecture.
