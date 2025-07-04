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
const SEPOLIA_R2_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  R2_ADDRESS: process.env.R2_ADDRESS,
  USDC_ADDRESS: process.env.R2_USDC_ADDRESS,
  ROUTER_ADDRESS: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
  
  // Staking Contracts
  R2USD_ADDRESS: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  SR2USD_ADDRESS: "0x006cbf409ca275ba022111db32bdae054a97d488", // decimal 6
  WBTC_ADDRESS: "0x4f5b54d4AF2568cefafA73bB062e5d734b55AA05",
  RWBTC_ADDRESS: "0xDcb5C62EaC28d1eFc7132ad99F2Bd81973041D14", // decimal 8
  WBTC_STAKING_ROUTER: "0x23b2615d783e16f14b62efa125306c7c69b4941a"
};

const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
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

// Helper functions
function getRandomAmount() {
  return Math.floor(Math.random() * 6) + 5; // 5-10 token
}

function getRandomSlippage() {
  return 0.995 + (Math.random() * 0.01); // 0.5-1.5% slippage
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function explorerLink(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

async function getTokenBalance(tokenAddress, wallet, decimals) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  const balance = await tokenContract.balanceOf(wallet.address);
  return ethers.formatUnits(balance, decimals);
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

async function stakeR2USD(amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const stakingContract = new ethers.Contract(config.SR2USD_ADDRESS, STAKING_ABI, wallet);
  const amountWei = ethers.parseUnits(amount.toString(), 6);
  
  // Cek balance
  const balance = await getTokenBalance(config.R2USD_ADDRESS, wallet, 6);
  logger.info(`Your R2USD Balance: ${balance}`);
  
  if (parseFloat(balance) < amount) {
    throw new Error(`Insufficient R2USD balance. You have ${balance}, trying to stake ${amount}`);
  }
  
  await ensureApproval(config.R2USD_ADDRESS, config.SR2USD_ADDRESS, amountWei, wallet, 6);
  
  logger.stake(`Staking ${amount} R2USD to sR2USD...`);
  try {
    const tx = await stakingContract.stake(amountWei, { gasLimit: 300000 });
    await tx.wait();
    logger.stakeSuccess(`Staking success: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error(`Staking failed: ${e.message}`);
    throw e;
  }
}

async function stakeWBTC(amount) {
  const config = SEPOLIA_R2_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const stakingContract = new ethers.Contract(config.WBTC_STAKING_ROUTER, STAKING_ABI, wallet);
  const amountWei = ethers.parseUnits(amount.toString(), 8);
  
  // Cek balance
  const balance = await getTokenBalance(config.WBTC_ADDRESS, wallet, 8);
  logger.info(`Your WBTC Balance: ${balance}`);
  
  if (parseFloat(balance) < amount) {
    throw new Error(`Insufficient WBTC balance. You have ${balance}, trying to stake ${amount}`);
  }
  
  await ensureApproval(config.WBTC_ADDRESS, config.WBTC_STAKING_ROUTER, amountWei, wallet, 8);
  
  logger.stake(`Staking ${amount} WBTC to rWBTC...`);
  try {
    const tx = await stakingContract.stake(amountWei, { gasLimit: 300000 });
    await tx.wait();
    logger.stakeSuccess(`Staking success: ${explorerLink(tx.hash)}`);
  } catch (e) {
    logger.error(`Staking failed: ${e.message}`);
    throw e;
  }
}

async function promptStaking() {
  const prompt = promptSync({ sigint: true });
  
  // Staking R2USD
  logger.info("\n=== R2USD Staking ===");
  const provider = new ethers.JsonRpcProvider(SEPOLIA_R2_CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const r2usdBalance = await getTokenBalance(SEPOLIA_R2_CONFIG.R2USD_ADDRESS, wallet, 6);
  logger.info(`Your R2USD Balance: ${r2usdBalance}`);
  const r2usdAmount = parseFloat(prompt("Amount of R2USD to stake: "));
  
  // Staking WBTC
  logger.info("\n=== WBTC Staking ===");
  const wbtcBalance = await getTokenBalance(SEPOLIA_R2_CONFIG.WBTC_ADDRESS, wallet, 8);
  logger.info(`Your WBTC Balance: ${wbtcBalance}`);
  const wbtcAmount = parseFloat(prompt("Amount of WBTC to stake: "));
  
  return { r2usdAmount, wbtcAmount };
}

async function mainLoop() {
  const prompt = promptSync({ sigint: true });
  logger.banner();

  logger.info("Please input your bot parameters:");
  const swapTimes = parseInt(prompt("How many swap cycles (USDC↔R2)? "));
  const lpTimes = parseInt(prompt("How many add liquidity actions? "));
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): "));
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): "));
  
  // Prompt staking amounts
  const { r2usdAmount, wbtcAmount } = await promptStaking();
  const delay24h = 24 * 60 * 60;

  while (true) {
    // Jalankan staking terlebih dahulu
    logger.info("--- Starting Staking Sequence ---");
    try {
      if (r2usdAmount > 0) {
        await stakeR2USD(r2usdAmount);
      }
      if (wbtcAmount > 0) {
        await stakeWBTC(wbtcAmount);
      }
    } catch (e) {
      logger.error(`Staking sequence failed: ${e.message}`);
    }

    // Lanjut ke swap dan liquidity
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
