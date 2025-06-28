import "dotenv/config";
import blessed from "blessed";
import figlet from "figlet";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/ef659d824bd14ae798d965f855f2cfd6";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("🛑 CRITICAL: Missing PRIVATE_KEY in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log("✅ ACTIVE WALLET:", wallet.address);
console.log("🌐 NETWORK ENDPOINT:", RPC_URL);

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
  menuBox.on('select', (item, index) => {
    switch (index) {
      case 0: showSwapMenu("USDC", "R2USD"); break;
      case 1: showSwapMenu("R2", "USDC"); break;
      case 2: showSwapMenu("BTC", "R2BTC"); break;
      case 3: showLiquidityMenu("add"); break;
      case 4: showLiquidityMenu("remove"); break;
      case 5: showStakingMenu("stake"); break;
      case 6: showStakingMenu("unstake"); break;
      case 7: showDepositBTCMenu(); break;
      case 8: showTransactionHistory(); break;
      case 9: logBox.setContent(""); screen.render(); break;
      case 10: updateWalletData(); break;
      case 11: process.exit(0);
    }
  });
  screen.render();
}

function showForm(title, fields, onSubmit) {
  const form = blessed.form({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '60%',
    height: '60%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } }
  });

  const inputs = {};
  blessed.text({
    parent: form,
    top: 1,
    left: 2,
    content: title
  });

  fields.forEach((field, i) => {
    blessed.text({
      parent: form,
      top: 3 + i * 2,
      left: 2,
      content: field.label
    });
    inputs[field.ref] = blessed.textbox({
      parent: form,
      top: 4 + i * 2,
      left: 2,
      width: '90%',
      height: 1,
      inputOnFocus: true
    });
  });

  const submit = blessed.button({
    parent: form,
    top: 4 + fields.length * 2,
    left: 2,
    width: 10,
    height: 1,
    content: 'Submit',
    style: { bg: 'green' }
  });

  const cancel = blessed.button({
    parent: form,
    top: 4 + fields.length * 2,
    left: 15,
    width: 10,
    height: 1,
    content: 'Cancel',
    style: { bg: 'red' }
  });

  submit.on('press', () => {
    const data = {};
    fields.forEach(field => {
      data[field.ref] = inputs[field.ref].getValue();
    });
    screen.remove(form);
    onSubmit(data);
  });

  cancel.on('press', () => {
    screen.remove(form);
    showMainMenu();
  });

  screen.append(form);
  inputs[fields[0].ref].focus();
  screen.render();
}

function showLiquidityMenu(action) {
  const title = action === "add" ? "Add Liquidity" : "Remove Liquidity";
  const menu = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '60%',
    height: '60%',
    border: { type: 'line' },
    style: { selected: { bg: 'blue' }, border: { fg: 'cyan' } },
    items: [
      `${action === "add" ? "Add" : "Remove"} R2-USDC Liquidity`,
      `${action === "add" ? "Add" : "Remove"} R2-R2USD Liquidity`,
      `${action === "add" ? "Add" : "Remove"} USDC-R2USD Liquidity`,
      `${action === "add" ? "Add" : "Remove"} R2USD-sR2USD Liquidity`,
      "Back to Main Menu"
    ]
  });

  screen.append(menu);
  menu.focus();

  menu.on('select', (item, idx) => {
    if (idx === 4) {
      screen.remove(menu);
      showMainMenu();
      return;
    }

    const pairs = [
      { tokenA: "R2", tokenB: "USDC" },
      { tokenA: "R2", tokenB: "R2USD" },
      { tokenA: "USDC", tokenB: "R2USD" },
      { tokenA: "R2USD", tokenB: "sR2USD" }
    ];

    const pair = pairs[idx];
    screen.remove(menu);

    if (action === "add") {
      showForm(`Add ${pair.tokenA}-${pair.tokenB} Liquidity`, [
        { label: `How many times to add liquidity?`, ref: "times" },
        { label: `Amount of ${pair.tokenA} per add?`, ref: "amountA" },
        { label: `Amount of ${pair.tokenB} per add?`, ref: "amountB" },
        { label: "Min delay between adds (seconds)?", ref: "minDelay" },
        { label: "Max delay between adds (seconds)?", ref: "maxDelay" }
      ], (data) => {
        executeAddLiquidity(
          pair.tokenA,
          pair.tokenB,
          parseFloat(data.amountA),
          parseFloat(data.amountB),
          parseInt(data.times),
          parseInt(data.minDelay),
          parseInt(data.maxDelay)
        ).then(() => showMainMenu());
      });
    } else {
      showForm(`Remove ${pair.tokenA}-${pair.tokenB} Liquidity`, [
        { label: `How many times to remove liquidity?`, ref: "times" },
        { label: "Percentage to remove (20 or 50)?", ref: "percentage" },
        { label: "Min delay between removes (seconds)?", ref: "minDelay" },
        { label: "Max delay between removes (seconds)?", ref: "maxDelay" }
      ], (data) => {
        executeRemoveLiquidity(
          pair.tokenA,
          pair.tokenB,
          parseInt(data.percentage),
          parseInt(data.times),
          parseInt(data.minDelay),
          parseInt(data.maxDelay)
        ).then(() => showMainMenu());
      });
    }
  });

  screen.render();
}

function showStakingMenu(action) {
  const title = action === "stake" ? "Stake R2USD" : "Unstake sR2USD";
  showForm(title, [
    { label: "How many times to " + action + "?", ref: "times" },
    { label: `Amount to ${action} each time?`, ref: "amount" },
    { label: "Minimum delay between actions (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between actions (seconds)?", ref: "maxDelay" }
  ], (data) => {
    if (action === "stake") {
      executeStake(
        parseFloat(data.amount),
        parseInt(data.times),
        parseInt(data.minDelay),
        parseInt(data.maxDelay)
      ).then(() => showMainMenu());
    } else {
      executeUnstake(
        parseFloat(data.amount),
        parseInt(data.times),
        parseInt(data.minDelay),
        parseInt(data.maxDelay)
      ).then(() => showMainMenu());
    }
  });
}

function showDepositBTCMenu() {
  showForm("Deposit BTC", [
    { label: "How many times to deposit?", ref: "times" },
    { label: "Amount of BTC per deposit?", ref: "amount" },
    { label: "Minimum delay between deposits (seconds)?", ref: "minDelay" },
    { label: "Maximum delay between deposits (seconds)?", ref: "maxDelay" }
  ], (data) => {
    executeDepositBTC(
      parseFloat(data.amount),
      parseInt(data.times),
      parseInt(data.minDelay),
      parseInt(data.maxDelay)
    ).then(() => showMainMenu());
  });
}

function showTransactionHistory() {
  const historyBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'blue'
      }
    }
  });

  const content = operationsHistory.map(op => 
    `${op.type} | Amount: ${op.amount || ''} | Block: ${op.blockNumber} | Tx: ${op.txHash}`
  ).join('\n');

  historyBox.setContent(content || "No transactions yet");
  
  const close = blessed.button({
    parent: historyBox,
    bottom: 1,
    left: 'center',
    width: 10,
    height: 1,
    content: 'Close',
    style: { bg: 'red' }
  });

  close.on('press', () => {
    screen.remove(historyBox);
    showMainMenu();
  });

  screen.append(historyBox);
  close.focus();
  screen.render();
}

// Initialize the application
function initApp() {
  screen = blessed.screen({
    smartCSR: true,
    title: 'R2 Bot Interface'
  });

  // Create header
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

  // Create wallet info box
  walletBox = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    width: '30%',
    height: '40%',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } }
  });

  // Create log box
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
      style: {
        bg: 'blue'
      }
    }
  });

  // Create menu box
  menuBox = blessed.list({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '60%',
    border: { type: 'line' },
    style: { 
      selected: { bg: 'blue' }, 
      border: { fg: 'cyan' } 
    },
    keys: true,
    mouse: true
  });

  // Quit on Escape, q, or Control-C
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  // Initial update
  updateWalletData();
  showMainMenu();
}

// Start the application
initApp();
