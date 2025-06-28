import "dotenv/config";
import blessed from "blessed";
import figlet from "figlet";
import { ethers } from "ethers";

// Configuration
const SEPOLIA_RPC = "https://sepolia.infura.io/v3/ef659d824bd14ae798d965f855f2cfd6";
const initialProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const initialWallet = new ethers.Wallet(process.env.PRIVATE_KEY, initialProvider);

const CONFIG = {
  RPC_URL: SEPOLIA_RPC,
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

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)"
];

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external"
];

let walletInfo = {
  address: initialWallet.address,
  balances: {
    native: "0",
    USDC: "0",
    BTC: "0",
    R2USD: "0",
    sR2USD: "0",
    R2BTC: "0",
    R2: "0",
    LP_R2USD_sR2USD: "0",
    LP_USDC_R2USD: "0",
    LP_R2_R2USD: "0"
  },
  status: "Ready"
};

let transactionLogs = [];
let operationsHistory = [];
let currentNonce = 0;
let screen, walletBox, logBox, menuBox;

// Helper Functions
function addLog(message, type = "info") {
  const colors = { info: "white", error: "red", success: "green", debug: "yellow" };
  const timestamp = new Date().toLocaleString();
  logBox.add(`[${timestamp}] | {${colors[type]}-fg}${message}{/${colors[type]}-fg}`);
  screen.render();
}

async function getTokenBalance(tokenAddress, provider, wallet) {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(wallet.address);
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    addLog(`Error getting balance for ${tokenAddress}: ${error.message}`, "error");
    return "0";
  }
}

async function ensureApproval(tokenAddress, spender, amount, wallet) {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const allowance = await contract.allowance(wallet.address, spender);
    if (allowance < amount) {
      addLog(`Approving ${tokenAddress} for spender ${spender}...`, "info");
      const tx = await contract.approve(spender, amount);
      await tx.wait();
      return true;
    }
    return false;
  } catch (error) {
    addLog(`Approval failed: ${error.message}`, "error");
    throw error;
  }
}

async function updateWalletData() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const balances = await Promise.all([
      provider.getBalance(wallet.address),
      getTokenBalance(CONFIG.USDC_ADDRESS, provider, wallet),
      getTokenBalance(CONFIG.BTC_ADDRESS, provider, wallet),
      getTokenBalance(CONFIG.R2USD_ADDRESS, provider, wallet),
      getTokenBalance(CONFIG.sR2USD_ADDRESS, provider, wallet),
      getTokenBalance(CONFIG.R2BTC_ADDRESS, provider, wallet),
      getTokenBalance(CONFIG.R2_ADDRESS, provider, wallet),
      getTokenBalance(CONFIG.LP_R2USD_sR2USD, provider, wallet),
      getTokenBalance(CONFIG.LP_USDC_R2USD, provider, wallet),
      getTokenBalance(CONFIG.LP_R2_R2USD, provider, wallet)
    ]);

    walletInfo.balances = {
      native: ethers.formatEther(balances[0]),
      USDC: balances[1],
      BTC: balances[2],
      R2USD: balances[3],
      sR2USD: balances[4],
      R2BTC: balances[5],
      R2: balances[6],
      LP_R2USD_sR2USD: balances[7],
      LP_USDC_R2USD: balances[8],
      LP_R2_R2USD: balances[9]
    };

    currentNonce = await provider.getTransactionCount(wallet.address, "pending");
    updateWalletDisplay();
  } catch (error) {
    addLog(`Balance update failed: ${error.message}`, "error");
  }
}

function updateWalletDisplay() {
  const shortAddress = walletInfo.address ? `${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}` : "N/A";
  const content = `┌── Address   : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH           : {bright-green-fg}${Number(walletInfo.balances.native).toFixed(4)}{/bright-green-fg}
│   ├── USDC          : {bright-green-fg}${Number(walletInfo.balances.USDC).toFixed(2)}{/bright-green-fg}
│   ├── BTC           : {bright-green-fg}${Number(walletInfo.balances.BTC).toFixed(8)}{/bright-green-fg}
│   ├── R2USD         : {bright-green-fg}${Number(walletInfo.balances.R2USD).toFixed(4)}{/bright-green-fg}
│   ├── sR2USD        : {bright-green-fg}${Number(walletInfo.balances.sR2USD).toFixed(4)}{/bright-green-fg}
│   ├── R2BTC         : {bright-green-fg}${Number(walletInfo.balances.R2BTC).toFixed(8)}{/bright-green-fg}
│   ├── R2            : {bright-green-fg}${Number(walletInfo.balances.R2).toFixed(4)}{/bright-green-fg}
│   ├── LP R2USD-sR2USD : {bright-green-fg}${Number(walletInfo.balances.LP_R2USD_sR2USD).toFixed(4)}{/bright-green-fg}
│   ├── LP USDC-R2USD : {bright-green-fg}${Number(walletInfo.balances.LP_USDC_R2USD).toFixed(4)}{/bright-green-fg}
│   └── LP R2-R2USD   : {bright-green-fg}${Number(walletInfo.balances.LP_R2_R2USD).toFixed(4)}{/bright-green-fg}
└── Network        : {bright-cyan-fg}${CONFIG.NETWORK_NAME}{/bright-cyan-fg}`;
  walletBox.setContent(content);
  screen.render();
}

// Transaction Log Formatter
function printTxLog(type, tx, block, explorer, custom = "") {
  addLog("waiting verify task", "debug");
  addLog(`Block   : ${block}`, "info");
  addLog(`[ ${new Date().toLocaleString()} ] | Tx Hash : ${tx}`, "info");
  addLog(`[ ${new Date().toLocaleString()} ] | Explorer: ${explorer}`, "debug");
  if (custom) addLog(custom, "debug");
}

// Transaction Functions (Swap/Add/Remove/Stake/Unstake/Deposit)
async function executeSwap(fromToken, toToken, amount, times, minDelay, maxDelay) {
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      addLog(`Waiting ${delay} seconds before next swap...`, "info");
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    let provider, wallet;
    try {
      provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const routerAddress = fromToken === "BTC" || toToken === "BTC" ? CONFIG.BTC_SWAP_ROUTER : CONFIG.SWAP_ROUTER;
      const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

      const fromAddress = CONFIG[`${fromToken}_ADDRESS`];
      const toAddress = CONFIG[`${toToken}_ADDRESS`];
      const path = [fromAddress, toAddress];

      let decimals = (fromToken === "BTC" || toToken === "BTC") ? 8 : 6;
      if (fromToken === "R2") decimals = 18;
      if (fromToken === "R2BTC" || toToken === "R2BTC") decimals = 8;
      const amountIn = ethers.parseUnits(amount.toString(), decimals);

      addLog(`[${i+1}/${times}] Preparing swap ${fromToken} -> ${toToken}...`, "info");
      await ensureApproval(fromAddress, routerAddress, amountIn, wallet);

      addLog(`[${i+1}/${times}] Executing swap...`, "info");
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        0,
        path,
        wallet.address,
        Math.floor(Date.now() / 1000) + 1200,
        { nonce: currentNonce++, gasLimit: 500000 }
      );
      addLog(`[${i+1}/${times}] Waiting for transaction confirmation...`, "info");
      const receipt = await tx.wait();

      operationsHistory.push({
        type: `Swap ${fromToken}->${toToken}`,
        amount, txHash: tx.hash, blockNumber: receipt.blockNumber, timestamp: new Date().toISOString()
      });
      printTxLog(`Swap ${fromToken}->${toToken}`, tx.hash, receipt.blockNumber, `https://sepolia.etherscan.io/tx/${tx.hash}`);
      await updateWalletData();
    } catch (error) {
      addLog(`[${i+1}/${times}] Swap failed: ${error.message}`, "error");
      if (error.code === "NONCE_EXPIRED") {
        currentNonce = await provider.getTransactionCount(wallet.address, "pending");
      }
    }
  }
}

async function executeStake(amount, times, minDelay, maxDelay) {
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      addLog(`Waiting ${delay} seconds before next stake...`, "info");
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    let provider, wallet;
    try {
      provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const staking = new ethers.Contract(CONFIG.STAKING_CONTRACT, STAKING_ABI, wallet);
      const amountIn = ethers.parseUnits(amount.toString(), 6);

      addLog(`[${i+1}/${times}] Preparing stake...`, "info");
      await ensureApproval(CONFIG.R2USD_ADDRESS, CONFIG.STAKING_CONTRACT, amountIn, wallet);

      addLog(`[${i+1}/${times}] Executing stake...`, "info");
      const tx = await staking.stake(amountIn, { nonce: currentNonce++, gasLimit: 500000 });
      addLog(`[${i+1}/${times}] Waiting for transaction confirmation...`, "info");
      const receipt = await tx.wait();

      operationsHistory.push({
        type: "Stake R2USD",
        amount, txHash: tx.hash, blockNumber: receipt.blockNumber, timestamp: new Date().toISOString()
      });
      printTxLog("Stake R2USD", tx.hash, receipt.blockNumber, `https://sepolia.etherscan.io/tx/${tx.hash}`);
      await updateWalletData();
    } catch (error) {
      addLog(`[${i+1}/${times}] Stake failed: ${error.message}`, "error");
      if (error.code === "NONCE_EXPIRED") {
        currentNonce = await provider.getTransactionCount(wallet.address, "pending");
      }
    }
  }
}

async function executeUnstake(amount, times, minDelay, maxDelay) {
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      addLog(`Waiting ${delay} seconds before next unstake...`, "info");
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    let provider, wallet;
    try {
      provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const staking = new ethers.Contract(CONFIG.STAKING_CONTRACT, STAKING_ABI, wallet);
      const amountIn = ethers.parseUnits(amount.toString(), 6);

      addLog(`[${i+1}/${times}] Preparing unstake...`, "info");
      addLog(`[${i+1}/${times}] Executing unstake...`, "info");
      const tx = await staking.withdraw(amountIn, { nonce: currentNonce++, gasLimit: 500000 });
      addLog(`[${i+1}/${times}] Waiting for transaction confirmation...`, "info");
      const receipt = await tx.wait();

      operationsHistory.push({
        type: "Unstake sR2USD",
        amount, txHash: tx.hash, blockNumber: receipt.blockNumber, timestamp: new Date().toISOString()
      });
      printTxLog("Unstake sR2USD", tx.hash, receipt.blockNumber, `https://sepolia.etherscan.io/tx/${tx.hash}`);
      await updateWalletData();
    } catch (error) {
      addLog(`[${i+1}/${times}] Unstake failed: ${error.message}`, "error");
      if (error.code === "NONCE_EXPIRED") {
        currentNonce = await provider.getTransactionCount(wallet.address, "pending");
      }
    }
  }
}

async function executeAddLiquidity(tokenA, tokenB, amountA, amountB, times, minDelay, maxDelay) {
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      addLog(`Waiting ${delay} seconds before next liquidity add...`, "info");
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    let provider, wallet;
    try {
      provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const router = new ethers.Contract(CONFIG.SWAP_ROUTER, ROUTER_ABI, wallet);
      const tokenAAddress = CONFIG[`${tokenA}_ADDRESS`];
      const tokenBAddress = CONFIG[`${tokenB}_ADDRESS`];

      let decimalsA = (tokenA === "BTC") ? 8 : (tokenA === "R2" ? 18 : 6);
      let decimalsB = (tokenB === "BTC") ? 8 : (tokenB === "R2" ? 18 : 6);
      const amountADesired = ethers.parseUnits(amountA.toString(), decimalsA);
      const amountBDesired = ethers.parseUnits(amountB.toString(), decimalsB);

      addLog(`[${i+1}/${times}] Preparing liquidity add ${tokenA}-${tokenB}...`, "info");
      await ensureApproval(tokenAAddress, CONFIG.SWAP_ROUTER, amountADesired, wallet);
      await ensureApproval(tokenBAddress, CONFIG.SWAP_ROUTER, amountBDesired, wallet);

      addLog(`[${i+1}/${times}] Executing liquidity add...`, "info");
      const tx = await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountADesired,
        amountBDesired,
        0,
        0,
        wallet.address,
        Math.floor(Date.now() / 1000) + 1200,
        { nonce: currentNonce++, gasLimit: 500000 }
      );
      addLog(`[${i+1}/${times}] Waiting for transaction confirmation...`, "info");
      const receipt = await tx.wait();

      operationsHistory.push({
        type: `Add Liquidity ${tokenA}-${tokenB}`,
        amountA, amountB, txHash: tx.hash, blockNumber: receipt.blockNumber, timestamp: new Date().toISOString()
      });
      printTxLog(`AddLiquidity ${tokenA}-${tokenB}`, tx.hash, receipt.blockNumber, `https://sepolia.etherscan.io/tx/${tx.hash}`);
      await updateWalletData();
    } catch (error) {
      addLog(`[${i+1}/${times}] Liquidity add failed: ${error.message}`, "error");
      if (error.code === "NONCE_EXPIRED") {
        currentNonce = await provider.getTransactionCount(wallet.address, "pending");
      }
    }
  }
}

async function executeRemoveLiquidity(tokenA, tokenB, percentage, times, minDelay, maxDelay) {
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      addLog(`Waiting ${delay} seconds before next liquidity remove...`, "info");
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    let provider, wallet;
    try {
      provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

      const router = new ethers.Contract(CONFIG.SWAP_ROUTER, ROUTER_ABI, wallet);
      const tokenAAddress = CONFIG[`${tokenA}_ADDRESS`];
      const tokenBAddress = CONFIG[`${tokenB}_ADDRESS`];
      let lpTokenAddress;
      if (tokenA === "R2" && tokenB === "USDC") lpTokenAddress = CONFIG.LP_R2_R2USD;
      else if (tokenA === "R2" && tokenB === "R2USD") lpTokenAddress = CONFIG.LP_R2_R2USD;
      else if (tokenA === "USDC" && tokenB === "R2USD") lpTokenAddress = CONFIG.LP_USDC_R2USD;
      else if (tokenA === "R2USD" && tokenB === "sR2USD") lpTokenAddress = CONFIG.LP_R2USD_sR2USD;
      else throw new Error("Unsupported token pair for remove liquidity");

      const lpContract = new ethers.Contract(lpTokenAddress, ERC20_ABI, provider);
      const lpBalance = await lpContract.balanceOf(wallet.address);
      const lpDecimals = await lpContract.decimals();
      const lpAmount = lpBalance * percentage / 100;

      addLog(`[${i+1}/${times}] Preparing to remove ${percentage}% of ${tokenA}-${tokenB} liquidity...`, "info");
      await ensureApproval(lpTokenAddress, CONFIG.SWAP_ROUTER, lpAmount, wallet);

      addLog(`[${i+1}/${times}] Executing liquidity remove...`, "info");
      const tx = await router.removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        lpAmount,
        0,
        0,
        wallet.address,
        Math.floor(Date.now() / 1000) + 1200,
        { nonce: currentNonce++, gasLimit: 500000 }
      );
      addLog(`[${i+1}/${times}] Waiting for transaction confirmation...`, "info");
      const receipt = await tx.wait();

      operationsHistory.push({
        type: `Remove Liquidity ${tokenA}-${tokenB}`,
        percentage, txHash: tx.hash, blockNumber: receipt.blockNumber, timestamp: new Date().toISOString()
      });
      printTxLog(`RemoveLiquidity ${tokenA}-${tokenB}`, tx.hash, receipt.blockNumber, `https://sepolia.etherscan.io/tx/${tx.hash}`);
      await updateWalletData();
    } catch (error) {
      addLog(`[${i+1}/${times}] Liquidity remove failed: ${error.message}`, "error");
      if (error.code === "NONCE_EXPIRED") {
        currentNonce = await provider.getTransactionCount(wallet.address, "pending");
      }
    }
  }
}

async function executeDepositBTC(amount, times, minDelay, maxDelay) {
  for (let i = 0; i < times; i++) {
    if (i > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      addLog(`Waiting ${delay} seconds before next deposit...`, "info");
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    let provider, wallet;
    try {
      provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      // Simulasi saja, actual bridging WBTC ke R2BTC harus lewat protocol
      // Di sini treat as swap BTC->R2BTC
      await executeSwap("BTC", "R2BTC", amount, 1, 0, 0);
    } catch (error) {
      addLog(`[${i+1}/${times}] Deposit BTC failed: ${error.message}`, "error");
    }
  }
}

// UI Functions
function showMainMenu() {
  menuBox.setItems([
    "Start 24h Auto Mode",
    "Manual Swap USDC <> R2USD",
    "Manual Swap BTC <> R2BTC",
    "Manual Stake R2USD",
    "Manual Unstake sR2USD",
    "Manual Add Liquidity",
    "Manual Remove Liquidity",
    "Manual Deposit BTC",
    "Transaction History",
    "Clear Logs",
    "Refresh",
    "Exit"
  ]);
  menuBox.focus();
  menuBox.on('select', (item, index) => handleMenu(index));
}

function handleMenu(index) {
  switch (index) {
    case 0: addLog("Auto Mode belum diimplementasikan, gunakan mode manual", "info"); break;
    case 1: showSwapMenu(); break;
    case 2: showSwapBTCMenu(); break;
    case 3: showStakeMenu(); break;
    case 4: showUnstakeMenu(); break;
    case 5: showAddLiquidityMenu(); break;
    case 6: showRemoveLiquidityMenu(); break;
    case 7: showDepositBTCMenu(); break;
    case 8: showHistory(); break;
    case 9: logBox.setContent(""); screen.render(); break;
    case 10: updateWalletData(); break;
    case 11: process.exit(0);
  }
}

function showSwapMenu() {
  showSwapGenericMenu([
    { title: "Swap USDC to R2USD", from: "USDC", to: "R2USD" },
    { title: "Swap R2USD to USDC", from: "R2USD", to: "USDC" },
    { title: "Swap R2 to USDC", from: "R2", to: "USDC" },
    { title: "Swap USDC to R2", from: "USDC", to: "R2" }
  ]);
}

function showSwapBTCMenu() {
  showSwapGenericMenu([
    { title: "Swap BTC to R2BTC", from: "BTC", to: "R2BTC" },
    { title: "Swap R2BTC to BTC", from: "R2BTC", to: "BTC" }
  ]);
}

function showSwapGenericMenu(pairs) {
  const swapMenu = blessed.list({
    parent: screen,
    top: 'center', left: 'center', width: '60%', height: '60%',
    border: { type: 'line' }, style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: pairs.map(x => x.title).concat(["Back to Main Menu"])
  });
  screen.append(swapMenu); swapMenu.focus();
  swapMenu.on('select', (item, idx) => {
    if (idx === pairs.length) { screen.remove(swapMenu); showMainMenu(); return; }
    screen.remove(swapMenu); showSwapForm(pairs[idx]);
  });
  screen.render();
}

function showSwapForm(pair) {
  const form = blessed.form({
    parent: screen, top: 'center', left: 'center',
    width: '60%', height: '60%',
    border: { type: 'line' }, style: { border: { fg: 'cyan' } }
  });
  const rows = [
    { label: `How many ${pair.from}->${pair.to} swaps?`, ref: "times" },
    { label: `Amount of ${pair.from} per swap?`, ref: "amount" },
    { label: "Minimum delay between swaps (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between swaps (seconds)?", ref: "maxDelay" }
  ];
  const inputs = {};
  rows.forEach((row, i) => {
    blessed.text({ parent: form, top: 1 + i*2, left: 2, content: row.label });
    inputs[row.ref] = blessed.textbox({ parent: form, top: 2 + i*2, left: 2, width: '90%', height: 1, inputOnFocus: true });
  });
  const submit = blessed.button({ parent: form, top: 10, left: 2, width: 10, height: 1, content: 'Submit', style: { bg: 'green' } });
  const cancel = blessed.button({ parent: form, top: 10, left: 15, width: 10, height: 1, content: 'Cancel', style: { bg: 'red' } });
  submit.on('press', () => {
    const times = parseInt(inputs.times.getValue()), amount = parseFloat(inputs.amount.getValue());
    const minDelay = parseInt(inputs.minDelay.getValue()), maxDelay = parseInt(inputs.maxDelay.getValue());
    if (isNaN(times) || isNaN(amount) || isNaN(minDelay) || isNaN(maxDelay)) { addLog("Invalid input values", "error"); return; }
    screen.remove(form);
    executeSwap(pair.from, pair.to, amount, times, minDelay, maxDelay).then(() => showMainMenu());
  });
  cancel.on('press', () => { screen.remove(form); showMainMenu(); });
  screen.append(form); inputs.times.focus(); screen.render();
}

function showStakeMenu() {
  showForm("Stake R2USD", [
    { label: "How many times to stake?", ref: "times" },
    { label: "Amount of R2USD to stake each time?", ref: "amount" },
    { label: "Minimum delay between stakes (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between stakes (seconds)?", ref: "maxDelay" }
  ], ({ times, amount, minDelay, maxDelay }) =>
    executeStake(amount, times, minDelay, maxDelay).then(() => showMainMenu())
  );
}

function showUnstakeMenu() {
  showForm("Unstake sR2USD", [
    { label: "How many times to unstake?", ref: "times" },
    { label: "Amount of sR2USD to unstake each time?", ref: "amount" },
    { label: "Minimum delay between unstakes (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between unstakes (seconds)?", ref: "maxDelay" }
  ], ({ times, amount, minDelay, maxDelay }) =>
    executeUnstake(amount, times, minDelay, maxDelay).then(() => showMainMenu())
  );
}

function showAddLiquidityMenu() {
  const liqMenu = blessed.list({
    parent: screen, top: 'center', left: 'center', width: '60%', height: '60%',
    border: { type: 'line' }, style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: [
      "Add R2-USDC Liquidity",
      "Add R2-R2USD Liquidity",
      "Add USDC-R2USD Liquidity",
      "Add R2USD-sR2USD Liquidity",
      "Back to Main Menu"
    ]
  });
  screen.append(liqMenu); liqMenu.focus();
  liqMenu.on('select', (item, idx) => {
    if (idx === 4) { screen.remove(liqMenu); showMainMenu(); return; }
    const pairs = [
      { tokenA: "R2", tokenB: "USDC" },
      { tokenA: "R2", tokenB: "R2USD" },
      { tokenA: "USDC", tokenB: "R2USD" },
      { tokenA: "R2USD", tokenB: "sR2USD" }
    ];
    screen.remove(liqMenu);
    showForm(`Add ${pairs[idx].tokenA}-${pairs[idx].tokenB} Liquidity`, [
      { label: `How many times to add liquidity ${pairs[idx].tokenA}-${pairs[idx].tokenB}?`, ref: "times" },
      { label: `Amount of ${pairs[idx].tokenA} per add?`, ref: "amountA" },
      { label: `Amount of ${pairs[idx].tokenB} per add?`, ref: "amountB" },
      { label: "Minimum delay between add (seconds)?", ref: "minDelay" },
      { label: "Maximum delay between add (seconds)?", ref: "maxDelay" }
    ], ({ times, amountA, amountB, minDelay, maxDelay }) =>
      executeAddLiquidity(pairs[idx].tokenA, pairs[idx].tokenB, amountA, amountB, times, minDelay, maxDelay)
        .then(() => showMainMenu())
    );
  });
  screen.render();
}

function showRemoveLiquidityMenu() {
  const rmMenu = blessed.list({
    parent: screen, top: 'center', left: 'center', width: '60%', height: '60%',
    border: { type: 'line' }, style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: [
      "Remove R2-USDC Liquidity",
      "Remove R2-R2USD Liquidity",
      "Remove USDC-R2USD Liquidity",
      "Remove R2USD-sR2USD Liquidity",
      "Back to Main Menu"
    ]
  });
  screen.append(rmMenu); rmMenu.focus();
  rmMenu.on('select', (item, idx) => {
    if (idx === 4) { screen.remove(rmMenu); showMainMenu(); return; }
    const pairs = [
      { tokenA: "R2", tokenB: "USDC" },
      { tokenA: "R2", tokenB: "R2USD" },
      { tokenA: "USDC", tokenB: "R2USD" },
      { tokenA: "R2USD", tokenB: "sR2USD" }
    ];
    screen.remove(rmMenu);
    showForm(`Remove ${pairs[idx].tokenA}-${pairs[idx].tokenB} Liquidity`, [
      { label: `How many times to remove liquidity ${pairs[idx].tokenA}-${pairs[idx].tokenB}?`, ref: "times" },
      { label: "Percentage to remove (20 or 50)?", ref: "percentage" },
      { label: "Minimum delay between remove (seconds)?", ref: "minDelay" },
      { label: "Maximum delay between remove (seconds)?", ref: "maxDelay" }
    ], ({ times, percentage, minDelay, maxDelay }) =>
      executeRemoveLiquidity(pairs[idx].tokenA, pairs[idx].tokenB, percentage, times, minDelay, maxDelay)
        .then(() => showMainMenu())
    );
  });
  screen.render();
}

function showDepositBTCMenu() {
  showForm("Deposit WBTC to R2BTC", [
    { label: "How many times to deposit?", ref: "times" },
    { label: "Amount of WBTC per deposit?", ref: "amount" },
    { label: "Minimum delay between deposit (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between deposit (seconds)?", ref: "maxDelay" }
  ], ({ times, amount, minDelay, maxDelay }) =>
    executeDepositBTC(amount, times, minDelay, maxDelay).then(() => showMainMenu())
  );
}

// Generic Form Helper
function showForm(title, fields, onSubmit) {
  const form = blessed.form({
    parent: screen, top: 'center', left: 'center',
    width: '60%', height: '60%',
    border: { type: 'line' }, style: { border: { fg: 'cyan' } }
  });
  blessed.text({ parent: form, top: 0, left: 2, content: title, style: { bold: true } });
  const inputs = {};
  fields.forEach((f, i) => {
    blessed.text({ parent: form, top: 2 + i*2, left: 2, content: f.label });
    inputs[f.ref] = blessed.textbox({ parent: form, top: 3 + i*2, left: 2, width: '90%', height: 1, inputOnFocus: true });
  });
  const submit = blessed.button({ parent: form, top: 3 + fields.length*2, left: 2, width: 10, height: 1, content: 'Submit', style: { bg: 'green' } });
  const cancel = blessed.button({ parent: form, top: 3 + fields.length*2, left: 15, width: 10, height: 1, content: 'Cancel', style: { bg: 'red' } });
  submit.on('press', () => {
    let values = {};
    let err = false;
    fields.forEach(f => {
      const v = Number(inputs[f.ref].getValue());
      if (isNaN(v)) err = true;
      values[f.ref] = v;
    });
    if (err) { addLog("Invalid input values", "error"); return; }
    screen.remove(form);
    onSubmit(values);
  });
  cancel.on('press', () => { screen.remove(form); showMainMenu(); });
  screen.append(form);
  inputs[fields[0].ref].focus();
  screen.render();
}

function showHistory() {
  logBox.setContent("");
  operationsHistory.forEach((op, idx) => {
    addLog(`[${idx+1}] ${op.type} | Tx: ${op.txHash} | Block: ${op.blockNumber} | ${op.timestamp}`, "info");
  });
  screen.render();
}

// Initial UI Setup
function main() {
  screen = blessed.screen({ smartCSR: true, title: "DeFi CLI Terminal" });
  walletBox = blessed.box({ top: 0, left: 0, width: '50%', height: '25%', border: { type: 'line' }, label: "Wallet Info", style: { border: { fg: 'cyan' } } });
  logBox = blessed.log({ top: '25%', left: 0, width: '50%', height: '75%', border: { type: 'line' }, label: "Logs", style: { border: { fg: 'cyan' } } });
  menuBox = blessed.list({ top: 0, left: '50%', width: '50%', height: '100%', border: { type: 'line' }, label: "Menu", style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } } });
  screen.append(walletBox); screen.append(logBox); screen.append(menuBox);
  updateWalletDisplay();
  showMainMenu();
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
  updateWalletData();
}

main();
