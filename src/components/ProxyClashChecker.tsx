'use client';

import React, { useState } from 'react';
import { inspectProxyOnChain, ProxyInspectionResult } from '../utils/proxyInspector';
import { PROXY_RESERVED_SELECTORS } from '../config/knownSelectors';
import { RecordAuditModal } from './RecordAuditModal';
import { Shield, Search, AlertTriangle, CheckCircle2, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { ExtractedSelector, SelectorCollision } from '../utils/selectorExtractor';

export function ProxyClashChecker() {
  const [proxyAddress, setProxyAddress] = useState('');
  const [rpcUrl, setRpcUrl] = useState('https://rpc.botchain.ai');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProxyInspectionResult | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const handleInspect = async () => {
    if (!proxyAddress.trim()) return;
    setIsLoading(true);
    try {
      const res = await inspectProxyOnChain(proxyAddress.trim(), rpcUrl.trim());
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectors: ExtractedSelector[] = PROXY_RESERVED_SELECTORS.map((p) => ({
    name: p.signature.split('(')[0],
    signature: p.signature,
    canonicalSignature: p.signature,
    selector: p.selector,
    sourceName: 'ProxyDispatcher',
  }));

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-zinc-300" />
          <h2 className="text-sm font-semibold font-mono text-zinc-100">
            ERC-1967 Proxy Storage & Dispatcher Inspector
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Reads standard EIP-1967 storage slots on Botchain Mainnet to verify implementation, admin, and beacon routing, and cross-checks against reserved proxy selectors.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={proxyAddress}
              onChange={(e) => setProxyAddress(e.target.value)}
              placeholder="Proxy Contract Address (0x...)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="w-full sm:w-60">
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="RPC URL (default: https://rpc.botchain.ai)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-400 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <button
            onClick={handleInspect}
            disabled={isLoading || !proxyAddress.trim()}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-medium text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reading Slots...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Inspect Slots</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.error ? (
            <div className="bg-red-950/20 border border-red-900/60 rounded-xl p-5 text-xs font-mono">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Storage Slot Inspection Error</span>
              </div>
              <p className="text-zinc-300">{result.error}</p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div>
                  <div className="text-xs font-mono text-zinc-500">Classification:</div>
                  <div className="text-sm font-semibold font-mono text-zinc-100 mt-0.5">
                    {result.proxyType}
                  </div>
                </div>

                <button
                  onClick={() => setShowRecordModal(true)}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Record Proxy Audit (Gas Fee)</span>
                </button>
              </div>

              {/* Slots Table */}
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80">
                  <div className="flex justify-between text-zinc-500 mb-1">
                    <span>Implementation Slot (0x3608...):</span>
                    <span className="text-zinc-400">EIP-1967 Logic Target</span>
                  </div>
                  {result.implementationAddress ? (
                    <a
                      href={`https://scan.botchain.ai/address/${result.implementationAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-bold underline"
                    >
                      <img
                        src="/botchain-logo.png"
                        alt="BotchainScan"
                        className="w-3.5 h-3.5 rounded-full object-contain inline-block"
                      />
                      <span>{result.implementationAddress}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  ) : (
                    <span className="text-zinc-600">None detected in slot</span>
                  )}
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80">
                  <div className="flex justify-between text-zinc-500 mb-1">
                    <span>Admin Slot (0xb531...):</span>
                    <span className="text-zinc-400">EIP-1967 Admin Target</span>
                  </div>
                  {result.adminAddress ? (
                    <a
                      href={`https://scan.botchain.ai/address/${result.adminAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-200 hover:text-zinc-100 flex items-center gap-1.5 underline"
                    >
                      <img
                        src="/botchain-logo.png"
                        alt="BotchainScan"
                        className="w-3.5 h-3.5 rounded-full object-contain inline-block"
                      />
                      <span>{result.adminAddress}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  ) : (
                    <span className="text-zinc-600">None detected / UUPS Self-Managed</span>
                  )}
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800/80">
                  <div className="flex justify-between text-zinc-500 mb-1">
                    <span>Beacon Slot (0xa3f0...):</span>
                    <span className="text-zinc-400">EIP-1967 Beacon Target</span>
                  </div>
                  {result.beaconAddress ? (
                    <a
                      href={`https://scan.botchain.ai/address/${result.beaconAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-200 hover:text-zinc-100 flex items-center gap-1.5 underline"
                    >
                      <img
                        src="/botchain-logo.png"
                        alt="BotchainScan"
                        className="w-3.5 h-3.5 rounded-full object-contain inline-block"
                      />
                      <span>{result.beaconAddress}</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  ) : (
                    <span className="text-zinc-600">None detected</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reserved Proxy Selectors Reference Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold font-mono text-zinc-300 mb-3">
          Reserved Proxy Admin Selectors (EIP-1967 / UUPS):
        </h3>
        <p className="text-xs text-zinc-400 mb-3">
          If an implementation contract contains any function with these 4-byte selectors, transparent proxies will intercept the call, preventing the implementation function from ever executing!
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="pb-2">Selector</th>
                <th className="pb-2">Signature</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {PROXY_RESERVED_SELECTORS.map((item, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30">
                  <td className="py-2 text-amber-400 font-bold">{item.selector}</td>
                  <td className="py-2 text-zinc-200">{item.signature}</td>
                  <td className="py-2 text-zinc-400">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RecordAuditModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        targetAddress={result?.implementationAddress || proxyAddress}
        archType={1} // ERC1967Proxy
        selectors={selectors}
        collisions={[]}
      />
    </div>
  );
}

