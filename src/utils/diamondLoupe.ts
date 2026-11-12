import { createPublicClient, http, Address } from 'viem';
import { botchainMainnet } from '../config/botchain';

export const DIAMOND_LOUPE_ABI = [
  {
    inputs: [],
    name: 'facets',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'facetAddress', type: 'address' },
          { internalType: 'bytes4[]', name: 'functionSelectors', type: 'bytes4[]' },
        ],
        internalType: 'struct IDiamondLoupe.Facet[]',
        name: 'facets_',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_facet', type: 'address' }],
    name: 'facetFunctionSelectors',
    outputs: [{ internalType: 'bytes4[]', name: '_facetFunctionSelectors', type: 'bytes4[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'facetAddresses',
    outputs: [{ internalType: 'address[]', name: 'facetAddresses_', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: '_functionSelector', type: 'bytes4' }],
    name: 'facetAddress',
    outputs: [{ internalType: 'address', name: 'facetAddress_', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface FacetInfo {
  facetAddress: Address;
  selectors: string[];
}

export interface DiamondInspectionResult {
  diamondAddress: string;
  facets: FacetInfo[];
  totalSelectors: number;
  duplicateSelectors: {
    selector: string;
    facets: string[];
  }[];
  isLoupeCompliant: boolean;
  error?: string;
}

export async function inspectDiamondOnChain(
  diamondAddress: string,
  rpcUrl: string = 'https://rpc.botchain.ai'
): Promise<DiamondInspectionResult> {
  const client = createPublicClient({
    chain: botchainMainnet,
    transport: http(rpcUrl),
  });

  try {
    const rawFacets = (await client.readContract({
      address: diamondAddress as Address,
      abi: DIAMOND_LOUPE_ABI,
      functionName: 'facets',
    })) as Array<{ facetAddress: Address; functionSelectors: readonly `0x${string}`[] }>;

    const facets: FacetInfo[] = rawFacets.map((f) => ({
      facetAddress: f.facetAddress,
      selectors: Array.from(f.functionSelectors),
    }));

    // Find overlapping selectors across facets
    const selectorToFacets = new Map<string, string[]>();
    let total = 0;

    for (const facet of facets) {
      for (const sel of facet.selectors) {
        total++;
        const current = selectorToFacets.get(sel) || [];
        current.push(facet.facetAddress);
        selectorToFacets.set(sel, current);
      }
    }

    const duplicateSelectors: { selector: string; facets: string[] }[] = [];
    for (const [selector, facetAddrs] of Array.from(selectorToFacets.entries())) {
      if (facetAddrs.length > 1) {
        duplicateSelectors.push({
          selector,
          facets: facetAddrs,
        });
      }
    }

    return {
      diamondAddress,
      facets,
      totalSelectors: total,
      duplicateSelectors,
      isLoupeCompliant: true,
    };
  } catch (err: any) {
    return {
      diamondAddress,
      facets: [],
      totalSelectors: 0,
      duplicateSelectors: [],
      isLoupeCompliant: false,
      error: err.shortMessage || err.message || 'Failed to inspect Diamond via IDiamondLoupe.',
    };
  }
}
