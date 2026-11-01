import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const botchainTestnet = defineChain({
  id: 968,
  name: 'Botchain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BohrScan',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
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
  console.log(`Connecting to Botchain Testnet (Chain ID 968)...`);

  const publicClient = createPublicClient({
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const walletClient = createWalletClient({
    account,
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
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

  console.log('\nDeploying SelectorClashRegistry.sol to Botchain Testnet...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });

  console.log(`Deployment Transaction Hash: ${hash}`);
  console.log(`Explorer Link: https://scan.bohr.life/tx/${hash}`);
  console.log('Waiting for transaction confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`\n🎉 SelectorClashRegistry deployed successfully!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Explorer Link: https://scan.bohr.life/address/${contractAddress}`);

  // Write to src/contracts/deployedAddress.json
  const deployedInfo = {
    address: contractAddress,
    chainId: 968,
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

