'use client';

import React, { useState } from 'react';
import { useAccount, useDisconnect, useBalance, useConnect, useSwitchChain } from 'wagmi';
import { useAppConfig } from '../context/Web3Provider';
import { ShieldAlert, ExternalLink, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { botchainMainnet } from '../config/botchain';

export function Header() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { reownId, contractAddress, setContractAddress, isMounted, isAppKitReady, openWalletModal } =
    useAppConfig();

  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);

  const { data: balance } = useBalance({
    address: address || undefined,
    chainId: botchainMainnet.id,
    query: {
      enabled: Boolean(isMounted && address),
    },
  });

  const isWrongChain = isConnected && chain && chain.id !== botchainMainnet.id;

  const [showConnectMenu, setShowConnectMenu] = useState(false);

  const handleInjectedConnect = () => {
    setShowConnectMenu(false);
    const injectedConnector =
      connectors.find((c) => c.id === 'injected' || c.type === 'injected') || connectors[0];

    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(() => {
          if (connectors[0]) connect({ connector: connectors[0] });
        })
        .catch((err: any) => console.error('Wallet connection rejected:', err));
    } else {
      alert('No Web3 wallet extension found. Please install MetaMask to connect to Botchain Testnet.');
    }
  };

  const handleWalletConnectModal = () => {
    setShowConnectMenu(false);
    if (isAppKitReady) {
      openWalletModal();
      return;
    }
    const wcConnector = connectors.find(
      (c) => c.id === 'walletConnect' || c.type === 'walletConnect'
    );
    if (wcConnector) {
      connect({ connector: wcConnector });
    } else {
      openWalletModal();
    }
  };

  const handleDirectConnect = () => {
    if (reownId && isAppKitReady) {
      openWalletModal();
      return;
    }
    handleInjectedConnect();
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Logo & Network Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-950 flex items-center justify-center p-1 shadow-md">
              <img
                src="/selectorclash-logo.svg"
                alt="SelectorClash Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-zinc-100 font-mono">
                  Selector<span className="text-zinc-400">Clash</span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 font-mono font-medium">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Solidity 4-Byte Function Selector Collision Detector
              </p>
            </div>
          </div>

          {/* Network & Contract Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botchain Mainnet Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
              <img
                src="/botchain-logo.png"
                alt="Botchain"
                className="w-4 h-4 rounded-full object-contain"
              />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-zinc-200">Botchain Mainnet</span>
              <span className="text-zinc-500 font-mono">ID: 677</span>
              <a
                href="https://scan.botchain.ai"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 ml-1"
                title="Open BotchainScan Official Explorer"
              >
                <img
                  src="/botchain-logo.png"
                  alt="BotchainScan"
                  className="w-3.5 h-3.5 rounded-full object-contain inline-block"
                />
                <span>BotchainScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Gas Fee Notice */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 font-mono">
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Gas Fee Only (BOT)</span>
            </div>

            {/* Contract Registry Address Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs font-mono">
              <img
                src="/botchain-logo.png"
                alt="Botchain"
                className="w-3.5 h-3.5 rounded-full object-contain"
              />
              <span className="text-zinc-500">Registry:</span>
              {contractAddress ? (
                <a
                  href={`https://scan.botchain.ai/address/${contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-300 hover:text-zinc-100 underline decoration-zinc-700 transition-colors"
                >
                  {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </a>
              ) : (
                <button
                  onClick={() => setShowAddressEdit(true)}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Set Address
                </button>
              )}
            </div>

            {/* Network Switcher (if on wrong network) */}
            {isWrongChain && (
              <button
                onClick={() => switchChain?.({ chainId: botchainMainnet.id })}
                disabled={isSwitching}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900/80 border border-amber-800 rounded-md text-xs font-mono text-amber-300 transition-colors"
              >
                <img
                  src="/botchain-logo.png"
                  alt="Botchain"
                  className="w-3.5 h-3.5 rounded-full object-contain"
                />
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch to Botchain Mainnet (677)</span>
              </button>
            )}

            {/* Wallet Connect Section */}
            <div className="flex items-center gap-2">
              {!isMounted ? (
                // Safe SSR Placeholder to prevent hydration mismatch
                <div className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 font-medium text-xs rounded-md font-mono">
                  Loading...
                </div>
              ) : isConnected && address ? (
                // Connected State
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-200 font-medium">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  {balance && (
                    <span className="text-zinc-400 border-l border-zinc-800 pl-2">
                      {parseFloat(balance.formatted).toFixed(3)} {balance.symbol}
                    </span>
                  )}
                  <button
                    onClick={() => disconnect()}
                    className="text-zinc-500 hover:text-zinc-300 ml-1.5 transition-colors"
                    title="Disconnect Wallet"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center">
                  <div className="inline-flex rounded-md shadow-sm">
                    <button
                      onClick={handleDirectConnect}
                      disabled={isConnecting}
                      className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-medium text-xs rounded-l-md transition-colors font-mono flex items-center gap-1.5"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Connect Wallet</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowConnectMenu(!showConnectMenu)}
                      className="px-2 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-xs rounded-r-md border-l border-zinc-300 transition-colors"
                      title="Connection Options"
                    >
                      ▾
                    </button>
                  </div>

                  {/* Dropdown Menu for Connection Options */}
                  {showConnectMenu && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1.5 z-50 text-xs font-mono">
                      <button
                        onClick={handleInjectedConnect}
                        className="w-full text-left px-3 py-2 text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>MetaMask / Injected</span>
                      </button>
                      <button
                        onClick={handleWalletConnectModal}
                        className="w-full text-left px-3 py-2 text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>WalletConnect (QR / AppKit)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Notice if connect error occurred */}
        {connectError && (
          <div className="mt-2 text-xs text-red-400 font-mono bg-red-950/40 p-2 rounded border border-red-900">
            Connection error: {connectError.message}
          </div>
        )}

        {/* Modal/Banner to configure registry contract address */}
        {showAddressEdit && (
          <div className="mt-3 p-3 bg-zinc-900 border border-zinc-700 rounded-md flex flex-col sm:flex-row items-center gap-2 text-xs">
            <span className="text-zinc-300 font-mono">SelectorClashRegistry Contract Address:</span>
            <input
              type="text"
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setContractAddress(tempAddress.trim());
                  setShowAddressEdit(false);
                }}
                className="px-3 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-medium rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddressEdit(false)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
