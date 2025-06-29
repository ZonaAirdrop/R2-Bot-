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

let operationsHistory = [
  { type: "Add Liquidity", amount: "100", blockNumber: "123456", txHash: "0xabc123" },
  { type: "Swap", amount: "10", blockNumber: "123457", txHash: "0xdef456" },
];
let screen, walletBox, logBox, menuBox;

// ========== HELPER & PROMPT ==========
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

// ========== GENERIC PROMPT WITH CALLBACK ==========
function promptStep(labels, callback) {
  let answers = [];
  function ask(i) {
    if (i >= labels.length) {
      callback(answers);
      return;
    }
    promptBox.input(labels[i], '', (err, value) => {
      if (err || !value || isNaN(Number(value)) || Number(value) <= 0) {
        addLog("Input tidak valid.", "error");
        showMainMenu();
        return;
      }
      answers.push(Number(value));
      ask(i + 1);
    });
  }
  ask(0);
}

// ========== ACTIONS ==========
function swapUsdcToR2usd(done) {
  promptStep(
    ['Masukkan jumlah USDC yang ingin di-swap ke R2USD:', 'Berapa kali swap?'],
    ([amount, times]) => {
      addLog(`Swap USDC ke R2USD sejumlah ${amount} sebanyak ${times} kali (dummy action)...`, "info");
      done();
    }
  );
}
function swapR2usdToUsdc(done) {
  promptStep(
    ['Masukkan jumlah R2USD yang ingin di-swap ke USDC:', 'Berapa kali swap?'],
    ([amount, times]) => {
      addLog(`Swap R2USD ke USDC sejumlah ${amount} sebanyak ${times} kali (dummy action)...`, "info");
      done();
    }
  );
}
function swapR2ToUsdc(done) {
  promptStep(
    ['Masukkan jumlah R2 yang ingin di-swap ke USDC:', 'Berapa kali swap?'],
    ([amount, times]) => {
      addLog(`Swap R2 ke USDC sejumlah ${amount} sebanyak ${times} kali (dummy action)...`, "info");
      done();
    }
  );
}
function swapUsdcToR2(done) {
  promptStep(
    ['Masukkan jumlah USDC yang ingin di-swap ke R2:', 'Berapa kali swap?'],
    ([amount, times]) => {
      addLog(`Swap USDC ke R2 sejumlah ${amount} sebanyak ${times} kali (dummy action)...`, "info");
      done();
    }
  );
}
function addR2UsdcLiquidity(done) {
  promptStep(
    ['Masukkan jumlah R2:', 'Masukkan jumlah USDC:'],
    ([amountR2, amountUsdc]) => {
      addLog(`Add Liquidity R2-USDC: R2 ${amountR2} + USDC ${amountUsdc} (dummy action)...`, "info");
      done();
    }
  );
}
function addR2R2usdLiquidity(done) {
  promptStep(
    ['Masukkan jumlah R2:', 'Masukkan jumlah R2USD:'],
    ([amountR2, amountR2usd]) => {
      addLog(`Add Liquidity R2-R2USD: R2 ${amountR2} + R2USD ${amountR2usd} (dummy action)...`, "info");
      done();
    }
  );
}
function addUsdcR2usdLiquidity(done) {
  promptStep(
    ['Masukkan jumlah USDC:', 'Masukkan jumlah R2USD:'],
    ([amountUsdc, amountR2usd]) => {
      addLog(`Add Liquidity USDC-R2USD: USDC ${amountUsdc} + R2USD ${amountR2usd} (dummy action)...`, "info");
      done();
    }
  );
}
function addR2usdSR2usdLiquidity(done) {
  promptStep(
    ['Masukkan jumlah R2USD:', 'Masukkan jumlah sR2USD:'],
    ([amountR2usd, amountSR2usd]) => {
      addLog(`Add Liquidity R2USD-sR2USD: R2USD ${amountR2usd} + sR2USD ${amountSR2usd} (dummy action)...`, "info");
      done();
    }
  );
}
function removeR2UsdcLiquidity(done) {
  promptStep(['Masukkan jumlah LP R2-USDC yang ingin di-remove:'], ([amount]) => {
    addLog(`Remove Liquidity R2-USDC: LP ${amount} (dummy action)...`, "info");
    done();
  });
}
function removeR2R2usdLiquidity(done) {
  promptStep(['Masukkan jumlah LP R2-R2USD yang ingin di-remove:'], ([amount]) => {
    addLog(`Remove Liquidity R2-R2USD: LP ${amount} (dummy action)...`, "info");
    done();
  });
}
function removeUsdcR2usdLiquidity(done) {
  promptStep(['Masukkan jumlah LP USDC-R2USD yang ingin di-remove:'], ([amount]) => {
    addLog(`Remove Liquidity USDC-R2USD: LP ${amount} (dummy action)...`, "info");
    done();
  });
}
function removeR2usdSR2usdLiquidity(done) {
  promptStep(['Masukkan jumlah LP R2USD-sR2USD yang ingin di-remove:'], ([amount]) => {
    addLog(`Remove Liquidity R2USD-sR2USD: LP ${amount} (dummy action)...`, "info");
    done();
  });
}
function stakeR2usd(done) {
  promptStep(['Masukkan jumlah R2USD yang ingin di-stake:'], ([amount]) => {
    addLog(`Stake R2USD: ${amount} (dummy action)...`, "info");
    done();
  });
}
function unstakeSR2usd(done) {
  promptStep(['Masukkan jumlah sR2USD yang ingin di-unstake:'], ([amount]) => {
    addLog(`Unstake sR2USD: ${amount} (dummy action)...`, "info");
    done();
  });
}
function depositBtc(done) {
  promptStep(['Masukkan jumlah BTC yang ingin di-deposit:'], ([amount]) => {
    addLog(`Deposit BTC: ${amount} (dummy action)...`, "info");
    done();
  });
}

// ========== SUBMENUS ==========
function showSimpleSubmenu(title, items, actions = {}) {
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
    screen.remove(subMenu);
    showMainMenu();
  });

  subMenu.on('select', (item, idx) => {
    const itemText = item.getText ? item.getText() : item.content;
    if (idx === items.length - 1 || /back/i.test(itemText)) {
      screen.remove(subMenu);
      showMainMenu();
      return;
    }
    screen.remove(subMenu);
    if (actions[idx]) {
      actions[idx](() => {
        showMainMenu();
      });
    } else {
      addLog("Menu ini masih dummy.", "debug");
      showMainMenu();
    }
  });
}

// ========== SUBMENU DEFINITIONS ==========
function showOtomatisBotSubMenu() {
  showSimpleSubmenu("Otomatis Bot", [
    "Jalankan Bot Otomatis (Soon)",
    "Back to Main Menu"
  ]);
}
function showManualSwapUSDC_R2USD_SubMenu() {
  showSimpleSubmenu(
    "Swap USDC <> R2USD",
    [
      "Swap USDC ke R2USD",
      "Swap R2USD ke USDC",
      "Back to Main Menu"
    ],
    {
      0: swapUsdcToR2usd,
      1: swapR2usdToUsdc
    }
  );
}
function showManualSwapR2_USDC_SubMenu() {
  showSimpleSubmenu(
    "Swap R2 <> USDC",
    [
      "Swap R2 ke USDC",
      "Swap USDC ke R2",
      "Back to Main Menu"
    ],
    {
      0: swapR2ToUsdc,
      1: swapUsdcToR2
    }
  );
}
function showAddLiquiditySubMenu() {
  showSimpleSubmenu(
    "Add Liquidity",
    [
      "Add R2-USDC Liquidity",
      "Add R2-R2USD Liquidity",
      "Add USDC-R2USD Liquidity",
      "Add R2USD-sR2USD Liquidity",
      "Back to Main Menu"
    ],
    {
      0: addR2UsdcLiquidity,
      1: addR2R2usdLiquidity,
      2: addUsdcR2usdLiquidity,
      3: addR2usdSR2usdLiquidity
    }
  );
}
function showRemoveLiquiditySubMenu() {
  showSimpleSubmenu(
    "Remove Liquidity",
    [
      "Remove R2-USDC Liquidity",
      "Remove R2-R2USD Liquidity",
      "Remove USDC-R2USD Liquidity",
      "Remove R2USD-sR2USD Liquidity",
      "Back to Main Menu"
    ],
    {
      0: removeR2UsdcLiquidity,
      1: removeR2R2usdLiquidity,
      2: removeUsdcR2usdLiquidity,
      3: removeR2usdSR2usdLiquidity
    }
  );
}
function showStakeR2USDSubMenu() {
  showSimpleSubmenu(
    "Stake R2USD",
    [
      "Stake R2USD",
      "Back to Main Menu"
    ],
    {
      0: stakeR2usd
    }
  );
}
function showUnstakeSR2USDSubMenu() {
  showSimpleSubmenu(
    "Unstake sR2USD",
    [
      "Unstake sR2USD",
      "Back to Main Menu"
    ],
    {
      0: unstakeSR2usd
    }
  );
}
function showDepositBTCSubMenu() {
  showSimpleSubmenu(
    "Deposit BTC",
    [
      "Deposit BTC",
      "Back to Main Menu"
    ],
    {
      0: depositBtc
    }
  );
}

// ========== TRANSACTION HISTORY & CLEAR LOGS ==========
function showTransactionHistoryBox() {
  const historyBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    border: { type: 'line' },
    label: 'Transaction History (ESC/q/Enter: Back)',
    style: { border: { fg: 'cyan' } },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: true,
    vi: true,
    scrollbar: { ch: ' ', style: { bg: 'cyan' } }
  });

  const content = operationsHistory.length
    ? operationsHistory.map((op, i) => `[${i+1}] | ${op.type} | Amount: ${op.amount || '-'} | Block: ${op.blockNumber || '-'} | Tx: ${op.txHash || '-'}`).join('\n')
    : "No transaction history.";

  historyBox.setContent(content + "\n\n{cyan-fg}ESC/q/Enter: Kembali ke menu utama{/cyan-fg}");

  screen.append(historyBox);
  historyBox.focus();
  screen.render();

  historyBox.key(['escape', 'q', 'C-c', 'enter'], () => {
    screen.remove(historyBox);
    showMainMenu();
  });
}

function clearLogsAndReturn() {
  logBox.setContent("");
  screen.render();
  addLog("Log telah dibersihkan.", "success");
  showMainMenu();
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
      case 8: showTransactionHistoryBox(); break;
      case 9: clearLogsAndReturn(); break;
      case 10:
        updateWalletData();
        addLog("Balance/data telah direfresh (dummy).", "success");
        break;
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
    scrollbar: { ch: ' ', style: { bg: 'cyan' } }
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