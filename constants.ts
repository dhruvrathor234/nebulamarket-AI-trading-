
export const INITIAL_BALANCE = 50000; // Increased for BTC volatility support
export const CRON_INTERVAL_MS = 30000; // Run analysis every 30 seconds
export const PRICE_TICK_INTERVAL_MS = 1000; // Update chart price every second

export const ASSETS = {
  XAUUSD: {
    NAME: "Gold vs US Dollar",
    INITIAL_PRICE: 2750.00, // Updated approximate current price
    CONTRACT_SIZE: 100, // 1 Lot = 100 oz
    PIP_VALUE: 10, // $10 per pip (0.10 move) for 1 lot
    DEFAULT_STOP_LOSS: 5.00
  },
  BTCUSD: {
    NAME: "Bitcoin vs US Dollar",
    INITIAL_PRICE: 97000.00, // Updated approximate current price
    CONTRACT_SIZE: 1, // 1 Lot = 1 BTC
    PIP_VALUE: 1, // $1 per $1 move for 1 lot
    DEFAULT_STOP_LOSS: 500.00
  },
  ETHUSD: {
    NAME: "Ethereum vs US Dollar",
    INITIAL_PRICE: 3350.00,
    CONTRACT_SIZE: 10, // 1 Lot = 10 ETH
    PIP_VALUE: 1, 
    DEFAULT_STOP_LOSS: 25.00
  }
};

export const SIMULATION_DISCLAIMER = "This is a PAPER TRADING simulation. No real money is involved.";
