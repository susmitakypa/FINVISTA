import type {
  FinancialObservation,
  FinancialValue,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import { inferPeriodType } from "@/lib/financial-data-types";

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function fillIfMissing(
  current: FinancialValue,
  computed: FinancialValue,
): { value: FinancialValue; calculated: boolean } {
  if (current !== null) return { value: current, calculated: false };
  if (computed === null) return { value: null, calculated: false };
  return { value: computed, calculated: true };
}

function fcfFromComponents(
  cfo: FinancialValue,
  capex: FinancialValue,
): FinancialValue {
  if (cfo === null || capex === null) return null;
  return capex < 0 ? finite(cfo + capex) : finite(cfo - capex);
}

function ratio(numerator: FinancialValue, denominator: FinancialValue): FinancialValue {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return finite(numerator / denominator);
}

function pct(numerator: FinancialValue, denominator: FinancialValue): FinancialValue {
  const value = ratio(numerator, denominator);
  return value === null ? null : finite(value * 100);
}

function days(balance: FinancialValue, flow: FinancialValue): FinancialValue {
  if (balance === null || flow === null || flow === 0) return null;
  return finite((balance / flow) * 365);
}

export function enrichPeriodWithDerived(period: PeriodFinancialData): {
  period: PeriodFinancialData;
  calculated: FinancialObservation[];
} {
  const income = { ...period.incomeStatement };
  const balance = { ...period.balanceSheet };
  const cash = { ...period.cashFlow };
  const ratios = { ...period.ratios };
  const calculated: FinancialObservation[] = [];
  const label = period.period ?? (period.year ? `FY${period.year}` : "unknown");
  const periodType = inferPeriodType(period);

  const note = (metric: string, value: number) => {
    calculated.push({
      metric,
      value,
      unit: metric.includes("margin") || metric.startsWith("ro") ? "%" : null,
      period: label,
      periodType,
      year: period.year,
      source: "derived",
      sourceKind: "screener_table",
      confidence: 1,
      rawText: "calculated",
      origin: "calculated",
    });
  };

  const assign = (
    metric: string,
    current: FinancialValue,
    computed: FinancialValue,
    write: (value: number) => void,
  ) => {
    const result = fillIfMissing(current, computed);
    if (result.value !== null) write(result.value);
    if (result.calculated && result.value !== null) note(metric, result.value);
  };

  assign("ebitda", income.ebitda, (() => {
    if (income.ebit === null || income.depreciation === null) return null;
    return finite(income.ebit + Math.abs(income.depreciation));
  })(), (value) => {
    income.ebitda = value;
  });

  assign(
    "total_debt",
    balance.totalDebt,
    balance.shortTermDebt !== null || balance.longTermDebt !== null
      ? finite(
          (balance.shortTermDebt ?? 0) + (balance.longTermDebt ?? 0),
        )
      : null,
    (value) => {
      balance.totalDebt = value;
    },
  );

  assign(
    "net_debt",
    balance.netDebt,
    balance.totalDebt !== null && balance.cash !== null
      ? finite(balance.totalDebt - balance.cash)
      : null,
    (value) => {
      balance.netDebt = value;
    },
  );

  assign(
    "fcf",
    cash.freeCashFlow,
    fcfFromComponents(cash.operatingCashFlow, cash.capitalExpenditure),
    (value) => {
      cash.freeCashFlow = value;
    },
  );

  assign(
    "operating_margin",
    ratios.operatingMargin,
    pct(income.ebit ?? income.ebitda, income.revenue),
    (value) => {
      ratios.operatingMargin = value;
    },
  );
  assign(
    "ebitda_margin",
    ratios.ebitdaMargin,
    pct(income.ebitda, income.revenue),
    (value) => {
      ratios.ebitdaMargin = value;
    },
  );
  assign(
    "pat_margin",
    ratios.netProfitMargin,
    pct(income.netProfit, income.revenue),
    (value) => {
      ratios.netProfitMargin = value;
    },
  );
  assign(
    "cfo_margin",
    ratios.cfoMargin,
    pct(cash.operatingCashFlow, income.revenue),
    (value) => {
      ratios.cfoMargin = value;
    },
  );
  assign(
    "fcf_margin",
    ratios.fcfMargin,
    pct(cash.freeCashFlow, income.revenue),
    (value) => {
      ratios.fcfMargin = value;
    },
  );
  assign(
    "roe",
    ratios.roe,
    pct(income.netProfit, balance.totalEquity),
    (value) => {
      ratios.roe = value;
    },
  );
  assign(
    "roa",
    ratios.roa,
    pct(income.netProfit, balance.totalAssets),
    (value) => {
      ratios.roa = value;
    },
  );
  assign(
    "roce",
    ratios.roce,
    pct(
      income.ebit ?? income.ebitda,
      balance.totalEquity !== null && balance.totalDebt !== null
        ? finite(balance.totalEquity + balance.totalDebt)
        : null,
    ),
    (value) => {
      ratios.roce = value;
    },
  );
  assign(
    "debt_to_equity",
    ratios.debtToEquity,
    ratio(balance.totalDebt, balance.totalEquity),
    (value) => {
      ratios.debtToEquity = value;
    },
  );
  assign(
    "interest_coverage",
    ratios.interestCoverage,
    ratio(income.ebit ?? income.ebitda, income.interestExpense),
    (value) => {
      ratios.interestCoverage = value;
    },
  );
  assign(
    "current_ratio",
    ratios.currentRatio,
    ratio(balance.currentAssets, balance.currentLiabilities),
    (value) => {
      ratios.currentRatio = value;
    },
  );
  assign(
    "quick_ratio",
    ratios.quickRatio,
    ratio(
      balance.currentAssets !== null && balance.inventory !== null
        ? finite(balance.currentAssets - balance.inventory)
        : null,
      balance.currentLiabilities,
    ),
    (value) => {
      ratios.quickRatio = value;
    },
  );
  assign(
    "asset_turnover",
    ratios.assetTurnover,
    ratio(income.revenue, balance.totalAssets),
    (value) => {
      ratios.assetTurnover = value;
    },
  );
  assign(
    "working_capital",
    ratios.workingCapital,
    balance.currentAssets !== null && balance.currentLiabilities !== null
      ? finite(balance.currentAssets - balance.currentLiabilities)
      : null,
    (value) => {
      ratios.workingCapital = value;
    },
  );
  assign(
    "receivable_days",
    ratios.receivableDays,
    days(balance.receivables, income.revenue),
    (value) => {
      ratios.receivableDays = value;
    },
  );
  assign(
    "inventory_days",
    ratios.inventoryDays,
    days(balance.inventory, income.revenue),
    (value) => {
      ratios.inventoryDays = value;
    },
  );
  assign(
    "payable_days",
    ratios.payableDays,
    days(balance.payables, income.revenue),
    (value) => {
      ratios.payableDays = value;
    },
  );
  assign(
    "cash_conversion_cycle",
    ratios.cashConversionCycle,
    ratios.receivableDays !== null &&
      ratios.inventoryDays !== null &&
      ratios.payableDays !== null
      ? finite(ratios.receivableDays + ratios.inventoryDays - ratios.payableDays)
      : null,
    (value) => {
      ratios.cashConversionCycle = value;
    },
  );
  assign(
    "cfo_to_pat",
    ratios.cfoToPat,
    ratio(cash.operatingCashFlow, income.netProfit),
    (value) => {
      ratios.cfoToPat = value;
    },
  );
  assign(
    "fcf_to_pat",
    ratios.fcfToPat,
    ratio(cash.freeCashFlow, income.netProfit),
    (value) => {
      ratios.fcfToPat = value;
    },
  );
  assign(
    "debt_to_ebitda",
    ratios.debtToEbitda,
    ratio(balance.totalDebt, income.ebitda),
    (value) => {
      ratios.debtToEbitda = value;
    },
  );
  assign(
    "net_debt_to_ebitda",
    ratios.netDebtToEbitda,
    ratio(balance.netDebt, income.ebitda),
    (value) => {
      ratios.netDebtToEbitda = value;
    },
  );
  assign(
    "cfo_to_interest",
    ratios.cfoToInterest,
    ratio(cash.operatingCashFlow, income.interestExpense),
    (value) => {
      ratios.cfoToInterest = value;
    },
  );

  return {
    period: {
      ...period,
      incomeStatement: income,
      balanceSheet: balance,
      cashFlow: cash,
      ratios,
    },
    calculated,
  };
}

export function enrichPeriodsWithDerived(periods: PeriodFinancialData[]): {
  periods: PeriodFinancialData[];
  calculated: FinancialObservation[];
} {
  const calculated: FinancialObservation[] = [];
  const enriched = periods.map((period) => {
    const result = enrichPeriodWithDerived(period);
    calculated.push(...result.calculated);
    return result.period;
  });
  return { periods: enriched, calculated };
}
