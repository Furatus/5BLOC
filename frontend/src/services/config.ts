/**
 * Configuration Web3 pour la DApp
 */

import { ROULETTE_CONTRACT_ADDRESS, SUPPORTED_CHAIN_ID } from '../utils/constants';

export const WEB3_CONFIG = {
  // Réseau supporté (Sepolia testnet)
  chainId: SUPPORTED_CHAIN_ID,
  
  // Adresse du smart contract
  contractAddress: ROULETTE_CONTRACT_ADDRESS,
  
  // RPC URLs (optionnel, utilise celui du wallet par défaut)
  rpcUrls: {
    sepolia: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  },
};

export default WEB3_CONFIG;
