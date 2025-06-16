📦 Full Feature Overview – R2-Bot

📦 1. Auto Faucet Claim
    → Automatically claims R2/USD tokens from a testnet faucet or smart contract.

📦 2. Wallet Generator
    → Initializes an EVM wallet from a private key and connects to the selected RPC.

📦 3. Auto Balance Checker
    → Fetches and displays the ETH/token balance of the wallet with proper formatting.

📦 4. Auto Swap Transactions
    → Executes automatic swaps between tokens (e.g., R2 <=> USDC) using smart contracts.

📦 5. Multi-Wallet Looping
    → Supports multiple wallets and loops through them one by one for batch operations.

📦 6. Real-Time Logging
    → Provides status, success, and error logs with color-coded messages and timestamps.

📦 7. Proxy & RPC Customization
    → Supports proxy configuration (optional) and custom RPC endpoints via `.env`.

📦 8. Continuous Farming Mode
    → Can run in an endless loop mode for recurring farming or claiming tasks.

Tentu! Berikut versi **bahasa Inggris lengkap dan rapi** dari instruksi setup dan run bot dari repo `https://github.com/ZonaAirdrop/R2-Bot-` — sangat cocok untuk dokumentasi GitHub `README.md` atau panduan teknis:

---

## 🚀 How to Run `R2-Bot` (Step-by-Step)

These are the complete and separated commands to run the bot from the [ZonaAirdrop/R2-Bot](https://github.com/ZonaAirdrop/R2-Bot-) repository (assuming you have access to it):

---

### 🌐 1. Clone the Repository

```bash
git clone https://github.com/ZonaAirdrop/R2-Bot-.git
```

---

### 📁 2. Navigate into the Project Directory

```bash
cd R2-Bot-
```

---

### 📦 3. Install Dependencies

```bash
npm install
```

---

### 📝 4. Create and Configure the `.env` File

If a `.env` file is not present, create one:

```bash
nano .env
```

Then open and fill in the required environment variables:

```env
PRIVATE_KEY=0x...         # Replace with your actual private key
DISCORD_TOKEN=...         # Optional, if used
```

---

### 🚀 5. Start the Bot

You can usually start the bot with:

```bash
npm start
```
