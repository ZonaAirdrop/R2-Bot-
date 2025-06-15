import { Wallet, JsonRpcProvider, ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new JsonRpcProvider(process.env.RPC_URL);

export const createWallet = (privateKey) => {
    try {
        const wallet = new Wallet(privateKey, provider);
        console.log(`[+] Wallet siap: ${wallet.address}`);
        return wallet;
    } catch (err) {
        console.error(`[!] Gagal buat wallet: ${err.message}`);
        return null;
    }
};

export const getBalance = async (wallet) => {
    try {
        const balance = await wallet.getBalance();
        return ethers.formatEther(balance);
    } catch (err) {
        console.error(`[!] Gagal ambil saldo: ${err.message}`);
        return null;
    }
};