//
// 📄 NEW FILE: figmav1/src/utils/helpers.ts
//
// Helper function for formatting currency
export const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch (e) {
    // Fallback for unknown currency
    return `$${amount.toFixed(2)}`;
  }
};

// Helper function for currency conversion on the dashboard
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: { [key: string]: number }
) => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Get the rate for the 'from' currency relative to the base (e.g., USD)
  const fromRate = rates[fromCurrency];
  // Get the rate for the 'to' (global) currency relative to the base
  const toRate = rates[toCurrency];

  // If we're missing rates, we can't accurately convert, so return as-is
  // This prevents crashes if a new currency is added before rates are fetched
  if (!fromRate || !toRate) {
    console.warn(`Missing exchange rate for ${fromCurrency} or ${toCurrency}`);
    return amount;
  }
  
  // 1. Convert the amount to the base currency (USD)
  const amountInBase = amount / fromRate;
  
  // 2. Convert from the base currency to the target (global) currency
  const amountInTarget = amountInBase * toRate;
  
  return amountInTarget;
};

// figmav1/src/utils/helpers.ts

export const formatCurrency = (
  amount: number,
  currency: string,
  compact = false
) => {
  if (isNaN(amount)) {
    amount = 0;
  }
  
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency || 'USD',
    notation: compact ? 'compact' : 'standard',
  };

  try {
    return new Intl.NumberFormat('en-US', options).format(amount);
  } catch (e) {
    // Fallback for unknown currency (e.g., if user types "BTC")
    options.currency = 'USD';
    return new Intl.NumberFormat('en-US', options).format(amount);
  }
};