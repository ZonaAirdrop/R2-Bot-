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
    
    // Contract addresses (replace with your actual contract addresses)
    this.contracts = {
      usdc: "0xYourUsdcContractAddress",
      r2usd: "0xYourR2UsdContractAddress",
      r2: "0xYourR2ContractAddress",
      staking: "0xYourStakingContractAddress",
      btcBridge: "0xYourBtcBridgeContractAddress",
      swapRouter: "0xYourSwapRouterAddress"
    };
    
    // Contract ABIs (simplified examples)
    this.abis = {
      erc20: [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address recipient, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)"
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
    console.log(chalk.bold.cyan("═══════════════════════════════════════════════════"));
    console.log(chalk.bold.cyan("               R2 CLI BOT INTERFACE"));
    console.log(chalk.cyan("───────────────────────────────────────────────────"));
    if (this.wallet) {
      console.log(
        chalk.gray(
          `Address: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`
        )
      );
    }
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
          "1. Swap USDC <> R2USD\n" +
          "2. Swap R2 <> USDC\n" +
          "3. Add Liquidity\n" +
          "4. Remove Liquidity\n" +
          "5. Stake R2USD\n" +
          "6. Unstake sR2USD\n" +
          "7. Deposit BTC\n" +
          "8. Run All Features\n" +
          "9. Exit\n"
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

  async depositBtcMenu() {
    this.printHeader();
    console.log(chalk.white("Deposit BTC"));
    
    const btcAddress = await this.prompt(
      "Masukkan alamat BTC tujuan: ",
      (v) => v.trim().length > 0 ? true : "Alamat BTC tidak boleh kosong"
    );
    
    const amount = Number(
      await this.prompt(
        "Masukkan jumlah BTC yang akan di deposit: ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    
    const count = Number(
      await this.prompt(
        "Berapa kali ingin melakukan deposit? ",
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
        (v) => (!isNaN(v) && Number(v) >= minDelay ? true : "Masukkan angka >= Min Delay"
      )
    );

    try {
      const btcBridgeContract = new ethers.Contract(
        this.contracts.btcBridge,
        this.abis.btcBridge,
        this.wallet
      );
      
      for (let i = 1; i <= count; i++) {
        this.log(`Mempersiapkan deposit BTC ke ${btcAddress} sebesar ${amount} BTC (${i}/${count})`, "info");
        
        // Convert BTC amount to satoshis/wei equivalent (adjust based on your contract)
        const amountInWei = ethers.parseUnits(amount.toString(), 8);
        
        const tx = await btcBridgeContract.depositBTC(
          btcAddress,
          amountInWei,
          { value: amountInWei } // Adjust if your contract requires different value
        );
        
        const receipt = await tx.wait();
        this.log(`Deposit BTC berhasil! TX Hash: ${receipt.hash}`, "success");
        
        if (i < count) {
          const delay = randomDelay(minDelay, maxDelay);
          this.log(`Menunggu ${delay} detik sebelum transaksi berikutnya...`, "info");
          await new Promise(res => setTimeout(res, delay * 1000));
        }
      }
    } catch (error) {
      this.log(`Error saat deposit BTC: ${error.message}`, "error");
    }
    
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
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

    try {
      const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
      const r2usdContract = new ethers.Contract(this.contracts.r2usd, this.abis.erc20, this.wallet);
      const swapRouterContract = new ethers.Contract(this.contracts.swapRouter, this.abis.swap, this.wallet);

      const amountInWei = ethers.parseUnits(amount.toString(), 18); // Adjust decimals as needed

      for (let i = 1; i <= count; i++) {
        if (direction === "1") {
          // USDC → R2USD
          // 1. Approve USDC spending
          const approveTx = await usdcContract.approve(this.contracts.swapRouter, amountInWei);
          await approveTx.wait();
          
          // 2. Execute swap
          const path = [this.contracts.usdc, this.contracts.r2usd];
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
          const swapTx = await swapRouterContract.swapExactTokensForTokens(
            amountInWei,
            0, // amountOutMin - set proper slippage tolerance
            path,
            this.wallet.address,
            deadline
          );
          const receipt = await swapTx.wait();
          this.log(`Swap USDC → R2USD berhasil! TX Hash: ${receipt.hash}`, "success");
        } else {
          // R2USD → USDC
          // Similar logic but reverse the path
          const approveTx = await r2usdContract.approve(this.contracts.swapRouter, amountInWei);
          await approveTx.wait();
          
          const path = [this.contracts.r2usd, this.contracts.usdc];
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
          const swapTx = await swapRouterContract.swapExactTokensForTokens(
            amountInWei,
            0,
            path,
            this.wallet.address,
            deadline
          );
          const receipt = await swapTx.wait();
          this.log(`Swap R2USD → USDC berhasil! TX Hash: ${receipt.hash}`, "success");
        }

        if (i < count) {
          const delay = randomDelay(minDelay, maxDelay);
          this.log(`Menunggu ${delay} detik sebelum transaksi berikutnya...`, "info");
          await new Promise(res => setTimeout(res, delay * 1000));
        }
      }
    } catch (error) {
      this.log(`Error saat swap: ${error.message}`, "error");
    }

    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  // Add other menu functions here with similar error handling
  // ...

  async runAllFeatures() {
    this.printHeader();
    console.log(chalk.white("Run All Features"));
    
    // Get parameters for all features including BTC deposit
    const swapUsdcR2usdCount = Number(
      await this.prompt(
        "Berapa kali ingin melakukan transaksi swap USDC <> R2USD? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    // ... (other prompts)
    const depositBtcCount = Number(
      await this.prompt(
        "Berapa kali ingin melakukan deposit BTC? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    const btcAddress = await this.prompt(
      "Masukkan alamat BTC tujuan: ",
      (v) => v.trim().length > 0 ? true : "Alamat BTC tidak boleh kosong"
    );
    const btcAmount = Number(
      await this.prompt(
        "Masukkan jumlah BTC yang akan di deposit: ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    // ... (rest of the prompts)

    // Run all features including BTC deposit
    let txCounter = 1;
    
    // ... (existing feature executions)
    
    // BTC Deposit
    if (depositBtcCount > 0) {
      try {
        const btcBridgeContract = new ethers.Contract(
          this.contracts.btcBridge,
          this.abis.btcBridge,
          this.wallet
        );
        
        for (let i = 1; i <= depositBtcCount; i++) {
          const amountInWei = ethers.parseUnits(btcAmount.toString(), 8);
          
          const tx = await btcBridgeContract.depositBTC(
            btcAddress,
            amountInWei,
            { value: amountInWei }
          );
          
          const receipt = await tx.wait();
          this.log(`TX ${txCounter++} (Deposit BTC ${i}/${depositBtcCount}) Berhasil! TX Hash: ${receipt.hash}`, "success");
          
          if (i < depositBtcCount) {
            const delay = randomDelay(minDelay, maxDelay);
            this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
            await new Promise(res => setTimeout(res, delay * 1000));
          }
        }
      } catch (error) {
        this.log(`Error saat deposit BTC: ${error.message}`, "error");
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