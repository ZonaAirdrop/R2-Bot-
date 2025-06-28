import "dotenv/config";
import blessed from "blessed";
import figlet from "figlet";
import { ethers } from "ethers";

const SEPOLIA_RPC = "https://sepolia.infura.io/v3/8fd1a4b2d3444172b240fb7efc241bf1";
const initialProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const initialWallet = new ethers.Wallet(process.env.PRIVATE_KEY, initialProvider);

const SEPOLIA_CONFIG = {
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

const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)"
];

const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external"
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

let walletInfo = {
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
};

let transactionLogs = [];
let operationsHistory = [];
let autoMode = false;
let swapRunning = false;
let swapDirection = true;
let provider = null;
let nextNonce = null;
let operationIntervals = {};
let screen = null;
let walletBox = null;
let logBox = null;

async function getTokenBalance(tokenAddress, provider, wallet) {
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const decimals = await contract.decimals();
  const balance = await contract.balanceOf(wallet.address);
  return ethers.formatUnits(balance, decimals);
}

async function ensureApproval(tokenAddress, spender, amount, wallet) {
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, wallet);
  const allowance = await contract.allowance(wallet.address, spender);
  
  if (allowance < amount) {
    const tx = await contract.approve(spender, amount);
    await tx.wait();
    return true;
  }
  return false;
}

async function updateWalletData() {
  try {
    const config = SEPOLIA_CONFIG;
    const localProvider = new ethers.JsonRpcProvider(config.RPC_URL);
    const localWallet = new ethers.Wallet(process.env.PRIVATE_KEY, localProvider);

    walletInfo.address = localWallet.address;

    const balances = await Promise.all([
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

    walletInfo.balanceNative = ethers.formatEther(balances[0]);
    walletInfo.balanceUsdc = balances[1];
    walletInfo.balanceBtc = balances[2];
    walletInfo.balanceR2usd = balances[3];
    walletInfo.balanceSr2usd = balances[4];
    walletInfo.balanceR2btc = balances[5];
    walletInfo.balanceR2 = balances[6];
    walletInfo.balanceLpR2usdSr2usd = balances[7];
    walletInfo.balanceLpUsdcR2usd = balances[8];
    walletInfo.balanceLpR2R2usd = balances[9];

    nextNonce = await localProvider.getTransactionCount(localWallet.address, "pending");
    walletInfo.status = "Ready";
    updateWalletDisplay();
  } catch (error) {
    logBox.setContent(`${logBox.getContent()}\nError updating wallet: ${error.message}`);
    screen.render();
  }
}

function updateWalletDisplay() {
  const shortAddress = walletInfo.address ? `${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}` : "N/A";
  
  const content = `┌── Address   : ${shortAddress}
│   ├── ETH           : ${Number(walletInfo.balanceNative).toFixed(4)}
│   ├── USDC          : ${Number(walletInfo.balanceUsdc).toFixed(2)}
│   ├── BTC           : ${Number(walletInfo.balanceBtc).toFixed(8)}
│   ├── R2USD         : ${Number(walletInfo.balanceR2usd).toFixed(4)}
│   ├── sR2USD        : ${Number(walletInfo.balanceSr2usd).toFixed(4)}
│   ├── R2BTC         : ${Number(walletInfo.balanceR2btc).toFixed(8)}
│   ├── R2            : ${Number(walletInfo.balanceR2).toFixed(4)}
│   ├── LP R2USD-sR2USD : ${Number(walletInfo.balanceLpR2usdSr2usd).toFixed(4)}
│   ├── LP USDC-R2USD : ${Number(walletInfo.balanceLpUsdcR2usd).toFixed(4)}
│   └── LP R2-R2USD   : ${Number(walletInfo.balanceLpR2R2usd).toFixed(4)}
└── Network        : ${walletInfo.network}`;
  
  walletBox.setContent(content);
  screen.render();
}

function getMainMenuItems() {
  return [
    ...(swapRunning ? ["Stop Bot"] : ["Start 24h Auto Mode"]),
    "Manual Swap USDC <> R2USD",
    "Manual Swap BTC <> R2BTC", 
    "Manual Stake R2USD",
    "Manual Unstake sR2USD",
    "Manual Add Liquidity",
    "Manual Remove Liquidity",
    "Transaction History",
    "Clear Logs",
    "Refresh",
    "Exit"
  ];
}

async function handleManualOperation(operationType) {
  return new Promise((resolve) => {
    const questionAmount = blessed.prompt({
      parent: screen,
      top: 'center',
      left: 'center',
      height: 3,
      width: '50%',
      border: {type: 'line'},
      style: {border: {fg: 'cyan'}}
    });
    
    questionAmount.input(`Enter amount for ${operationType}: `, '', async (err, amount) => {
      if (err) return resolve();
      
      const questionDelay = blessed.prompt({
        parent: screen,
        top: 'center',
        left: 'center',
        height: 3,
        width: '50%',
        border: {type: 'line'},
        style: {border: {fg: 'cyan'}}
      });
      
      questionDelay.input('Enter delay (seconds): ', '', async (err, delay) => {
        if (err) return resolve();
        
        const numAmount = parseFloat(amount);
        const numDelay = parseInt(delay) * 1000;
        
       if (isNaN(numAmount)) {
          logBox.setContent(`${logBox.getContent()}\nInvalid amount`);
          screen.render();
          return resolve();
        }
        
        setTimeout(async () => {
          try {
            let tx;
            switch(operationType) {
              case 'USDC->R2USD':
                tx = await swapUsdcToR2usd(numAmount);
                break;
              case 'R2USD->USDC':
                tx = await swapR2usdToUsdc(numAmount);
                break;
              case 'BTC->R2BTC':
                tx = await swapBtcToR2btc(numAmount);
                break;
              case 'Stake R2USD':
                tx = await stakeR2usd(numAmount);
                break;
              case 'Unstake sR2USD':
                tx = await unstakeSr2usd(numAmount);
                break;
            }
            
            logBox.setContent(`${logBox.getContent()}\n[MANUAL] ${new Date().toISOString()} - ${operationType} ${numAmount} (${tx.hash})`);
            operationsHistory.push({
              type: operationType,
              amount: numAmount,
              txHash: tx.hash,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            logBox.setContent(`${logBox.getContent()}\n[ERROR] ${error.message}`);
          }
          screen.render();
          // await updateWalletData(); (moved below after walletBox is defined)
        }, numDelay);
        
        resolve();
      });
    });
  });
}

function startAutoMode() {
  autoMode = true;
  swapRunning = true;
  const endTime = Date.now() + 24 * 60 * 60 * 1000;
  
  operationIntervals.swap = setInterval(async () => {
    if (Date.now() > endTime) {
      stopAutoMode();
      return;
    }
    
    const amount = (swapDirection ? 
      randomBetween(randomAmountRanges.SWAP_R2USD_USDC.USDC.min, randomAmountRanges.SWAP_R2USD_USDC.USDC.max) :
      randomBetween(randomAmountRanges.SWAP_R2USD_USDC.R2USD.min, randomAmountRanges.SWAP_R2USD_USDC.R2USD.max)).toFixed(2);
    
    const delay = randomBetween(5, 20) * 1000;
    
    setTimeout(async () => {
      try {
        const tx = swapDirection ? 
          await swapUsdcToR2usd(amount) : 
          await swapR2usdToUsdc(amount);
        
        logBox.setContent(`${logBox.getContent()}\n[AUTO] ${new Date().toISOString()} - Swapped ${amount} ${swapDirection ? 'USDC->R2USD' : 'R2USD->USDC'} (${tx.hash})`);
        operationsHistory.push({
          type: swapDirection ? 'USDC->R2USD' : 'R2USD->USDC',
          amount: parseFloat(amount),
          txHash: tx.hash,
          timestamp: new Date().toISOString()
        });
        swapDirection = !swapDirection;
      } catch (error) {
        logBox.setContent(`${logBox.getContent()}\n[AUTO ERROR] ${error.message}`);
      }
      screen.render();
      // await updateWalletData(); (moved below after walletBox is defined)
    }, delay);
  }, 30 * 1000);

  operationIntervals.staking = setInterval(async () => {
    if (Date.now() > endTime) {
      stopAutoMode();
      return;
    }
    
    const delay = randomBetween(10, 30) * 1000;
    
    setTimeout(async () => {
      try {
        const amount = randomBetween(randomAmountRanges.SWAP_R2USD_USDC.R2USD.min, randomAmountRanges.SWAP_R2USD_USDC.R2USD.max).toFixed(2);
        const tx = await stakeR2usd(amount);
        
        logBox.setContent(`${logBox.getContent()}\n[AUTO] ${new Date().toISOString()} - Staked ${amount} R2USD (${tx.hash})`);
        operationsHistory.push({
          type: 'Stake R2USD',
          amount: parseFloat(amount),
          txHash: tx.hash,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logBox.setContent(`${logBox.getContent()}\n[AUTO ERROR] ${error.message}`);
      }
      screen.render();
      // await updateWalletData(); (moved below after walletBox is defined)
    }, delay);
  }, 45 * 60 * 1000);

  logBox.setContent(`${logBox.getContent()}\n[AUTO] 24-hour auto mode started`);
  screen.render();
}

function stopAutoMode() {
  autoMode = false;
  swapRunning = false;
  Object.values(operationIntervals).forEach(interval => clearInterval(interval));
  logBox.setContent(`${logBox.getContent()}\n[AUTO] Auto mode stopped`);
  screen.render();
}

function showTransactionHistory() {
  const historyBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    border: {type: 'line'},
    style: {border: {fg: 'cyan'}},
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {bg: 'blue'}
    }
  });
  
  let historyContent = 'LAST TRANSACTIONS:\n\n';
  operationsHistory.slice(-20).reverse().forEach(op => {
    historyContent += `${op.timestamp} - ${op.type} ${op.amount} (${op.txHash.slice(0,10)}...)\n`;
  });
  
  historyBox.setContent(historyContent);
  screen.append(historyBox);
  screen.render();
  
  historyBox.key(['escape'], () => {
    screen.remove(historyBox);
    screen.render();
  });
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

async function swapUsdcToR2usd(amountUsdc) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const amount = ethers.parseUnits(amountUsdc.toString(), 6);
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(config.USDC_ADDRESS, config.SWAP_ROUTER, amount, wallet);

  const path = [config.USDC_ADDRESS, config.R2USD_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await router.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function swapR2usdToUsdc(amountR2usd) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(config.R2USD_ADDRESS, config.SWAP_ROUTER, amount, wallet);

  const path = [config.R2USD_ADDRESS, config.USDC_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await router.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function swapBtcToR2btc(amountBtc) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const amount = ethers.parseUnits(amountBtc.toString(), 8);
  const router = new ethers.Contract(config.BTC_SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(config.BTC_ADDRESS, config.BTC_SWAP_ROUTER, amount, wallet);

  const path = [config.BTC_ADDRESS, config.R2BTC_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const amountOutMin = 0;

  const tx = await router.swapExactTokensForTokens(
    amount,
    amountOutMin,
    path,
    wallet.address,
    deadline,
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function stakeR2usd(amountR2usd) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const amount = ethers.parseUnits(amountR2usd.toString(), 6);
  const staking = new ethers.Contract(config.STAKING_CONTRACT, STAKING_ABI, wallet);
  
  await ensureApproval(config.R2USD_ADDRESS, config.STAKING_CONTRACT, amount, wallet);

  const tx = await staking.stake(
    amount,
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function unstakeSr2usd(amountSr2usd) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const amount = ethers.parseUnits(amountSr2usd.toString(), 6);
  const staking = new ethers.Contract(config.STAKING_CONTRACT, STAKING_ABI, wallet);
  
  const tx = await staking.withdraw(
    amount,
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function addLiquidity(tokenA, tokenB, amountA, amountB) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  
  await ensureApproval(tokenA, config.SWAP_ROUTER, amountA, wallet);
  await ensureApproval(tokenB, config.SWAP_ROUTER, amountB, wallet);

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
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function removeLiquidity(tokenA, tokenB, lpAmount) {
  const config = SEPOLIA_CONFIG;
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = new ethers.Contract(config.SWAP_ROUTER, UNISWAP_V2_ROUTER_ABI, wallet);
  const lpToken = tokenA === config.USDC_ADDRESS && tokenB === config.R2USD_ADDRESS ? config.LP_USDC_R2USD :
                 tokenA === config.R2USD_ADDRESS && tokenB === config.sR2USD_ADDRESS ? config.LP_R2USD_sR2USD :
                 tokenA === config.R2_ADDRESS && tokenB === config.R2USD_ADDRESS ? config.LP_R2_R2USD : null;
  
  if (!lpToken) throw new Error("Unsupported token pair");
  
  await ensureApproval(lpToken, config.SWAP_ROUTER, lpAmount, wallet);

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
    { gasLimit: 500000, nonce: nextNonce++ }
  );

  return tx;
}

async function main() {
  console.log(figlet.textSync('R2 Testnet Bot'));
  // await updateWalletData(); (moved below after walletBox is defined)
  
  screen = blessed.screen({
    smartCSR: true,
    title: 'YetiDAO - R2 Testnet Bot'
  });

  walletBox = blessed.box({
    top: 0,
    left: 0,
    width: '50%',
    height: '30%',
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' }
    }
  });

  const menu = blessed.list({
    top: '30%',
    left: 0,
    width: '50%',
    height: '70%',
    items: getMainMenuItems(),
    border: { type: 'line' },
    style: {
      selected: { bg: 'blue' },
      border: { fg: 'cyan' }
    },
    keys: true,
    mouse: true
  });

  logBox = blessed.box({
    top: 0,
    right: 0,
    width: '50%',
    height: '100%',
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' }
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: { bg: 'blue' }
    }
  });

  screen.append(walletBox);
  screen.append(menu);
menu.focus();  // Auto-focus so menu is responsive
  screen.append(logBox);
  screen.render();

  menu.on('select', async (item, index) => {
    const selected = item.getText();
    
    if (selected === 'Start 24h Auto Mode') {
      startAutoMode();
    } 
    else if (selected === 'Stop Bot') {
      stopAutoMode();
    }
    else if (selected === 'Manual Swap USDC <> R2USD') {
      await handleManualOperation(swapDirection ? 'USDC->R2USD' : 'R2USD->USDC');
      swapDirection = !swapDirection;
    }
    else if (selected === 'Manual Swap BTC <> R2BTC') {
      await handleManualOperation('BTC->R2BTC');
    }
    else if (selected === 'Manual Stake R2USD') {
      await handleManualOperation('Stake R2USD');
    }
    else if (selected === 'Manual Unstake sR2USD') {
      await handleManualOperation('Unstake sR2USD');
    }
    else if (selected === 'Transaction History') {
      showTransactionHistory();
    }
    else if (selected === 'Clear Logs') {
      logBox.setContent('');
      screen.render();
    }
    else if (selected === 'Refresh') {
      // await updateWalletData(); (moved below after walletBox is defined)
    }
    else if (selected === 'Exit') {
      process.exit(0);
    }
  });

  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
}

main().catch(console.error);
