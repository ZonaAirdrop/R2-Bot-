import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import { ethers } from "ethers";

function getWIBTime() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 7);
  return now.toLocaleString("id-ID", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
      usdc: "0xc7BcCf452965Def7d5D9bF02943e3348F758D3CB",
      btc: "0x0f3B4ae3f2b63B21b12e423444d065CC82e3DfA5",
      r2usd: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
      sr2usd: "0x006CbF409CA275bA022111dB32BDAE054a97d488",
      r2: "0xb816bB88f836EA75Ca4071B46FF285f690C43bb7",
      swapRouter: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
      btcSwapRouter: "0x23b2615d783e16f14b62efa125306c7c69b4941a",
      staking: "0x006cbf409ca275ba022111db32bdae054a97d488",
      lpR2usdSr2usd: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
      lpUsdcR2usd: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
      lpR2R2usd: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
    };

    this.abis = {
      erc20: [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address recipient, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ],
      staking: [
        "function stake(uint256 amount)",
        "function unstake(uint256 amount)"
      ],
      swap: [
        "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)"
      ],
      btcBridge: [
        "function depositBTC(string calldata btcAddress, uint256 amount) payable"
      ]
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
    console.log(color(`[${getWIBTime()} WIB ] | ${msg}`));
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
      const swapRouterContract = new ethers.Contract(this.contracts.swapRouter, this.abis.swap, this.wallet);

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
      allowance = await tokenIn.allowance(this.wallet.address, this.contracts.swapRouter);
      balance = await tokenIn.balanceOf(this.wallet.address);

      // Debug info
      this.log(`Decimals tokenIn: ${decimalsIn}`, "info");
      this.log(`Saldo tokenIn: ${ethers.formatUnits(balance, decimalsIn)}`, "info");
      this.log(`Allowance ke router: ${ethers.formatUnits(allowance, decimalsIn)}`, "info");
      this.log(`Amount swap: ${ethers.formatUnits(amountInWei, decimalsIn)}`, "info");
      this.log(`Path swap: [${path.join(", ")}]`, "info");

      if (balance.lt(amountInWei)) {
        this.log(`Saldo tidak cukup untuk swap (${ethers.formatUnits(balance, decimalsIn)} < ${amount})`, "error");
        await this.prompt("Tekan Enter untuk kembali ke menu utama...");
        return;
      }

      if (allowance.lt(amountInWei)) {
        this.log("Allowance kurang. Mengirim approve...", "info");
        const approveTx = await tokenIn.approve(this.contracts.swapRouter, amountInWei);
        await approveTx.wait();
        this.log(`Approve berhasil: ${approveTx.hash}`, "success");
      } else {
        this.log("Allowance cukup, tidak perlu approve ulang.", "info");
      }

      for (let i = 1; i <= count; i++) {
        try {
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
          this.log(`Proses swap ke-${i}...`, "info");
          const swapTx = await swapRouterContract.swapExactTokensForTokens(
            amountInWei,
            0,
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
          const delay = randomDelay(minDelay, maxDelay);
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

  // ==================== ADD LIQUIDITY (TEMPLATE) ====================
  async addLiquidityMenu() {
    this.printHeader();
    this.log("Fitur Add Liquidity siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== REMOVE LIQUIDITY (TEMPLATE) ====================
  async removeLiquidityMenu() {
    this.printHeader();
    this.log("Fitur Remove Liquidity siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== STAKE R2USD (TEMPLATE) ====================
  async stakeR2usdMenu() {
    this.printHeader();
    this.log("Fitur Stake R2USD siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== UNSTAKE sR2USD (TEMPLATE) ====================
  async unstakeSr2usdMenu() {
    this.printHeader();
    this.log("Fitur Unstake sR2USD siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== DEPOSIT BTC (TEMPLATE) ====================
  async depositBtcMenu() {
    this.printHeader();
    this.log("Fitur Deposit BTC siap dikembangkan!", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // ==================== RUN ALL FEATURES (TEMPLATE) ====================
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