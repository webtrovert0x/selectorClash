import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { keccak256, toHex, stringToBytes } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('==================================================');
console.log('🧪 SELECTORCLASH AUTOMATED COMPREHENSIVE TEST SUITE');
console.log('==================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  }
}

// 1. Verify Logo Assets
console.log('--- 1. Testing Logo Assets ---');
const botchainLogoPath = path.join(root, 'public', 'botchain-logo.png');
const selectorClashLogoPath = path.join(root, 'public', 'selectorclash-logo.svg');
const iconPath = path.join(root, 'public', 'icon.svg');

assert(fs.existsSync(botchainLogoPath), 'Official Botchain logo exists at public/botchain-logo.png');
if (fs.existsSync(botchainLogoPath)) {
  const stat = fs.statSync(botchainLogoPath);
  assert(stat.size > 500, `Official Botchain logo has valid size (${stat.size} bytes)`);
}

assert(fs.existsSync(selectorClashLogoPath), 'SelectorClash logo exists at public/selectorclash-logo.svg');
if (fs.existsSync(selectorClashLogoPath)) {
  const content = fs.readFileSync(selectorClashLogoPath, 'utf8');
  assert(content.includes('<svg') && content.includes('SELECTORCLASH'), 'SelectorClash logo SVG contains valid vector branding');
}

assert(fs.existsSync(iconPath), 'App icon exists at public/icon.svg');

// 2. Verify Botchain Mainnet Deployment Config
console.log('\n--- 2. Testing Botchain Mainnet Configuration ---');
const deployedPath = path.join(root, 'src', 'contracts', 'deployedAddress.json');
assert(fs.existsSync(deployedPath), 'deployedAddress.json exists');

if (fs.existsSync(deployedPath)) {
  const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
  assert(deployed.chainId === 677, `Chain ID is 677 (Botchain Mainnet, got ${deployed.chainId})`);
  assert(deployed.network === 'Botchain Mainnet', 'Network name is Botchain Mainnet');
  assert(
    deployed.address.toLowerCase() === '0x376e716d512cbcc36db30fa396ccfb145daa2839'.toLowerCase(),
    `Contract address matches Mainnet deployment: ${deployed.address}`
  );
  assert(deployed.rpcUrl === 'https://rpc.botchain.ai', 'RPC URL is https://rpc.botchain.ai');
  assert(deployed.explorerUrl === 'https://scan.botchain.ai', 'Explorer URL is https://scan.botchain.ai');
}

// 3. Verify Function Selector Computation & Collision Engine
console.log('\n--- 3. Testing 4-Byte Keccak-256 Selector Extraction ---');
function computeSelector(signature) {
  const hash = keccak256(stringToBytes(signature));
  return hash.slice(0, 10);
}

const transferSelector = computeSelector('transfer(address,uint256)');
assert(transferSelector === '0xa9059cbb', `ERC-20 transfer selector: expected 0xa9059cbb, got ${transferSelector}`);

const balanceOfSelector = computeSelector('balanceOf(address)');
assert(balanceOfSelector === '0x70a08231', `ERC-20 balanceOf selector: expected 0x70a08231, got ${balanceOfSelector}`);

// Known 4-byte collision pair:
// transfer(bytes4[9],...) vs test collisions
const sig1 = 'clash550254402()';
const sel1 = computeSelector(sig1);
assert(sel1 === '0x025313a2', `Tincho clash signature ${sig1} produces selector ${sel1}`);

// 4. Verify Tincho Transparent Proxy Clash Detection
console.log('\n--- 4. Testing ERC-1967 Transparent Proxy Admin Collision Vector ---');
const PROXY_ADMIN_SELECTORS = [
  { selector: '0x3659cfe6', signature: 'upgradeTo(address)' },
  { selector: '0x4f1ef286', signature: 'upgradeToAndCall(address,bytes)' },
  { selector: '0xf851a440', signature: 'admin()' },
  { selector: '0x8da5cb5b', signature: 'owner()' },
  { selector: '0x5c19a95c', signature: 'changeAdmin(address)' },
];

function checkProxyAdminCollision(testSelector) {
  return PROXY_ADMIN_SELECTORS.find(
    (admin) => admin.selector.toLowerCase() === testSelector.toLowerCase()
  );
}

const mockCollision = checkProxyAdminCollision('0x3659cfe6');
assert(
  Boolean(mockCollision && mockCollision.signature === 'upgradeTo(address)'),
  'Successfully detects conflict with reserved proxy admin selector upgradeTo(address)'
);

const cleanSelector = checkProxyAdminCollision('0xa9059cbb');
assert(!cleanSelector, 'Standard ERC-20 transfer(address,uint256) correctly marked clean from proxy collision');

// Summary
console.log('\n==================================================');
console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('==================================================\n');

if (testsFailed > 0) {
  process.exit(1);
}

