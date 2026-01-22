
export const isValidBetAmount = (amount: string, min: string, max: string): boolean => {
  const num = parseFloat(amount);
  const minNum = parseFloat(min);
  const maxNum = parseFloat(max);
  
  if (isNaN(num) || num <= 0) return false;
  if (num < minNum || num > maxNum) return false;
  
  return true;
};


export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};


export const isRequired = (value: string): boolean => {
  return value.trim().length > 0;
};


export const isNumber = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};
