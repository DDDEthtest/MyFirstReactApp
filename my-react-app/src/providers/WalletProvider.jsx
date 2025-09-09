// Bridge file: re-export the TypeScript implementation so both JS and TS
// parts of the app use the same context/provider.
export { WalletProvider, useWalletContext } from './WalletProvider.tsx';
export { WalletProvider as default } from './WalletProvider.tsx';
