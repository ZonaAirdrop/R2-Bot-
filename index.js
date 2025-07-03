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
    console.log(' R2 DEX Bot - USDC/R2 Only');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
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

// Helper functions
function getRandomAmount() {
  return Math.floor(Math.random() * 6) + 5; // 5-10 token
}

function getRandomSlippage() {
  return 0.995 + (Math.random() * 0.01); // 0.5-1.5% slippage (99.5%-98.5% of amount)
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
    logger.loading(`Approving token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`);
    const approveTx = await tokenContract.approve(spender, ethers.MaxUint256);
    await approveTx.wait();
    logger.success(`Approval success for ${spender.slice(0, 6)}...${spender.slice(-4)}`);
  }
}

async function swapSepoliaR2(isUsdcToR2, amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);

  const slippage = getRandomSlippage();
  const path = isUsdcToR2 
    ? [config.USDC_ADDRESS, config.R2_ADDRESS] 
    : [config.R2_ADDRESS, config.USDC_ADDRESS];

  const amountIn = isUsdcToR2
    ? ethers.parseUnits(amount.toString(), 6)
    : ethers.parseUnits(amount.toString(), 18);

  const amountOutMin = isUsdcToR2
    ? ethers.parseUnits((amount * slippage).toFixed(6), 6)
    : ethers.parseUnits((amount * slippage).toFixed(18), 18);

  await ensureApproval(
    path[0], 
    config.ROUTER_ADDRESS, 
    amountIn, 
    wallet, 
    isUsdcToR2 ? 6 : 18
  );

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const direction = isUsdcToR2 ? "USDC → R2" : "R2 → USDC";
  
  logger.swap(`Starting swap ${direction} (${amount} tokens, slippage ${((1-slippage)*100).toFixed(2)}%)...`);
  
  try {
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { gasLimit: 500000 }
    );
    await tx.wait();
    logger.swapSuccess(`Swap success: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error(`Swap failed: ${e.message}`);
    throw e;
  }
}

async function addLpSepoliaR2(amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.ROUTER_ADDRESS, ROUTER_ABI, wallet);

  const slippage = getRandomSlippage();
  const amountUsdc = ethers.parseUnits(amount.toString(), 6);
  const amountR2 = ethers.parseUnits(amount.toString(), 18);
  const minAmountUsdc = ethers.parseUnits((amount * slippage).toFixed(6), 6);
  const minAmountR2 = ethers.parseUnits((amount * slippage).toFixed(18), 18);

  await ensureApproval(config.USDC_ADDRESS, config.ROUTER_ADDRESS, amountUsdc, wallet, 6);
  await ensureApproval(config.R2_ADDRESS, config.ROUTER_ADDRESS, amountR2, wallet, 18);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  logger.liquidity(`Adding liquidity USDC-R2 (${amount} tokens each, slippage ${((1-slippage)*100).toFixed(2)}%)...`);

  try {
    const tx = await router.addLiquidity(
      config.USDC_ADDRESS,
      config.R2_ADDRESS,
      amountUsdc,
      amountR2,
      minAmountUsdc,
      minAmountR2,
      wallet.address,
      deadline,
      { gasLimit: 700000 }
    );
    await tx.wait();
    logger.liquiditySuccess(`Liquidity added: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error(`Add liquidity failed: ${e.message}`);
    throw e;
  }
}

async function runSwapBolakBalik(times, fn, desc, minDelay, maxDelay) {
  let isFirstDirection = true;
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`[${desc}] #${i} | Amount: ${amount} | Direction: ${isFirstDirection ? 'USDC→R2' : 'R2→USDC'}`);
    try {
      await fn(isFirstDirection, amount);
    } catch (e) {
      logger.error(`Action failed, skipping...`);
      continue;
    }
    isFirstDirection = !isFirstDirection;
    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Waiting ${delay / 1000} seconds...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function runAction(times, fn, desc, minDelay, maxDelay) {
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`[${desc}] #${i} | Amount: ${amount}`);
    try {
      await fn(amount);
    } catch (e) {
      logger.error(`Action failed, skipping...`);
      continue;
    }
    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Waiting ${delay / 1000} seconds...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

function countdown(seconds) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${colors.cyan}⏳ Next cycle in: ${seconds}s...  ${colors.reset}`);
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

  logger.info("Please input your bot parameters:");
  const swapTimes = parseInt(prompt("How many swap cycles (USDC↔R2)? "));
  const lpTimes = parseInt(prompt("How many add liquidity actions? "));
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): "));
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): "));
  const delay24h = 24 * 60 * 60;

  while (true) {
    logger.info("--- Starting Swap Sequence ---");
    await runSwapBolakBalik(
      swapTimes,
      swapSepoliaR2,
      "USDC ↔ R2 Swap",
      minDelay,
      maxDelay
    );

    logger.info("--- Starting Liquidity Sequence ---");
    await runAction(
      lpTimes,
      addLpSepoliaR2,
      "Add Liquidity",
      minDelay,
      maxDelay
    );

    logger.loading(`All tasks completed. Waiting 24 hours...`);
    await countdown(delay24h);
    logger.banner();
    logger.info("Starting new cycle...");
  }
}

mainLoop().catch(console.error);
