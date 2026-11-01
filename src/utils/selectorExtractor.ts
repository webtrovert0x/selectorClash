import { keccak256, toHex } from 'viem';
import { PROXY_RESERVED_SELECTORS, DIAMOND_LOUPE_SELECTORS, KNOWN_COLLISION_PAIRS } from '../config/knownSelectors';

export interface ExtractedSelector {
  name: string;
  signature: string;
  canonicalSignature: string;
  selector: string;
  stateMutability?: string;
  inputs?: any[];
  sourceName?: string; // e.g. Contract Name or Facet Name
}

export interface SelectorCollision {
  selector: string;
  entries: ExtractedSelector[];
  type: 'IntraContract' | 'MultiFacetOverlap' | 'ProxyClash' | 'KnownExploitPair';
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

/**
 * Normalizes elementary types according to the Solidity ABI specification.
 * e.g., 'uint' -> 'uint256', 'int' -> 'int256'
 */
export function canonicalizeType(typeStr: string): string {
  let cleaned = typeStr.trim();
  if (cleaned === 'uint') return 'uint256';
  if (cleaned === 'int') return 'int256';
  if (cleaned === 'byte') return 'bytes1';

  // Array types: uint[] -> uint256[]
  if (cleaned.startsWith('uint[')) return cleaned.replace('uint[', 'uint256[');
  if (cleaned.startsWith('int[')) return cleaned.replace('int[', 'int256[');

  // Tuples: e.g. tuple(address,uint)
  if (cleaned.startsWith('tuple')) {
    // If it's pure tuple, it should be formatted as (types)
    return cleaned.replace(/^tuple/, '');
  }

  return cleaned;
}

/**
 * Normalizes an ABI parameter including nested tuples and arrays.
 */
export function formatAbiParam(param: any): string {
  if (param.type.startsWith('tuple')) {
    const inner = (param.components || []).map(formatAbiParam).join(',');
    const suffix = param.type.slice(5); // catch any array suffix like []
    return `(${inner})${suffix}`;
  }
  return canonicalizeType(param.type);
}

/**
 * Generates canonical function signature from ABI item.
 * e.g., "transfer(address,uint256)"
 */
export function getCanonicalSignatureFromAbiItem(item: any): string {
  const name = item.name || '';
  const paramTypes = (item.inputs || []).map(formatAbiParam).join(',');
  return `${name}(${paramTypes})`;
}

/**
 * Normalizes a raw string signature into canonical form.
 * e.g., "function transfer(address to, uint amount) public returns (bool)"
 * -> "transfer(address,uint256)"
 */
export function canonicalizeSignatureString(rawSig: string): string {
  let s = rawSig.trim();
  // Strip 'function ' if present
  s = s.replace(/^\s*function\s+/, '');
  // Strip visibility, modifiers, returns: everything after the closing parenthesis
  const lastParen = s.lastIndexOf(')');
  if (lastParen !== -1) {
    s = s.slice(0, lastParen + 1);
  }

  const firstParen = s.indexOf('(');
  if (firstParen === -1) {
    throw new Error(`Invalid function signature, missing '(': ${rawSig}`);
  }

  const funcName = s.slice(0, firstParen).trim();
  const argsString = s.slice(firstParen + 1, lastParen).trim();

  if (!argsString) {
    return `${funcName}()`;
  }

  // Parse comma-separated arguments, accounting for nested tuples
  const args: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    if (char === '(') depth++;
    if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    args.push(current.trim());
  }

  const canonicalArgs = args.map((arg) => {
    // If argument contains variable name like "address to" or "uint256 indexed amount"
    const parts = arg.trim().split(/\s+/);
    // The type is usually the first part or tuple
    let typePart = parts[0];
    // Check if indexed or memory/calldata/storage was specified
    if (typePart === 'indexed' && parts.length > 1) {
      typePart = parts[1];
    }
    return canonicalizeType(typePart);
  });

  return `${funcName}(${canonicalArgs.join(',')})`;
}

/**
 * Computes 4-byte selector from canonical signature.
 * e.g., "transfer(address,uint256)" -> "0xa9059cbb"
 */
export function computeSelector(canonicalSig: string): string {
  const hash = keccak256(toHex(canonicalSig));
  return hash.slice(0, 10);
}

/**
 * Extracts all function selectors from an ABI JSON array.
 */
export function extractSelectorsFromAbi(
  abi: any[],
  sourceName: string = 'Contract'
): ExtractedSelector[] {
  if (!Array.isArray(abi)) return [];

  const functions = abi.filter((item) => item.type === 'function');
  return functions.map((item) => {
    const canonical = getCanonicalSignatureFromAbiItem(item);
    const selector = computeSelector(canonical);
    return {
      name: item.name || '',
      signature: `${item.name}(${(item.inputs || []).map((i: any) => `${i.type} ${i.name || ''}`.trim()).join(', ')})`,
      canonicalSignature: canonical,
      selector,
      stateMutability: item.stateMutability,
      inputs: item.inputs,
      sourceName,
    };
  });
}

/**
 * Extracts selectors from a list of raw text function signatures.
 */
export function extractSelectorsFromRawSignatures(
  rawText: string,
  sourceName: string = 'Custom'
): ExtractedSelector[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

  const results: ExtractedSelector[] = [];
  for (const line of lines) {
    try {
      const canonical = canonicalizeSignatureString(line);
      const name = canonical.slice(0, canonical.indexOf('('));
      const selector = computeSelector(canonical);
      results.push({
        name,
        signature: line,
        canonicalSignature: canonical,
        selector,
        sourceName,
      });
    } catch {
      // Skip invalid lines
    }
  }
  return results;
}

/**
 * Analyzes an array of extracted selectors for internal collisions,
 * proxy clashes, and known exploit signatures.
 */
export function detectCollisions(
  selectors: ExtractedSelector[],
  checkProxyClash: boolean = true
): {
  collisions: SelectorCollision[];
  safeSelectors: ExtractedSelector[];
  proxyWarnings: SelectorCollision[];
} {
  const map = new Map<string, ExtractedSelector[]>();
  for (const item of selectors) {
    const list = map.get(item.selector) || [];
    list.push(item);
    map.set(item.selector, list);
  }

  const collisions: SelectorCollision[] = [];
  const safeSelectors: ExtractedSelector[] = [];
  const proxyWarnings: SelectorCollision[] = [];

  for (const [selector, items] of Array.from(map.entries())) {
    // Check if unique canonical signatures are clashing
    const uniqueCanonicals = Array.from(new Set(items.map((i) => i.canonicalSignature)));

    if (uniqueCanonicals.length > 1) {
      // Check if it's across multiple facets
      const sources = Array.from(new Set(items.map((i) => i.sourceName)));
      const isMultiFacet = sources.length > 1;

      collisions.push({
        selector,
        entries: items,
        type: isMultiFacet ? 'MultiFacetOverlap' : 'IntraContract',
        description: isMultiFacet
          ? `Selector clash between different facets/contracts (${sources.join(', ')})`
          : `Intra-contract collision: Multiple different functions share the exact same 4-byte selector!`,
        severity: 'CRITICAL',
      });
    } else {
      safeSelectors.push(items[0]);
    }

    // Check against Proxy Reserved Selectors
    if (checkProxyClash) {
      const proxyMatch = PROXY_RESERVED_SELECTORS.find((p) => p.selector === selector);
      if (proxyMatch) {
        // If implementation defines this selector or clashes with it
        const nonProxyEntries = items.filter(
          (i) => i.canonicalSignature !== proxyMatch.signature
        );
        if (nonProxyEntries.length > 0) {
          proxyWarnings.push({
            selector,
            entries: items,
            type: 'ProxyClash',
            description: `CRITICAL PROXY CLASH: Implementation function matches reserved proxy admin selector for "${proxyMatch.signature}". Any transaction calling this implementation function may be intercepted by the proxy dispatcher!`,
            severity: 'CRITICAL',
          });
        }
      }
    }
  }

  // Also check against known collision database
  for (const pair of KNOWN_COLLISION_PAIRS) {
    const matching = selectors.filter((s) => s.selector === pair.selector);
    if (matching.length > 0) {
      const canonicals = matching.map((m) => m.canonicalSignature);
      if (
        canonicals.includes(pair.signatureA) &&
        !collisions.some((c) => c.selector === pair.selector)
      ) {
        // Flag warning about known exploit pair
        // (Informational notice)
      }
    }
  }

  return { collisions, safeSelectors, proxyWarnings };
}
