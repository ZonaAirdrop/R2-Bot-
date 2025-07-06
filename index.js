require("dotenv/config");
const { ethers } = require("ethers");
const promptSync = require("prompt-sync");

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
  stake: (msg) => console.log(`${colors.cyan}[🔒] ${msg}${colors.reset}`),
  stakeSuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' R2 Final zonaairdrop');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

// Configuration for R2 to USDC swaps and liquidity (keeping unchanged)
const SEPOLIA_R2_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  R2_ADDRESS: process.env.R2_ADDRESS,
  USDC_ADDRESS: process.env.R2_USDC_ADDRESS,
  ROUTER_ADDRESS: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"
};

// New staking configurations
const BTC_STAKING_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  BTC_ADDRESS: "0x4f5b54d4AF2568cefafA73bB062e5d734b55AA05",
  ROUTER_ADDRESS: "0x23b2615d783E16F14B62EfA125306c7c69B4941A"
};

const R2USD_STAKING_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  R2USD_ADDRESS: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  ROUTER_ADDRESS: "0x006CbF409CA275bA022111dB32BDAE054a97d488"
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

// Staking ABI dengan method selector 0x1a5f0f00
const STAKING_ABI = [
  "function stake(uint256 amount) external"
];

// Utility functions
function getRandomAmount() {
  return 1;
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function ensureApproval(tokenAddress, spender, amount, wallet, decimals) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  let allowance = await tokenContract.allowance(wallet.address, spender);
  if (BigInt(allowance) < BigInt(amount)) {
    logger.loading(`Approve token ${tokenAddress} ke ${spender}`);
    const approveTx = await tokenContract.approve(spender, ethers.parseUnits("1000000", decimals));
    await approveTx.wait();
    logger.success(`Approve berhasil untuk ${spender}`);
  }
}

// Keep existing R2 to USDC swap function unchanged
async function swapSepoliaR2(isUsdcToR2, amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);

  if (isUsdcToR2) {
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    await ensureApproval(config.USDC_ADDRESS, config.ROUTER_ADDRESS, amountWei, wallet, 6);
    const path = [config.USDC_ADDRESS, config.R2_ADDRESS];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    logger.swap(`Mulai swap USDC → R2 sebesar ${amount} token...`);
    const tx = await router.swapExactTokensForTokens(
      amountWei,
      0,
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
    const tx = await router.swapExactTokensForTokens(
      amountWei,
      0,
      path,
      wallet.address,
      deadline
    );
    await tx.wait();
    logger.swapSuccess(`Swap selesai: ${explorerLink(tx.hash)}`);
  }
}

// Keep existing R2 to USDC liquidity function unchanged
async function addLpSepoliaR2(amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);
  const amountUsdc = ethers.parseUnits(amount.toString(), 6);
  const amountR2 = ethers.parseUnits(amount.toString(), 18);

  await ensureApproval(config.USDC_ADDRESS, config.ROUTER_ADDRESS, amountUsdc, wallet, 6);
  await ensureApproval(config.R2_ADDRESS, config.ROUTER_ADDRESS, amountR2, wallet, 18);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  logger.liquidity(`Mulai add liquidity USDC-R2 sebesar ${amount} token...`);
  const tx = await router.addLiquidity(
    config.USDC_ADDRESS,
    config.R2_ADDRESS,
    amountUsdc,
    amountR2,
    0, 0,
    wallet.address,
    deadline
  );
  await tx.wait();
  logger.liquiditySuccess(`Add Liquidity selesai: ${explorerLink(tx.hash)}`);
}

// New BTC to R2WBTC staking function
async function stakeBtcToR2Wbtc(amount) {
  const config = BTC_STAKING_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Check balance first
  const btcContract = new ethers.Contract(config.BTC_ADDRESS, ERC20ABI, wallet);
  const balance = await btcContract.balanceOf(wallet.address);
  const amountWei = ethers.parseUnits(amount.toString(), 8);
  
  if (BigInt(balance) < BigInt(amountWei)) {
    logger.error(`Insufficient BTC balance. Balance: ${ethers.formatUnits(balance, 8)}, Required: ${amount}`);
    return;
  }
  
  logger.info(`BTC Balance: ${ethers.formatUnits(balance, 8)} BTC`);
  
  await ensureApproval(config.BTC_ADDRESS, config.ROUTER_ADDRESS, amountWei, wallet, 8);
  
  logger.stake(`Mulai stake BTC → R2WBTC sebesar ${amount} token...`);
  
  try {
    const stakingRouter = new ethers.Contract(config.ROUTER_ADDRESS, STAKING_ABI, wallet);
    const tx = await stakingRouter.stake(amountWei);
    await tx.wait();
    logger.stakeSuccess(`Staking BTC selesai: ${explorerLink(tx.hash)}`);
  } catch (error) {
    logger.error(`Staking BTC failed: ${error.message}`);
    // Try alternative method if main method fails
    logger.loading("Trying alternative staking method...");
    const stakingRouterAlt = new ethers.Contract(config.ROUTER_ADDRESS, ["function stake(uint256) external"], wallet);
    const tx = await stakingRouterAlt.stake(amountWei);
    await tx.wait();
    logger.stakeSuccess(`Staking BTC selesai (alternative method): ${explorerLink(tx.hash)}`);
  }
}

// New R2USD to SR2USD staking function
async function stakeR2UsdToSr2Usd(amount) {
  const config = R2USD_STAKING_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Check balance first
  const r2usdContract = new ethers.Contract(config.R2USD_ADDRESS, ERC20ABI, wallet);
  const balance = await r2usdContract.balanceOf(wallet.address);
  const amountWei = ethers.parseUnits(amount.toString(), 6);
  
  if (BigInt(balance) < BigInt(amountWei)) {
    logger.error(`Insufficient R2USD balance. Balance: ${ethers.formatUnits(balance, 6)}, Required: ${amount}`);
    return;
  }
  
  logger.info(`R2USD Balance: ${ethers.formatUnits(balance, 6)} R2USD`);
  
  await ensureApproval(config.R2USD_ADDRESS, config.ROUTER_ADDRESS, amountWei, wallet, 6);
  
  logger.stake(`Mulai stake R2USD → SR2USD sebesar ${amount} token...`);
  
  try {
    const stakingRouter = new ethers.Contract(config.ROUTER_ADDRESS, STAKING_ABI, wallet);
    const tx = await stakingRouter.stake(amountWei);
    await tx.wait();
    logger.stakeSuccess(`Staking R2USD selesai: ${explorerLink(tx.hash)}`);
  } catch (error) {
    logger.error(`Staking R2USD failed: ${error.message}`);
    // Try alternative method if main method fails
    logger.loading("Trying alternative staking method...");
    const stakingRouterAlt = new ethers.Contract(config.ROUTER_ADDRESS, ["function stake(uint256) external"], wallet);
    const tx = await stakingRouterAlt.stake(amountWei);
    await tx.wait();
    logger.stakeSuccess(`Staking R2USD selesai (alternative method): ${explorerLink(tx.hash)}`);
  }
}

// Utility for running swap & LP bolak-balik
async function runSwapBolakBalik(times, fn, desc, minDelay, maxDelay) {
  let isFirstDirection = true;
  for (let i = 1; i <= times; i++) {
    let amount = getRandomAmount();
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
    let amount = getRandomAmount();
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
  const stakeBtcTimes = parseInt(prompt("How many BTC to R2WBTC staking actions? "));
  const stakeR2UsdTimes = parseInt(prompt("How many R2USD to SR2USD staking actions? "));
  const swapSepoliaR2Times = parseInt(prompt("How many bidirectional swaps USDC <-> R2 on Sepolia R2? "));
  const addLpSepoliaR2Times = parseInt(prompt("How many add liquidity actions on Sepolia R2? "));
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): "));
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): "));
  const delay24h = 24 * 60 * 60;

  while (true) {
    logger.info("--- Starting staking, swap & LP sequence ---");
    
    // BTC to R2WBTC staking
    if (stakeBtcTimes > 0) {
      await runAction(
        stakeBtcTimes,
        stakeBtcToR2Wbtc,
        "BTC to R2WBTC Staking",
        minDelay,
        maxDelay
      );
    }
    
    // R2USD to SR2USD staking
    if (stakeR2UsdTimes > 0) {
      await runAction(
        stakeR2UsdTimes,
        stakeR2UsdToSr2Usd,
        "R2USD to SR2USD Staking",
        minDelay,
        maxDelay
      );
    }
    
    // Existing R2 to USDC swap (keeping unchanged)
    if (swapSepoliaR2Times > 0) {
      await runSwapBolakBalik(
        swapSepoliaR2Times,
        swapSepoliaR2,
        "Bidirectional Swap Sepolia R2 (USDC ↔️ R2)",
        minDelay,
        maxDelay
      );
    }
    
    // Existing R2 to USDC liquidity (keeping unchanged)
    if (addLpSepoliaR2Times > 0) {
      await runAction(
        addLpSepoliaR2Times,
        addLpSepoliaR2,
        "Add Liquidity Sepolia R2 (USDC-R2)",
        minDelay,
        maxDelay
      );
    }
    
    logger.success("Semua aktivitas selesai!");
    logger.info(`Menunggu 24 jam untuk siklus berikutnya...`);
    await countdown(delay24h);
  }
}

// Start the main loop
mainLoop().catch(console.error);
