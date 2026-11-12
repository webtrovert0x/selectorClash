import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const contractAddress = '0x376e716d512cbcc36db30fa396ccfb145daa2839';
const sourceCode = fs.readFileSync(path.join(root, 'contracts/SelectorClashRegistry.sol'), 'utf8');

async function main() {
  console.log('Verifying SelectorClashRegistry at address:', contractAddress);
  console.log('Target Explorer: https://scan.botchain.ai');

  const standardJson = {
    language: 'Solidity',
    sources: {
      'contracts/SelectorClashRegistry.sol': {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  // Try standard Etherscan/Blockscout API endpoint
  const url = 'https://scan.botchain.ai/api?module=contract&action=verifysourcecode';
  
  const params = new URLSearchParams();
  params.append('contractaddress', contractAddress);
  params.append('contractname', 'contracts/SelectorClashRegistry.sol:SelectorClashRegistry');
  params.append('compilerversion', 'v0.8.38+commit.1835d247');
  params.append('codeformat', 'solidity-standard-json-input');
  params.append('sourceCode', JSON.stringify(standardJson));
  params.append('optimizationUsed', '1');
  params.append('runs', '200');
  params.append('constructorArguments', '');
  params.append('licenseType', '3'); // MIT

  console.log('Sending verification request to Blockscout API...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const text = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('API Response:', text);
  } catch (err) {
    console.error('API call error:', err.message);
  }
}

main();

