import "dotenv/config";
import blessed from "blessed";
import { ethers } from "ethers";

// Config
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

// State
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

// Helper
function addLog(message, type = "info") {
  const colors = { info: "white", error: "red", success: "green", debug: "yellow" };
  const timestamp = new Date().toLocaleString();
  logBox.add(`[${timestamp}] | {${colors[type]}-fg}${message}{/${colors[type]}-fg}`);
  screen.render();
}

async function updateWalletData() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    walletInfo.balances.native = "0.0000";
    walletInfo.balances.USDC = "0";
    walletInfo.balances.BTC = "0";
    walletInfo.balances.R2USD = "0";
    walletInfo.balances.sR2USD = "0";
    walletInfo.balances.R2 = "0";
    walletInfo.balances.LP_R2USD_sR2USD = "0";
    walletInfo.balances.LP_USDC_R2USD = "0";
    walletInfo.balances.LP_R2_R2USD = "0";
    updateWalletDisplay();
  } catch (error) {
    addLog(`Balance update failed: ${error.message}`, "error");
  }
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

// PromptBox helper
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

// --- Submenus ---
// SWAP
function showManualSwapSubMenu() {
  const swapMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '40%',
    height: 12,
    border: { type: 'line' },
    label: 'Manual Swap',
    items: [
      "USDC -> R2USD",
      "R2USD -> USDC",
      "R2 -> USDC",
      "USDC -> R2",
      "BTC -> R2BTC",
      "Back to Main Menu"
    ],
    style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    keys: true,
    mouse: true,
    vi: true
  });

  screen.append(swapMenu);
  swapMenu.focus();

  swapMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(swapMenu);
    showMainMenu();
  });

  swapMenu.on("select", (item) => {
    const selected = item.getText();
    const map = {
      "USDC -> R2USD": ["USDC", "R2USD"],
      "R2USD -> USDC": ["R2USD", "USDC"],
      "R2 -> USDC": ["R2", "USDC"],
      "USDC -> R2": ["USDC", "R2"],
      "BTC -> R2BTC": ["BTC", "R2BTC"]
    };
    if (map[selected]) {
      promptBox.setFront();
      promptBox.input(`Masukkan jumlah ${map[selected][0]} yang ingin di-swap ke ${map[selected][1]}`, "", async (err, value) => {
        promptBox.hide();
        if (err || !value) {
          addLog("Input tidak valid atau dibatalkan.", "error");
        } else {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount <= 0) {
            addLog("Jumlah harus berupa angka lebih besar dari 0.", "error");
          } else {
            addLog(`Swap ${amount} ${map[selected][0]} ke ${map[selected][1]}...`, "info");
            addLog("Menu ini masih dummy.", "debug");
          }
        }
        screen.remove(swapMenu);
        showMainMenu();
      });
    } else if (selected === "Back to Main Menu") {
      screen.remove(swapMenu);
      showMainMenu();
    }
  });
}

// ADD LIQUIDITY
function showManualAddLiquiditySubMenu() {
  const addMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: 14,
    border: { type: 'line' },
    label: 'Add Liquidity',
    items: [
      "R2-USDC",
      "R2-R2USD",
      "USDC-R2USD",
      "R2USD-sR2USD",
      "Back to Main Menu"
    ],
    style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    keys: true,
    mouse: true,
    vi: true
  });

  screen.append(addMenu);
  addMenu.focus();

  addMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(addMenu);
    showMainMenu();
  });

  addMenu.on("select", (item) => {
    const selected = item.getText();
    const pairs = {
      "R2-USDC": ["R2", "USDC"],
      "R2-R2USD": ["R2", "R2USD"],
      "USDC-R2USD": ["USDC", "R2USD"],
      "R2USD-sR2USD": ["R2USD", "sR2USD"]
    };
    if (pairs[selected]) {
      const [tokenA, tokenB] = pairs[selected];
      promptBox.setFront();
      promptBox.input(`Jumlah ${tokenA} untuk Add Liquidity:`, "", async (err, valueA) => {
        promptBox.hide();
        if (err || !valueA) {
          addLog("Input tidak valid atau dibatalkan.", "error");
        } else {
          const amountA = parseFloat(valueA);
          if (isNaN(amountA) || amountA <= 0) {
            addLog("Jumlah harus lebih besar dari 0.", "error");
          } else {
            promptBox.setFront();
            promptBox.input(`Jumlah ${tokenB} untuk Add Liquidity:`, "", async (err, valueB) => {
              promptBox.hide();
              if (err || !valueB) {
                addLog("Input tidak valid atau dibatalkan.", "error");
              } else {
                const amountB = parseFloat(valueB);
                if (isNaN(amountB) || amountB <= 0) {
                  addLog("Jumlah harus lebih besar dari 0.", "error");
                } else {
                  addLog(`Add Liquidity ${tokenA}-${tokenB} ...`, "info");
                  addLog("Menu ini masih dummy.", "debug");
                }
              }
              screen.remove(addMenu);
              showMainMenu();
            });
          }
        }
      });
    } else if (selected === "Back to Main Menu") {
      screen.remove(addMenu);
      showMainMenu();
    }
  });
}

// REMOVE LIQUIDITY
function showManualRemoveLiquiditySubMenu() {
  const removeMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: 14,
    border: { type: 'line' },
    label: 'Remove Liquidity',
    items: [
      "R2-USDC",
      "R2-R2USD",
      "USDC-R2USD",
      "R2USD-sR2USD",
      "Back to Main Menu"
    ],
    style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    keys: true,
    mouse: true,
    vi: true
  });

  screen.append(removeMenu);
  removeMenu.focus();

  removeMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(removeMenu);
    showMainMenu();
  });

  removeMenu.on("select", (item) => {
    const selected = item.getText();
    const pairs = {
      "R2-USDC": ["R2", "USDC"],
      "R2-R2USD": ["R2", "R2USD"],
      "USDC-R2USD": ["USDC", "R2USD"],
      "R2USD-sR2USD": ["R2USD", "sR2USD"]
    };
    if (pairs[selected]) {
      const [tokenA, tokenB] = pairs[selected];
      promptBox.setFront();
      promptBox.input(`Masukkan persentase liquidity ${tokenA}-${tokenB} yang ingin di-remove:`, "", async (err, value) => {
        promptBox.hide();
        if (err || !value) {
          addLog("Input tidak valid atau dibatalkan.", "error");
        } else {
          const percentage = parseInt(value);
          if (isNaN(percentage) || percentage <= 0) {
            addLog("Persentase harus angka > 0.", "error");
          } else {
            addLog(`Remove Liquidity ${tokenA}-${tokenB} ...`, "info");
            addLog("Menu ini masih dummy.", "debug");
          }
        }
        screen.remove(removeMenu);
        showMainMenu();
      });
    } else if (selected === "Back to Main Menu") {
      screen.remove(removeMenu);
      showMainMenu();
    }
  });
}

// DEPOSIT BTC
function showManualDepositBtcSubMenu() {
  const depositMenu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '40%',
    height: 8,
    border: { type: 'line' },
    label: 'Deposit BTC',
    items: [
      "Deposit BTC",
      "Back to Main Menu"
    ],
    style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    keys: true,
    mouse: true,
    vi: true
  });

  screen.append(depositMenu);
  depositMenu.focus();

  depositMenu.key(['escape', 'q', 'C-c'], () => {
    screen.remove(depositMenu);
    showMainMenu();
  });

  depositMenu.on("select", (item) => {
    const selected = item.getText();
    if (selected === "Deposit BTC") {
      promptBox.setFront();
      promptBox.input("Masukkan jumlah BTC yang ingin di-deposit:", "", async (err, value) => {
        promptBox.hide();
        if (err || !value) {
          addLog("Input tidak valid atau dibatalkan.", "error");
        } else {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount <= 0) {
            addLog("Jumlah BTC harus lebih besar dari 0.", "error");
          } else {
            addLog(`Deposit ${amount} BTC...`, "info");
            addLog("Menu ini masih dummy.", "debug");
          }
        }
        screen.remove(depositMenu);
        showMainMenu();
      });
    } else if (selected === "Back to Main Menu") {
      screen.remove(depositMenu);
      showMainMenu();
    }
  });
}

// --- Main Menu ---
function showMainMenu() {
  menuBox.setItems([
    "Manual Swap",
    "Add Liquidity",
    "Remove Liquidity",
    "Deposit BTC",
    "Exit"
  ]);
  menuBox.select(0);
  menuBox.focus();

  menuBox.key(['escape', 'q', 'C-c'], () => process.exit(0));

  menuBox.on('select', (item, index) => {
    switch (index) {
      case 0: showManualSwapSubMenu(); break;
      case 1: showManualAddLiquiditySubMenu(); break;
      case 2: showManualRemoveLiquiditySubMenu(); break;
      case 3: showManualDepositBtcSubMenu(); break;
      case 4: process.exit(0); break;
    }
  });
}

// --- Init App ---
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
    style: {
      fg: 'white',
      bg: 'blue',
      bold: true
    }
  });

  // Wallet info
  walletBox = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    width: '30%',
    height: '40%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } }
  });

  // Log box
  logBox = blessed.log({
    parent: screen,
    top: 3,
    left: '30%',
    width: '70%',
    height: '40%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      style: { bg: 'blue' }
    }
  });

  // Menu box
  menuBox = blessed.list({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '60%',
    border: { type: 'line' },
    style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    keys: true,
    mouse: true,
    vi: true
  });

  promptBox = createPromptBox();

  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  updateWalletData();
  showMainMenu();
}

// Start app
initApp();