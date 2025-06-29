import "dotenv/config";
import blessed from "blessed";
import { ethers } from "ethers";

// ====== CONFIG & STATE ======
const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/ef659d824bd14ae798d965f855f2cfd6";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("🛑 CRITICAL: Missing PRIVATE_KEY in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const CONFIG = {
  RPC_URL: RPC_URL,
  USDC_ADDRESS: "0xc7BcCf452965Def7d5D9bF02943e3348F758D3CB",
  BTC_ADDRESS: "0x0f3B4ae3f2b63B21b12e423444d065CC82e3DfA5",
  R2USD_ADDRESS: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  sR2USD_ADDRESS: "0x006CbF409CA275bA022111dB32BDAE054a97d488",
  R2_ADDRESS: "0xb816bB88f836EA75Ca4071B46FF285f690C43bb7",
  SWAP_ROUTER: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
  BTC_SWAP_ROUTER: "0x23b2615d783e16f14b62efa125306c7c69b4941a",
  STAKING_CONTRACT: "0x006cbf409ca275ba022111db32bdae054a97d488",
  LP_R2USD_sR2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  LP_USDC_R2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  LP_R2_R2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  NETWORK_NAME: "Sepolia Testnet"
};

let walletInfo = {
  balances: {
    native: "0",
    USDC: "0",
    BTC: "0",
    R2USD: "0",
    sR2USD: "0",
    R2: "0",
    LP_R2USD_sR2USD: "0",
    LP_USDC_R2USD: "0",
    LP_R2_R2USD: "0"
  },
  status: "Ready"
};

let operationsHistory = [];
let currentNonce = 0;
let screen, walletBox, logBox, menuBox;

// ========== HELPER ==========

function addLog(message, type = "info") {
  const colors = { info: "white", error: "red", success: "green", debug: "yellow" };
  const timestamp = new Date().toLocaleString();
  logBox.add(`[${timestamp}] | {${colors[type]}-fg}${message}{/${colors[type]}-fg}`);
  screen.render();
}

function updateWalletDisplay() {
  const addr = wallet.address;
  const shortAddress = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";
  const content = `┌── Address   : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH           : {bright-green-fg}${walletInfo.balances.native}{/bright-green-fg}
│   ├── USDC          : {bright-green-fg}${walletInfo.balances.USDC}{/bright-green-fg}
│   ├── R2USD         : {bright-green-fg}${walletInfo.balances.R2USD}{/bright-green-fg}
│   ├── sR2USD        : {bright-green-fg}${walletInfo.balances.sR2USD}{/bright-green-fg}
│   ├── R2            : {bright-green-fg}${walletInfo.balances.R2}{/bright-green-fg}
│   ├── LP R2USD-sR2USD : {bright-green-fg}${walletInfo.balances.LP_R2USD_sR2USD}{/bright-green-fg}
│   ├── LP USDC-R2USD : {bright-green-fg}${walletInfo.balances.LP_USDC_R2USD}{/bright-green-fg}
│   ├── LP R2-R2USD   : {bright-green-fg}${walletInfo.balances.LP_R2_R2USD}{/bright-green-fg}
│   └── BTC           : {bright-green-fg}${walletInfo.balances.BTC}{/bright-green-fg}
└── Network        : {bright-cyan-fg}${CONFIG.NETWORK_NAME}{/bright-cyan-fg}`;
  walletBox.setContent(content);
  screen.render();
}

async function updateWalletData() {
  // Dummy for demo
  walletInfo.balances.native = "1.2345";
  walletInfo.balances.USDC = "1000";
  walletInfo.balances.BTC = "0.005";
  walletInfo.balances.R2USD = "500";
  walletInfo.balances.sR2USD = "200";
  walletInfo.balances.R2 = "300";
  walletInfo.balances.LP_R2USD_sR2USD = "0";
  walletInfo.balances.LP_USDC_R2USD = "0";
  walletInfo.balances.LP_R2_R2USD = "0";
  updateWalletDisplay();
}

// ========== PROMPT BOX ==========

function createPromptBox() {
  const prompt = blessed.prompt({
    parent: screen,
    left: 'center',
    top: 'center',
    width: '50%',
    height: 7,
    border: { type: 'line' },
    label: ' {blue-fg}Input{/blue-fg} ',
    tags: true,
    keys: true,
    vi: true
  });
  prompt.hide();
  screen.append(prompt);
  return prompt;
}
let promptBox;

// ========== SUBMENUS ==========

function showOtomatisBotSubMenu() {
  showSimpleSubmenu("Otomatis Bot", [
    "Jalankan Bot Otomatis (Soon)",
    "Back to Main Menu"
  ]);
}

function showManualSwapUSDC_R2USD_SubMenu() {
  showSimpleSubmenu("Swap USDC <> R2USD", [
    "Swap USDC ke R2USD (Soon)",
    "Swap R2USD ke USDC (Soon)",
    "Back to Main Menu"
  ]);
}

function showManualSwapR2_USDC_SubMenu() {
  showSimpleSubmenu("Swap R2 <> USDC", [
    "Swap R2 ke USDC (Soon)",
    "Swap USDC ke R2 (Soon)",
    "Back to Main Menu"
  ]);
}

function showAddLiquiditySubMenu() {
  showSimpleSubmenu("Add Liquidity", [
    "Add R2-USDC Liquidity",
    "Add R2-R2USD Liquidity",
    "Add USDC-R2USD Liquidity",
    "Add R2USD-sR2USD Liquidity",
    "Back to Main Menu"
  ]);
}

function showRemoveLiquiditySubMenu() {
  showSimpleSubmenu("Remove Liquidity", [
    "Remove R2-USDC Liquidity",
    "Remove R2-R2USD Liquidity",
    "Remove USDC-R2USD Liquidity",
    "Remove R2USD-sR2USD Liquidity",
    "Back to Main Menu"
  ]);
}

function showStakeR2USDSubMenu() {
  showSimpleSubmenu("Stake R2USD", [
    "Stake R2USD (Soon)",
    "Back to Main Menu"
  ]);
}

function showUnstakeSR2USDSubMenu() {
  showSimpleSubmenu("Unstake sR2USD", [
    "Unstake sR2USD (Soon)",
    "Back to Main Menu"
  ]);
}

function showDepositBTCSubMenu() {
  showSimpleSubmenu("Deposit BTC", [
    "Deposit BTC (Soon)",
    "Back to Main Menu"
  ]);
}

function showTransactionHistorySubMenu() {
  showSimpleSubmenu("Transaction History", [
    "Lihat Riwayat Transaksi (Soon)",
    "Back to Main Menu"
  ]);
}

function showClearLogsSubMenu() {
  const subMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '40%',
    height: 6,
    border: { type: 'line' },
    label: 'Clear Logs',
    items: [
      "Clear Log Sekarang",
      "Back to Main Menu"
    ],
    style: {
      selected: { bg: 'cyan', fg: 'black' },
      border: { fg: 'cyan' },
      item: { fg: 'cyan' },
      focus: { bg: 'cyan' }
    },
    keys: true, mouse: true, vi: true
  });
  screen.append(subMenu);
  subMenu.focus();
  screen.render();
  subMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(subMenu); showMainMenu();
  });
  subMenu.on('select', (item, idx) => {
    if (idx === 1) {
      screen.remove(subMenu); showMainMenu(); return;
    }
    logBox.setContent(""); screen.render();
    addLog("Log telah dibersihkan.", "success");
    screen.remove(subMenu); showMainMenu();
  });
}

function showRefreshSubMenu() {
  const subMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '40%',
    height: 6,
    border: { type: 'line' },
    label: 'Refresh',
    items: [
      "Refresh Balance & Data",
      "Back to Main Menu"
    ],
    style: {
      selected: { bg: 'cyan', fg: 'black' },
      border: { fg: 'cyan' },
      item: { fg: 'cyan' },
      focus: { bg: 'cyan' }
    },
    keys: true, mouse: true, vi: true
  });
  screen.append(subMenu);
  subMenu.focus();
  screen.render();
  subMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(subMenu); showMainMenu();
  });
  subMenu.on('select', (item, idx) => {
    if (idx === 1) {
      screen.remove(subMenu); showMainMenu(); return;
    }
    updateWalletData();
    addLog("Balance/data telah direfresh (dummy).", "success");
    screen.remove(subMenu); showMainMenu();
  });
}

// ====== SUBMENU GENERIC ======
function showSimpleSubmenu(title, items) {
  const subMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '60%',
    height: Math.max(6, items.length * 2),
    border: { type: 'line' },
    label: title,
    items,
    style: {
      selected: { bg: 'cyan', fg: 'black' },
      border: { fg: 'cyan' },
      item: { fg: 'cyan' },
      focus: { bg: 'cyan' }
    },
    keys: true, mouse: true, vi: true
  });
  screen.append(subMenu);
  subMenu.focus();
  screen.render();
  subMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(subMenu); showMainMenu();
  });
  subMenu.on('select', (item, idx) => {
    if (idx === items.length - 1) {
      screen.remove(subMenu); showMainMenu(); return;
    }
    addLog("Menu ini masih dummy.", "debug");
    screen.remove(subMenu); showMainMenu();
  });
}

// ========== MAIN MENU ==========

function showMainMenu() {
  menuBox.setItems([
    "1. Otomatis Bot",
    "2. Swap USDC <> R2USD",
    "3. Swap R2 <> USDC",
    "4. Add Liquidity",
    "5. Remove Liquidity",
    "6. Stake R2USD",
    "7. Unstake sR2USD",
    "8. Deposit BTC",
    "9. Transaction History",
    "10. Clear Logs",
    "11. Refresh",
    "12. Exit"
  ]);
  menuBox.select(0);
  menuBox.focus();
  screen.render();
  menuBox.key(['escape', 'q', 'C-c'], () => process.exit(0));
  menuBox.on('select', (item, index) => {
    switch (index) {
      case 0: showOtomatisBotSubMenu(); break;
      case 1: showManualSwapUSDC_R2USD_SubMenu(); break;
      case 2: showManualSwapR2_USDC_SubMenu(); break;
      case 3: showAddLiquiditySubMenu(); break;
      case 4: showRemoveLiquiditySubMenu(); break;
      case 5: showStakeR2USDSubMenu(); break;
      case 6: showUnstakeSR2USDSubMenu(); break;
      case 7: showDepositBTCSubMenu(); break;
      case 8: showTransactionHistorySubMenu(); break;
      case 9: showClearLogsSubMenu(); break;
      case 10: showRefreshSubMenu(); break;
      case 11: process.exit(0); break;
    }
  });
}

// ========== INIT APP ==========

function initApp() {
  screen = blessed.screen({
    smartCSR: true,
    title: 'R2 Bot Interface'
  });

  // Header
  blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: '{center} R2 Bot Interface {/center}',
    style: { fg: 'white', bg: 'blue', bold: true }
  });

  walletBox = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    width: '30%',
    height: '40%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } }
  });

  logBox = blessed.log({
    parent: screen,
    top: 3,
    left: '30%',
    width: '70%',
    height: '40%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
    scrollable: true,
    scrollbar: { ch: ' ', style: { bg: 'blue' } }
  });

  menuBox = blessed.list({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '60%',
    border: { type: 'line' },
    style: {
      selected: { bg: 'cyan', fg: 'black' },
      item: { fg: 'cyan' },
      border: { fg: 'cyan' },
      focus: { bg: 'cyan' }
    },
    keys: true,
    mouse: true,
    vi: true
  });

  promptBox = createPromptBox();

  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  updateWalletData();
  showMainMenu();
}

// ========== START ==========
initApp();