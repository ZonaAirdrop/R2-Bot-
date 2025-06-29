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
    // Contract ABIs (simplified examples)
    this.abis = {
      erc20: [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address recipient, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
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

    const amount = await this.prompt(
      "Masukkan jumlah BTC yang akan di deposit: ",
      (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
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
        (v) => (!isNaN(v) && Number(v) >= minDelay ? true : "Masukkan angka >= Min Delay")
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

        // amount dari user (string) jadi parseUnits pakai 8 decimals
        const amountInWei = ethers.parseUnits(amount, 8);

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
    
    try {
      const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
      const r2usdContract = new ethers.Contract(this.contracts.r2usd, this.abis.erc20, this.wallet);
      
      // Ambil balance dan decimals
      const [usdcBalance, r2usdBalance, usdcDecimals, r2usdDecimals] = await Promise.all([
        usdcContract.balanceOf(this.wallet.address),
        r2usdContract.balanceOf(this.wallet.address),
        usdcContract.decimals(),
        r2usdContract.decimals()
      ]);
      
      const formattedUsdcBalance = ethers.formatUnits(usdcBalance, usdcDecimals);
      const formattedR2usdBalance = ethers.formatUnits(r2usdBalance, r2usdDecimals);
      
      this.log(`Balance USDC: ${formattedUsdcBalance}`, "info");
      this.log(`Balance R2USD: ${formattedR2usdBalance}`, "info");
      
    } catch (error) {
      this.log(`Gagal mengambil balance: ${error.message}`, "error");
    }
    
    const amount = await this.prompt(
      "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
      (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
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

    try {
      const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
      const r2usdContract = new ethers.Contract(this.contracts.r2usd, this.abis.erc20, this.wallet);
      const swapRouterContract = new ethers.Contract(this.contracts.swapRouter, this.abis.swap, this.wallet);

      const usdcDecimals = await usdcContract.decimals();
      const r2usdDecimals = await r2usdContract.decimals();

      const amountInWei =
        direction === "1"
          ? ethers.parseUnits(amount, usdcDecimals)
          : ethers.parseUnits(amount, r2usdDecimals);

      // Cek balance lagi sebelum eksekusi
      const balance = direction === "1" 
        ? await usdcContract.balanceOf(this.wallet.address)
        : await r2usdContract.balanceOf(this.wallet.address);
        
      if (balance < amountInWei) {
        throw new Error(`Balance tidak cukup. Dibutuhkan: ${amount}, Tersedia: ${
          ethers.formatUnits(balance, direction === "1" ? usdcDecimals : r2usdDecimals)
        }`);
      }

      for (let i = 1; i <= count; i++) {
        try {
          if (direction === "1") {
            // USDC → R2USD
            this.log(`Memberikan allowance untuk USDC...`, "info");
            const approveTx = await usdcContract.approve(this.contracts.swapRouter, amountInWei);
            await approveTx.wait();

            const path = [this.contracts.usdc, this.contracts.r2usd];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            this.log(`Melakukan swap USDC → R2USD...`, "info");
            const swapTx = await swapRouterContract.swapExactTokensForTokens(
              amountInWei,
              1, // Minimal amountOutMin di-set ke 1 untuk menghindari error
              path,
              this.wallet.address,
              deadline
            );
            const receipt = await swapTx.wait();
            this.log(`Swap USDC → R2USD berhasil! TX Hash: ${receipt.hash}`, "success");
          } else {
            // R2USD → USDC
            this.log(`Memberikan allowance untuk R2USD...`, "info");
            const approveTx = await r2usdContract.approve(this.contracts.swapRouter, amountInWei);
            await approveTx.wait();

            const path = [this.contracts.r2usd, this.contracts.usdc];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            this.log(`Melakukan swap R2USD → USDC...`, "info");
            const swapTx = await swapRouterContract.swapExactTokensForTokens(
              amountInWei,
              1,
              path,
              this.wallet.address,
              deadline
            );
            const receipt = await swapTx.wait();
            this.log(`Swap R2USD → USDC berhasil! TX Hash: ${receipt.hash}`, "success");
          }
        } catch (error) {
          this.log(`Error pada transaksi ke-${i}: ${error.message}`, "error");
          // Lanjut ke transaksi berikutnya jika ada error
          continue;
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

  async swapR2UsdcMenu() {
    this.printHeader();
    console.log(chalk.white("Swap R2 <> USDC"));
    console.log(chalk.white("1. R2 → USDC\n2. USDC → R2"));
    const direction = await this.prompt(
      "Pilih arah swap [1/2]: ",
      (v) => ["1", "2"].includes(v) ? true : "Pilih 1 atau 2"
    );
    
    try {
      const r2Contract = new ethers.Contract(this.contracts.r2, this.abis.erc20, this.wallet);
      const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
      
      // Ambil balance dan decimals
      const [r2Balance, usdcBalance, r2Decimals, usdcDecimals] = await Promise.all([
        r2Contract.balanceOf(this.wallet.address),
        usdcContract.balanceOf(this.wallet.address),
        r2Contract.decimals(),
        usdcContract.decimals()
      ]);
      
      const formattedR2Balance = ethers.formatUnits(r2Balance, r2Decimals);
      const formattedUsdcBalance = ethers.formatUnits(usdcBalance, usdcDecimals);
      
      this.log(`Balance R2: ${formattedR2Balance}`, "info");
      this.log(`Balance USDC: ${formattedUsdcBalance}`, "info");
      
    } catch (error) {
      this.log(`Gagal mengambil balance: ${error.message}`, "error");
    }
    
    const amount = await this.prompt(
      "Masukkan jumlah swap (misal: 1, 0.01, dst): ",
      (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
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

    try {
      const r2Contract = new ethers.Contract(this.contracts.r2, this.abis.erc20, this.wallet);
      const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
      const swapRouterContract = new ethers.Contract(this.contracts.swapRouter, this.abis.swap, this.wallet);

      const r2Decimals = await r2Contract.decimals();
      const usdcDecimals = await usdcContract.decimals();

      const amountInWei =
        direction === "1"
          ? ethers.parseUnits(amount, r2Decimals)
          : ethers.parseUnits(amount, usdcDecimals);

      // Cek balance lagi sebelum eksekusi
      const balance = direction === "1" 
        ? await r2Contract.balanceOf(this.wallet.address)
        : await usdcContract.balanceOf(this.wallet.address);
        
      if (balance < amountInWei) {
        throw new Error(`Balance tidak cukup. Dibutuhkan: ${amount}, Tersedia: ${
          ethers.formatUnits(balance, direction === "1" ? r2Decimals : usdcDecimals)
        }`);
      }

      for (let i = 1; i <= count; i++) {
        try {
          if (direction === "1") {
            // R2 → USDC
            this.log(`Memberikan allowance untuk R2...`, "info");
            const approveTx = await r2Contract.approve(this.contracts.swapRouter, amountInWei);
            await approveTx.wait();

            const path = [this.contracts.r2, this.contracts.usdc];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            this.log(`Melakukan swap R2 → USDC...`, "info");
            const swapTx = await swapRouterContract.swapExactTokensForTokens(
              amountInWei,
              1, // Minimal amountOutMin di-set ke 1 untuk menghindari error
              path,
              this.wallet.address,
              deadline
            );
            const receipt = await swapTx.wait();
            this.log(`Swap R2 → USDC berhasil! TX Hash: ${receipt.hash}`, "success");
          } else {
            // USDC → R2
            this.log(`Memberikan allowance untuk USDC...`, "info");
            const approveTx = await usdcContract.approve(this.contracts.swapRouter, amountInWei);
            await approveTx.wait();

            const path = [this.contracts.usdc, this.contracts.r2];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            this.log(`Melakukan swap USDC → R2...`, "info");
            const swapTx = await swapRouterContract.swapExactTokensForTokens(
              amountInWei,
              1,
              path,
              this.wallet.address,
              deadline
            );
            const receipt = await swapTx.wait();
            this.log(`Swap USDC → R2 berhasil! TX Hash: ${receipt.hash}`, "success");
          }
        } catch (error) {
          this.log(`Error pada transaksi ke-${i}: ${error.message}`, "error");
          // Lanjut ke transaksi berikutnya jika ada error
          continue;
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

  async addLiquidityMenu() {
    this.printHeader();
    this.log("Fitur Add Liquidity belum diimplementasikan", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async removeLiquidityMenu() {
    this.printHeader();
    this.log("Fitur Remove Liquidity belum diimplementasikan", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async stakeR2usdMenu() {
    this.printHeader();
    this.log("Fitur Stake R2USD belum diimplementasikan", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

  async unstakeSr2usdMenu() {
    this.printHeader();
    this.log("Fitur Unstake sR2USD belum diimplementasikan", "info");
    await this.prompt("Tekan Enter untuk kembali ke menu utama...");
  }

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
    
    const swapR2UsdcCount = Number(
      await this.prompt(
        "Berapa kali ingin melakukan transaksi swap R2 <> USDC? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    
    const depositBtcCount = Number(
      await this.prompt(
        "Berapa kali ingin melakukan deposit BTC? ",
        (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
      )
    );
    
    const btcAddress = depositBtcCount > 0 ? await this.prompt(
      "Masukkan alamat BTC tujuan: ",
      (v) => v.trim().length > 0 ? true : "Alamat BTC tidak boleh kosong"
    ) : "";
    
    const btcAmount = depositBtcCount > 0 ? await this.prompt(
      "Masukkan jumlah BTC yang akan di deposit: ",
      (v) => (!isNaN(v) && Number(v) > 0 ? true : "Masukkan angka > 0")
    ) : "0";
    
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

    // Run all features
    let txCounter = 1;

    // Swap USDC <> R2USD
    if (swapUsdcR2usdCount > 0) {
      try {
        const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
        const r2usdContract = new ethers.Contract(this.contracts.r2usd, this.abis.erc20, this.wallet);
        const swapRouterContract = new ethers.Contract(this.contracts.swapRouter, this.abis.swap, this.wallet);

        const usdcDecimals = await usdcContract.decimals();
        const r2usdDecimals = await r2usdContract.decimals();
        const amountInWei = ethers.parseUnits("1", usdcDecimals); // Default amount 1 USDC

        for (let i = 1; i <= swapUsdcR2usdCount; i++) {
          try {
            this.log(`Memberikan allowance untuk USDC...`, "info");
            const approveTx = await usdcContract.approve(this.contracts.swapRouter, amountInWei);
            await approveTx.wait();

            const path = [this.contracts.usdc, this.contracts.r2usd];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            this.log(`Melakukan swap USDC → R2USD...`, "info");
            const swapTx = await swapRouterContract.swapExactTokensForTokens(
              amountInWei,
              1,
              path,
              this.wallet.address,
              deadline
            );
            const receipt = await swapTx.wait();
            this.log(`TX ${txCounter++} (Swap USDC→R2USD ${i}/${swapUsdcR2usdCount}) Berhasil! TX Hash: ${receipt.hash}`, "success");

            if (i < swapUsdcR2usdCount) {
              const delay = randomDelay(minDelay, maxDelay);
              this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
              await new Promise(res => setTimeout(res, delay * 1000));
            }
          } catch (error) {
            this.log(`Error pada transaksi swap USDC→R2USD ke-${i}: ${error.message}`, "error");
            continue;
          }
        }
      } catch (error) {
        this.log(`Error saat swap USDC→R2USD: ${error.message}`, "error");
      }
    }

    // Swap R2 <> USDC
    if (swapR2UsdcCount > 0) {
      try {
        const r2Contract = new ethers.Contract(this.contracts.r2, this.abis.erc20, this.wallet);
        const usdcContract = new ethers.Contract(this.contracts.usdc, this.abis.erc20, this.wallet);
        const swapRouterContract = new ethers.Contract(this.contracts.swapRouter, this.abis.swap, this.wallet);

        const r2Decimals = await r2Contract.decimals();
        const amountInWei = ethers.parseUnits("1", r2Decimals); // Default amount 1 R2

        for (let i = 1; i <= swapR2UsdcCount; i++) {
          try {
            this.log(`Memberikan allowance untuk R2...`, "info");
            const approveTx = await r2Contract.approve(this.contracts.swapRouter, amountInWei);
            await approveTx.wait();

            const path = [this.contracts.r2, this.contracts.usdc];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            
            this.log(`Melakukan swap R2 → USDC...`, "info");
            const swapTx = await swapRouterContract.swapExactTokensForTokens(
              amountInWei,
              1,
              path,
              this.wallet.address,
              deadline
            );
            const receipt = await swapTx.wait();
            this.log(`TX ${txCounter++} (Swap R2→USDC ${i}/${swapR2UsdcCount}) Berhasil! TX Hash: ${receipt.hash}`, "success");

            if (i < swapR2UsdcCount) {
              const delay = randomDelay(minDelay, maxDelay);
              this.log(`Delay sebelum TX berikutnya: ${delay} detik`, "info");
              await new Promise(res => setTimeout(res, delay * 1000));
            }
          } catch (error) {
            this.log(`Error pada transaksi swap R2→USDC ke-${i}: ${error.message}`, "error");
            continue;
          }
        }
      } catch (error) {
        this.log(`Error saat swap R2→USDC: ${error.message}`, "error");
      }
    }

    // BTC Deposit
    if (depositBtcCount > 0) {
      try {
        const btcBridgeContract = new ethers.Contract(
          this.contracts.btcBridge,
          this.abis.btcBridge,
          this.wallet
        );

        for (let i = 1; i <= depositBtcCount; i++) {
          try {
            const amountInWei = ethers.parseUnits(btcAmount, 8);

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
          } catch (error) {
            this.log(`Error pada transaksi deposit BTC ke-${i}: ${error.message}`, "error");
            continue;
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