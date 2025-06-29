import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import { ethers } from "ethers";

class MinimalR2Bot {
  constructor() {
    this.RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/ef659d824bd14ae798d965f855f2cfd6";
    this.PRIVATE_KEY = process.env.PRIVATE_KEY;
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    this.wallet = this.PRIVATE_KEY ? new ethers.Wallet(this.PRIVATE_KEY, this.provider) : null;
    this.history = [];
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  printHeader() {
    console.clear();
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════"));
    console.log(chalk.bold.cyan("               R2 CLI BOT INTERFACE"));
    console.log(chalk.cyan("───────────────────────────────────────────────────"));
    if (this.wallet)
      console.log(chalk.gray(`Address: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`));
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════\n"));
  }

  log(msg, type = "info") {
    let color = chalk.white;
    if (type === "error") color = chalk.red;
    if (type === "success") color = chalk.green;
    if (type === "info") color = chalk.blue;
    console.log(color(`[${new Date().toLocaleTimeString()}] ${msg}`));
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(chalk.yellow(question), (answer) => resolve(answer.trim()));
    });
  }

  async mainMenu() {
    while (true) {
      this.printHeader();
      console.log(chalk.white(
        "1. Swap USDC <-> R2USD\n" +
        "2. Add Liquidity (USDC-R2USD)\n" +
        "3. Show History\n" +
        "4. Exit\n"
      ));
      const choice = await this.prompt("> Pilih menu [1-4]: ");
      if (choice === "1") await this.swapMenu();
      else if (choice === "2") await this.addLiquidityMenu();
      else if (choice === "3") this.showHistory();
      else if (choice === "4") {
        this.log("Goodbye!", "success");
        this.rl.close();
        process.exit(0);
      }
      else {
        this.log("Pilihan tidak valid! Tekan Enter untuk ulang...", "error");
        await this.prompt("");
      }
    }
  }

  async swapMenu() {
    this.printHeader();
    const dir = await this.prompt("Swap [1] USDC->R2USD  [2] R2USD->USDC ? [1/2]: ");
    if (dir === "1") {
      const amount = await this.prompt("Jumlah USDC yang ingin di-swap ke R2USD: ");
      this.log(`✅ ${amount} USDC -> R2USD (dummy swap)`, "success");
      this.history.push({ action: "Swap USDC->R2USD", amount, time: new Date() });
    } else if (dir === "2") {
      const amount = await this.prompt("Jumlah R2USD yang ingin di-swap ke USDC: ");
      this.log(`✅ ${amount} R2USD -> USDC (dummy swap)`, "success");
      this.history.push({ action: "Swap R2USD->USDC", amount, time: new Date() });
    } else {
      this.log("Pilihan tidak valid pada menu swap!", "error");
      await this.prompt("Tekan Enter untuk kembali...");
    }
  }

  async addLiquidityMenu() {
    this.printHeader();
    const usdc = await this.prompt("Jumlah USDC: ");
    const r2usd = await this.prompt("Jumlah R2USD: ");
    this.log(`✅ Add Liquidity: USDC ${usdc} + R2USD ${r2usd} (dummy)`, "success");
    this.history.push({ action: "Add Liquidity", usdc, r2usd, time: new Date() });
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  showHistory() {
    this.printHeader();
    if (!this.history.length) {
      this.log("Belum ada riwayat transaksi.", "info");
    } else {
      this.log("Riwayat Transaksi:", "info");
      this.history.forEach((x, i) => {
        if (x.action === "Add Liquidity") {
          console.log(
            chalk.green(`[${i + 1}] ${x.action}: USDC=${x.usdc}, R2USD=${x.r2usd} | ${x.time.toLocaleString()}`)
          );
        } else {
          console.log(
            chalk.green(`[${i + 1}] ${x.action}: ${x.amount} | ${x.time.toLocaleString()}`)
          );
        }
      });
    }
    // Pause before returning
    console.log();
    return this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }
}

async function main() {
  const bot = new MinimalR2Bot();
  if (!bot.PRIVATE_KEY) {
    bot.log("🛑 PRIVATE_KEY tidak ditemukan di .env", "error");
    process.exit(1);
  }
  await bot.mainMenu();
}

main();