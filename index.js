import "dotenv/config";
import blessed from "blessed";
import readline from "readline";
import chalk from "chalk";
import { ethers } from "ethers";

const SEPOLIA_CONFIG = {
  RPC_URL: "https://ethereum-sepolia-rpc.publicnode.com", // Your RPC
  USDC_ADDRESS: "0xef84994eF411c4981328fFcE5Fda41cD3803faE4",
  R2USD_ADDRESS: "0x20c54C5F742F123Abb49a982BFe0af47edb38756",
  sR2USD_ADDRESS: "0xBD6b25c4132F09369C354beE0f7be777D7d434fa",
  ROUTER_USDC_TO_R2USD: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  ROUTER_R2USD_TO_USDC: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
  STAKING_CONTRACT: "0x006CbF409CA275bA022111dB32BDAE054a97d488",
  LP_R2USD_sR2USD: "0xe85A06C238439F981c90b2C91393b2F3c46e27FC",
  LP_USDC_R2USD: "0x47d1B0623bB3E557bF8544C159c9ae51D091F8a2",
  NETWORK_NAME: "Sepolia Testnet"
};

const SEPOLIA_R2_CONFIG = {
  RPC_URL: "https://ethereum-sepolia-rpc.publicnode.com", // Your RPC
  R2_ADDRESS: "0xb816bB88f836EA75Ca4071B46FF285f690C43bb7",
  USDC_ADDRESS: "0x8BEbFCBe5468F146533C182dF3DFbF5ff9BE00E2",
  R2USD_ADDRESS: "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365",
  ROUTER_ADDRESS: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
  LP_R2_R2USD: "0x9Ae18109692b43e95Ae6BE5350A5Acc5211FE9a1", 
  LP_USDC_R2: "0xCdfDD7dD24bABDD05A2ff4dfcf06384c5Ad661a9", 
  NETWORK_NAME: "Sepolia R2 Testnet"
};

// Initialize wallet
const provider = new ethers.JsonRpcProvider(SEPOLIA_CONFIG.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ABIs (simplified from your original)
const ERC20ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  {
    "inputs": [
      {"internalType":"uint256","name":"amountIn","type":"uint256"},
      {"internalType":"uint256","name":"amountOutMin","type":"uint256"},
      {"internalType":"address[]","name":"path","type":"address[]"},
      {"internalType":"address","name":"to","type":"address"},
      {"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// UI Setup
const screen = blessed.screen({ smartCSR: true, title: "R2 Token Manager" });

// Wallet Info Display
const walletBox = blessed.box({
  label: " Wallet Info ",
  border: { type: "line" },
  width: "50%",
  height: "40%",
  tags: true,
  style: { border: { fg: "magenta" } }
});

// Transaction Logs
const logsBox = blessed.box({
  label: " Transaction Logs ",
  border: { type: "line" },
  width: "50%",
  height: "40%",
  left: "50%",
  scrollable: true,
  tags: true,
  style: { border: { fg: "yellow" } }
});

// Main Menu
const mainMenu = blessed.list({
  label: " Main Menu ",
  top: "40%",
  width: "100%",
  height: "60%",
  border: { type: "line" },
  items: [
    "Swap USDC ⇄ R2USD",
    "Add Liquidity",
    "Remove Liquidity",
    "Stake R2USD",
    "View Balances",
    "Exit"
  ],
  keys: true,
  mouse: true
});

// Helper Functions
async function updateBalances() {
  try {
    const balances = await Promise.all([
      provider.getBalance(wallet.address),
      getTokenBalance(SEPOLIA_CONFIG.USDC_ADDRESS),
      getTokenBalance(SEPOLIA_CONFIG.R2USD_ADDRESS),
      getTokenBalance(SEPOLIA_CONFIG.sR2USD_ADDRESS)
    ]);
    
    walletBox.setContent(`
      Address: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}
      ETH: ${ethers.formatEther(balances[0])}
      USDC: ${balances[1]}
      R2USD: ${balances[2]}
      sR2USD: ${balances[3]}
    `);
    screen.render();
  } catch (error) {
    addLog(`Balance update failed: ${error.message}`, "error");
  }
}

async function getTokenBalance(tokenAddress) {
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const balance = await contract.balanceOf(wallet.address);
  const decimals = await contract.decimals();
  return ethers.formatUnits(balance, decimals);
}

function addLog(message, type = "info") {
  const colors = { error: "red", success: "green", warning: "yellow", info: "white" };
  logsBox.insertLine(0, `{${colors[type]}-fg}${message}{/}`);
  screen.render();
}

// Transaction Functions
async function swapTokens() {
  const promptBox = blessed.prompt({
    parent: screen,
    border: "line",
    height: 7,
    width: "60%",
    top: "center",
    left: "center",
    label: " Token Swap "
  });

  promptBox.input("Enter amount to swap:", "", async (err, amount) => {
    if (err || !amount) return;
    
    const direction = await new Promise(resolve => {
      const dirMenu = blessed.list({
        parent: screen,
        border: "line",
        height: 5,
        width: "60%",
        top: "center",
        left: "center",
        label: " Select Direction ",
        items: ["USDC → R2USD", "R2USD → USDC"],
        keys: true
      });
      
      dirMenu.on("select", item => resolve(item.getText()));
      dirMenu.focus();
      screen.render();
    });

    try {
      const [fromToken, toToken] = direction.split(" → ");
      const fromAddress = fromToken === "USDC" ? SEPOLIA_CONFIG.USDC_ADDRESS : SEPOLIA_CONFIG.R2USD_ADDRESS;
      const routerAddress = fromToken === "USDC" ? SEPOLIA_CONFIG.ROUTER_USDC_R2USD : SEPOLIA_CONFIG.ROUTER_R2USD_USDC;
      
      const contract = new ethers.Contract(fromAddress, ERC20ABI, wallet);
      const decimals = await contract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      // Check balance and approve
      const balance = await contract.balanceOf(wallet.address);
      if (balance < amountInWei) {
        addLog("Insufficient balance", "error");
        return;
      }
      
      const allowance = await contract.allowance(wallet.address, routerAddress);
      if (allowance < amountInWei) {
        addLog("Approving tokens...", "info");
        const tx = await contract.approve(routerAddress, amountInWei);
        await tx.wait();
      }
      
      // Execute swap
      const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);
      const path = [fromAddress, toToken === "USDC" ? SEPOLIA_CONFIG.USDC_ADDRESS : SEPOLIA_CONFIG.R2USD_ADDRESS];
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
      
      const tx = await router.swapExactTokensForTokens(
        amountInWei,
        0, // amountOutMin
        path,
        wallet.address,
        deadline
      );
      
      addLog(`Swap initiated: ${tx.hash}`, "success");
      await tx.wait();
      addLog("Swap completed!", "success");
      updateBalances();
    } catch (error) {
      addLog(`Swap failed: ${error.message}`, "error");
    }
  });
  
  promptBox.focus();
  screen.render();
}

// Menu Handler
mainMenu.on("select", item => {
  const selected = item.getText();
  
  if (selected === "Swap USDC ⇄ R2USD") {
    swapTokens();
  } 
  else if (selected === "View Balances") {
    updateBalances();
  }
  else if (selected === "Exit") {
    process.exit(0);
  }
});

// Initial Setup
screen.append(walletBox);
screen.append(logsBox);
screen.append(mainMenu);
updateBalances();
mainMenu.focus();
screen.render();

// Key Bindings
screen.key(["escape", "q", "C-c"], () => process.exit(0));
