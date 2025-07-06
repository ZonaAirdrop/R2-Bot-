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
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
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
  liquidity: (msg) => console.log(`${colors.cyan}[💧] ${msg}${colors.reset}`),
  liquiditySuccess: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  balance: (msg) => console.log(`${colors.blue}[💰] ${msg}${colors.reset}`),
  block: (msg) => console.log(`${colors.magenta}[📦] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' R2 Final zonaairdrop');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
  separator: (title) => {
    console.log(`${colors.yellow}${'='.repeat(50)}`);
    console.log(`${colors.yellow}${colors.bold} ${title} ${colors.reset}`);
    console.log(`${colors.yellow}${'='.repeat(50)}${colors.reset}`);
  }
};

// Configuration untuk R2 to USDC swaps dan liquidity
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
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
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

// Utility functions
function getRandomAmount() {
  return 50;
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function displayBalances(provider, wallet) {
  try {
    const config = SEPOLIA_R2_CONFIG;
    const currentBlock = await provider.getBlockNumber();
    
    logger.block(`Current Block: ${currentBlock}`);
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    logger.balance(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Get R2 balance
    const r2Contract = new ethers.Contract(config.R2_ADDRESS, ERC20ABI, provider);
    const r2Balance = await r2Contract.balanceOf(wallet.address);
    logger.balance(`R2 Balance: ${ethers.formatUnits(r2Balance, 18)} R2`);
    
    // Get USDC balance
    const usdcContract = new ethers.Contract(config.USDC_ADDRESS, ERC20ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    logger.balance(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    
    console.log('');
  } catch (error) {
    logger.error(`Error getting balances: ${error.message}`);
  }
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

async function swapSepoliaR2(isUsdcToR2, amount) {
  logger.separator("SWAP SECTION");
  
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);

  // Display balances before swap
  await displayBalances(provider, wallet);

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

  // Display balances after swap
  logger.info("Balance setelah swap:");
  await displayBalances(provider, wallet);
  
  logger.separator("END SWAP SECTION");
}

async function addLpSepoliaR2(amount) {
  logger.separator("ADD LIQUIDITY SECTION");
  
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);
  
  // Display balances before add liquidity
  await displayBalances(provider, wallet);
  
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

  // Display balances after add liquidity
  logger.info("Balance setelah add liquidity:");
  await displayBalances(provider, wallet);
  
  logger.separator("END ADD LIQUIDITY SECTION");
}

async function runSwapBolakBalik(times, fn, desc, minDelay, maxDelay) {
  let isFirstDirection = true;
  for (let i = 1; i <= times; i++) {
    let amount = getRandomAmount();
    logger.step(`[${desc}] #${i} | Jumlah: ${amount} | Arah: ${isFirstDirection ? 'USDC→R2' : 'R2→USDC'}`);
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
  const swapSepoliaR2Times = parseInt(prompt("How many bidirectional swaps USDC <-> R2 on Sepolia R2? "));
  const addLpSepoliaR2Times = parseInt(prompt("How many add liquidity actions on Sepolia R2? "));
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): "));
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): "));
  const delay24h = 24 * 60 * 60;

  while (true) {
    logger.info("--- Starting swap & LP sequence ---");
    
    // R2 to USDC swap
    if (swapSepoliaR2Times > 0) {
      await runSwapBolakBalik(
        swapSepoliaR2Times,
        swapSepoliaR2,
        "Bidirectional Swap Sepolia R2 (USDC ↔️ R2)",
        minDelay,
        maxDelay
      );
    }
    
    // R2 to USDC liquidity
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
