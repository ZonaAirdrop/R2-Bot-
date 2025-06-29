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
  }

  printHeader() {
    console.clear();
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════"));
    console.log(chalk.bold.cyan("               R2 CLI BOT INTERFACE"));
    console.log(chalk.cyan("───────────────────────────────────────────────────"));
    if (this.wallet)
      console.log(
        chalk.gray(
          `Address: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`
        )
      );
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════\n"));
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
          "3. Add Liquidity\n" +
          "4. Remove Liquidity\n" +
          "5. Stake R2USD\n" +
          "6. Unstake sR2USD\n" +
          "7. Run All Features\n" +
          "8. Exit\n"
        )
      );
      const choice = await this.prompt("> Choose [1-8]: ", (ans) => {
        if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(ans))
          return true;
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
        await this.runAllFeatures();
      } else if (choice === "8") {
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
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    for (let i = 1; i <= count; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${i} Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < count) await new Promise(res => setTimeout(res, delay * 1000));
    }

    this.log(
      `Swap ${direction === "1" ? "USDC ke R2USD" : "R2USD ke USDC"} sebanyak ${amount} sebanyak ${count}x`,
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
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    for (let i = 1; i <= count; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${i} Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < count) await new Promise(res => setTimeout(res, delay * 1000));
    }

    this.log(
      `Swap ${direction === "1" ? "R2 ke USDC" : "USDC ke R2"} sebanyak ${amount} sebanyak ${count}x`,
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
    for (let i = 1; i <= count; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${i} Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < count) await new Promise(res => setTimeout(res, delay * 1000));
    }
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
    for (let i = 1; i <= count; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${i} Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < count) await new Promise(res => setTimeout(res, delay * 1000));
    }
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
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah stake tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    for (let i = 1; i <= count; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${i} Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < count) await new Promise(res => setTimeout(res, delay * 1000));
    }
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
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah unstake tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    for (let i = 1; i <= count; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${i} Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < count) await new Promise(res => setTimeout(res, delay * 1000));
    }
    this.log(`Unstake sR2USD sebanyak ${count}x, amount ${amount}`, "info");
    this.log("Demo unstake, implementasi asli di sini", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async runAllFeatures() {
    this.printHeader();
    console.log(chalk.white("Run All Features"));
    
    // Get parameters for each feature
    const swapUsdcR2usdCount = Number(
      await this.prompt(
        "Berapa kali ingin melakukan transaksi swap USDC <> R2USD? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const swapR2UsdcCount = Number(
      await this.prompt(
        "Berapa kali ingin melakukan transaksi swap R2 <> USDC? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const addLiquidityCount = Number(
      await this.prompt(
        "Berapa kali ingin Add Liquidity? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const removeLiquidityCount = Number(
      await this.prompt(
        "Berapa kali ingin Remove Liquidity? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const stakeR2usdCount = Number(
      await this.prompt(
        "Berapa kali ingin Stake R2USD? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const unstakeSr2usdCount = Number(
      await this.prompt(
        "Berapa kali ingin Unstake sR2USD? ",
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
    
    const swapUsdcR2usdAmount = Number(
      await this.prompt(
        "Masukkan jumlah swap USDC <> R2USD (misal: 1, 0.01, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const swapR2UsdcAmount = Number(
      await this.prompt(
        "Masukkan jumlah swap R2 <> USDC (misal: 1, 0.01, dst): ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const stakeR2usdAmount = Number(
      await this.prompt(
        "Masukkan jumlah stake R2USD tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const unstakeSr2usdAmount = Number(
      await this.prompt(
        "Masukkan jumlah unstake sR2USD tiap kali? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );

    // Run all features in sequence
    let txCounter = 1;
    
    // Swap USDC <> R2USD
    for (let i = 1; i <= swapUsdcR2usdCount; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${txCounter++} (USDC<>R2USD ${i}/${swapUsdcR2usdCount}) Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < swapUsdcR2usdCount || swapR2UsdcCount > 0 || addLiquidityCount > 0 || removeLiquidityCount > 0 || stakeR2usdCount > 0 || unstakeSr2usdCount > 0) {
        await new Promise(res => setTimeout(res, delay * 1000));
      }
    }
    
    // Swap R2 <> USDC
    for (let i = 1; i <= swapR2UsdcCount; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${txCounter++} (R2<>USDC ${i}/${swapR2UsdcCount}) Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < swapR2UsdcCount || addLiquidityCount > 0 || removeLiquidityCount > 0 || stakeR2usdCount > 0 || unstakeSr2usdCount > 0) {
        await new Promise(res => setTimeout(res, delay * 1000));
      }
    }
    
    // Add Liquidity
    for (let i = 1; i <= addLiquidityCount; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${txCounter++} (Add Liquidity ${i}/${addLiquidityCount}) Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < addLiquidityCount || removeLiquidityCount > 0 || stakeR2usdCount > 0 || unstakeSr2usdCount > 0) {
        await new Promise(res => setTimeout(res, delay * 1000));
      }
    }
    
    // Remove Liquidity
    for (let i = 1; i <= removeLiquidityCount; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${txCounter++} (Remove Liquidity ${i}/${removeLiquidityCount}) Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < removeLiquidityCount || stakeR2usdCount > 0 || unstakeSr2usdCount > 0) {
        await new Promise(res => setTimeout(res, delay * 1000));
      }
    }
    
    // Stake R2USD
    for (let i = 1; i <= stakeR2usdCount; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${txCounter++} (Stake R2USD ${i}/${stakeR2usdCount}) Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < stakeR2usdCount || unstakeSr2usdCount > 0) {
        await new Promise(res => setTimeout(res, delay * 1000));
      }
    }
    
    // Unstake sR2USD
    for (let i = 1; i <= unstakeSr2usdCount; i++) {
      const blockNumber = await this.provider.getBlockNumber();
      const explorerUrl = `https://sepolia.etherscan.io/block/${blockNumber}`;
      this.log(`TX ${txCounter++} (Unstake sR2USD ${i}/${unstakeSr2usdCount}) Blok: ${blockNumber} Explore: ${explorerUrl}`, "success");
      const delay = randomDelay(minDelay, maxDelay);
      this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
      if (i < unstakeSr2usdCount) {
        await new Promise(res => setTimeout(res, delay * 1000));
      }
    }
    
    this.log("Semua fitur telah dijalankan!", "success");
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