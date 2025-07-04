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

// Chain Config
const CONFIG = {
  RPC_URL: "https://ethereum-sepolia-rpc.publicnode.com/",
  CONTRACTS: {
    ROUTER: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
    SR2USD: "0x006cbf409ca275ba022111db32bdae054a97d488",
    WBTC_STAKING: "0x23b2615d783e16f14b62efa125306c7c69b4941a",
  },
  TOKENS: {
    USDC: "0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2",
    R2: "0xb816bB88f836EA75Ca4071B46FF285f690C43bb7",
    R2USD: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
    WBTC: "0x4f5b54d4AF2568cefafA73bB062e5d734b55AA05",
  }
};

const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256[])",
  "function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"
];

const STAKING_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Utils
function getFixedSlippage() {
  return 0.05;
}

function getRandomAmount(min = 1, max = 3) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 0.05)) + min;
}

function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function getTokenBalance(tokenAddress, wallet, decimals) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  const balance = await tokenContract.balanceOf(wallet.address);
  return parseFloat(ethers.formatUnits(balance, decimals));
}

async function showAllBalances(wallet) {
  const usdc = await getTokenBalance(CONFIG.TOKENS.USDC, wallet, 6);
  const r2 = await getTokenBalance(CONFIG.TOKENS.R2, wallet, 18);
  const r2usd = await getTokenBalance(CONFIG.TOKENS.R2USD, wallet, 6);
  const wbtc = await getTokenBalance(CONFIG.TOKENS.WBTC, wallet, 8);

  logger.info("┌───────────────────────┐");
  logger.info("│     TOKEN BALANCES    │");
  logger.info("└───────────────────────┘");
  logger.info(`USDC:   ${usdc}`);
  logger.info(`R2:     ${r2}`);
  logger.info(`R2USD:  ${r2usd}`);
  logger.info(`WBTC:   ${wbtc}`);
}

async function ensureApproval(tokenAddress, spender, amount, wallet, decimals) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  const allowance = await tokenContract.allowance(wallet.address, spender);
  if (BigInt(allowance) < BigInt(amount)) {
    logger.loading(`Approving ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`);
    const tx = await tokenContract.approve(spender, ethers.MaxUint256);
    await tx.wait();
    logger.success(`Approved for ${spender.slice(0, 6)}...${spender.slice(-4)}`);
  }
}

// Core Bot

async function swapTokens(isUsdcToR2, amount) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(CONFIG.CONTRACTS.ROUTER, ROUTER_ABI, wallet);

  const slippage = getFixedSlippage();
  const path = isUsdcToR2 ? [CONFIG.TOKENS.USDC, CONFIG.TOKENS.R2] : [CONFIG.TOKENS.R2, CONFIG.TOKENS.USDC];

  const decimals = isUsdcToR2 ? 6 : 18;
  const amountIn = ethers.parseUnits(amount.toString(), decimals);
  const amountOutMin = ethers.parseUnits((amount * slippage).toFixed(decimals), decimals);

  await ensureApproval(path[0], CONFIG.CONTRACTS.ROUTER, amountIn, wallet, decimals);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const direction = isUsdcToR2 ? "USDC→R2" : "R2→USDC";
  logger.swap(`Swapping ${amount} ${direction} (slippage 3%)`);

  try {
    const tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, wallet.address, deadline, { gasLimit: 500000 });
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

  const slippage = getFixedSlippage();
  const amountUsdc = ethers.parseUnits(amount.toString(), 6);
  const amountR2 = ethers.parseUnits(amount.toString(), 18);
  const minAmountUsdc = ethers.parseUnits((amount * slippage).toFixed(6), 6);
  const minAmountR2 = ethers.parseUnits((amount * slippage).toFixed(18), 18);

  await ensureApproval(CONFIG.TOKENS.USDC, CONFIG.CONTRACTS.ROUTER, amountUsdc, wallet, 6);
  await ensureApproval(CONFIG.TOKENS.R2, CONFIG.CONTRACTS.ROUTER, amountR2, wallet, 18);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  logger.liquidity(`Adding liquidity (${amount} USDC & R2)`);

  try {
    const tx = await router.addLiquidity(CONFIG.TOKENS.USDC, CONFIG.TOKENS.R2, amountUsdc, amountR2, minAmountUsdc, minAmountR2, wallet.address, deadline, { gasLimit: 700000 });
    await tx.wait();
    logger.liquiditySuccess(`Liquidity added: ${explorerLink(tx.hash)}`);
    return true;
  } catch (error) {
    logger.error(`Add liquidity failed: ${error.message}`);
    return false;
  }
}

async function getUserInput() {
  const prompt = promptSync({ sigint: true });
  logger.banner();

  logger.info("Konfigurasi parameter bot:");
  const swapTimes = parseInt(prompt("Berapa kali swap USDC↔R2? ")) || 0;
  const lpTimes = parseInt(prompt("Berapa kali add liquidity? ")) || 0;
  const minDelay = parseInt(prompt("Delay minimum antar aksi (ms): ")) || 5000;
  const maxDelay = parseInt(prompt("Delay maksimum antar aksi (ms): ")) || 15000;

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  await showAllBalances(wallet);

  return { swapTimes, lpTimes, minDelay, maxDelay };
}

async function runSwapSequence(times, minDelay, maxDelay) {
  let isUsdcToR2 = true;
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`Swap #${i}: ${amount} tokens (${isUsdcToR2 ? 'USDC→R2' : 'R2→USDC'})`);
    await swapTokens(isUsdcToR2, amount);
    isUsdcToR2 = !isUsdcToR2;

    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Menunggu ${delay / 1000} detik...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function runLiquiditySequence(times, minDelay, maxDelay) {
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`Add Liquidity #${i}: ${amount}`);
    await addLiquidity(amount);

    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Menunggu ${delay / 1000} detik...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function countdown(seconds) {
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

async function main() {
  try {
    const { swapTimes, lpTimes, minDelay, maxDelay } = await getUserInput();
    const cycleDelay = 24 * 60 * 60;

    while (true) {
      logger.info("\n═════════════════════════════════════");
      logger.info("         MULAI BOT CYCLE BARU        ");
      logger.info("═════════════════════════════════════");

      if (swapTimes > 0) {
        logger.info("\nMulai swap...");
        await runSwapSequence(swapTimes, minDelay, maxDelay);
      }

      if (lpTimes > 0) {
        logger.info("\nMulai add liquidity...");
        await runLiquiditySequence(lpTimes, minDelay, maxDelay);
      }

      logger.success("\n✅ Bot cycle selesai!");
      logger.loading("Menunggu cycle berikutnya...");
      await countdown(cycleDelay);
    }
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
