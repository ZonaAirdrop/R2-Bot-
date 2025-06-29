import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import { ethers } from "ethers";

function getWIBTime() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 7); // WIB = UTC+7
  return now.toLocaleString("id-ID", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

class AllFeatureBot {
  constructor() {
    this.RPC_URL =
      process.env.RPC_URL ||
      "https://sepolia.infura.io/v3/ef659d824bd14ae798d965f855f2cfd6";
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
  }

  printHeader() {
    console.clear();
    console.log(
      chalk.bold.cyan("═══════════════════════════════════════════════════")
    );
    console.log(chalk.bold.cyan("               R2 CLI BOT INTERFACE"));
    console.log(
      chalk.cyan("───────────────────────────────────────────────────")
    );
    if (this.wallet)
      console.log(
        chalk.gray(
          `Address: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`
        )
      );
    console.log(
      chalk.bold.cyan("═══════════════════════════════════════════════════\n")
    );
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
          return resolve(this.prompt(question, validator));
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
          "1. Swap USDC <> R2USD\n" +
            "2. Swap R2 <> USDC\n" +
            "3. Swap BTC <> R2BTC\n" +
            "4. Add Liquidity\n" +
            "5. Remove Liquidity\n" +
            "6. Stake R2USD\n" +
            "7. Unstake sR2USD\n" +
            "8. Deposit BTC\n" +
            "9. Run All Features\n" +
            "10. Exit\n"
        )
      );
      const choice = await this.prompt("> Choose [1-10]: ", (ans) => {
        if (
          [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
          ].includes(ans)
        )
          return true;
        return "Pilihan tidak valid!";
      });

      if (choice === "1") {
        await this.swapUsdcR2usdMenu();
      } else if (choice === "2") {
        await this.swapR2UsdcMenu();
      } else if (choice === "3") {
        await this.swapBtcR2btcMenu();
      } else if (choice === "4") {
        await this.addLiquidityMenu();
      } else if (choice === "5") {
        await this.removeLiquidityMenu();
      } else if (choice === "6") {
        await this.stakeR2usdMenu();
      } else if (choice === "7") {
        await this.unstakeSr2usdMenu();
      } else if (choice === "8") {
        await this.depositBtcMenu();
      } else if (choice === "9") {
        await this.runAllFeatures();
      } else if (choice === "10") {
        this.rl.close();
        this.log("Goodbye!", "success");
        process.exit(0);
      }
    }
  }

  async swapUsdcR2usdMenu() {
    this.printHeader();
    console.log(chalk.white("Swap USDC <> R2USD"));
    console.log(chalk.white("1. USDC → R2USD\n2. R2USD → USDC"));
    const direction = await this.prompt(
      "Pilih arah swap [1/2]: ",
      (v) => ["1", "2"].includes(v) ? true : "Pilih 1 atau 2"
    );
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(
      `Swap ${direction === "1" ? "USDC ke R2USD" : "R2USD ke USDC"} sebanyak ${amount}`,
      "info"
    );
    this.log("Demo swap, implementasi swap asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async swapR2UsdcMenu() {
    this.printHeader();
    console.log(chalk.white("Swap R2 <> USDC"));
    console.log(chalk.white("1. R2 → USDC\n2. USDC → R2"));
    const direction = await this.prompt(
      "Pilih arah swap [1/2]: ",
      (v) => ["1", "2"].includes(v) ? true : "Pilih 1 atau 2"
    );
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(
      `Swap ${direction === "1" ? "R2 ke USDC" : "USDC ke R2"} sebanyak ${amount}`,
      "info"
    );
    this.log("Demo swap, implementasi swap asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async swapBtcR2btcMenu() {
    this.printHeader();
    console.log(chalk.white("Swap BTC <> R2BTC"));
    console.log(chalk.white("1. BTC → R2BTC\n2. R2BTC → BTC"));
    const direction = await this.prompt(
      "Pilih arah swap [1/2]: ",
      (v) => ["1", "2"].includes(v) ? true : "Pilih 1 atau 2"
    );
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah swap BTC (misal: 0.001, 0.002, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(
      `Swap ${direction === "1" ? "BTC ke R2BTC" : "R2BTC ke BTC"} sebanyak ${amount}`,
      "info"
    );
    this.log("Demo swap, implementasi swap asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async addLiquidityMenu() {
    this.printHeader();
    console.log(chalk.white("Add Liquidity"));
    const count = Number(
      await this.prompt(
        "Berapa kali ingin Add Liquidity? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(`Add Liquidity sebanyak ${count}x`, "info");
    this.log("Demo add liquidity, implementasi aslinya di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async removeLiquidityMenu() {
    this.printHeader();
    console.log(chalk.white("Remove Liquidity"));
    const count = Number(
      await this.prompt(
        "Berapa kali ingin Remove Liquidity? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(`Remove Liquidity sebanyak ${count}x`, "info");
    this.log("Demo remove liquidity, implementasi aslinya di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async stakeR2usdMenu() {
    this.printHeader();
    console.log(chalk.white("Stake R2USD"));
    const count = Number(
      await this.prompt(
        "Berapa kali ingin Stake R2USD? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah stake tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(`Stake R2USD sebanyak ${count}x, amount ${amount}`, "info");
    this.log("Demo stake, implementasi asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async unstakeSr2usdMenu() {
    this.printHeader();
    console.log(chalk.white("Unstake sR2USD"));
    const count = Number(
      await this.prompt(
        "Berapa kali ingin Unstake sR2USD? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah unstake tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(`Unstake sR2USD sebanyak ${count}x, amount ${amount}`, "info");
    this.log("Demo unstake, implementasi asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async depositBtcMenu() {
    this.printHeader();
    console.log(chalk.white("Deposit BTC"));
    const count = Number(
      await this.prompt(
        "Berapa kali ingin Deposit BTC? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah deposit BTC tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    this.log(`Deposit BTC sebanyak ${count}x, amount ${amount}`, "info");
    this.log("Demo deposit, implementasi asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async runAllFeatures() {
    this.printHeader();
    this.log("Run All Features Selected.", "success");

    // 1. Swap USDC <> R2USD
    const swapUsdcR2usdCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Swap USDC <> R2USD? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const swapUsdcR2usdAmount = Number(
      await this.prompt(
        "Enter Amount for Each Swap [1 or 0.01 or 0.001, etc in decimals] -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 2. Swap R2 <> USDC
    const swapR2UsdcCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Swap R2 <> USDC? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const swapR2UsdcAmount = Number(
      await this.prompt(
        "Enter Amount for Each Swap [1 or 0.01 or 0.001, etc in decimals] -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 3. Swap BTC <> R2BTC
    const swapBtcR2btcCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Swap BTC <> R2BTC? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const swapBtcR2btcAmount = Number(
      await this.prompt(
        "Enter BTC Amount for Each Swap [0.001, 0.002, etc] -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 4. Add Liquidity
    const addLpCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Add Liquidity? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 5. Remove Liquidity
    const removeLpCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Remove Liquidity? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 6. Stake R2USD
    const stakeCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Stake R2USD? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const stakeAmount = Number(
      await this.prompt(
        "Stake Amount Each Time? [1 or 0.01 or 0.001, etc in decimals] -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 7. Unstake sR2USD
    const unstakeCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Unstake sR2USD? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const unstakeAmount = Number(
      await this.prompt(
        "Unstake Amount Each Time? [1 or 0.01 or 0.001, etc in decimals] -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 8. Deposit BTC
    const depositBtcCount = Number(
      await this.prompt(
        "How Many Times Do You Want To Deposit BTC? -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const depositBtcAmount = Number(
      await this.prompt(
        "Deposit BTC Amount Each Time? [0.001, 0.002, etc] -> ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // 9. Delay
    const minDelay = Number(
      await this.prompt(
        "Min Delay Each Tx (seconds) -> ",
        (v) => (!isNaN(v) && Number(v) >= 0 ? true : "Masukkan angka >= 0")
      )
    );
    const maxDelay = Number(
      await this.prompt(
        "Max Delay Each Tx (seconds) -> ",
        (v) => (!isNaN(v) && Number(v) >= minDelay ? true : "Max Delay harus >= Min Delay")
      )
    );

    // 10. Proxy Option
    console.log(
      chalk.white(
        "1. Run With Free Proxyscrape Proxy\n" +
          "2. Run With Private Proxy\n" +
          "3. Run Without Proxy\n"
      )
    );
    const proxyOption = await this.prompt(
      "Choose [1/2/3] -> ",
      (v) => ["1", "2", "3"].includes(v) ? true : "Pilih 1, 2, atau 3"
    );

    // Summary (demo)
    this.printHeader();
    this.log("SUMMARY INPUT:", "success");
    console.log(
      chalk.white(
        `Swap USDC <> R2USD: ${swapUsdcR2usdCount}x, amount ${swapUsdcR2usdAmount}\n` +
          `Swap R2 <> USDC: ${swapR2UsdcCount}x, amount ${swapR2UsdcAmount}\n` +
          `Swap BTC <> R2BTC: ${swapBtcR2btcCount}x, amount ${swapBtcR2btcAmount}\n` +
          `Add Liquidity: ${addLpCount}x\n` +
          `Remove Liquidity: ${removeLpCount}x\n` +
          `Stake R2USD: ${stakeCount}x, amount ${stakeAmount}\n` +
          `Unstake sR2USD: ${unstakeCount}x, amount ${unstakeAmount}\n` +
          `Deposit BTC: ${depositBtcCount}x, amount ${depositBtcAmount}\n` +
          `Delay: min ${minDelay}s, max ${maxDelay}s\n` +
          `Proxy Option: ${proxyOption}\n`
      )
    );
    this.log("Ini hanya DEMO input interaktif seperti bot1.py!", "info");
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