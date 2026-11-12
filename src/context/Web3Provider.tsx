'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit/react';
import { isAddress } from 'viem';
import { botchainMainnet, botchainTestnet } from '../config/botchain';

interface AppConfigContextType {
  reownId: string;
  contractAddress: string;
  isConfigLoaded: boolean;
  isMounted: boolean;
  isAppKitReady: boolean;
  setContractAddress: (address: string) => void;
  openWalletModal: () => void;
}

const AppConfigContext = createContext<AppConfigContextType>({
  reownId: '',
  contractAddress: '',
  isConfigLoaded: false,
  isMounted: false,
  isAppKitReady: false,
  setContractAddress: () => {},
  openWalletModal: () => {},
});

export const useAppConfig = () => useContext(AppConfigContext);

let globalAppKitInstance: any = null;
let globalWagmiConfig: any = null;

function getOrCreateWagmiConfig(projectId: string) {
  if (globalWagmiConfig) return globalWagmiConfig;

  if (projectId && projectId.trim().length > 5) {
    try {
      const adapter = new WagmiAdapter({
        projectId: projectId.trim(),
        networks: [botchainMainnet as any, botchainTestnet as any],
        connectors: [
          injected(),
          walletConnect({ projectId: projectId.trim(), showQrModal: false }),
        ],
        ssr: true,
      });

      if (typeof window !== 'undefined' && !globalAppKitInstance) {
        globalAppKitInstance = createAppKit({
          adapters: [adapter],
          networks: [botchainMainnet as any, botchainTestnet as any],
          projectId: projectId.trim(),
          metadata: {
            name: 'SelectorClash',
            description: 'Function Selector Collision Detector on Botchain Mainnet',
            url: window.location.origin,
            icons: ['https://scan.botchain.ai/favicon.ico'],
          },
          themeMode: 'dark',
          themeVariables: {
            '--w3m-color-mix': '#18181b',
            '--w3m-color-mix-strength': 40,
            '--w3m-accent': '#52525b',
          },
        });
      }

      globalWagmiConfig = adapter.wagmiConfig;
      return globalWagmiConfig;
    } catch (e) {
      console.warn('WagmiAdapter initialization fallback:', e);
    }
  }

  // Fallback direct config
  globalWagmiConfig = createConfig({
    chains: [botchainMainnet, botchainTestnet],
    connectors: [injected()],
    transports: {
      [botchainMainnet.id]: http('https://rpc.botchain.ai'),
      [botchainTestnet.id]: http('https://rpc.bohr.life'),
    },
    ssr: true,
  });

  return globalWagmiConfig;
}

interface Web3ProviderProps {
  children: React.ReactNode;
  initialReownId?: string;
  initialContractAddress?: string;
}

export function Web3Provider({
  children,
  initialReownId = '',
  initialContractAddress = '',
}: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [reownId, setReownId] = useState<string>(initialReownId);
  const [contractAddress, setContractAddressState] = useState<string>(
    initialContractAddress && isAddress(initialContractAddress) ? initialContractAddress : ''
  );
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isAppKitReady, setIsAppKitReady] = useState<boolean>(Boolean(initialReownId));

  // Determine Wagmi configuration ONCE on initial render
  const wagmiConfig = useMemo(() => {
    return getOrCreateWagmiConfig(initialReownId || reownId);
  }, [initialReownId, reownId]);

  const setContractAddress = (addr: string) => {
    const cleaned = addr.trim();
    if (isAddress(cleaned)) {
      setContractAddressState(cleaned);
    }
  };

  useEffect(() => {
    setIsMounted(true);

    // Sync client-side with /api/config if not preloaded
    async function syncConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.reownId && !reownId) {
            setReownId(data.reownId.trim());
          }
          if (data.contractAddress && isAddress(data.contractAddress)) {
            setContractAddressState(data.contractAddress);
          }
        }
      } catch (err) {
        console.warn('Failed to sync runtime config:', err);
      }
    }
    syncConfig();
  }, [reownId]);

  // Ensure AppKit client instance is initialized
  useEffect(() => {
    if (typeof window !== 'undefined' && reownId && !globalAppKitInstance) {
      try {
        const adapter = new WagmiAdapter({
          projectId: reownId,
          networks: [botchainMainnet as any, botchainTestnet as any],
          connectors: [
            injected(),
            walletConnect({ projectId: reownId, showQrModal: false }),
          ],
          ssr: true,
        });

        globalAppKitInstance = createAppKit({
          adapters: [adapter],
          networks: [botchainMainnet as any, botchainTestnet as any],
          projectId: reownId,
          metadata: {
            name: 'SelectorClash',
            description: 'Function Selector Collision Detector on Botchain Mainnet',
            url: window.location.origin,
            icons: ['https://scan.botchain.ai/favicon.ico'],
          },
          themeMode: 'dark',
          themeVariables: {
            '--w3m-color-mix': '#18181b',
            '--w3m-color-mix-strength': 40,
            '--w3m-accent': '#52525b',
          },
        });
        setIsAppKitReady(true);
      } catch (err) {
        console.warn('Client AppKit init:', err);
      }
    } else if (globalAppKitInstance) {
      setIsAppKitReady(true);
    }
  }, [reownId]);

  const openWalletModal = () => {
    if (globalAppKitInstance && typeof globalAppKitInstance.open === 'function') {
      globalAppKitInstance.open({ view: 'Connect' });
      return;
    }
    if (typeof window !== 'undefined') {
      const modalEl = document.querySelector('appkit-button') as any;
      if (modalEl && typeof modalEl.click === 'function') {
        modalEl.click();
        return;
      }
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AppConfigContext.Provider
          value={{
            reownId,
            contractAddress,
            isConfigLoaded: true,
            isMounted,
            isAppKitReady,
            setContractAddress,
            openWalletModal,
          }}
        >
          {children}
        </AppConfigContext.Provider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
