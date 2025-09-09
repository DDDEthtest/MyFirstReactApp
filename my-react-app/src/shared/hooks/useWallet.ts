import { useWalletContext } from '../../providers/WalletProvider';

export const useWallet = () => {
  return useWalletContext();
};

