# 📦 R2 Final zonaairdrop - DeFi Automation Bot

## 📦 Feature Overview

📦 1. **Auto Balance Checker**
    → Fetches and displays real-time ETH, R2, and USDC token balances with proper formatting and current block number.

📦 2. **Auto Swap Transactions**
    → Executes automatic bidirectional swaps between R2 and USDC tokens using Uniswap-compatible router contracts with visual separators.

📦 3. **Auto Add Liquidity**
    → Automatically adds liquidity to R2-USDC pool with approval handling and transaction confirmation with enhanced UI display.

📦 4. **Wallet Integration**
    → Initializes EVM wallet from private key and connects to Sepolia testnet RPC with secure environment variable management.

📦 5. **Real-Time Logging**
    → Provides color-coded status, success, and error logs with timestamps, icons, and visual section separators.

📦 6. **Continuous Farming Mode**
    → Runs in endless loop mode with 24-hour cycles for recurring swap and liquidity operations.

📦 7. **Enhanced UI Display**
    → Features visual separators (garis atas dan bawah) for swap and add liquidity sections with balance tracking before and after operations.

📦 8. **Error Handling & Approval**
    → Automatic token approval handling and comprehensive error management for failed transactions.

---

## 🚀 How to Run `R2 Final zonaairdrop` (Step-by-Step)

### 📁 1. Setup Project Directory

````
git clone https://github.com/ZonaAirdrop/R2-Bot-.git
cd R2-Bot-
````

### 📦 2. Install Dependencies

```bash
npm install dotenv ethers prompt-sync
```

### 📝 3. Create and Configure the `.env` File

Create a `.env` file in your project directory:

```bash
nano .env
```

Fill in the required environment variables:

```env
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here
```

### 🚀 4. Start the Bot

Run the main script:

````
node index.js
````

### 📊 5. Configure Bot Parameters

When prompted, enter:
- Number of bidirectional swaps (USDC ↔️ R2)
- Number of add liquidity actions
- Minimum delay between actions (milliseconds)
- Maximum delay between actions (milliseconds)

---

## 💡 Features in Action

### 🔄 Swap Operations
```
==================================================
 SWAP SECTION 
==================================================
[📦] Current Block: 12345678
[💰] ETH Balance: 0.1234 ETH
[💰] R2 Balance: 1000.0 R2
[💰] USDC Balance: 500.0 USDC

[↪️] Mulai swap USDC → R2 sebesar 1 token...
[✅] Swap selesai: https://sepolia.etherscan.io/tx/0x...
==================================================
 END SWAP SECTION 
==================================================
```

### 💧 Add Liquidity Operations
```
==================================================
 ADD LIQUIDITY SECTION 
==================================================
[📦] Current Block: 12345679
[💰] ETH Balance: 0.1230 ETH
[💰] R2 Balance: 999.0 R2
[💰] USDC Balance: 499.0 USDC

[💧] Mulai add liquidity USDC-R2 sebesar 1 token...
[✅] Add Liquidity selesai: https://sepolia.etherscan.io/tx/0x...
==================================================
 END ADD LIQUIDITY SECTION 
==================================================
```

---

## 🔐 Security Notice

> **Always prioritize the security of your private key and RPC endpoints.**
> This bot interacts with blockchain networks and performs automated transactions, so improper handling of sensitive credentials can lead to irreversible asset loss.

---

### ⚠️ Best Practices

```
🔒 1. Never share your `.env` file or private key with anyone.
🔒 2. Always use a testnet wallet (e.g., Sepolia) when testing this bot.
🔒 3. Keep your `.env` file out of version control by adding it to `.gitignore`.
🔒 4. Use proxy or VPN if necessary, especially when using public RPCs.
🔒 5. Rotate or regenerate private keys periodically to reduce exposure risk.
🔒 6. Double-check contract addresses and RPC endpoints before deployment.
🔒 7. Use this tool only on trusted environments (your local device or secure VPS).
🔒 8. Monitor your token balances regularly during bot operations.
```

---

### 🚫 Disclaimer

This software is provided for **educational and testing purposes only**.
The maintainers are **not responsible** for any loss, damage, or misuse caused by the use of this tool.

> By using this bot, you agree that you understand the risks associated with blockchain automation, including but not limited to transaction fees, delays, and unexpected behavior due to network congestion or smart contract changes.

---

## 🛠️ Technical Details

- **Network**: Sepolia Testnet
- **Router Contract**: 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3
- **Token Standards**: ERC20 (R2: 18 decimals, USDC: 6 decimals)
- **Runtime**: Node.js with ethers.js v6
- **Architecture**: CommonJS modules for maximum compatibility

---

📝 **Note**: This bot focuses on R2-USDC swap and liquidity operations only. All staking functionality has been removed for stability and simplicity.

For updates and support: https://t.me/ZonaAirdr0p
