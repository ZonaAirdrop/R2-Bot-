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
  stake: (msg) => console.log(`${colors.cyan}[🔄] ${msg}${colors.reset}`),
  stakeSuccess: (msg) => console.log(`${colors.green}[🔒] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' R2 DEX Bot - USDC/R2 + Staking');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

// Konfigurasi Jaringan
const CONFIG = {
  RPC_URL: "https://ethereum-sepolia-rpc.publicnode.com/",
  TOKENS: {
    R2: "0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2",
    USDC: "0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2",
    R2USD: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
    SR2USD: "0x006cbf409ca275ba022111db32bdae054a97d488",
    WBTC: "0x4f5b54d4AF2568cefafA73bB062e5d734b55AA05",
    RWBTC: "0xDcb5C62EaC28d1eFc7132ad99F2Bd81973041D14"
  },
  CONTRACTS: {
    ROUTER: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
    WBTC_STAKING_ROUTER: "0x23b2615d783e16f14b62efa125306c7c69b4941a"
  }
};

const ERC20_ABI = [
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

const STAKING_ABI = [
  {
    "inputs": [
      {"internalType":"uint256","name":"amount","type":"uint256"}
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Helper Functions
function getRandomAmount(min = 2, max = 5) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSlippage(min = 0.5, max = 1) {
  return 1 - (Math.random() * (max - min) + min);
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function getTokenBalance(tokenAddress, wallet, decimals) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);
    const formattedBalance = parseFloat(ethers.formatUnits(balance, decimals));
    return formattedBalance;
  } catch (error) {
    logger.error(`Failed to get balance for token ${tokenAddress}: ${error.message}`);
    return 0;
  }
}

async function ensureApproval(tokenAddress, spender, amount, wallet, decimals) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const allowance = await tokenContract.allowance(wallet.address, spender);
    
    if (BigInt(allowance) < BigInt(amount)) {
      logger.loading(`Approving ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`);
      const tx = await tokenContract.approve(spender, ethers.MaxUint256);
      await tx.wait();
      logger.success(`Approved for ${spender.slice(0, 6)}...${spender.slice(-4)}`);
    }
  } catch (error) {
    logger.error(`Approval failed: ${error.message}`);
    throw error;
  }
}

// Core Functions
async function swapTokens(isUsdcToR2, amount) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(CONFIG.CONTRACTS.ROUTER, ROUTER_ABI, wallet);

  const slippage = getRandomSlippage();
  const path = isUsdcToR2 
    ? [CONFIG.TOKENS.USDC, CONFIG.TOKENS.R2] 
    : [CONFIG.TOKENS.R2, CONFIG.TOKENS.USDC];

  const decimals = isUsdcToR2 ? 6 : 18;
  const amountIn = ethers.parseUnits(amount.toString(), decimals);
  const amountOutMin = ethers.parseUnits((amount * slippage).toFixed(decimals), decimals);

  await ensureApproval(path[0], CONFIG.CONTRACTS.ROUTER, amountIn, wallet, decimals);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const direction = isUsdcToR2 ? "USDC→R2" : "R2→USDC";
  
  logger.swap(`Swapping ${amount} ${direction} (slippage ${((1-slippage)*100).toFixed(2)}%)`);
  
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
    logger.swapSuccess(`Swap completed: ${explorerLink(tx.hash)}`);
    return true;
  } catch (error) {
    logger.error(`Swap failed: ${error.message}`);
    return false;
  }
}

async function addLiquidity(amount) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(CONFIG.CONTRACTS.ROUTER, ROUTER_ABI, wallet);

  const slippage = getRandomSlippage();
  const amountUsdc = ethers.parseUnits(amount.toString(), 6);
  const amountR2 = ethers.parseUnits(amount.toString(), 18);
  const minAmountUsdc = ethers.parseUnits((amount * slippage).toFixed(6), 6);
  const minAmountR2 = ethers.parseUnits((amount * slippage).toFixed(18), 18);

  await ensureApproval(CONFIG.TOKENS.USDC, CONFIG.CONTRACTS.ROUTER, amountUsdc, wallet, 6);
  await ensureApproval(CONFIG.TOKENS.R2, CONFIG.CONTRACTS.ROUTER, amountR2, wallet, 18);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  logger.liquidity(`Adding liquidity (${amount} USDC & R2)`);

  try {
    const tx = await router.addLiquidity(
      CONFIG.TOKENS.USDC,
      CONFIG.TOKENS.R2,
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
    return true;
  } catch (error) {
    logger.error(`Add liquidity failed: ${error.message}`);
    return false;
  }
}

async function stakeTokens(tokenType, amount) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  let tokenAddress, stakingAddress, decimals;
  
  if (tokenType === 'R2USD') {
    tokenAddress = CONFIG.TOKENS.R2USD;
    stakingAddress = CONFIG.TOKENS.SR2USD;
    decimals = 6;
  } else { // WBTC
    tokenAddress = CONFIG.TOKENS.WBTC;
    stakingAddress = CONFIG.CONTRACTS.WBTC_STAKING_ROUTER;
    decimals = 8;
  }

  const stakingContract = new ethers.Contract(stakingAddress, STAKING_ABI, wallet);
  const amountWei = ethers.parseUnits(amount.toString(), decimals);

  // Check balance
  const balance = await getTokenBalance(tokenAddress, wallet, decimals);
  logger.info(`Your ${tokenType} Balance: ${balance.toFixed(decimals)}`);
  
  if (balance < amount) {
    logger.error(`Insufficient balance. Available: ${balance.toFixed(decimals)} ${tokenType}`);
    return false;
  }

  await ensureApproval(tokenAddress, stakingAddress, amountWei, wallet, decimals);

  logger.stake(`Staking ${amount} ${tokenType}`);
  
  try {
    const tx = await stakingContract.stake(amountWei, { gasLimit: 300000 });
    await tx.wait();
    logger.stakeSuccess(`Staking completed: ${explorerLink(tx.hash)}`);
    return true;
  } catch (error) {
    logger.error(`Staking failed: ${error.message}`);
    return false;
  }
}

// Bot Operations
async function runSwapSequence(times, minDelay, maxDelay) {
  let isUsdcToR2 = true;
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`Swap #${i}: ${amount} tokens (${isUsdcToR2 ? 'USDC→R2' : 'R2→USDC'})`);
    
    await swapTokens(isUsdcToR2, amount);
    isUsdcToR2 = !isUsdcToR2;

    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Waiting ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function runLiquiditySequence(times, minDelay, maxDelay) {
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`Liquidity #${i}: ${amount} tokens each`);
    
    await addLiquidity(amount);

    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Waiting ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function runStakingSequence(r2usdAmount, wbtcAmount) {
  if (r2usdAmount > 0) {
    logger.step(`Staking R2USD: ${r2usdAmount} tokens`);
    await stakeTokens('R2USD', r2usdAmount);
  }
  
  if (wbtcAmount > 0) {
    logger.step(`Staking WBTC: ${wbtcAmount} tokens`);
    await stakeTokens('WBTC', wbtcAmount);
  }
}

// User Interface
async function getUserInput() {
  const prompt = promptSync({ sigint: true });
  logger.banner();

  logger.info("Please configure your bot parameters:");
  
  const swapTimes = parseInt(prompt("Number of swap cycles (USDC↔R2): ")) || 0;
  const lpTimes = parseInt(prompt("Number of liquidity additions: ")) || 0;
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): ")) || 5000;
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): ")) || 15000;

  // Get staking amounts
  logger.info("\n┌───────────────────────┐");
  logger.info("│      STAKING SETUP    │");
  logger.info("└───────────────────────┘");
  
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Display balances with proper formatting
  const r2usdBalance = await getTokenBalance(CONFIG.TOKENS.R2USD, wallet, 6);
  logger.info(`Your R2USD Balance: ${r2usdBalance.toFixed(6)}`);
  const r2usdAmount = parseFloat(prompt("Amount of R2USD to stake (0 to skip): ")) || 0;

  const wbtcBalance = await getTokenBalance(CONFIG.TOKENS.WBTC, wallet, 8);
  logger.info(`Your WBTC Balance: ${wbtcBalance.toFixed(8)}`);
  const wbtcAmount = parseFloat(prompt("Amount of WBTC to stake (0 to skip): ")) || 0;

  return { swapTimes, lpTimes, minDelay, maxDelay, r2usdAmount, wbtcAmount };
}

function countdown(seconds) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`\r${colors.cyan}⏳ Next cycle in: ${seconds}s ${colors.reset}`);
      seconds--;
      if (seconds < 0) {
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000);
  });
}

// Main Bot Loop
async function main() {
  try {
    const { swapTimes, lpTimes, minDelay, maxDelay, r2usdAmount, wbtcAmount } = await getUserInput();
    const cycleDelay = 24 * 60 * 60; // 24 hours in seconds

    while (true) {
      logger.info("\n══════════════════════════════════════════════");
      logger.info("            STARTING NEW BOT CYCLE            ");
      logger.info("══════════════════════════════════════════════");

      // Run staking first if amounts are specified
      if (r2usdAmount > 0 || wbtcAmount > 0) {
        logger.info("\nStarting Staking Sequence...");
        await runStakingSequence(r2usdAmount, wbtcAmount);
      }

      // Run swaps if specified
      if (swapTimes > 0) {
        logger.info("\nStarting Swap Sequence...");
        await runSwapSequence(swapTimes, minDelay, maxDelay);
      }

      // Run liquidity if specified
      if (lpTimes > 0) {
        logger.info("\nStarting Liquidity Sequence...");
        await runLiquiditySequence(lpTimes, minDelay, maxDelay);
      }

      logger.success("\nCycle completed successfully!");
      logger.loading(`Waiting for next cycle...`);
      await countdown(cycleDelay);
    }
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
