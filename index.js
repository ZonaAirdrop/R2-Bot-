import "dotenv/config";
import blessed from "blessed";
import figlet from "figlet";
import { ethers } from "ethers";
import axios from "axios";
import FormData from "form-data";
import { v4 as uuid } from "uuid";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = "1356609826230243469";
const GUILD_ID = "1308368864505106442";
const COMMAND_ID = "1356665931056808211";
const COMMAND_VERSION = "1356665931056808212";
const initialProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const initialWallet = new ethers.Wallet(process.env.PRIVATE_KEY, initialProvider);
const wallet_address = initialWallet.address;

const NETWORK_CHANNEL_IDS = {
  "Sepolia": "1339883019556749395"
};

const SEPOLIA_CONFIG = {
  RPC_URL: process.env.RPC_URL,
  USDC_ADDRESS: "0xc7BcCf452965Def7d5D9bF02943e3348F758D3CB",
  BTC_ADDRESS: "0x0f3B4ae3f2b63B21b12e423444d065CC82e3DfA5",
  R2USD_ADDRESS: process.env.R2USD_ADDRESS,
  sR2USD_ADDRESS: process.env.sR2USD_ADDRESS,
  R2BTC_ADDRESS: process.env.R2BTC_ADDRESS,
  R2_ADDRESS: process.env.R2_ADDRESS,
  SWAP_ROUTER: "0x9e8ff356d35a2da385c546d6bf1d77ff85133365",
  SELL_ROUTER: "0x47d1b0623bb3e557bf8544c159c9ae51d091f8a2",
  BTC_SWAP_ROUTER: "0x23b2615d783e16f14b62efa125306c7c69b4941a",
  STAKING_CONTRACT: "0x006cbf409ca275ba022111db32bdae054a97d488",
  LP_R2USD_sR2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  LP_USDC_R2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  LP_R2_R2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  NETWORK_NAME: "Sepolia Testnet"
};

const DEBUG_MODE = false;

const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)"
];

const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)"
];

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function getReward() external",
  "function exit() external"
];

const randomAmountRanges = {
  "SWAP_R2USD_USDC": {
    USDC: { min: 50, max: 200 },
    R2USD: { min: 50, max: 200 }
  },
  "SWAP_BTC_R2BTC": {
    BTC: { min: 0.001, max: 0.01 }
  }
};

let currentNetwork = "Sepolia";
let walletInfoByNetwork = {
  "Sepolia": {
    address: "",
    balanceNative: "0.00",
    balanceUsdc: "0.00",
    balanceBtc: "0.00",
    balanceR2usd: "0.00",
    balanceSr2usd: "0.00",
    balanceR2btc: "0.00",
    balanceR2: "0.00",
    balanceLpR2usdSr2usd: "0.00",
    balanceLpUsdcR2usd: "0.00",
    balanceLpR2R2usd: "0.00",
    network: SEPOLIA_CONFIG.NETWORK_NAME,
    status: "Initializing"
  }
};

let transactionLogs = [];
let MY_USER_ID = null;
let claimRunning = false;
let claimCancelled = false;
let dailyClaimInterval = null;
let swapRunningSepolia = false;
let swapCancelledSepolia = false;
let globalWallet = null;
let provider = null;
let transactionQueue = Promise.resolve();
let transactionQueueList = [];
let transactionIdCounter = 0;
let nextNonceSepolia = null;
let swapDirection = {
  "Sepolia": true
};

// [Keep all the helper functions like getShortAddress, addLog, etc. but remove network-specific ones]

// Update the wallet data function to only handle Sepolia
async function updateWalletData() {
  try {
    const config = SEPOLIA_CONFIG;
    const localProvider = new ethers.JsonRpcProvider(config.RPC_URL, undefined, { timeout: 60000 });
    const localWallet = new ethers.Wallet(process.env.PRIVATE_KEY, localProvider);

    walletInfoByNetwork["Sepolia"].address = localWallet.address;

    const [
      nativeBalance, 
      usdcBalance, 
      btcBalance,
      r2usdBalance, 
      sr2usdBalance,
      r2btcBalance,
      r2Balance,
      lpR2usdSr2usdBalance, 
      lpUsdcR2usdBalance,
      lpR2R2usdBalance
    ] = await Promise.all([
      localProvider.getBalance(localWallet.address),
      getTokenBalance(config.USDC_ADDRESS, localProvider, localWallet),
      getTokenBalance(config.BTC_ADDRESS, localProvider, localWallet),
      getTokenBalance(config.R2USD_ADDRESS, localProvider, localWallet),
      getTokenBalance(config.sR2USD_ADDRESS, localProvider, localWallet),
      getTokenBalance(config.R2BTC_ADDRESS, localProvider, localWallet),
      getTokenBalance(config.R2_ADDRESS, localProvider, localWallet),
      getTokenBalance(config.LP_R2USD_sR2USD, localProvider, localWallet),
      getTokenBalance(config.LP_USDC_R2USD, localProvider, localWallet),
      getTokenBalance(config.LP_R2_R2USD, localProvider, localWallet)
    ]);

    walletInfoByNetwork["Sepolia"].balanceNative = ethers.formatEther(nativeBalance);
    walletInfoByNetwork["Sepolia"].balanceUsdc = usdcBalance;
    walletInfoByNetwork["Sepolia"].balanceBtc = btcBalance;
    walletInfoByNetwork["Sepolia"].balanceR2usd = r2usdBalance;
    walletInfoByNetwork["Sepolia"].balanceSr2usd = sr2usdBalance;
    walletInfoByNetwork["Sepolia"].balanceR2btc = r2btcBalance;
    walletInfoByNetwork["Sepolia"].balanceR2 = r2Balance;
    walletInfoByNetwork["Sepolia"].balanceLpR2usdSr2usd = lpR2usdSr2usdBalance;
    walletInfoByNetwork["Sepolia"].balanceLpUsdcR2usd = lpUsdcR2usdBalance;
    walletInfoByNetwork["Sepolia"].balanceLpR2R2usd = lpR2R2usdBalance;

    const currentNonce = await localProvider.getTransactionCount(localWallet.address, "pending");
    nextNonceSepolia = currentNonce;
    addLog(`Nonce awal untuk Sepolia: ${nextNonceSepolia}`, "debug", "Sepolia");

    walletInfoByNetwork["Sepolia"].status = "Ready";
    updateWallet();
    addLog("Wallet Information Updated !!", "system", "Sepolia");
  } catch (error) {
    addLog(`Gagal mengambil data wallet: ${error.message}`, "error", "Sepolia");
  }
}

// Update swap functions to use Uniswap V2
async function swapUsdcToR2usd(amountUsdc, nonce, wallet, provider, config) {
  const amount = ethers.parseUnits(amountUsdc.toString(), 6);
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(config.USDC_ADDRESS, config.SWAP_ROUTER, amount, wallet, "Sepolia");

  const path = [config.USDC_ADDRESS, config.R2USD_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
  const amountOutMin = 0; // No slippage protection for simplicity

  const tx = await router.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

async function swapR2usdToUsdc(amountR2usd, nonce, wallet, provider, config) {
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(config.R2USD_ADDRESS, config.SWAP_ROUTER, amount, wallet, "Sepolia");

  const path = [config.R2USD_ADDRESS, config.USDC_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await router.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

async function swapBtcToR2btc(amountBtc, nonce, wallet, provider, config) {
  const amount = ethers.parseUnits(amountBtc.toString(), 8); // BTC has 8 decimals
  const router = new ethers.Contract(config.BTC_SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(config.BTC_ADDRESS, config.BTC_SWAP_ROUTER, amount, wallet, "Sepolia");

  const path = [config.BTC_ADDRESS, config.R2BTC_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await router.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

async function stakeR2usd(amountR2usd, nonce, wallet, provider, config) {
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const staking = new ethers.Contract(config.STAKING_CONTRACT, STAKING_ABI, wallet);
  
  await ensureApproval(config.R2USD_ADDRESS, config.STAKING_CONTRACT, amount, wallet, "Sepolia");

  const tx = await staking.stake(
    amount,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

async function unstakeSr2usd(amountSr2usd, nonce, wallet, provider, config) {
  const amount = ethers.parseUnits(amountSr2usd.toString(), 6);
  const staking = new ethers.Contract(config.STAKING_CONTRACT, STAKING_ABI, wallet);
  
  const tx = await staking.withdraw(
    amount,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

async function addLiquidity(tokenA, tokenB, amountA, amountB, nonce, wallet, provider, config) {
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(tokenA, config.SWAP_ROUTER, amountA, wallet, "Sepolia");
  await ensureApproval(tokenB, config.SWAP_ROUTER, amountB, wallet, "Sepolia");

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountAMin = 0;
  const amountBMin = 0;

  const tx = await router.addLiquidity(
    tokenA,
    tokenB,
    amountA,
    amountB,
    amountAMin,
    amountBMin,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

async function removeLiquidity(tokenA, tokenB, lpAmount, nonce, wallet, provider, config) {
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  const lpToken = getLpTokenAddress(tokenA, tokenB, config);
  
  await ensureApproval(lpToken, config.SWAP_ROUTER, lpAmount, wallet, "Sepolia");

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountAMin = 0;
  const amountBMin = 0;

  const tx = await router.removeLiquidity(
    tokenA,
    tokenB,
    lpAmount,
    amountAMin,
    amountBMin,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce }
  );

  return tx;
}

function getLpTokenAddress(tokenA, tokenB, config) {
  if (tokenA === config.USDC_ADDRESS && tokenB === config.R2USD_ADDRESS) {
    return config.LP_USDC_R2USD;
  } else if (tokenA === config.R2USD_ADDRESS && tokenB === config.sR2USD_ADDRESS) {
    return config.LP_R2USD_sR2USD;
  } else if (tokenA === config.R2_ADDRESS && tokenB === config.R2USD_ADDRESS) {
    return config.LP_R2_R2USD;
  }
  throw new Error("Unsupported token pair");
}

// Update the menu items to only show Sepolia options
function getMainMenItems() {
  let items = [];
  if (swapRunningSepolia) items.push("Stop Transaction");
  items = items.concat([
    "Sepolia Network",
    "Claim Faucet",
    "Antrian Transaksi",
    "Clear Transaction Logs",
    "Refresh",
    "Exit"
  ]);
  return items;
}

function getSepoliaSubMenuItems() {
  let items = [];
  if (swapRunningSepolia) items.push("Stop Transaction");
  items = items.concat([
    "Swap USDC <> R2USD",
    "Swap BTC <> R2BTC",
    "Stake R2USD",
    "Unstake sR2USD",
    "Add Liquidity",
    "Remove Liquidity",
    "Change Random Amount",
    "Clear Transaction Logs",
    "Back To Main Menu",
    "Refresh"
  ]);
  return items;
}

// [Keep the rest of the UI and event handling code, but remove all other network-specific code]
// Make sure to update all event handlers to only handle Sepolia network

// Update the wallet display to show all new balances
function updateWallet() {
  const walletInfo = walletInfoByNetwork["Sepolia"];
  const shortAddress = walletInfo.address ? getShortAddress(walletInfo.address) : "N/A";
  
  const nativeBalance = walletInfo.balanceNative ? Number(walletInfo.balanceNative).toFixed(4) : "0.0000";
  const usdc = walletInfo.balanceUsdc ? Number(walletInfo.balanceUsdc).toFixed(2) : "0.00";
  const btc = walletInfo.balanceBtc ? Number(walletInfo.balanceBtc).toFixed(8) : "0.00000000";
  const r2usd = walletInfo.balanceR2usd ? Number(walletInfo.balanceR2usd).toFixed(4) : "0.0000";
  const sr2usd = walletInfo.balanceSr2usd ? Number(walletInfo.balanceSr2usd).toFixed(4) : "0.0000";
  const r2btc = walletInfo.balanceR2btc ? Number(walletInfo.balanceR2btc).toFixed(8) : "0.00000000";
  const r2 = walletInfo.balanceR2 ? Number(walletInfo.balanceR2).toFixed(4) : "0.0000";
  const lpR2usdSr2usd = walletInfo.balanceLpR2usdSr2usd ? Number(walletInfo.balanceLpR2usdSr2usd).toFixed(4) : "0.0000";
  const lpUsdcR2usd = walletInfo.balanceLpUsdcR2usd ? Number(walletInfo.balanceLpUsdcR2usd).toFixed(4) : "0.0000";
  const lpR2R2usd = walletInfo.balanceLpR2R2usd ? Number(walletInfo.balanceLpR2R2usd).toFixed(4) : "0.0000";

  const content = `┌── Address   : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH           : {bright-green-fg}${nativeBalance}{/bright-green-fg}
│   ├── USDC          : {bright-green-fg}${usdc}{/bright-green-fg}
│   ├── BTC           : {bright-green-fg}${btc}{/bright-green-fg}
│   ├── R2USD         : {bright-green-fg}${r2usd}{/bright-green-fg}
│   ├── sR2USD        : {bright-green-fg}${sr2usd}{/bright-green-fg}
│   ├── R2BTC         : {bright-green-fg}${r2btc}{/bright-green-fg}
│   ├── R2            : {bright-green-fg}${r2}{/bright-green-fg}
│   ├── LP R2USD-sR2USD : {bright-green-fg}${lpR2usdSr2usd}{/bright-green-fg}
│   ├── LP USDC-R2USD : {bright-green-fg}${lpUsdcR2usd}{/bright-green-fg}
│   └── LP R2-R2USD   : {bright-green-fg}${lpR2R2usd}{/bright-green-fg}
└── Network        : {bright-cyan-fg}${walletInfo.network}{/bright-cyan-fg}`;
  
  walletBox.setContent(content);
  safeRender();
}

// [Keep all other necessary functions but remove network-specific ones]