import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const botchainMainnet = defineChain({
  id: 677,
  name: 'Botchain',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.botchain.ai'],
    },
    public: {
      http: ['https://rpc.botchain.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BotchainScan',
      url: 'https://scan.botchain.ai',
    },
  },
  testnet: false,
});

async function main() {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY is not set in .env!');
    console.log('Please add your private key to .env: PRIVATE_KEY=0x...');
    process.exit(1);
  }

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);

  console.log(`Deployer Address: ${account.address}`);
  console.log(`Connecting to Botchain Mainnet (Chain ID 677)...`);

  const publicClient = createPublicClient({
    chain: botchainMainnet,
    transport: http('https://rpc.botchain.ai'),
  });

  const walletClient = createWalletClient({
    account,
    chain: botchainMainnet,
    transport: http('https://rpc.botchain.ai'),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer BOT Balance: ${Number(balance) / 1e18} BOT`);

  const artifactPath = path.resolve(__dirname, '../src/contracts/SelectorClashRegistry.json');
  if (!fs.existsSync(artifactPath)) {
    console.log('Artifact not found. Running compile first...');
    const { execSync } = await import('child_process');
    execSync('node scripts/compile.mjs', { stdio: 'inherit' });
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('\nDeploying SelectorClashRegistry.sol to Botchain Mainnet (Chain ID 677)...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });

  console.log(`Deployment Transaction Hash: ${hash}`);
  console.log(`Explorer Link: https://scan.botchain.ai/tx/${hash}`);
  console.log('Waiting for transaction confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`\n🎉 SelectorClashRegistry deployed successfully on Botchain Mainnet!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Explorer Link: https://scan.botchain.ai/address/${contractAddress}`);

  // Write to src/contracts/deployedAddress.json
  const deployedInfo = {
    address: contractAddress,
    chainId: 677,
    network: 'Botchain Mainnet',
    deployedAt: new Date().toISOString(),
    txHash: hash,
  };
  fs.writeFileSync(
    path.resolve(__dirname, '../src/contracts/deployedAddress.json'),
    JSON.stringify(deployedInfo, null, 2)
  );

  // Update .env
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('SELECTOR_CLASH_REGISTRY_ADDRESS=')) {
    envContent = envContent.replace(
      /SELECTOR_CLASH_REGISTRY_ADDRESS=.*/,
      `SELECTOR_CLASH_REGISTRY_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nSELECTOR_CLASH_REGISTRY_ADDRESS=${contractAddress}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log('Updated .env and src/contracts/deployedAddress.json with deployed contract address.');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
