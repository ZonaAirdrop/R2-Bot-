const { ethers } = require("ethers");
import { createWallet, getBalance } from './services.js';
import { log, logDivider } from './logger.js';

export const runFaucetCommand = async () => {
    logDivider();
    log('Inisialisasi wallet...', 'info');

    const wallet = createWallet(process.env.PRIVATE_KEY);
    if (!wallet) return;

    log('Mengambil saldo...', 'info');
    const balance = await getBalance(wallet);

    if (balance) {
        log(`Saldo wallet: ${balance} ETH`, 'success');
    } else {
        log('Gagal mengambil saldo', 'error');
    }

    logDivider();
};
