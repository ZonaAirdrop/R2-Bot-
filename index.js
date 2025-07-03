import "dotenv/config";
import { ethers } from "ethers";
import promptSync from "prompt-sync";

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  swap: (msg) => console.log(`${colors.cyan}[↪️] ${msg}${colors.reset}`),
  swapSuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  liquidity: (msg) => console.log(`${colors.cyan}[↪️] ${msg}${colors.reset}`),
  liquiditySuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' R2 Final zonaairdrop');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

const SEPOLIA_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  USDC_ADDRESS: process.env.USDC_ADDRESS,
  R2USD_ADDRESS: process.env.R2USD_ADDRESS,
  ROUTER_USDC_TO_R2USD: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  ROUTER_R2USD_TO_USDC: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
};
const SEPOLIA_R2_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  R2_ADDRESS: process.env.R2_ADDRESS,
  USDC_ADDRESS: process.env.R2_USDC_ADDRESS,
  ROUTER_ADDRESS: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"
};
const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
const ROUTER_ABI = [
  {
    "inputs": [
      {"internalType":"uint256","name":"amountIn","type":"uint256"},
      {"internalType":"uint256","name":"amountOutMin","type":"uint256"},
      {"internalType":"address[]","name":"path","type":"address[]"},
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType":"address","name":"tokenA","type":"address"},
      {"internalType":"address","name":"tokenB","type":"address"},
      {"internalType":"uint256","name":"amountADesired","type":"uint256"},
      {"internalType":"uint256","name":"amountBDesired","type":"uint256"},
      {"internalType":"uint256","name":"amountAMin","type":"uint256"},
      {"internalType":"uint256","name":"amountBMin","type":"uint256"},
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "name": "addLiquidity",
    "outputs": [
      {"internalType":"uint256","name":"amountA","type":"uint256"},
      {"internalType":"uint256","name":"amountB","type":"uint256"},
      {"internalType":"uint256","name":"liquidity","type":"uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// SLIPPAGE SETTINGS (sama untuk swap & add liquidity)
const SLIPPAGE_R2USD = 0.001; // 0.1% (USDC <-> R2USD Sepolia)
const SLIPPAGE_R2 = 0.005;    // 0.5% (USDC <-> R2 Sepolia R2)

function getRandomAmount() {
  return Math.floor(Math.random() * 51) + 50;
}
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function ensureApproval(tokenAddress, spender, amount, wallet, decimals) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
    let allowance = await tokenContract.allowance(wallet.address, spender);
    if (BigInt(allowance) < BigInt(amount)) {
      logger.loading(`Approve token ${tokenAddress} ke ${spender}`);
      const approveTx = await tokenContract.approve(spender, ethers.parseUnits("1000000", decimals));
      await approveTx.wait();
      logger.success(`Approve berhasil untuk ${spender}`);
    }
  } catch (e) {
    logger.error("Approve gagal, error: " + e.message);
  }
}

// Swap USDC <-> R2USD Sepolia
async function swapSepolia(isUsdcToR2usd, amount) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  try {
    if (isUsdcToR2usd) {
      const amountWei = ethers.parseUnits(amount.toString(), 6);
      await ensureApproval(config.USDC_ADDRESS, config.ROUTER_USDC_TO_R2USD, amountWei, wallet, 6);
      logger.swap(`Mulai swap USDC → R2USD sebesar ${amount} token...`);
      const methodId = "0x095e7a95";
      const data = ethers.concat([
        methodId,
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
          [wallet.address, amountWei, 0, 0, 0, 0, 0]
        ),
      ]);
      const tx = await wallet.sendTransaction({
        to: config.ROUTER_USDC_TO_R2USD,
        data: data,
        gasLimit: 500000
      });
      await tx.wait();
      logger.swapSuccess(`Swap selesai: ${explorerLink(tx.hash)}`);
    } else {
      const amountWei = ethers.parseUnits(amount.toString(), 6);
      await ensureApproval(config.R2USD_ADDRESS, config.ROUTER_R2USD_TO_USDC, amountWei, wallet, 6);
      logger.swap(`Mulai swap R2USD → USDC sebesar ${amount} token...`);
      const minDy = ethers.parseUnits(
        (parseFloat(amount) * (1 - SLIPPAGE_R2USD)).toFixed(6), 6
      );
      const methodId = "0x3df02124";
      const data = ethers.concat([
        methodId,
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["int128", "int128", "uint256", "uint256"],
          [0, 1, amountWei, minDy]
        ),
      ]);
      const tx = await wallet.sendTransaction({
        to: config.ROUTER_R2USD_TO_USDC,
        data: data,
        gasLimit: 500000
      });
      await tx.wait();
      logger.swapSuccess(`Swap selesai: ${explorerLink(tx.hash)}`);
    }
  } catch (e) {
    logger.error("Swap USDC <-> R2USD gagal, error: " + (e.reason || e.message));
  }
}

// Add Liquidity USDC-R2USD Sepolia
async function addLpR2Sepolia(amount) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_USDC_TO_R2USD, ROUTER_ABI, wallet);
  const amountWei = ethers.parseUnits(amount.toString(), 6);

  try {
    await ensureApproval(config.USDC_ADDRESS, config.ROUTER_USDC_TO_R2USD, amountWei, wallet, 6);
    await ensureApproval(config.R2USD_ADDRESS, config.ROUTER_USDC_TO_R2USD, amountWei, wallet, 6);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    logger.liquidity(`Mulai add liquidity USDC-R2USD sebesar ${amount} token...`);
    // Min amount pakai slippage R2USD
    const amountAMin = ethers.parseUnits((amount * (1 - SLIPPAGE_R2USD)).toFixed(6), 6);
    const amountBMin = ethers.parseUnits((amount * (1 - SLIPPAGE_R2USD)).toFixed(6), 6);

    const tx = await router.addLiquidity(
      config.USDC_ADDRESS,
      config.R2USD_ADDRESS,
      amountWei,
      amountWei,
      amountAMin,
      amountBMin,
      wallet.address,
      deadline
    );
    await tx.wait();
    logger.liquiditySuccess(`Add Liquidity selesai: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error("Add liquidity USDC-R2USD gagal, error: " + (e.reason || e.message));
  }
}

// Swap USDC <-> R2 Sepolia R2
async function swapSepoliaR2(isUsdcToR2, amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);

  try {
    if (isUsdcToR2) {
      const amountWei = ethers.parseUnits(amount.toString(), 6);
      await ensureApproval(config.USDC_ADDRESS, config.ROUTER_ADDRESS, amountWei, wallet, 6);
      const path = [config.USDC_ADDRESS, config.R2_ADDRESS];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      logger.swap(`Mulai swap USDC → R2 sebesar ${amount} token...`);
      const minAmountOut = ethers.parseUnits(
        (parseFloat(amount) * (1 - SLIPPAGE_R2)).toFixed(6), 18
      );
      const tx = await router.swapExactTokensForTokens(
        amountWei,
        minAmountOut,
        path,
        wallet.address,
        deadline
      );
      await tx.wait();
      logger.swapSuccess(`Swap selesai: ${explorerLink(tx.hash)}`);
    } else {
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await ensureApproval(config.R2_ADDRESS, config.ROUTER_ADDRESS, amountWei, wallet, 18);
      const path = [config.R2_ADDRESS, config.USDC_ADDRESS];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      logger.swap(`Mulai swap R2 → USDC sebesar ${amount} token...`);
      const minAmountOut = ethers.parseUnits(
        (parseFloat(amount) * (1 - SLIPPAGE_R2)).toFixed(6), 6
      );
      const tx = await router.swapExactTokensForTokens(
        amountWei,
        minAmountOut,
        path,
        wallet.address,
        deadline
      );
      await tx.wait();
      logger.swapSuccess(`Swap selesai: ${explorerLink(tx.hash)}`);
    }
  } catch (e) {
    logger.error("Swap USDC <-> R2 gagal, error: " + (e.reason || e.message));
  }
}

// Add Liquidity USDC-R2 Sepolia R2
async function addLpSepoliaR2(amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);
  const amountUsdc = ethers.parseUnits(amount.toString(), 6);
  const amountR2 = ethers.parseUnits(amount.toString(), 18);

  try {
    await ensureApproval(config.USDC_ADDRESS, config.ROUTER_ADDRESS, amountUsdc, wallet, 6);
    await ensureApproval(config.R2_ADDRESS, config.ROUTER_ADDRESS, amountR2, wallet, 18);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    logger.liquidity(`Mulai add liquidity USDC-R2 sebesar ${amount} token...`);
    // Min amount pakai slippage R2
    const amountAMin = ethers.parseUnits((amount * (1 - SLIPPAGE_R2)).toFixed(6), 6);
    const amountBMin = ethers.parseUnits((amount * (1 - SLIPPAGE_R2)).toFixed(6), 18);

    const tx = await router.addLiquidity(
      config.USDC_ADDRESS,
      config.R2_ADDRESS,
      amountUsdc,
      amountR2,
      amountAMin,
      amountBMin,
      wallet.address,
      deadline
    );
    await tx.wait();
    logger.liquiditySuccess(`Add Liquidity selesai: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error("Add liquidity USDC-R2 gagal, error: " + (e.reason || e.message));
  }
}

async function runSwapBolakBalik(times, fn, desc, minDelay, maxDelay) {
  let isFirstDirection = true;
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`[${desc}] #${i} | Jumlah: ${amount} | Arah: ${isFirstDirection ? 'A→B' : 'B→A'}`);
    try {
      await fn(isFirstDirection, amount);
    } catch (e) {
      logger.error(e.message);
    }
    isFirstDirection = !isFirstDirection;
    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Tunggu ${delay / 1000} detik...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}
async function runAction(times, fn, desc, minDelay, maxDelay) {
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`[${desc}] #${i} | Jumlah: ${amount}`);
    try {
      await fn(amount);
    } catch (e) {
      logger.error(e.message);
    }
    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Tunggu ${delay / 1000} detik...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}
function countdown(seconds) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${colors.cyan}⏳ Menunggu siklus berikutnya: ${seconds}s...  ${colors.reset}`);
      seconds--;
      if (seconds < 0) {
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000);
  });
}

async function mainLoop() {
  const prompt = promptSync({ sigint: true });
  logger.banner();

  logger.info("Please input your bot parameters.");
  const swapR2SepoliaTimes = parseInt(prompt("How many bidirectional swaps USDC <-> R2USD on R2 Sepolia? "));
  const addLpR2SepoliaTimes = parseInt(prompt("How many add liquidity actions on R2 Sepolia? "));
  const swapSepoliaR2Times = parseInt(prompt("How many bidirectional swaps USDC <-> R2 on Sepolia R2? "));
  const addLpSepoliaR2Times = parseInt(prompt("How many add liquidity actions on Sepolia R2? "));
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): "));
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): "));
  const delay24h = 24 * 60 * 60;

  while (true) {
    logger.info("--- Starting R2 Sepolia swap & LP sequence ---");
    await runSwapBolakBalik(
      swapR2SepoliaTimes,
      swapSepolia,
      "Bidirectional Swap R2 Sepolia (USDC ↔️ R2USD)",
      minDelay,
      maxDelay
    );
    await runAction(
      addLpR2SepoliaTimes,
      addLpR2Sepolia,
      "Add Liquidity R2 Sepolia",
      minDelay,
      maxDelay
    );
    logger.success("All swaps and add liquidity actions on R2 Sepolia completed.");

    logger.info("--- Starting Sepolia R2 swap & LP sequence ---");
    await runSwapBolakBalik(
      swapSepoliaR2Times,
      swapSepoliaR2,
      "Bidirectional Swap Sepolia R2 (USDC ↔️ R2)",
      minDelay,
      maxDelay
    );
    await runAction(
      addLpSepoliaR2Times,
      addLpSepoliaR2,
      "Add Liquidity Sepolia R2",
      minDelay,
      maxDelay
    );
    logger.success("All swaps and add liquidity actions on Sepolia R2 completed.");

    logger.loading(`All tasks completed. Waiting 24 hours before next cycle...`);
    await countdown(delay24h);
    logger.banner();
    logger.info("Starting the next cycle...");
  }
}

mainLoop();
