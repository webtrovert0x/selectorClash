import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.resolve(__dirname, '../contracts/SelectorClashRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'SelectorClashRegistry.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

console.log('Compiling SelectorClashRegistry.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  for (const error of output.errors) {
    console.log(error.formattedMessage);
    if (error.severity === 'error') {
      hasError = true;
    }
  }
  if (hasError) {
    process.exit(1);
  }
}

const contract = output.contracts['SelectorClashRegistry.sol']['SelectorClashRegistry'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const outDir = path.resolve(__dirname, '../src/contracts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'SelectorClashRegistry.json'),
  JSON.stringify({ abi, bytecode: `0x${bytecode}` }, null, 2)
);

console.log('✓ Successfully compiled SelectorClashRegistry.sol to src/contracts/SelectorClashRegistry.json');

