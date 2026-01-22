import { ethers, BrowserProvider, Signer } from 'ethers';
import { NETWORK_CONFIG } from '../config/contracts';
import { ERROR_MESSAGES } from '../utils/constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

class web3Service {
  private provider: BrowserProvider | null = null;
  private signer: Signer | null = null;

  isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined';
  }

  getProvider(): BrowserProvider {
    if (!this.isMetaMaskInstalled()) {
      throw new Error(ERROR_MESSAGES.METAMASK_NOT_INSTALLED);
    }

    if (!this.provider) {
      this.provider = new BrowserProvider(window.ethereum);
    }

    return this.provider;
  }

  async getSigner(): Promise<Signer> {
    const provider = this.getProvider();

    if (!this.signer) {
      await provider.send('eth_requestAccounts', []);
      this.signer = await provider.getSigner();
    }

    return this.signer;
  }

  async connectWallet(): Promise<string> {
    try {
      await this.switchNetwork();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      return address;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error(ERROR_MESSAGES.USER_REJECTED);
      }
      throw error;
    }
  }

  async getAddress(): Promise<string> {
    const signer = await this.getSigner();
    return await signer.getAddress();
  }

  async getBalance(address: string): Promise<string> {
    const provider = this.getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

 
  async getChainId(): Promise<number> {
    const provider = this.getProvider();
    const network = await provider.getNetwork();
    return Number(network.chainId);
  }

  async isCorrectNetwork(): Promise<boolean> {
    const chainId = await this.getChainId();
    return chainId === NETWORK_CONFIG.chainId;
  }


  async switchNetwork(): Promise<void> {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await this.addNetwork();
      } else {
        throw error;
      }
    }
  }


  private async addNetwork(): Promise<void> {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
          chainName: NETWORK_CONFIG.chainName,
          rpcUrls: [NETWORK_CONFIG.rpcUrl],
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
          },
          blockExplorerUrls: NETWORK_CONFIG.blockExplorer ? [NETWORK_CONFIG.blockExplorer] : [],
        },
      ],
    });
  }

 
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }


  onChainChanged(callback: () => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  cleanup(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
}

export default new web3Service();