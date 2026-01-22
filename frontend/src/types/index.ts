/**
 * Types pour la DApp Casino Roulette
 */

export type BetColor = 'red' | 'black' | 'green';

export interface Bet {
  color: BetColor;
  amount: string;
  timestamp: number;
}

export interface GameResult {
  winningNumber: number;
  winningColor: BetColor;
  isWin: boolean;
  payout: string;
  timestamp: number;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: string;
  chainId: number | null;
}

export interface RouletteNumber {
  number: number;
  color: BetColor;
}

// Configuration des numéros de la roulette européenne (0-36)
export const ROULETTE_NUMBERS: RouletteNumber[] = [
  { number: 0, color: 'green' },
  // Numéros rouges
  { number: 1, color: 'red' },
  { number: 3, color: 'red' },
  { number: 5, color: 'red' },
  { number: 7, color: 'red' },
  { number: 9, color: 'red' },
  { number: 12, color: 'red' },
  { number: 14, color: 'red' },
  { number: 16, color: 'red' },
  { number: 18, color: 'red' },
  { number: 19, color: 'red' },
  { number: 21, color: 'red' },
  { number: 23, color: 'red' },
  { number: 25, color: 'red' },
  { number: 27, color: 'red' },
  { number: 30, color: 'red' },
  { number: 32, color: 'red' },
  { number: 34, color: 'red' },
  { number: 36, color: 'red' },
  // Numéros noirs
  { number: 2, color: 'black' },
  { number: 4, color: 'black' },
  { number: 6, color: 'black' },
  { number: 8, color: 'black' },
  { number: 10, color: 'black' },
  { number: 11, color: 'black' },
  { number: 13, color: 'black' },
  { number: 15, color: 'black' },
  { number: 17, color: 'black' },
  { number: 20, color: 'black' },
  { number: 22, color: 'black' },
  { number: 24, color: 'black' },
  { number: 26, color: 'black' },
  { number: 28, color: 'black' },
  { number: 29, color: 'black' },
  { number: 31, color: 'black' },
  { number: 33, color: 'black' },
  { number: 35, color: 'black' },
];
