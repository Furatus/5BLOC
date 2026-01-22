/**
 * Service Web3 pour interagir avec MetaMask et Ethereum
 * IMPORTANT: Ce code utilise l'API window.ethereum (MetaMask)
 * Pour utiliser ethers.js, installez: npm install ethers
 */

import { WalletState } from '../types';
import { ERROR_MESSAGES } from '../utils/constants';
import WEB3_CONFIG from './config';

class Web3Service {
  private ethereum: any;

  constructor() {
    this.ethereum = (window as any).ethereum;
  }

  /**
   * Vérifie si MetaMask est installé
   */
  isMetaMaskInstalled(): boolean {
    return typeof this.ethereum !== 'undefined' && this.ethereum.isMetaMask;
  }

  /**
   * Connecte le wallet MetaMask
   */
  async connectWallet(): Promise<WalletState> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask n\'est pas installé');
    }

    try {
      // Demande l'accès au wallet
      const accounts = await this.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      const chainId = await this.getChainId();
      const balance = await this.getBalance(address);

      return {
        address,
        isConnected: true,
        balance,
        chainId,
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error(ERROR_MESSAGES.USER_REJECTED);
      }
      throw error;
    }
  }

  /**
   * Récupère l'ID de la chaîne actuelle
   */
  async getChainId(): Promise<number> {
    const chainId = await this.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  }

  /**
   * Récupère le solde d'une adresse
   */
  async getBalance(address: string): Promise<string> {
    const balance = await this.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    
    // Convertit de Wei à ETH (1 ETH = 10^18 Wei)
    const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
    return balanceInEth.toFixed(4);
  }

  /**
   * Vérifie si le réseau est correct
   */
  async isCorrectNetwork(): Promise<boolean> {
    const chainId = await this.getChainId();
    return chainId === WEB3_CONFIG.chainId;
  }

  /**
   * Demande à l'utilisateur de changer de réseau
   */
  async switchNetwork(): Promise<void> {
    try {
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${WEB3_CONFIG.chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // Si le réseau n'est pas ajouté, cette erreur sera lancée
      if (error.code === 4902) {
        throw new Error('Veuillez ajouter le réseau Sepolia à MetaMask');
      }
      throw error;
    }
  }

  /**
   * Écoute les changements de compte
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.ethereum) {
      this.ethereum.on('accountsChanged', callback);
    }
  }

  /**
   * Écoute les changements de réseau
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (this.ethereum) {
      this.ethereum.on('chainChanged', callback);
    }
  }
}

// Instance unique (Singleton)
const web3Service = new Web3Service();

export default web3Service;
