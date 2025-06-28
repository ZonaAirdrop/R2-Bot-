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
      R2: balances[5],
      LP_R2USD_sR2USD: balances[6],
      LP_USDC_R2USD: balances[7],
      LP_R2_R2USD: balances[8]
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
│   ├── R2USD         : {bright-green-fg}${Number(walletInfo.balances.R2USD).toFixed(4)}{/bright-green-fg}
│   ├── sR2USD        : {bright-green-fg}${Number(walletInfo.balances.sR2USD).toFixed(4)}{/bright-green-fg}
│   ├── R2            : {bright-green-fg}${Number(walletInfo.balances.R2).toFixed(4)}{/bright-green-fg}
│   ├── LP R2USD-sR2USD : {bright-green-fg}${Number(walletInfo.balances.LP_R2USD_sR2USD).toFixed(4)}{/bright-green-fg}
│   ├── LP USDC-R2USD : {bright-green-fg}${Number(walletInfo.balances.LP_USDC_R2USD).toFixed(4)}{/bright-green-fg}
│   ├── LP R2-R2USD   : {bright-green-fg}${Number(walletInfo.balances.LP_R2_R2USD).toFixed(4)}{/bright-green-fg}
│   └── BTC           : {bright-green-fg}${Number(walletInfo.balances.BTC).toFixed(8)}{/bright-green-fg}
└── Network        : {bright-cyan-fg}${CONFIG.NETWORK_NAME}{/bright-cyan-fg}`;
  walletBox.setContent(content);
  screen.render();
}

function printTxLog(type, tx, block, explorer, custom = "") {
  addLog("waiting verify task", "debug");
  addLog(`Block   : ${block}`, "info");
  addLog(`[ ${new Date().toLocaleString()} ] | Tx Hash : ${tx}`, "info");
  addLog(`[ ${new Date().toLocaleString()} ] | Explorer: ${explorer}`, "debug");
  if (custom) addLog(custom, "debug");
}

// Transaction Functions
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
      await executeSwap("BTC", "R2BTC", amount, 1, 0, 0);
    } catch (error) {
      addLog(`[${i+1}/${times}] Deposit BTC failed: ${error.message}`, "error");
    }
  }
}

// UI Functions
function showMainMenu() {
  menuBox.setItems([
    "1. Swap USDC <> R2USD",
    "2. Swap R2 <> USDC",
    "3. Swap BTC <> R2BTC",
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
  menuBox.focus();
  menuBox.on('select', (item, index) => handleMenu(index));
}

function handleMenu(index) {
  switch (index) {
    case 0: showSwapMenu(); break;
    case 1: showR2SwapMenu(); break;
    case 2: showSwapBTCMenu(); break;
    case 3: showAddLiquidityMenu(); break;
    case 4: showRemoveLiquidityMenu(); break;
    case 5: showStakeMenu(); break;
    case 6: showUnstakeMenu(); break;
    case 7: showDepositBTCMenu(); break;
    case 8: showHistory(); break;
    case 9: logBox.setContent(""); screen.render(); break;
    case 10: updateWalletData(); break;
    case 11: process.exit(0);
  }
}

function showSwapMenu() {
  const swapMenu = blessed.list({
    parent: screen,
    top: 'center', left: 'center', width: '60%', height: '60%',
    border: { type: 'line' }, style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: [
      "Swap USDC to R2USD",
      "Swap R2USD to USDC",
      "Back to Main Menu"
    ]
  });
  screen.append(swapMenu); swapMenu.focus();
  swapMenu.on('select', (item, idx) => {
    if (idx === 2) { screen.remove(swapMenu); showMainMenu(); return; }
    screen.remove(swapMenu);
    const pairs = [
      { from: "USDC", to: "R2USD" },
      { from: "R2USD", to: "USDC" }
    ];
    showSwapForm(pairs[idx]);
  });
  screen.render();
}

function showR2SwapMenu() {
  const swapMenu = blessed.list({
    parent: screen,
    top: 'center', left: 'center', width: '60%', height: '60%',
    border: { type: 'line' }, style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: [
      "Swap R2 to USDC",
      "Swap USDC to R2",
      "Back to Main Menu"
    ]
  });
  screen.append(swapMenu); swapMenu.focus();
  swapMenu.on('select', (item, idx) => {
    if (idx === 2) { screen.remove(swapMenu); showMainMenu(); return; }
    screen.remove(swapMenu);
    const pairs = [
      { from: "R2", to: "USDC" },
      { from: "USDC", to: "R2" }
    ];
    showSwapForm(pairs[idx]);
  });
  screen.render();
}

function showSwapBTCMenu() {
  const swapMenu = blessed.list({
    parent: screen,
    top: 'center', left: 'center', width: '60%', height: '60%',
    border: { type: 'line' }, style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: [
      "Swap BTC to R2BTC",
      "Swap R2BTC to BTC",
      "Back to Main Menu"
    ]
  });
  screen.append(swapMenu); swapMenu.focus();
  swapMenu.on('select', (item, idx) => {
    if (idx === 2) { screen.remove(swapMenu); showMainMenu(); return; }
    screen.remove(swapMenu);
    const pairs = [
      { from: "BTC", to: "R2BTC" },
      { from: "R2BTC", to: "BTC" }
    ];
    showSwapForm(pairs[idx]);
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
    { label: "Minimum delay between deposits (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between deposits (seconds)?", ref: "maxDelay" }
  ], (data) => {
    // Process deposit data
    const { times, amount, minDelay, maxDelay } = data;
    performDepositBTC(times, amount, minDelay, maxDelay);
  });
}

function showSwapMenu() {
  showMenu("Swap Menu", [
    { title: "Swap USDC to R2USD", value: "usdcToR2usd" },
    { title: "Swap R2USD to USDC", value: "r2usdToUsdc" },
    { title: "Swap R2 to USDC", value: "r2ToUsdc" },
    { title: "Swap USDC to R2", value: "usdcToR2" },
    { title: "Back to Main Menu", value: "back" }
  ], (selected) => {
    if (selected === "back") {
      showMainMenu();
      return;
    }
    
    const swapForms = {
      "usdcToR2usd": {
        title: "Swap USDC to R2USD",
        fields: [
          { label: "How many times to swap?", ref: "times" },
          { label: "Amount to swap each time?", ref: "amount" },
          { label: "Max delay between swaps (seconds)?", ref: "maxDelay" }
        ]
      },
      // Add similar configurations for other swap types
    };
    
    showForm(swapForms[selected].title, swapForms[selected].fields, (data) => {
      performSwap(selected, data.times, data.amount, data.maxDelay);
    });
  });
}

function showLiquidityMenu() {
  showMenu("Liquidity Menu", [
    { title: "Add Liquidity", value: "add" },
    { title: "Remove Liquidity", value: "remove" },
    { title: "Back to Main Menu", value: "back" }
  ], (selected) => {
    if (selected === "back") {
      showMainMenu();
      return;
    }
    
    if (selected === "add") {
      showAddLiquidityMenu();
    } else {
      showRemoveLiquidityMenu();
    }
  });
}

function showAddLiquidityMenu() {
  showMenu("Add Liquidity", [
    { title: "Add R2 to USDC", value: "r2Usdc" },
    { title: "Add R2 to R2USD", value: "r2R2usd" },
    { title: "Add USDC to R2USD", value: "usdcR2usd" },
    { title: "Add R2USD to sR2USD", value: "r2usdSR2usd" },
    { title: "Back", value: "back" }
  ], (selected) => {
    if (selected === "back") {
      showLiquidityMenu();
      return;
    }
    
    showForm(`Add Liquidity ${selected}`, [
      { label: "How many times to add liquidity?", ref: "times" },
      { label: "Amount to add each time?", ref: "amount" },
      { label: "Delay between adds (seconds)?", ref: "delay" }
    ], (data) => {
      performAddLiquidity(selected, data.times, data.amount, data.delay);
    });
  });
}

function showRemoveLiquidityMenu() {
  showMenu("Remove Liquidity", [
    { title: "Remove R2 and USDC", value: "r2Usdc" },
    { title: "Remove R2 and R2USD", value: "r2R2usd" },
    { title: "Remove USDC and R2USD", value: "usdcR2usd" },
    { title: "Remove R2USD and sR2USD", value: "r2usdSR2usd" },
    { title: "Back", value: "back" }
  ], (selected) => {
    if (selected === "back") {
      showLiquidityMenu();
      return;
    }
    
    showForm(`Remove Liquidity ${selected}`, [
      { label: "Percentage to remove?", ref: "percentage", type: "select", options: [
        { title: "20%", value: 20 },
        { title: "30%", value: 30 },
        { title: "40%", value: 40 },
        { title: "50%", value: 50 }
      ]},
      { label: "Delay before removing (seconds)?", ref: "delay" }
    ], (data) => {
      performRemoveLiquidity(selected, data.percentage, data.delay);
    });
  });
}

function showStakingMenu() {
  showMenu("Staking Menu", [
    { title: "Stake R2USD to sR2USD", value: "stake" },
    { title: "Unstake sR2USD to R2USD", value: "unstake" },
    { title: "Back to Main Menu", value: "back" }
  ], (selected) => {
    if (selected === "back") {
      showMainMenu();
      return;
    }
    
    const action = selected === "stake" ? "Stake" : "Unstake";
    showForm(`${action} R2USD/sR2USD`, [
      { label: "How many times to ${selected}?", ref: "times" },
      { label: "Amount to ${selected} each time?", ref: "amount" },
      { label: "Delay between ${selected}s (seconds)?", ref: "delay" }
    ], (data) => {
      if (selected === "stake") {
        performStake(data.times, data.amount, data.delay);
      } else {
        performUnstake(data.times, data.amount, data.delay);
      }
    });
  });
}

// Example transaction processing function
async function performSwap(type, times, amount, maxDelay) {
  for (let i = 0; i < times; i++) {
    console.log(`Waiting to verify task...`);
    
    // Simulate swap transaction
    const txHash = "0x" + Math.random().toString(16).substr(2, 64);
    const blockNumber = Math.floor(Math.random() * 10000000) + 10000000;
    const now = new Date();
    
    console.log(`Block   : ${blockNumber}`);
    console.log(`[ ${now.toLocaleDateString()} ${now.toLocaleTimeString()} ] | Tx Hash : ${txHash}`);
    console.log(`Explorer: https://testnet.pharosscan.xyz/tx/${txHash}`);
    
    // Random delay between transactions
    const delay = Math.floor(Math.random() * maxDelay * 1000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  showMainMenu();
}

// Similar functions would be needed for:
// - performDepositBTC
// - performAddLiquidity
// - performRemoveLiquidity
// - performStake
// - performUnstake

function showMainMenu() {
  showMenu("Main Menu", [
    { title: "Swap", value: "swap" },
    { title: "Liquidity", value: "liquidity" },
    { title: "Staking", value: "staking" },
    { title: "Deposit BTC", value: "deposit" },
    { title: "Exit", value: "exit" }
  ], (selected) => {
    switch (selected) {
      case "swap":
        showSwapMenu();
        break;
      case "liquidity":
        showLiquidityMenu();
        break;
      case "staking":
        showStakingMenu();
        break;
      case "deposit":
        showDepositBTCMenu();
        break;
      case "exit":
        process.exit(0);
    }
  });
}