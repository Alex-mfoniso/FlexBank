/**
 * Centralized formatting utilities for currencies and timestamps (Section 14)
 */

/**
 * Formats a minor-unit integer (e.g., 100000 = NGN 1000.00) into a clean, symbol-decorated currency string.
 */
export const formatMoney = (minorAmount: number | null | undefined, currency = "NGN"): string => {
  if (minorAmount === null || minorAmount === undefined) {
    minorAmount = 0;
  }
  
  const majorAmount = minorAmount / 100;

  try {
    // Standard localized Intl Formatter
    const locale = currency === "NGN" ? "en-NG" : "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    });

    let formatted = formatter.format(majorAmount);
    
    // Explicit NGN symbol guard to avoid "NGN" abbreviation fallbacks
    if (currency === "NGN" && !formatted.includes("₦")) {
      formatted = "₦" + majorAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return formatted;
  } catch {
    // Resilient fallback formatting
    const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;
    return `${symbol}${majorAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

/**
 * Formats ISO strings into structured human-readable developer logs timestamps.
 */
export const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
};
