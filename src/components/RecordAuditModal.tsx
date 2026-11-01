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
import { keccak256, toHex, Address, isAddress } from 'viem';
import { X, CheckCircle2, AlertTriangle, ExternalLink, Loader2, Zap } from 'lucide-react';
import { ExtractedSelector, SelectorCollision } from '../utils/selectorExtractor';
import { botchainTestnet } from '../config/botchain';

interface RecordAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAddress: string;
  archType: number; // 0=Standard, 1=ERC1967Proxy, 2=UUPS, 3=ERC2535Diamond
  selectors: ExtractedSelector[];
  collisions: SelectorCollision[];
}

export function RecordAuditModal({
  isOpen,
  onClose,
  targetAddress,
  archType,
  selectors,
  collisions,
}: RecordAuditModalProps) {
  const { isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { contractAddress, setContractAddress, reownId, isAppKitReady, openWalletModal } = useAppConfig();
  const [details, setDetails] = useState('');
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

  const validTarget =
    targetAddress && targetAddress.startsWith('0x') && targetAddress.length === 42
      ? (targetAddress as Address)
      : ('0x0000000000000000000000000000000000000000' as Address);

  // Compute ABI / Signature digest
  const signaturesString = selectors.map((s) => s.canonicalSignature).sort().join('\n');
  const abiHash = keccak256(toHex(signaturesString || 'empty'));
  const hasCollision = collisions.length > 0;
  const collidingSelectors = collisions.map((c) => c.selector as `0x${string}`);

  const rawContract = (contractAddress || customContract).trim();
  const isValidContract = isAddress(rawContract);
  const activeContract = isValidContract ? (rawContract as Address) : undefined;
  const isWrongChain = isConnected && chain && chain.id !== botchainTestnet.id;

  const handleRecordAudit = async () => {
    if (!activeContract) {
      alert('Please deploy the SelectorClashRegistry contract or paste a valid 0x contract address.');
      return;
    }

    try {
      const auditDetails =
        details.trim() ||
        JSON.stringify({
          collisionCount: collisions.length,
          collisions: collisions.map((c) => ({
            selector: c.selector,
            type: c.type,
            signatures: c.entries.map((e) => e.canonicalSignature),
          })),
        });

      // Pure gas fee only transaction - non-payable
      await writeContractAsync({
        address: activeContract,
        abi: SELECTOR_CLASH_REGISTRY_ABI,
        functionName: 'recordAudit',
        args: [
          validTarget,
          abiHash,
          archType,
          hasCollision,
          BigInt(selectors.length),
          collidingSelectors,
          auditDetails,
        ],
      });
    } catch (err: any) {
      console.error('Transaction failed:', err);
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
          <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-md">
            <Zap className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 font-mono">
              Record Audit on Botchain Testnet
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Stores permanent collision verification to SelectorClashRegistry
            </p>
          </div>
        </div>

        {/* Gas Fee Guarantee Notice */}
        <div className="mb-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono">
          <div className="flex items-center justify-between text-zinc-300 mb-1">
            <span className="font-medium text-zinc-200">Transaction Fee Policy:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-medium">
              Gas Fee Only
            </span>
          </div>
          <p className="text-zinc-400">
            This on-chain transaction only consumes network gas in <span className="text-zinc-200 font-medium">BOT</span> on Botchain Testnet (Chain ID 968). There are zero protocol taxes, developer surcharges, or hidden fees.
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
              To record on-chain audits on Botchain Testnet (Chain ID 968), add your deployer <code className="text-zinc-200">PRIVATE_KEY</code> in <code className="text-zinc-200">.env</code> and run <code className="text-zinc-200">npm run deploy:contract</code>, or paste an already deployed contract address below:
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

        {/* Audit Summary Details */}
        <div className="space-y-2 text-xs font-mono mb-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
          <div className="flex justify-between">
            <span className="text-zinc-500">Target Contract:</span>
            <span className="text-zinc-300">
              {validTarget === '0x0000000000000000000000000000000000000000'
                ? 'Raw ABI Check (0x0)'
                : `${validTarget.slice(0, 8)}...${validTarget.slice(-6)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Architecture:</span>
            <span className="text-zinc-300">
              {archType === 1
                ? 'ERC-1967 Transparent Proxy'
                : archType === 2
                ? 'UUPS Proxy'
                : archType === 3
                ? 'ERC-2535 Diamond'
                : 'Standard Contract'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Total Selectors:</span>
            <span className="text-zinc-300">{selectors.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Collision Status:</span>
            {hasCollision ? (
              <span className="text-red-400 font-medium">
                {collisions.length} Collision(s) Detected
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">0 Collisions (Clean)</span>
            )}
          </div>
        </div>

        {/* Optional Notes */}
        <div className="mb-4">
          <label className="block text-xs font-mono text-zinc-400 mb-1">
            Audit Notes / Verification Comments (Optional):
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Verified for Diamond Facet V2 deployment without selector overlap."
            rows={2}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
          />
        </div>

        {/* Status Messages */}
        {submitError && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-300 flex items-start gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="truncate">
              {submitError.message || 'Transaction submission failed.'}
            </div>
          </div>
        )}

        {txHash && (
          <div className="mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Transaction Status:</span>
              {isConfirmed ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed on Botchain
                </span>
              ) : isConfirming ? (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming...
                </span>
              ) : (
                <span className="text-zinc-300">Submitted</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">BohrScan Explorer:</span>
              <a
                href={`https://scan.bohr.life/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-300 hover:text-zinc-100 flex items-center gap-1 underline"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Not Connected / Wrong Chain Helpers */}
        {!isConnected ? (
          <div className="mb-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
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
          <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800 flex items-center justify-between">
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

        {/* Action Button */}
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
              isSubmitting ||
              isConfirming ||
              !activeContract
            }
            onClick={handleRecordAudit}
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
                <span>Confirm & Record (Gas Fee)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
