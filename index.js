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
  balance: (msg) => console.log(`${colors.cyan}[💰] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' R2 DEX Bot - USDC/R2 + Staking + Balance Check');
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

// ... (ABI lainnya tetap sama seperti sebelumnya)

// Helper Functions
async function getTokenBalance(tokenAddress, wallet, decimals) {
  try {
    if (tokenAddress === 'ETH') {
      const balance = await wallet.getBalance();
      return parseFloat(ethers.formatUnits(balance, 18));
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (error) {
    logger.error(`Failed to get balance: ${error.message}`);
    return 0;
  }
}

// Tambahkan fungsi untuk menampilkan semua balance
async function showAllBalances(wallet) {
  logger.balance("Checking all balances...");
  
  // ETH Balance
  const ethBalance = await getTokenBalance('ETH', wallet, 18);
  logger.balance(`ETH Balance: ${ethBalance.toFixed(6)}`);

  // Token Balances
  const tokens = [
    { symbol: 'R2', address: CONFIG.TOKENS.R2, decimals: 18 },
    { symbol: 'USDC', address: CONFIG.TOKENS.USDC, decimals: 6 },
    { symbol: 'R2USD', address: CONFIG.TOKENS.R2USD, decimals: 6 },
    { symbol: 'WBTC', address: CONFIG.TOKENS.WBTC, decimals: 8 },
    { symbol: 'RWBTC', address: CONFIG.TOKENS.RWBTC, decimals: 8 }
  ];

  for (const token of tokens) {
    const balance = await getTokenBalance(token.address, wallet, token.decimals);
    logger.balance(`${token.symbol} Balance: ${balance.toFixed(token.decimals)}`);
  }
}

// ... (fungsi-fungsi helper lainnya tetap sama)

// User Interface
async function getUserInput() {
  const prompt = promptSync({ sigint: true });
  logger.banner();

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Tampilkan semua balance terlebih dahulu
  await showAllBalances(wallet);
  console.log("\n");

  logger.info("Please configure your bot parameters:");
  
  const swapTimes = parseInt(prompt("Number of swap cycles (USDC↔R2): ")) || 0;
  const lpTimes = parseInt(prompt("Number of liquidity additions: ")) || 0;
  const minDelay = parseInt(prompt("Minimum delay between actions (ms): ")) || 5000;
  const maxDelay = parseInt(prompt("Maximum delay between actions (ms): ")) || 15000;

  // Get staking amounts
  logger.info("\n┌───────────────────────┐");
  logger.info("│      STAKING SETUP    │");
  logger.info("└───────────────────────┘");
  
  const r2usdAmount = parseFloat(prompt("Amount of R2USD to stake (0 to skip): ")) || 0;
  const wbtcAmount = parseFloat(prompt("Amount of WBTC to stake (0 to skip): ")) || 0;

  return { swapTimes, lpTimes, minDelay, maxDelay, r2usdAmount, wbtcAmount };
}

// ... (fungsi-fungsi lainnya tetap sama seperti sebelumnya)

// Main Bot Loop
async function main() {
  try {
    const { swapTimes, lpTimes, minDelay, maxDelay, r2usdAmount, wbtcAmount } = await getUserInput();
    const cycleDelay = 24 * 60 * 60; // 24 hours in seconds

    while (true) {
      logger.info("\n══════════════════════════════════════════════");
      logger.info("            STARTING NEW BOT CYCLE            ");
      logger.info("══════════════════════════════════════════════");

      // Tampilkan balance di awal setiap cycle
      const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      await showAllBalances(wallet);
      console.log("\n");

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
