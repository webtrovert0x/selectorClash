import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function isValidEvmAddress(address: string): boolean {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

export async function GET() {
  let reownId = process.env.REOWN_ID || '';
  let contractAddress = process.env.SELECTOR_CLASH_REGISTRY_ADDRESS || '';

  // Direct disk read so changes to .env take effect immediately without dev server restart
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const rawEnv = fs.readFileSync(envPath, 'utf8');
      const reownMatch = rawEnv.match(/^REOWN_ID=(.+)$/m);
      if (reownMatch && reownMatch[1].trim() && !reownMatch[1].trim().startsWith('#')) {
        reownId = reownMatch[1].trim();
      }
      const contractMatch = rawEnv.match(/^SELECTOR_CLASH_REGISTRY_ADDRESS=(.+)$/m);
      if (contractMatch && contractMatch[1].trim() && !contractMatch[1].trim().startsWith('#')) {
        const potentialAddress = contractMatch[1].trim();
        if (isValidEvmAddress(potentialAddress)) {
          contractAddress = potentialAddress;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading .env directly:', e);
  }

  // Fallback to reading deployedAddress.json if created by scripts/deploy.mjs
  if (!contractAddress || !isValidEvmAddress(contractAddress)) {
    try {
      const deployedJsonPath = path.resolve(process.cwd(), 'src/contracts/deployedAddress.json');
      if (fs.existsSync(deployedJsonPath)) {
        const fileContent = JSON.parse(fs.readFileSync(deployedJsonPath, 'utf8'));
        if (fileContent.address && isValidEvmAddress(fileContent.address)) {
          contractAddress = fileContent.address;
        }
      }
    } catch {
      // ignore
    }
  }

  // Final check: only return valid EVM address
  if (!isValidEvmAddress(contractAddress)) {
    contractAddress = '';
  }

  return NextResponse.json({
    reownId,
    contractAddress,
    chainId: 968,
    rpcUrl: 'https://rpc.bohr.life',
    explorerUrl: 'https://scan.bohr.life',
  });
}
