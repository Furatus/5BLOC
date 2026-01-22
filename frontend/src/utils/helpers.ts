/**
 * Fonctions utilitaires pour la DApp Casino
 */

import { BetColor } from '../types';

/**
 * Formate une adresse Ethereum
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Formate un montant ETH
 */
export const formatEther = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(4);
};

/**
 * Vérifie si une chaîne est une adresse Ethereum valide
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Obtient la couleur CSS pour une couleur de pari
 */
export const getBetColorHex = (color: BetColor): string => {
  const colors = {
    red: '#c0392b',
    black: '#2c3e50',
    green: '#27ae60',
  };
  return colors[color];
};

/**
 * Génère un ID unique
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Délai asynchrone
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Formate une date
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('fr-FR');
};
