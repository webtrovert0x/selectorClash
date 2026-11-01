import { defineChain } from '@reown/appkit/networks';

export const botchainTestnet = defineChain({
  id: 968,
  caipNetworkId: 'eip155:968',
  chainNamespace: 'eip155',
  name: 'Botchain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BohrScan',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
});
