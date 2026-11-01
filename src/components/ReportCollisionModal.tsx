'use client';

import React, { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
  useSwitchChain,
} from 'wagmi';
import { useAppConfig } from '../context/Web3Provider';
import { SELECTOR_CLASH_REGISTRY_ABI } from '../contracts/SelectorClashRegistryABI';
import { computeSelector, canonicalizeSignatureString } from '../utils/selectorExtractor';
import { Address, isAddress } from 'viem';
import { X, AlertTriangle, ExternalLink, Loader2, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';
import { botchainTestnet } from '../config/botchain';

interface ReportCollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSignatureA?: string;
  initialSignatureB?: string;
  initialSelector?: string;
}

export function ReportCollisionModal({
  isOpen,
  onClose,
  initialSignatureA = '',
  initialSignatureB = '',
  initialSelector = '',
}: ReportCollisionModalProps) {
  const { isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { contractAddress, setContractAddress, reownId, isAppKitReady, openWalletModal } = useAppConfig();

  const [targetAddress, setTargetAddress] = useState('');
  const [sigA, setSigA] = useState(initialSignatureA);
  const [sigB, setSigB] = useState(initialSignatureB);
  const [category, setCategory] = useState<number>(1);
  const [impactNotes, setImpactNotes] = useState('');
  const [customContract, setCustomContract] = useState('');

  const {
    data: txHash,
    isPending: isSubmitting,
    error: submitError,
    writeContractAsync,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  if (!isOpen) return null;

  let selA = '';
  let selB = '';

  try {
    if (sigA.trim()) selA = computeSelector(canonicalizeSignatureString(sigA));
  } catch {}

  try {
    if (sigB.trim()) selB = computeSelector(canonicalizeSignatureString(sigB));
  } catch {}

  const isCollisionValid = selA && selB && selA === selB;
  const rawContract = (contractAddress || customContract).trim();
  const isValidContract = isAddress(rawContract);
  const activeContract = isValidContract ? (rawContract as Address) : undefined;
  const isWrongChain = isConnected && chain && chain.id !== botchainTestnet.id;

  const handleReport = async () => {
    if (!activeContract) {
      alert('Please deploy the SelectorClashRegistry contract or paste a valid 0x contract address.');
      return;
    }

    if (!isCollisionValid) {
      alert('Signatures must produce the exact same 4-byte selector!');
      return;
    }

    try {
      const validTarget =
        targetAddress && targetAddress.startsWith('0x') && targetAddress.length === 42
          ? (targetAddress as Address)
          : ('0x0000000000000000000000000000000000000000' as Address);

      const canonicalA = canonicalizeSignatureString(sigA);
      const canonicalB = canonicalizeSignatureString(sigB);

      // Gas fee only transaction
      await writeContractAsync({
        address: activeContract,
        abi: SELECTOR_CLASH_REGISTRY_ABI,
        functionName: 'reportCollision',
        args: [
          validTarget,
          selA as `0x${string}`,
          canonicalA,
          canonicalB,
          category,
          impactNotes.trim() || 'Community reported selector collision.',
        ],
      });
    } catch (err: any) {
      console.error('Report submission failed:', err);
    }
  };

  const handleConnect = () => {
    if (reownId && isAppKitReady) {
      openWalletModal();
      return;
    }
    const injectedConnector =
      connectors.find((c) => c.id === 'injected' || c.type === 'injected') || connectors[0];
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-red-950/60 border border-red-800 rounded-md">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 font-mono">
              Report Selector Collision
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Submit a verified 4-byte collision to the on-chain registry
            </p>
          </div>
        </div>

        {/* Gas Fee Guarantee Notice */}
        <div className="mb-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono">
          <div className="flex items-center justify-between text-zinc-300 mb-1">
            <span className="font-medium text-zinc-200">On-Chain Interaction:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-medium">
              Gas Fee Only
            </span>
          </div>
          <p className="text-zinc-400">
            Records your report to <span className="font-mono text-zinc-200">SelectorClashRegistry</span> on Botchain Testnet. Costs network gas fee only.
          </p>
        </div>

        {/* If contract address is missing or invalid, show clear deployment notice & input */}
        {!isValidContract && (
          <div className="mb-4 p-3 rounded-lg bg-zinc-950 border border-amber-800/80 text-xs font-mono">
            <div className="text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              SelectorClashRegistry Contract Not Deployed Yet
            </div>
            <p className="text-zinc-400 mb-2 leading-relaxed">
              To record collision reports on Botchain Testnet (Chain ID 968), add your deployer <code className="text-zinc-200">PRIVATE_KEY</code> in <code className="text-zinc-200">.env</code> and run <code className="text-zinc-200">npm run deploy:contract</code>, or paste an already deployed contract address below:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x... (42-character address)"
                value={customContract}
                onChange={(e) => setCustomContract(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
              />
              <button
                type="button"
                disabled={!isAddress(customContract.trim())}
                onClick={() => {
                  if (isAddress(customContract.trim())) {
                    setContractAddress(customContract.trim());
                  }
                }}
                className="px-3 py-1 bg-zinc-200 hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 rounded font-bold transition-colors"
              >
                Set
              </button>
            </div>
            {customContract.trim() && !isAddress(customContract.trim()) && (
              <p className="text-red-400 text-[11px] mt-1.5">Please enter a valid 42-character 0x address.</p>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 mb-1">
              Vulnerable Contract Address (Optional, defaults to 0x0):
            </label>
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Function Signature A:</label>
              <input
                type="text"
                value={sigA}
                onChange={(e) => setSigA(e.target.value)}
                placeholder="e.g. proxy_owner()"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
              {selA && (
                <div className="mt-1 text-[11px] text-zinc-400">
                  Selector: <span className="text-zinc-200">{selA}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Function Signature B:</label>
              <input
                type="text"
                value={sigB}
                onChange={(e) => setSigB(e.target.value)}
                placeholder="e.g. clash550254402()"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
              {selB && (
                <div className="mt-1 text-[11px] text-zinc-400">
                  Selector: <span className="text-zinc-200">{selB}</span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Indicator */}
          {sigA && sigB && (
            <div
              className={`p-2.5 rounded-lg border text-xs ${
                isCollisionValid
                  ? 'bg-zinc-950 border-emerald-800 text-emerald-400'
                  : 'bg-zinc-950 border-red-900 text-red-400'
              }`}
            >
              {isCollisionValid ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Verified Collision! Both produce {selA}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Selectors do not match ({selA || 'invalid'} vs {selB || 'invalid'})
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-zinc-400 mb-1">Collision Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value={1}>ProxyAdminClash (Transparent/UUPS Interception)</option>
              <option value={2}>DiamondFacetOverlap (ERC-2535 Loupe Conflict)</option>
              <option value={3}>IntraContractCollision (Direct Dispatcher Conflict)</option>
              <option value={4}>UpgradeShadowing (V1 vs V2 Modification)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">
              Impact Notes / Exploit Context:
            </label>
            <textarea
              value={impactNotes}
              onChange={(e) => setImpactNotes(e.target.value)}
              placeholder="Explain how this collision affects contract execution..."
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Transaction Status */}
        {submitError && (
          <div className="mt-3 p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-300 flex items-start gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="truncate">{submitError.message}</div>
          </div>
        )}

        {txHash && (
          <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Transaction:</span>
              {isConfirmed ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed on Botchain
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming...
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Explorer:</span>
              <a
                href={`https://scan.bohr.life/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-300 underline hover:text-zinc-100 flex items-center gap-1"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Not Connected / Wrong Chain Helpers */}
        {!isConnected ? (
          <div className="mt-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Wallet not connected:</span>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-mono text-xs font-medium rounded transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : isWrongChain ? (
          <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800 flex items-center justify-between">
            <span className="text-xs font-mono text-amber-300">Connected to wrong network:</span>
            <button
              onClick={() => switchChain?.({ chainId: botchainTestnet.id })}
              disabled={isSwitching}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-xs font-bold rounded transition-colors"
            >
              Switch to Botchain (968)
            </button>
          </div>
        ) : null}

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={
              !isConnected ||
              isWrongChain ||
              !isCollisionValid ||
              isSubmitting ||
              isConfirming ||
              !activeContract
            }
            onClick={handleReport}
            className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-medium text-xs font-mono rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting || isConfirming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Broadcasting (Gas Fee)...</span>
              </>
            ) : !activeContract ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Contract Not Deployed (Enter Address)</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Submit Report (Gas Fee)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
