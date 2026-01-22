import { RED_NUMBERS, BLACK_NUMBERS } from './constants';


export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};


export const formatEther = (value: string, decimals: number = 4): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
};


export const getNumberColor = (num: number): 'red' | 'black' | 'green' => {
  if (num === 0) return 'green';
  if (RED_NUMBERS.includes(num)) return 'red';
  if (BLACK_NUMBERS.includes(num)) return 'black';
  return 'green';
};


export const getNumberColorHex = (num: number): string => {
  const color = getNumberColor(num);
  const colors = {
    red: '#dc2626',
    black: '#1f2937',
    green: '#16a34a',
  };
  return colors[color];
};


export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString('fr-FR');
};


export const formatTxHash = (hash: string): string => {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};