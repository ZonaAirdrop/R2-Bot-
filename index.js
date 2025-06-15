import dotenv from 'dotenv';
dotenv.config();

import { runFaucetCommand } from './commands.js';

console.clear();
console.log("🚀 YetiBot Faucet is running...\n");

runFaucetCommand();