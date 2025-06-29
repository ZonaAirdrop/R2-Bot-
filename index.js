import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import { ethers } from "ethers";

// ====== UNISWAP V2 ROUTER ABI (MINIMAL, + ADD/REMOVE/STAKE/SWAP) ======
const routerAbi = [
  // getAmountsOut
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  // swapExactTokensForTokens
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // addLiquidity
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" },
      { "internalType": "uint256", "name": "amountADesired", "type": "uint256" },
      { "internalType": "uint256", "name": "amountBDesired", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
      { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "addLiquidity",
    "outputs": [
      { "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "internalType": "uint256", "name": "amountB", "type": "uint256" },
      { "internalType": "uint256", "name": "liquidity", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // removeLiquidity
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" },
      { "internalType": "uint256", "name": "liquidity", "type": "uint256" },
      { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
      { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "removeLiquidity",
    "outputs": [
      { "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "internalType": "uint256", "name": "amountB", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ====== ERC20 ABI MINIMAL + STAKE ======
const erc20abi = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  },
  // Fungsi staking (method selector 0x1a5f0f00)
  {
    "constant": false,
    "inputs": [{ "name": "amount", "type": "uint256" }],
    "name": "stake",
    "outputs": [],
    "type": "function"
  }
];

// ================= BOT IMPLEMENTASI =================
class AllFeatureBot {
  constructor() {
    this.RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/ef659d824bd14ae798d965f855f2cfd6";
    this.PRIVATE_KEY = process.env.PRIVATE_KEY;
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    this.wallet = this.PRIVATE_KEY
      ? new ethers.Wallet(this.PRIVATE_KEY, this.provider)
      : null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.state = {};

    this.contracts = {
      usdc: "0xef84994eF411c4981328fFcE5Fda41cD3803faE4",                      
      r2usd:"0x20c54C5F742F123Abb49a982BFe0af47edb38756",         
      r2: "0xBD6b25c4132F09369C354beE0f7be777D7d434fa",                       

      router_usdc_r2usd: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",        
      router_r2_usdc: "0x47d1b0623bb3e557bf8544c159c9ae51d091f8a2",           

      lp_r2usd_sr2usd: "0xe85A06C238439F981c90b2C91393b2F3c46e27FC",         
      remove_liquidity: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",         

      staking_r2usd: "0x006CbF409CA275bA022111dB32BDAE054a97d488",            
      staking_btc: "0x23b2615d783E16F14B62EfA125306c7c69B4941A",              
    };

    this.abis = {
      erc20: erc20abi,
      swap: routerAbi,
    };
  }

  printHeader() {
    console.clear();
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════════════════════════════════"));
    console.log(chalk.bold.cyan("                              R2 CLI BOT INTERFACE"));
    console.log(chalk.cyan("───────────────────────────────────────────────────────────────────────────────"));
    if (this.wallet) {
      console.log(
        chalk.gray(
          `Address: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`
        )
      );
    }
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════════════════════════════════\n"));
  }

  log(msg, type = "info") {
    let color = chalk.white;
    if (type === "error") color = chalk.red;
    if (type === "success") color = chalk.green;
    if (type === "info") color = chalk.blue;
    console.log(color(`[${this.getWIBTime()} WIB ] | ${msg}`));
  }

  getWIBTime() {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() + 7);
    return now.toLocaleString("id-ID", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async prompt(question, validator = null) {
    return new Promise((resolve) => {
      this.rl.question(chalk.yellow(question), (answer) => {
        if (validator) {
          const valid = validator(answer.trim());
          if (valid === true) return resolve(answer.trim());
          this.log(valid, "error");
          return this.prompt(question, validator).then(resolve);
        }
        resolve(answer.trim());
      });
    });
  }

  async mainMenu() {
    while (true) {
      this.printHeader();
      console.log(
        chalk.white(
          [
            "1. Swap USDC <> R2USD",
            "2. Swap R2 <> USDC",
            "3. Add Liquidity",
            "4. Remove Liquidity",
            "5. Stake R2USD",
            "6. Unstake sR2USD",
            "7. Deposit BTC",
            "8. Run All Features",
            "9. Exit\n"
          ].join("\n")
        )
      );
      const choice = await this.prompt("> Choose [1-9]: ", (ans) => {
        if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(ans)) {
          return true;
        }
        return "Pilihan tidak valid!";
      });

      if (choice === "1") {
        await this.swapUsdcR2usdMenu();
      } else if (choice === "2") {
        await this.swapR2UsdcMenu();
      } else if (choice === "3") {
        await this.addLiquidityMenu();
      } else if (choice === "4") {
        await this.removeLiquidityMenu();
      } else if (choice === "5") {
        await this.stakeR2usdMenu();
      } else if (choice === "6") {
        await this.unstakeSr2usdMenu();
      } else if (choice === "7") {
        await this.depositBtcMenu();
      } else if (choice === "8") {
        await this.runAllFeatures();
      } else if (choice === "9") {
        this.rl.close();
        this.log("Goodbye!", "success");
        process.exit(0);
      }
    }
  }

  // ==================== SWAP USDC <> R2USD ====================
  async swapUsdcR2usdMenu() {
    this.printHeader();
    console.log(chalk.white("Swap USDC <> R2USD"));
    console.log(chalk.white("1. USDC → R2USD\n2. R2USD → USDC"));
    const direction = await this.prompt(
      "Pilih arah swap [1/2]: ",
      (v) => ["1", "2"].includes(v) ? true : "Pilih 1 atau 2"
    );
    const count = Number(
      await this.prompt(
        "Berapa kali ingin melakukan transaksi swap? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const minDelay = Number(
      await this.prompt(
        "Min Delay (detik) antar transaksi? ",
        (v) => (!isNaN(v) && Number(v) >= 0 ? true : "Masukkan angka >= 0")
      )
    );
    const maxDelay = Number(
      await this.prompt(
        "Max Delay (detik) antar transaksi? ",
        (v) => (!isNaN(v) && Number(v) >= minDelay ? true : "Masukkan angka >= Min Delay")
      )
    );
    const amount = await this.prompt(
      "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
      (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
    );

    try {
      const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
      const r2usdContract = new ethers.Contract(this.contracts.r2usd, this.abis.erc20, this.wallet);
      const swapRouterAddress = this.contracts.router_usdc_r2usd;
      const swapRouterContract = new ethers.Contract(swapRouterAddress, this.abis.swap, this.wallet);

      const usdcDecimals = await usdcContract.decimals();
      const r2usdDecimals = await r2usdContract.decimals();

      let tokenIn, decimalsIn, path, allowance, balance;
      if (direction === "1") {
        tokenIn = usdcContract;
        decimalsIn = usdcDecimals;
        path = [this.contracts.usdc, this.contracts.r2usd];
      } else {
        tokenIn = r2usdContract;
        decimalsIn = r2usdDecimals;
        path = [this.contracts.r2usd, this.contracts.usdc];
      }
      const amountInWei = ethers.parseUnits(amount, decimalsIn);
      allowance = await tokenIn.allowance(this.wallet.address, swapRouterAddress);
      balance = await tokenIn.balanceOf(this.wallet.address);

      // Debug info
      this.log(`Decimals tokenIn: ${decimalsIn}`, "info");
      this.log(`Saldo tokenIn: ${ethers.formatUnits(balance, decimalsIn)}`, "info");
      this.log(`Allowance ke router: ${ethers.formatUnits(allowance, decimalsIn)}`, "info");
      this.log(`Amount swap: ${ethers.formatUnits(amountInWei, decimalsIn)}`, "info");
      this.log(`Path swap: [${path.join(", ")}]`, "info");

      if (BigInt(balance) < BigInt(amountInWei)) {
        this.log(`Saldo tidak cukup untuk swap (${ethers.formatUnits(balance, decimalsIn)} < ${amount})`, "error");
        await this.prompt("Tekan Enter untuk kembali ke menu utama...");
        return;
      }

      if (BigInt(allowance) < BigInt(amountInWei)) {
        this.log("Allowance kurang. Mengirim approve...", "info");
        const approveTx = await tokenIn.approve(swapRouterAddress, amountInWei);
        await approveTx.wait();
        this.log(`Approve berhasil: ${approveTx.hash}`, "success");
      } else {
        this.log("Allowance cukup, tidak perlu approve ulang.", "info");
      }

      // --- Estimasi dan set amountOutMin ---
      let amountOutMin = 0n;
      try {
        const amountsOut = await swapRouterContract.getAmountsOut(amountInWei, path);
        amountOutMin = (amountsOut[1] * 99n) / 100n; // 99% dari estimasi (1% slippage)
        this.log(`Estimasi amountOutMin: ${ethers.formatUnits(amountOutMin, decimalsIn)}`, "info");
      } catch (err) {
        this.log("Gagal estimasi amountOutMin, kemungkinan path atau pair salah!", "error");
        await this.prompt("Tekan Enter untuk kembali ke menu utama...");
        return;
      }

      for (let i = 1; i <= count; i++) {
        try {
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
          this.log(`Proses swap ke-${i}...`, "info");
          const swapTx = await swapRouterContract.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            path,
            this.wallet.address,
            deadline
          );
          const receipt = await swapTx.wait();
          this.log(
            `Swap berhasil! TX Hash: ${receipt.hash}`,
            "success"
          );
        } catch (swapError) {
          this.log(
            `Error saat swap [${i}]: ${swapError.shortMessage || swapError.reason || swapError.message}`,
            "error"
          );
          if (swapError.data) {
            this.log(`Revert data: ${swapError.data}`, "error");
          }
        }
        if (i < count) {
          const delay = this.randomDelay(minDelay, maxDelay);
          this.log(`Menunggu ${delay} detik sebelum transaksi berikutnya...`, "info");
          await new Promise(res => setTimeout(res, delay * 1000));
        }
      }
    } catch (error) {
      this.log(`Error fatal: ${error.shortMessage || error.reason || error.message}`, "error");
      if (error.data) this.log(`Revert data: ${error.data}`, "error");
    }

    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== SWAP R2 <> USDC (TEMPLATE) ====================
  async swapR2UsdcMenu() {
    this.printHeader();
    this.log("Fitur swap R2 <> USDC siap dikembangkan, silakan copy dari swapUsdcR2usdMenu!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== ADD LIQUIDITY ====================
  async addLiquidityMenu() {
    this.printHeader();
    this.log("Fitur Add Liquidity siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== REMOVE LIQUIDITY ====================
  async removeLiquidityMenu() {
    this.printHeader();
    this.log("Fitur Remove Liquidity siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== STAKE R2USD ====================
  async stakeR2usdMenu() {
    this.printHeader();
    this.log("Fitur Stake R2USD siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== UNSTAKE sR2USD ====================
  async unstakeSr2usdMenu() {
    this.printHeader();
    this.log("Fitur Unstake sR2USD siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== DEPOSIT BTC ====================
  async depositBtcMenu() {
    this.printHeader();
    this.log("Fitur Deposit BTC siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== RUN ALL FEATURES ====================
  async runAllFeatures() {
    this.printHeader();
    this.log("Fitur Run All Features siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }
}

async function main() {
  const bot = new AllFeatureBot();
  if (!bot.PRIVATE_KEY) {
    console.log(chalk.red("🛑 PRIVATE_KEY tidak ditemukan di .env / format salah!"));
    process.exit(1);
  }
  await bot.mainMenu();
}

main();
