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
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
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
  return 0.97; // 3% slippage → accept at least 97%
}

function getRandomAmount(min = 1, max = 3) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function getTokenBalance(tokenAddress, wallet, decimals) {
  const token = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  const raw = await token.balanceOf(wallet.address);
  return Number(ethers.formatUnits(raw, decimals));
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

async function ensureApproval(token, spender, amount, wallet, decimals) {
  const contract = new ethers.Contract(token, ERC20ABI, wallet);
  const allowance = await contract.allowance(wallet.address, spender);
  if (allowance < amount) {
    logger.loading(`Approving ${token.slice(0, 6)}...`);
    const tx = await contract.approve(spender, ethers.MaxUint256);
    await tx.wait();
    logger.success(`Approval complete for ${spender.slice(0, 6)}...`);
  }
}

async function swapTokens(isUsdcToR2, amount) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(CONFIG.CONTRACTS.ROUTER, ROUTER_ABI, wallet);

  const path = isUsdcToR2
    ? [CONFIG.TOKENS.USDC, CONFIG.TOKENS.R2]
    : [CONFIG.TOKENS.R2, CONFIG.TOKENS.USDC];

  const decimals = isUsdcToR2 ? 6 : 18;
  const amountIn = ethers.parseUnits(amount.toString(), decimals);
  const amountOutMin = amountIn * BigInt(Math.floor(getFixedSlippage() * 100)) / 100n;

  await ensureApproval(path[0], CONFIG.CONTRACTS.ROUTER, amountIn, wallet, decimals);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  logger.swap(`Swapping ${amount} ${isUsdcToR2 ? 'USDC→R2' : 'R2→USDC'}`);

  try {
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { gasLimit: 500_000 }
    );
    await tx.wait();
    logger.swapSuccess(`Swap complete: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error(`Swap failed: ${e.message}`);
  }
}

async function addLiquidity(amount) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(CONFIG.CONTRACTS.ROUTER, ROUTER_ABI, wallet);

  const usdcAmount = ethers.parseUnits(amount.toString(), 6);
  const r2Amount = ethers.parseUnits(amount.toString(), 18);
  const minUsdc = usdcAmount * BigInt(Math.floor(getFixedSlippage() * 100)) / 100n;
  const minR2 = r2Amount * BigInt(Math.floor(getFixedSlippage() * 100)) / 100n;

  await ensureApproval(CONFIG.TOKENS.USDC, CONFIG.CONTRACTS.ROUTER, usdcAmount, wallet, 6);
  await ensureApproval(CONFIG.TOKENS.R2, CONFIG.CONTRACTS.ROUTER, r2Amount, wallet, 18);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  logger.liquidity(`Adding Liquidity: ${amount} USDC & R2`);

  try {
    const tx = await router.addLiquidity(
      CONFIG.TOKENS.USDC,
      CONFIG.TOKENS.R2,
      usdcAmount,
      r2Amount,
      minUsdc,
      minR2,
      wallet.address,
      deadline,
      { gasLimit: 700_000 }
    );
    await tx.wait();
    logger.liquiditySuccess(`Liquidity added: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error(`Add liquidity failed: ${e.message}`);
  }
}

async function getUserInput() {
  const prompt = promptSync({ sigint: true });
  logger.banner();

  logger.info("Konfigurasi parameter bot:");
  const swapTimes = parseInt(prompt("How many times swap USDC↔R2? ")) || 0;
  const lpTimes = parseInt(prompt("How many times add liquidity? ")) || 0;
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): ")) || 5000;
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): ")) || 15000;

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  await showAllBalances(wallet);

  return { swapTimes, lpTimes, minDelay, maxDelay };
}

async function runSwapSequence(times, minDelay, maxDelay) {
  let isUsdcToR2 = true;
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`Swap #${i}: ${amount}`);
    await swapTokens(isUsdcToR2, amount);
    isUsdcToR2 = !isUsdcToR2;

    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Tunggu ${delay / 1000} detik...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function runLiquiditySequence(times, minDelay, maxDelay) {
  for (let i = 1; i <= times; i++) {
    const amount = getRandomAmount();
    logger.step(`Liquidity #${i}: ${amount}`);
    await addLiquidity(amount);

    if (i < times) {
      const delay = getRandomDelay(minDelay, maxDelay);
      logger.loading(`Tunggu ${delay / 1000} detik...`);
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
        await runSwapSequence(swapTimes, minDelay, maxDelay);
      }

      if (lpTimes > 0) {
        await runLiquiditySequence(lpTimes, minDelay, maxDelay);
      }

      logger.success("✅ Cycle Completed!");
      await countdown(cycleDelay);
    }
  } catch (e) {
    logger.error(`Fatal error: ${e.message}`);
    process.exit(1);
  }
}

main();
