export type FieldSection =
  | "incomeStatement"
  | "balanceSheet"
  | "cashFlow"
  | "ratios"
  | "marketData";

export type MetricSpec = {
  canonical: string;
  section: FieldSection;
  key: string;
  labels: RegExp[];
  preferPercentage?: boolean;
};

export type FieldPattern = {
  key: string;
  labels: RegExp[];
  preferPercentage?: boolean;
};

export const METRIC_SPECS: MetricSpec[] = [
  {
    canonical: "revenue",
    section: "incomeStatement",
    key: "revenue",
    labels: [
      /revenue from operations/i,
      /total revenue/i,
      /net sales/i,
      /sales\s*\+?/i,
      /\brevenue\b/i,
    ],
  },
  {
    canonical: "ebitda",
    section: "incomeStatement",
    key: "ebitda",
    labels: [/\bebitda\b/i],
  },
  {
    canonical: "operating_profit",
    section: "incomeStatement",
    key: "ebit",
    labels: [/operating profit/i, /\bebit\b/i, /pbdit/i, /op\.?\s*profit/i],
  },
  {
    canonical: "depreciation",
    section: "incomeStatement",
    key: "depreciation",
    labels: [/depreciation/i, /depreciation and amorti/i, /\bd&a\b/i],
  },
  {
    canonical: "pbt",
    section: "incomeStatement",
    key: "profitBeforeTax",
    labels: [/profit before tax/i, /\bpbt\b/i, /profit before taxation/i],
  },
  {
    canonical: "pat",
    section: "incomeStatement",
    key: "netProfit",
    labels: [
      /profit after tax/i,
      /net profit/i,
      /\bpat\b/i,
      /net income/i,
    ],
  },
  {
    canonical: "eps",
    section: "incomeStatement",
    key: "eps",
    labels: [/\beps\b/i, /earnings per share/i, /eps in rs/i],
  },
  {
    canonical: "interest_expense",
    section: "incomeStatement",
    key: "interestExpense",
    labels: [
      /finance costs?/i,
      /interest expense/i,
      /interest paid/i,
      /finance charges?/i,
      /\binterest\b(?!\s+(cover|coverage|earned))/i,
    ],
  },
  {
    canonical: "total_assets",
    section: "balanceSheet",
    key: "totalAssets",
    labels: [/total assets/i, /assets total/i],
  },
  {
    canonical: "total_equity",
    section: "balanceSheet",
    key: "totalEquity",
    labels: [
      /total equity/i,
      /shareholders.? funds/i,
      /net worth/i,
      /total shareholders/i,
    ],
  },
  {
    canonical: "total_debt",
    section: "balanceSheet",
    key: "totalDebt",
    labels: [/total debt/i, /total borrowings/i, /\bborrowings?\b/i],
  },
  {
    canonical: "net_debt",
    section: "balanceSheet",
    key: "netDebt",
    labels: [/net debt/i],
  },
  {
    canonical: "cash",
    section: "balanceSheet",
    key: "cash",
    labels: [
      /cash and cash equivalents/i,
      /cash\s*&\s*cash equivalents/i,
      /cash equivalents/i,
      /cash\s*&\s*bank/i,
      /\bcash\b(?!\s+from)/i,
    ],
  },
  {
    canonical: "receivables",
    section: "balanceSheet",
    key: "receivables",
    labels: [/trade receivables/i, /\breceivables\b/i, /\bdebtors\b/i],
  },
  {
    canonical: "inventory",
    section: "balanceSheet",
    key: "inventory",
    labels: [/inventor(?:y|ies)/i],
  },
  {
    canonical: "payables",
    section: "balanceSheet",
    key: "payables",
    labels: [/trade payables/i, /\bpayables\b/i, /\bcreditors\b/i],
  },
  {
    canonical: "current_assets",
    section: "balanceSheet",
    key: "currentAssets",
    labels: [/current assets/i, /total current assets/i],
  },
  {
    canonical: "current_liabilities",
    section: "balanceSheet",
    key: "currentLiabilities",
    labels: [/current liabilities/i, /total current liabilities/i],
  },
  {
    canonical: "short_term_debt",
    section: "balanceSheet",
    key: "shortTermDebt",
    labels: [
      /short[- ]term (?:debt|borrowings)/i,
      /current borrowings/i,
      /current portion of (?:long[- ]term )?(?:debt|borrowings)/i,
    ],
  },
  {
    canonical: "long_term_debt",
    section: "balanceSheet",
    key: "longTermDebt",
    labels: [
      /long[- ]term (?:debt|borrowings)/i,
      /non[- ]current borrowings/i,
    ],
  },
  {
    canonical: "cfo",
    section: "cashFlow",
    key: "operatingCashFlow",
    labels: [
      /cash\s*f\w{0,6}\s*operat/i,
      /cash[- ]flow from operat/i,
      /operating cash flow/i,
      /net cash from operating/i,
      /cash from operations/i,
      /\bcfo\b/i,
    ],
  },
  {
    canonical: "capex",
    section: "cashFlow",
    key: "capitalExpenditure",
    labels: [
      /capital expenditure/i,
      /capital exp/i,
      /\bcapex\b/i,
      /cap\.?\s*ex/i,
      /purchase of (?:ppe|fixed assets)/i,
      /purchase of property/i,
      /fixed assets purchased/i,
      /ppe purchased/i,
      /assets purchased/i,
    ],
  },
  {
    canonical: "fcf",
    section: "cashFlow",
    key: "freeCashFlow",
    labels: [/free cash flow/i, /\bfcf\b/i],
  },
  {
    canonical: "financing_cf",
    section: "cashFlow",
    key: "financingCashFlow",
    labels: [
      /cash\s*fr[o0mn]{0,3}\s*financ/i,
      /financing cash flow/i,
      /net cash from financing/i,
    ],
  },
  {
    canonical: "investing_cf",
    section: "cashFlow",
    key: "investingCashFlow",
    labels: [
      /cash\s*fr[o0mn]{0,3}\s*invest/i,
      /investing cash flow/i,
      /net cash from investing/i,
    ],
  },
  {
    canonical: "principal_repayment",
    section: "cashFlow",
    key: "principalRepayment",
    labels: [
      /repayment of (?:borrowings|debt|loans?)/i,
      /principal repayment/i,
      /debt repaid/i,
    ],
  },
  {
    canonical: "cash_taxes",
    section: "cashFlow",
    key: "cashTaxes",
    labels: [/taxes? paid/i, /income tax paid/i, /direct taxes? paid/i],
  },
  {
    canonical: "maintenance_capex",
    section: "cashFlow",
    key: "maintenanceCapex",
    labels: [/maintenance capex/i, /maintenance capital expenditure/i],
  },
  {
    canonical: "debt_to_equity",
    section: "ratios",
    key: "debtToEquity",
    labels: [/debt.?equity/i, /debt to equity/i, /\bd\/e\b/i],
  },
  {
    canonical: "roe",
    section: "ratios",
    key: "roe",
    labels: [/\broe\b/i, /return on equity/i],
    preferPercentage: true,
  },
  {
    canonical: "roce",
    section: "ratios",
    key: "roce",
    labels: [/\broce\b/i, /return on capital employed/i],
    preferPercentage: true,
  },
  {
    canonical: "roa",
    section: "ratios",
    key: "roa",
    labels: [/\broa\b/i, /return on assets/i],
    preferPercentage: true,
  },
  {
    canonical: "operating_margin",
    section: "ratios",
    key: "operatingMargin",
    labels: [/operating margin/i, /\bopm\b/i],
    preferPercentage: true,
  },
  {
    canonical: "ebitda_margin",
    section: "ratios",
    key: "ebitdaMargin",
    labels: [/ebitda margin/i],
    preferPercentage: true,
  },
  {
    canonical: "pat_margin",
    section: "ratios",
    key: "netProfitMargin",
    labels: [/net profit margin/i, /\bnpm\b/i, /profit margin/i],
    preferPercentage: true,
  },
  {
    canonical: "interest_coverage",
    section: "ratios",
    key: "interestCoverage",
    labels: [/interest coverage/i, /interest cover/i],
  },
  {
    canonical: "current_ratio",
    section: "ratios",
    key: "currentRatio",
    labels: [/current ratio/i],
  },
  {
    canonical: "asset_turnover",
    section: "ratios",
    key: "assetTurnover",
    labels: [/asset turnover/i],
  },
  {
    canonical: "receivable_days",
    section: "ratios",
    key: "receivableDays",
    labels: [/debtor days/i, /receivable days/i, /days sales outstanding/i],
  },
  {
    canonical: "inventory_days",
    section: "ratios",
    key: "inventoryDays",
    labels: [/inventory days/i, /days inventory/i],
  },
  {
    canonical: "payable_days",
    section: "ratios",
    key: "payableDays",
    labels: [/days payable/i, /payable days/i, /creditor days/i],
  },
  {
    canonical: "working_capital",
    section: "ratios",
    key: "workingCapital",
    labels: [/working capital(?!\s+cycle)/i],
  },
  {
    canonical: "current_price",
    section: "marketData",
    key: "currentPrice",
    labels: [/current price/i, /\bcmp\b/i, /market price/i, /stock price/i],
  },
  {
    canonical: "market_cap",
    section: "marketData",
    key: "marketCap",
    labels: [/market cap/i, /market capitalization/i, /\bmcap\b/i],
  },
  {
    canonical: "pe",
    section: "marketData",
    key: "pe",
    labels: [/\bp\/e\b/i, /price to earning/i, /price.?earnings/i, /\bpe ratio\b/i],
  },
  {
    canonical: "pb",
    section: "marketData",
    key: "pb",
    labels: [/\bp\/b\b/i, /price to book/i, /\bpb ratio\b/i],
  },
  {
    canonical: "dividend_yield",
    section: "marketData",
    key: "dividendYield",
    labels: [/dividend yield/i, /\bdiv yield\b/i],
    preferPercentage: true,
  },
  {
    canonical: "promoter_holding",
    section: "marketData",
    key: "promoterHolding",
    labels: [
      /promoter holding/i,
      /promoters.? holding/i,
      /promoter shareholding/i,
    ],
    preferPercentage: true,
  },
  {
    canonical: "promoter_holding_change",
    section: "marketData",
    key: "promoterHoldingChange",
    labels: [
      /promoter holding change/i,
      /change in promoter/i,
      /promoter.*change/i,
    ],
    preferPercentage: true,
  },
];

export function specsForSection(section: FieldSection): FieldPattern[] {
  return METRIC_SPECS.filter((spec) => spec.section === section).map((spec) => ({
    key: spec.key,
    labels: spec.labels,
    preferPercentage: spec.preferPercentage,
  }));
}

export function matchMetricSpec(label: string): MetricSpec | null {
  const cleaned = label.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2) return null;
  const looksLikeStatementFlow =
    /operat|invest|financ|capex|ppe|fixed assets|cash flow/i.test(cleaned);
  for (const spec of METRIC_SPECS) {
    if (spec.canonical === "cash" && looksLikeStatementFlow) continue;
    if (spec.labels.some((pattern) => pattern.test(cleaned))) return spec;
  }
  return null;
}

export function inferUnit(rawLine: string, spec: MetricSpec | null): string | null {
  if (spec?.preferPercentage || /%/.test(rawLine)) return "%";
  if (/\beps\b|rs\.?|₹/i.test(rawLine) && spec?.canonical === "eps") return "Rs";
  if (/\b(Cr|crore)\b/i.test(rawLine)) return "Cr";
  if (/\b(L|lakh)\b/i.test(rawLine)) return "L";
  return "Cr";
}
