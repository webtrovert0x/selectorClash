import { createPublicClient, http, Address, hexToBigInt } from 'viem';
import { botchainMainnet } from '../config/botchain';

// Standard EIP-1967 storage slots
export const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const EIP1967_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
export const EIP1967_BEACON_SLOT =
  '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

export interface ProxyInspectionResult {
  proxyAddress: string;
  implementationAddress: string | null;
  adminAddress: string | null;
  beaconAddress: string | null;
  isProxy: boolean;
  proxyType: 'EIP-1967 Transparent/UUPS' | 'Beacon' | 'Non-Proxy/Custom';
  error?: string;
}

export async function inspectProxyOnChain(
  proxyAddress: string,
  rpcUrl: string = 'https://rpc.botchain.ai'
): Promise<ProxyInspectionResult> {
  const client = createPublicClient({
    chain: botchainMainnet,
    transport: http(rpcUrl),
  });

  try {
    const [implStorage, adminStorage, beaconStorage] = await Promise.all([
      client.getStorageAt({
        address: proxyAddress as Address,
        slot: EIP1967_IMPLEMENTATION_SLOT as `0x${string}`,
      }),
      client.getStorageAt({
        address: proxyAddress as Address,
        slot: EIP1967_ADMIN_SLOT as `0x${string}`,
      }),
      client.getStorageAt({
        address: proxyAddress as Address,
        slot: EIP1967_BEACON_SLOT as `0x${string}`,
      }),
    ]);

    const formatAddressFromSlot = (slotValue: `0x${string}` | undefined): string | null => {
      if (!slotValue || slotValue === '0x' || hexToBigInt(slotValue) === 0n) return null;
      // Address is last 20 bytes (40 hex chars)
      const clean = slotValue.replace(/^0x/, '');
      const addrHex = `0x${clean.slice(-40)}`;
      return addrHex;
    };

    const implementationAddress = formatAddressFromSlot(implStorage);
    const adminAddress = formatAddressFromSlot(adminStorage);
    const beaconAddress = formatAddressFromSlot(beaconStorage);

    const isProxy = Boolean(implementationAddress || beaconAddress);
    const proxyType = implementationAddress
      ? 'EIP-1967 Transparent/UUPS'
      : beaconAddress
      ? 'Beacon'
      : 'Non-Proxy/Custom';

    return {
      proxyAddress,
      implementationAddress,
      adminAddress,
      beaconAddress,
      isProxy,
      proxyType,
    };
  } catch (err: any) {
    return {
      proxyAddress,
      implementationAddress: null,
      adminAddress: null,
      beaconAddress: null,
      isProxy: false,
      proxyType: 'Non-Proxy/Custom',
      error: err.shortMessage || err.message || 'Failed to read proxy storage slots.',
    };
  }
}

