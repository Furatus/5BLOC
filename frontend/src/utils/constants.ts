/**
 * Constantes de la DApp Casino Roulette
 */

export const APP_NAME = '5BLOC Casino';
export const APP_VERSION = '1.0.0';

// Configuration Blockchain
export const SUPPORTED_CHAIN_ID = 11155111; // Sepolia testnet
export const SUPPORTED_CHAIN_NAME = 'Sepolia';

// Adresse du smart contract (à mettre à jour après déploiement)
export const ROULETTE_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

// Messages d'erreur
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Wallet non connecté',
  WRONG_NETWORK: `Veuillez vous connecter au réseau ${SUPPORTED_CHAIN_NAME}`,
  TRANSACTION_FAILED: 'Transaction échouée',
  INSUFFICIENT_FUNDS: 'Fonds insuffisants',
  USER_REJECTED: 'Transaction rejetée par l\'utilisateur',
  CONTRACT_ERROR: 'Erreur du smart contract',
  UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite',
};

// Messages de succès
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connecté avec succès',
  BET_PLACED: 'Mise placée avec succès',
  WIN: 'Félicitations ! Vous avez gagné !',
  TRANSACTION_CONFIRMED: 'Transaction confirmée',
};

// Multiplicateurs de gains
export const PAYOUT_MULTIPLIERS = {
  RED: 2,
  BLACK: 2,
  GREEN: 36,
};

// Limites de mise (en ETH)
export const BET_LIMITS = {
  MIN: '0.01',
  MAX: '1.0',
};
