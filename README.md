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


## 🔐 Security Notice

> **Always prioritize the security of your private key and RPC endpoints.**
> This bot interacts with blockchain networks and performs automated transactions, so improper handling of sensitive credentials can lead to irreversible asset loss.

---

### ⚠️ Best Practices

```
🔒 1. Never share your `.env` file or private key with anyone.
🔒 2. Always use a testnet wallet (e.g., Sepolia, Goerli) when testing this bot.
🔒 3. Keep your `.env` file out of version control by adding it to `.gitignore`.
🔒 4. Use proxy or VPN if necessary, especially when using public RPCs or handling multiple wallets.
🔒 5. Rotate or regenerate private keys periodically to reduce exposure risk.
🔒 6. Double-check contract addresses and RPC endpoints before deployment.
🔒 7. Use this tool only on trusted environments (your local device or a secure VPS).
```

---

### 🚫 Disclaimer

This software is provided for **educational and testing purposes only**.
The maintainers are **not responsible** for any loss, damage, or misuse caused by the use of this tool.

> By using this bot, you agree that you understand the risks associated with blockchain automation, including but not limited to transaction fees, delays, and unexpected behavior due to network congestion or smart contract changes.

