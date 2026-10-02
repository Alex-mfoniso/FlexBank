export interface BankOption {
  code: string;
  name: string;
}

export const NIGERIAN_BANKS: BankOption[] = [
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "044", name: "Access Bank" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "070", name: "Fidelity Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "035", name: "Wema Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "082", name: "Keystone Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "50515", name: "Moniepoint" },
  { code: "000", name: "Test Bank / Sandbox Mock" },
];

export function getBankName(code: string): string {
  const bank = NIGERIAN_BANKS.find((b) => b.code === code);
  return bank ? bank.name : `Bank (${code})`;
}
