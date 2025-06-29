import "dotenv/config";
import blessed from "blessed";
import { ethers } from "ethers";

// ====== DATA KONTRAK & TOKEN ======
const ADDRESSES = {
  USDC: "0xc7BcCf452965Def7d5D9bF02943e3348F758D3CB",
  R2USD: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  sR2USD: "0x006CbF409CA275bA022111dB32BDAE054a97d488",
  R2: "0xb816bB88f836EA75Ca4071B46FF285f690C43bb7",
  BTC: "0x0f3B4ae3f2b63B21b12e423444d065CC82e3DfA5",
  SWAP_ROUTER: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
  BTC_SWAP_ROUTER: "0x23b2615d783e16f14b62efa125306c7c69b4941a",
  STAKING_CONTRACT: "0x006cbf409ca275ba022111db32bdae054a97d488",
  LP_R2USD_sR2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  LP_USDC_R2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3",
  LP_R2_R2USD: "0xee567fe1712faf6149d80da1e6934e354124cfe3"
};

// ====== ABI (MINIMAL, BISA DITAMBAH) ======
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256[])",
  "function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)"
  // Tambahkan ABI lain jika ada fitur lain
];

// ====== INIT ETHERS ======
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Silakan isi .env dengan RPC_URL dan PRIVATE_KEY");
  process.exit(1);
}
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ====== CONTRACT INSTANCE ======
const usdc = new ethers.Contract(ADDRESSES.USDC, ERC20_ABI, wallet);
const r2usd = new ethers.Contract(ADDRESSES.R2USD, ERC20_ABI, wallet);
const router = new ethers.Contract(ADDRESSES.SWAP_ROUTER, ROUTER_ABI, wallet);

// ====== STATE ======
let walletInfo = {
  balances: { native: "0", USDC: "0", R2USD: "0" },
  status: "Ready"
};
let operationsHistory = [];
let screen, walletBox, logBox, menuBox, promptBox;

// ====== HELPER ======
function addLog(message, type = "info") {
  const colors = { info: "white", error: "red", success: "green", debug: "yellow" };
  const timestamp = new Date().toLocaleString();
  logBox.add(`[${timestamp}] | {${colors[type]}-fg}${message}{/${colors[type]}-fg}`);
  screen.render();
}
function formatEth(wei) {
  return ethers.formatEther(wei);
}
function formatToken(amount, decimals) {
  return Number(amount) / 10 ** decimals;
}
async function fetchBalance(tokenAddress, decimals) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const raw = await contract.balanceOf(wallet.address);
  return formatToken(raw, decimals);
}
async function updateWalletData() {
  // ETH
  const native = await provider.getBalance(wallet.address);
  walletInfo.balances.native = formatEth(native);
  // ERC20
  const usdcDec = await usdc.decimals();
  const r2usdDec = await r2usd.decimals();
  walletInfo.balances.USDC = await fetchBalance(ADDRESSES.USDC, usdcDec);
  walletInfo.balances.R2USD = await fetchBalance(ADDRESSES.R2USD, r2usdDec);
  updateWalletDisplay();
}
function updateWalletDisplay() {
  const addr = wallet.address;
  const shortAddress = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";
  const content = `┌── Address   : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH           : {bright-green-fg}${walletInfo.balances.native}{/bright-green-fg}
│   ├── USDC          : {bright-green-fg}${walletInfo.balances.USDC}{/bright-green-fg}
│   ├── R2USD         : {bright-green-fg}${walletInfo.balances.R2USD}{/bright-green-fg}
└── Network        : {bright-cyan-fg}Sepolia{/bright-cyan-fg}`;
  walletBox.setContent(content);
  screen.render();
}

async function checkAndApprove(tokenContract, spender, amount) {
  const allowance = await tokenContract.allowance(wallet.address, spender);
  if (BigInt(allowance) < BigInt(amount)) {
    const tx = await tokenContract.approve(spender, amount);
    await tx.wait();
    addLog(`Approve sukses: ${tx.hash}`, "success");
  }
}

// ====== TRANSAKSI UTAMA ======
async function swapUsdcToR2usd(amount, times, done) {
  const decimals = await usdc.decimals();
  const amountIn = ethers.parseUnits(amount.toString(), decimals);
  await checkAndApprove(usdc, ADDRESSES.SWAP_ROUTER, amountIn * BigInt(times));
  for (let i = 0; i < times; i++) {
    try {
      const path = [ADDRESSES.USDC, ADDRESSES.R2USD];
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        0,
        path,
        wallet.address,
        deadline
      );
      addLog(`Swap ke-${i + 1} tx: ${tx.hash}`);
      const receipt = await tx.wait();
      operationsHistory.push({
        type: "Swap USDC->R2USD",
        amount,
        blockNumber: receipt.blockNumber.toString(),
        txHash: tx.hash
      });
    } catch (e) {
      addLog(`Gagal swap ke-${i + 1}: ${e.message}`, "error");
    }
  }
  await updateWalletData();
  done();
}
async function swapR2usdToUsdc(amount, times, done) {
  const decimals = await r2usd.decimals();
  const amountIn = ethers.parseUnits(amount.toString(), decimals);
  await checkAndApprove(r2usd, ADDRESSES.SWAP_ROUTER, amountIn * BigInt(times));
  for (let i = 0; i < times; i++) {
    try {
      const path = [ADDRESSES.R2USD, ADDRESSES.USDC];
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        0,
        path,
        wallet.address,
        deadline
      );
      addLog(`Swap ke-${i + 1} tx: ${tx.hash}`);
      const receipt = await tx.wait();
      operationsHistory.push({
        type: "Swap R2USD->USDC",
        amount,
        blockNumber: receipt.blockNumber.toString(),
        txHash: tx.hash
      });
    } catch (e) {
      addLog(`Gagal swap ke-${i + 1}: ${e.message}`, "error");
    }
  }
  await updateWalletData();
  done();
}
async function addUsdcR2usdLiquidity(amountUsdc, amountR2usd, done) {
  const usdcDec = await usdc.decimals();
  const r2usdDec = await r2usd.decimals();
  const amountADesired = ethers.parseUnits(amountUsdc.toString(), usdcDec);
  const amountBDesired = ethers.parseUnits(amountR2usd.toString(), r2usdDec);
  await checkAndApprove(usdc, ADDRESSES.SWAP_ROUTER, amountADesired);
  await checkAndApprove(r2usd, ADDRESSES.SWAP_ROUTER, amountBDesired);
  try {
    const deadline = Math.floor(Date.now() / 1000) + 1800;
    const tx = await router.addLiquidity(
      ADDRESSES.USDC,
      ADDRESSES.R2USD,
      amountADesired,
      amountBDesired,
      0,
      0,
      wallet.address,
      deadline
    );
    addLog(`Add Liquidity tx: ${tx.hash}`);
    const receipt = await tx.wait();
    operationsHistory.push({
      type: "AddLiquidity USDC-R2USD",
      amount: `${amountUsdc}|${amountR2usd}`,
      blockNumber: receipt.blockNumber.toString(),
      txHash: tx.hash
    });
  } catch (e) {
    addLog(`Gagal add liquidity: ${e.message}`, "error");
  }
  await updateWalletData();
  done();
}

// ====== UI BLESSED ======
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
function promptStep(labels, callback) {
  let answers = [];
  function ask(i) {
    if (i >= labels.length) {
      promptBox.hide();
      screen.render();
      callback(answers);
      return;
    }
    let label = labels[i];
    promptBox.show();
    promptBox.focus();
    screen.render();
    promptBox.input(label, '', (err, value) => {
      promptBox.hide();
      screen.render();
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
function showManualSwapUSDC_R2USD_SubMenu() {
  showSimpleSubmenu(
    "Swap USDC <> R2USD",
    [
      "Swap USDC ke R2USD",
      "Swap R2USD ke USDC",
      "Back to Main Menu"
    ],
    {
      0: (done) => promptStep(['Jumlah USDC:', 'Berapa kali swap?'], ([amount, times]) => swapUsdcToR2usd(amount, times, done)),
      1: (done) => promptStep(['Jumlah R2USD:', 'Berapa kali swap?'], ([amount, times]) => swapR2usdToUsdc(amount, times, done))
    }
  );
}
function showAddLiquiditySubMenu() {
  showSimpleSubmenu(
    "Add Liquidity",
    [
      "Add USDC-R2USD Liquidity",
      "Back to Main Menu"
    ],
    {
      0: (done) => promptStep(['Jumlah USDC:', 'Jumlah R2USD:'], ([usdc, r2usd]) => addUsdcR2usdLiquidity(usdc, r2usd, done))
    }
  );
}
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

// ====== MAIN MENU ======
function showMainMenu() {
  menuBox.setItems([
    "1. Swap USDC <> R2USD",
    "2. Add Liquidity USDC-R2USD",
    "3. Transaction History",
    "4. Refresh Data",
    "5. Exit"
  ]);
  menuBox.select(0);
  menuBox.focus();
  screen.render();
  menuBox.key(['escape', 'q', 'C-c'], () => process.exit(0));
  menuBox.on('select', (item, index) => {
    switch (index) {
      case 0: showManualSwapUSDC_R2USD_SubMenu(); break;
      case 1: showAddLiquiditySubMenu(); break;
      case 2: showTransactionHistoryBox(); break;
      case 3: updateWalletData(); addLog("Balance/data telah direfresh.", "success"); break;
      case 4: process.exit(0); break;
    }
  });
}

// ====== INIT APP ======
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
initApp();