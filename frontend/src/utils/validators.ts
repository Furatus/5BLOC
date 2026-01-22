/**
 * Validations pour la DApp Casino
 */

/**
 * Valide un montant de pari
 */
export const isValidBetAmount = (amount: string, min: string, max: string): boolean => {
  const num = parseFloat(amount);
  const minNum = parseFloat(min);
  const maxNum = parseFloat(max);
  
  if (isNaN(num) || num <= 0) return false;
  if (num < minNum || num > maxNum) return false;
  
  return true;
};

/**
 * Valide une adresse Ethereum
 */
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Valide qu'une chaîne n'est pas vide
 */
export const isRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Valide qu'une valeur est un nombre
 */
export const isNumber = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};
