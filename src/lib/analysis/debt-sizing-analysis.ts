import type {
  DebtFacility,
  DocumentCoverage,
  FinancialValue,
  NormalizedFinancialData,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import {
  comparablePeriods,
  countExtractedFields,
  createEmptyDocumentCoverage,
  inferPeriodType,
  periodIdentityKey,
} from "@/lib/financial-data-types";
import { enrichPeriodWithDerived } from "@/lib/analysis/derived-metrics";
import { mergePeriodRecords } from "@/lib/financial-period-merge";
import { DOCUMENT_SOURCE_LABELS } from "@/lib/upload-types";

export type TargetDscr = 1.25 | 1.5 | 1.75 | 2;
export type StressDeclinePct = 0 | 10 | 20 | 30;
export type CashFlowBasisChoice = "cfo" | "fcf";
export type InputOrigin = "EXTRACTED" | "CALCULATED" | "ASSUMED";

export const REPAYMENT_PRESETS = [5, 10, 15, 20] as const;
export const DEFAULT_REPAYMENT_PCT = 10;
export const DEFAULT_ASSUMED_INTEREST_RATE_PCT = 8;

export type DebtSizingOptions = {
  targetDscr: TargetDscr;
  stressDeclinePct: StressDeclinePct;
  assumedInterestRatePct: FinancialValue;
  assumedRepaymentPct: number;
  assumedPrincipalAmount: FinancialValue;
  cashFlowBasis: CashFlowBasisChoice;
  periodKey?: string | null;
};

export type CreditMetric = {
  label: string;
  value: FinancialValue;
  formatted: string;
  unit?: string;
  available: boolean;
  source: string;
  methodology: string;
  requiredHint?: string;
  validation?: "validated" | "discrepancy";
  validationNote?: string;
  origin?: InputOrigin;
  originLabel?: string;
};

export type CreditPeriodOption = {
  key: string;
  label: string;
};

export type DscrBand =
  | "Strong debt-servicing capacity"
  | "Comfortable debt-servicing capacity"
  | "Moderate debt-servicing capacity; monitor leverage"
  | "Weak debt-servicing cushion"
  | "Insufficient cash generation to cover assumed debt service"
  | "Unavailable";

export type CreditGrade =
  | "STRONG"
  | "HEALTHY"
  | "MODERATE"
  | "WEAK"
  | "INSUFFICIENT DATA";

export type LendingRisk =
  | "LOW RISK"
  | "MODERATE RISK"
  | "HIGH RISK"
  | "INSUFFICIENT DATA";

export type CapacityScenario = {
  key: "conservative" | "base" | "aggressive";
  label: string;
  targetDscr: TargetDscr;
  maxDebtService: FinancialValue;
  maxDebt: FinancialValue;
  existingDebt: FinancialValue;
  additionalCapacity: FinancialValue;
  impliedDscr: FinancialValue;
};

export type StressRow = {
  declinePct: StressDeclinePct;
  ebitda: FinancialValue;
  cads: FinancialValue;
  dscr: FinancialValue;
  surplus: FinancialValue;
  aboveOne: boolean | null;
  aboveTarget: boolean | null;
};

export type DscrSensitivityRow = {
  repaymentPct: number;
  assumedPrincipal: FinancialValue;
  assumedDebtService: FinancialValue;
  dscr: FinancialValue;
};

export type ModelAssumptions = {
  repaymentPct: number;
  principalIsCustomAmount: boolean;
  cashFlowBasis: CashFlowBasisChoice;
  cashFlowBasisNote: string | null;
  dscrLabel: string;
  interestRatePct: FinancialValue;
  interestRateOrigin: "extracted" | "implied" | "assumed";
  targetDscr: TargetDscr;
  inputs: CreditMetric[];
};

export type ScoreComponent = {
  label: string;
  score: number | null;
  max: number;
  detail: string;
};

export type DebtSizingAnalysis = {
  company: string | null;
  latestPeriodLabel: string | null;
  documentCoverage: DocumentCoverage;
  sourceSummary: string;
  position: CreditMetric[];
  headline: {
    dscr: CreditMetric;
    debtEquity: CreditMetric;
    debtEbitda: CreditMetric;
    interestCoverage: CreditMetric;
  };
  dscrBand: DscrBand;
  dscrInterpretation: string;
  dscrUnavailableReason: string | null;
  usesCfoProxy: boolean;
  leverage: CreditMetric[];
  coverageMetrics: CreditMetric[];
  cashFlowMetrics: CreditMetric[];
  cads: CreditMetric;
  interest: CreditMetric;
  principal: CreditMetric;
  debtService: CreditMetric;
  cashInterestCover: CreditMetric;
  fcfInterest: CreditMetric;
  model: ModelAssumptions;
  sensitivity: DscrSensitivityRow[];
  stressInterpretation: string | null;
  periodOptions: CreditPeriodOption[];
  selectedPeriodKey: string | null;
  facilities: DebtFacility[];
  capacity: {
    existingDebt: CreditMetric;
    maxSustainableDebt: CreditMetric;
    additionalCapacity: CreditMetric;
    maxSustainableDebtService: CreditMetric;
    targetDscr: TargetDscr;
    assumptionsUsed: string[];
  };
  scenarios: CapacityScenario[];
  stress: {
    available: boolean;
    unavailableReason: string | null;
    rows: StressRow[];
    selected: StressRow;
  };
  score: {
    value: number | null;
    grade: CreditGrade;
    components: ScoreComponent[];
    explanation: string;
  };
  lending: {
    risk: LendingRisk;
    explanation: string;
  };
  charts: {
    existingVsMax: { label: string; value: number }[];
    scenarioDscr: { label: string; value: number }[];
    stressDscr: { label: string; value: number }[];
    maturity: { label: string; value: number }[];
  };
  availableFields: string[];
  unavailableFields: string[];
};

const UNAVAILABLE = "Insufficient data";

function finite(value: number | null | undefined): FinancialValue {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function divide(numerator: FinancialValue, denominator: FinancialValue): FinancialValue {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return finite(numerator / denominator);
}

function formatNumber(value: FinancialValue, unit = ""): string {
  if (value === null) return UNAVAILABLE;
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (unit === "x") return `${formatted}x`;
  if (unit === "%") return `${formatted}%`;
  return `₹${formatted} Cr`;
}

function metric(options: {
  label: string;
  value: FinancialValue;
  unit?: string;
  source: string;
  methodology: string;
  requiredHint?: string;
  validation?: "validated" | "discrepancy";
  validationNote?: string;
  origin?: InputOrigin;
  originLabel?: string;
}): CreditMetric {
  return {
    label: options.label,
    value: options.value,
    formatted: formatNumber(options.value, options.unit),
    unit: options.unit,
    available: options.value !== null,
    source: options.source,
    methodology: options.methodology,
    requiredHint: options.requiredHint,
    validation: options.validation,
    validationNote: options.validationNote,
    origin: options.origin,
    originLabel: options.originLabel,
  };
}

function nearlyEqual(left: number, right: number): boolean {
  const scale = Math.max(Math.abs(left), Math.abs(right), 1);
  return Math.abs(left - right) / scale <= 0.08 || Math.abs(left - right) <= 0.15;
}

function compareExtracted(
  extracted: FinancialValue,
  calculated: FinancialValue,
): { validation?: "validated" | "discrepancy"; validationNote?: string } {
  if (extracted === null || calculated === null) return {};
  if (nearlyEqual(extracted, calculated)) {
    return {
      validation: "validated",
      validationNote: `✓ Calculation validated (source ${extracted.toFixed(2)} vs calculated ${calculated.toFixed(2)})`,
    };
  }
  return {
    validation: "discrepancy",
    validationNote: `Source/calculation discrepancy (source ${extracted.toFixed(2)} vs calculated ${calculated.toFixed(2)})`,
  };
}

function latestPeriodWith(
  periods: PeriodFinancialData[],
  selected: PeriodFinancialData | null,
  has: (period: PeriodFinancialData) => boolean,
): PeriodFinancialData | null {
  if (selected && has(selected)) return selected;
  const type =
    selected && inferPeriodType(selected) === "quarterly" ? "quarterly" : "annual";
  const pool = comparablePeriods(periods, type);
  return [...pool]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .find(has) ?? null;
}

function fcfFrom(cfo: FinancialValue, capex: FinancialValue): FinancialValue {
  if (cfo === null || capex === null) return null;
  return finite(cfo - Math.abs(capex));
}

function documentSource(coverage: DocumentCoverage): string {
  if (coverage.annualReport) return "Annual Report";
  if (coverage.screener) return "Screener";
  if (coverage.quarterlyResults) return "Quarterly results";
  return "Uploaded documents";
}

function periodLabel(period: PeriodFinancialData | null): string | null {
  if (!period) return null;
  if (period.period) return period.period;
  if (period.year !== null) {
    return inferPeriodType(period) === "quarterly"
      ? `Q FY${period.year}`
      : `FY${period.year}`;
  }
  return null;
}

export function listCreditPeriods(
  data: NormalizedFinancialData | null,
): CreditPeriodOption[] {
  if (!data) return [];
  const annual = comparablePeriods(data.periods ?? [], "annual");
  const pool =
    annual.length > 0
      ? annual
      : comparablePeriods(data.periods ?? [], "quarterly");
  const seen = new Set<string>();
  const options: CreditPeriodOption[] = [];
  for (const period of [...pool].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))) {
    const key = periodIdentityKey(period);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      key,
      label: periodLabel(period) ?? key,
    });
  }
  return options;
}

function selectMatchingPeriod(
  periods: PeriodFinancialData[],
  periodKey?: string | null,
): PeriodFinancialData | null {
  const annual = comparablePeriods(periods, "annual");
  const pool =
    annual.length > 0 ? annual : comparablePeriods(periods, "quarterly");
  if (pool.length === 0) return null;

  const latest = selectLatest(pool);
  const targetKey = periodKey || (latest ? periodIdentityKey(latest) : null);
  const matched = targetKey
    ? pool.filter((period) => periodIdentityKey(period) === targetKey)
    : pool.slice(0, 1);
  const base = matched[0] ?? latest;
  if (!base) return null;
  const merged = matched.slice(1).reduce(
    (current, period) => mergePeriodRecords(current, period),
    base,
  );
  return enrichPeriodWithDerived(merged).period;
}

function selectLatest(periods: PeriodFinancialData[]): PeriodFinancialData | null {
  const usable = periods.filter((period) => countExtractedFields(period) > 0);
  const pool = usable.length > 0 ? usable : periods;
  const dated = pool.filter((period) => period.year !== null);
  const ranked = (dated.length > 0 ? dated : pool).slice().sort((a, b) => {
    const yearDiff = (b.year ?? -1) - (a.year ?? -1);
    if (yearDiff !== 0) return yearDiff;
    return countExtractedFields(b) - countExtractedFields(a);
  });
  return ranked[0] ?? null;
}

function selectPrior(
  periods: PeriodFinancialData[],
  latest: PeriodFinancialData | null,
): PeriodFinancialData | null {
  if (!latest) return null;
  const latestKey = periodIdentityKey(latest);
  const others = periods
    .filter(
      (period) =>
        periodIdentityKey(period) !== latestKey &&
        countExtractedFields(period) > 0,
    )
    .sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
  return others[0] ?? null;
}

function sum(values: FinancialValue[]): FinancialValue {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0);
}

function dscrBand(dscr: FinancialValue): DscrBand {
  if (dscr === null) return "Unavailable";
  if (dscr >= 2) return "Strong debt-servicing capacity";
  if (dscr >= 1.5) return "Comfortable debt-servicing capacity";
  if (dscr >= 1.2) return "Moderate debt-servicing capacity; monitor leverage";
  if (dscr >= 1) return "Weak debt-servicing cushion";
  return "Insufficient cash generation to cover assumed debt service";
}

function indicativeDebtCapacity(
  maxDebtService: FinancialValue,
  repaymentPct: number,
  interestRatePct: FinancialValue,
): FinancialValue {
  if (maxDebtService === null || interestRatePct === null) return null;
  const factor = repaymentPct / 100 + interestRatePct / 100;
  if (!(factor > 0)) return null;
  return finite(maxDebtService / factor);
}

function describeStress(rows: StressRow[], targetDscr: number): string | null {
  const usable = rows.filter((row) => row.dscr !== null);
  if (usable.length === 0) return null;
  const base = usable.find((row) => row.declinePct === 0);
  if (base && base.dscr !== null && base.dscr < 1.25) {
    return "FINVISTA's modeled DSCR is already below 1.25x in the base case under the selected repayment assumption.";
  }
  const firstBelow125 = usable.find((row) => (row.dscr as number) < 1.25);
  const lastAbove125 = [...usable]
    .reverse()
    .find((row) => (row.dscr as number) >= 1.25);
  const firstBelowTarget = usable.find((row) => (row.dscr as number) < targetDscr);
  if (!firstBelow125) {
    if (firstBelowTarget && firstBelowTarget.declinePct > 0) {
      return `DSCR remains above 1.25x across the illustrated cash-flow stresses, but falls below the ${targetDscr.toFixed(2)}x target under a ${firstBelowTarget.declinePct}% stress.`;
    }
    return "FINVISTA's modeled DSCR remains above 1.25x across the 0–30% cash-flow stress cases under the selected repayment assumption.";
  }
  if (lastAbove125 && lastAbove125.declinePct < firstBelow125.declinePct) {
    const targetNote =
      firstBelowTarget && firstBelowTarget.declinePct !== firstBelow125.declinePct
        ? ` It falls below the ${targetDscr.toFixed(2)}x target under a ${firstBelowTarget.declinePct}% stress.`
        : firstBelowTarget
          ? ` It also falls below the ${targetDscr.toFixed(2)}x target at that stress.`
          : "";
    return `DSCR remains above 1.25x under a ${lastAbove125.declinePct}% cash-flow stress but falls below 1.25x under a ${firstBelow125.declinePct}% stress.${targetNote}`;
  }
  return `FINVISTA's modeled DSCR falls below 1.25x under a ${firstBelow125.declinePct}% cash-flow stress.`;
}

export const DEFAULT_DEBT_OPTIONS: DebtSizingOptions = {
  targetDscr: 1.5,
  stressDeclinePct: 0,
  assumedInterestRatePct: null,
  assumedRepaymentPct: DEFAULT_REPAYMENT_PCT,
  assumedPrincipalAmount: null,
  cashFlowBasis: "fcf",
  periodKey: null,
};

export function analyzeDebtSizing(
  data: NormalizedFinancialData | null,
  options: DebtSizingOptions = DEFAULT_DEBT_OPTIONS,
): DebtSizingAnalysis | null {
  if (!data) return null;

  const periodOptions = listCreditPeriods(data);
  const latest = selectMatchingPeriod(data.periods ?? [], options.periodKey);
  const priorType =
    latest && inferPeriodType(latest) === "quarterly" ? "quarterly" : "annual";
  const prior = selectPrior(
    comparablePeriods(data.periods ?? [], priorType),
    latest,
  );
  const coverage = data.documentCoverage ?? createEmptyDocumentCoverage();
  const period = periodLabel(latest);
  const extractedSource = documentSource(coverage);
  const calculatedSource = coverage.annualReport
    ? "Calculated from Annual Report"
    : "Calculated from Screener";
  const sourceFiles = (data.sourceFiles ?? [])
    .filter((file) => file.status !== "failed")
    .map((file) => DOCUMENT_SOURCE_LABELS[file.category] ?? file.category);
  const sourceSummary =
    sourceFiles.length > 0
      ? Array.from(new Set(sourceFiles)).join(", ")
      : extractedSource;
  const periodSource = period ? `${extractedSource} · ${period}` : extractedSource;
  const facilities = data.debtFacilities ?? [];

  const revenue = latest?.incomeStatement.revenue ?? null;
  let ebitda = latest?.incomeStatement.ebitda ?? null;
  const ebit = latest?.incomeStatement.ebit ?? null;
  const depreciation = latest?.incomeStatement.depreciation ?? null;
  if (ebitda === null && ebit !== null && depreciation !== null) {
    ebitda = finite(ebit + Math.abs(depreciation));
  }
  const pbt = latest?.incomeStatement.profitBeforeTax ?? null;
  const pat = latest?.incomeStatement.netProfit ?? null;
  const extractedInterest = latest?.incomeStatement.interestExpense ?? null;
  const impliedInterest =
    ebit !== null && pbt !== null && ebit > pbt ? finite(ebit - pbt) : null;
  const facilityInterest = sum(facilities.map((item) => item.annualInterest));
  let interest: FinancialValue = extractedInterest;
  let interestSource = periodSource;
  let interestMethod = "Extracted finance cost / interest expense";
  if (interest === null && impliedInterest !== null) {
    interest = impliedInterest;
    interestSource = calculatedSource;
    interestMethod = "EBIT − PBT";
  }
  if (interest === null && facilityInterest !== null) {
    interest = facilityInterest;
    interestSource = "Extracted debt schedule";
    interestMethod = "Sum of extracted facility annual interest";
  }

  const cashPeriod = latestPeriodWith(
    data.periods ?? [],
    latest,
    (period) =>
      period.cashFlow.operatingCashFlow !== null ||
      period.cashFlow.capitalExpenditure !== null ||
      period.cashFlow.freeCashFlow !== null,
  );
  const cfo = cashPeriod?.cashFlow.operatingCashFlow ?? null;
  const capexRaw = cashPeriod?.cashFlow.capitalExpenditure ?? null;
  const capex = capexRaw !== null ? Math.abs(capexRaw) : null;
  const extractedFcf = cashPeriod?.cashFlow.freeCashFlow ?? null;
  const calculatedFcf = fcfFrom(cfo, capex);
  const fcf = extractedFcf ?? calculatedFcf;
  const fcfCalculated = extractedFcf === null && calculatedFcf !== null;
  const investingCf = cashPeriod?.cashFlow.investingCashFlow ?? null;
  const financingCf = cashPeriod?.cashFlow.financingCashFlow ?? null;
  const cashPeriodInterest = cashPeriod?.incomeStatement.interestExpense ?? null;
  if (interest === null && cashPeriodInterest !== null) {
    interest = cashPeriodInterest;
    interestSource = cashPeriod?.period
      ? `${extractedSource} · ${cashPeriod.period}`
      : extractedSource;
    interestMethod = "Interest from the period that contains cash-flow data";
  }
  const cashSource = cashPeriod?.period
    ? `${extractedSource} · ${cashPeriod.period}`
    : periodSource;

  const repaymentPct =
    Number.isFinite(options.assumedRepaymentPct) && options.assumedRepaymentPct > 0
      ? options.assumedRepaymentPct
      : DEFAULT_REPAYMENT_PCT;
  const customPrincipal =
    options.assumedPrincipalAmount !== null && options.assumedPrincipalAmount > 0
      ? options.assumedPrincipalAmount
      : null;

  let cashFlowBasis: CashFlowBasisChoice = "fcf";
  let cashFlowBasisNote: string | null = null;
  let cads: FinancialValue = null;
  let cadsMethod = "Not available";
  let usesCfoProxy = false;
  const preferCfo = options.cashFlowBasis === "cfo" && cfo !== null;
  if (!preferCfo && fcf !== null) {
    cads = fcf;
    cashFlowBasis = "fcf";
    cadsMethod = fcfCalculated ? "Calculated FCF = CFO − Capex" : "Extracted free cash flow (FCF)";
  } else if (cfo !== null) {
    cads = cfo;
    cashFlowBasis = "cfo";
    usesCfoProxy = fcf === null;
    cashFlowBasisNote = usesCfoProxy
      ? "FCF unavailable — using CFO as cash available for debt service."
      : null;
    cadsMethod = usesCfoProxy
      ? "CFO proxy (FCF unavailable)"
      : "Operating cash flow (CFO)";
  } else if (fcf !== null) {
    cads = fcf;
    cashFlowBasis = "fcf";
    cadsMethod = fcfCalculated ? "Calculated FCF = CFO − Capex" : "Extracted free cash flow (FCF)";
  }

  const cfoInterest = divide(cfo, interest);
  const fcfInterest = divide(fcf, interest);

  const equity = latest?.balanceSheet.totalEquity ?? null;
  const cash = latest?.balanceSheet.cash ?? null;
  const totalAssets = latest?.balanceSheet.totalAssets ?? null;
  const extractedNetDebt = latest?.balanceSheet.netDebt ?? null;
  let totalDebt = latest?.balanceSheet.totalDebt ?? null;
  const shortTerm = latest?.balanceSheet.shortTermDebt ?? null;
  const longTerm = latest?.balanceSheet.longTermDebt ?? null;
  if (totalDebt === null && (shortTerm !== null || longTerm !== null)) {
    totalDebt = sum([shortTerm, longTerm]);
  }
  if (totalDebt === null) {
    const facilityDebt = sum(facilities.map((item) => item.outstanding));
    if (facilityDebt !== null) totalDebt = facilityDebt;
  }
  const calculatedNetDebt =
    totalDebt !== null && cash !== null ? finite(totalDebt - cash) : null;
  const netDebt = extractedNetDebt ?? calculatedNetDebt;
  const extractedDe = latest?.ratios.debtToEquity ?? null;
  const calculatedDe = divide(totalDebt, equity);
  const debtEquity = extractedDe ?? calculatedDe;
  const debtEbitda = divide(totalDebt, ebitda);
  const netDebtEbitda = divide(netDebt, ebitda);
  const debtAssets = divide(totalDebt, totalAssets);
  const extractedCoverage = latest?.ratios.interestCoverage ?? null;
  const calculatedCoverage = divide(ebit, interest);
  const interestCoverage = extractedCoverage ?? calculatedCoverage;
  const currentAssets = latest?.balanceSheet.currentAssets ?? null;
  const currentLiabilities = latest?.balanceSheet.currentLiabilities ?? null;
  const currentRatio = divide(currentAssets, currentLiabilities);
  const extractedOpm = latest?.ratios.operatingMargin ?? null;
  let operatingMargin: FinancialValue = extractedOpm;
  let opmMethod = "Extracted operating / EBITDA margin";
  if (operatingMargin === null && ebit !== null && revenue !== null && revenue !== 0) {
    operatingMargin = finite((ebit / revenue) * 100);
    opmMethod = "EBIT / revenue";
  } else if (
    operatingMargin === null &&
    ebitda !== null &&
    revenue !== null &&
    revenue !== 0
  ) {
    operatingMargin = finite((ebitda / revenue) * 100);
    opmMethod = "EBITDA / revenue";
  }
  const fcfMargin =
    fcf !== null && revenue !== null && revenue !== 0
      ? finite((fcf / revenue) * 100)
      : null;
  const cfoMargin =
    cfo !== null && revenue !== null && revenue !== 0
      ? finite((cfo / revenue) * 100)
      : null;
  const cfoToPat = divide(cfo, pat);
  const fcfToPat = divide(fcf, pat);

  const deCompare = compareExtracted(extractedDe, calculatedDe);
  const coverageCompare = compareExtracted(extractedCoverage, calculatedCoverage);
  const netDebtCompare = compareExtracted(extractedNetDebt, calculatedNetDebt);

  const facilityRate = (() => {
    const rates = facilities
      .map((item) => item.interestRatePct)
      .filter((value): value is number => value !== null && value > 0);
    if (rates.length === 0) return null;
    return rates.reduce((total, value) => total + value, 0) / rates.length;
  })();
  const impliedRate =
    interest !== null && totalDebt !== null && totalDebt !== 0
      ? finite((interest / totalDebt) * 100)
      : null;
  let interestRatePct: FinancialValue;
  let interestRateOrigin: ModelAssumptions["interestRateOrigin"];
  if (options.assumedInterestRatePct !== null) {
    interestRatePct = options.assumedInterestRatePct;
    interestRateOrigin = "assumed";
  } else if (facilityRate !== null) {
    interestRatePct = facilityRate;
    interestRateOrigin = "extracted";
  } else if (impliedRate !== null) {
    interestRatePct = impliedRate;
    interestRateOrigin = "implied";
  } else {
    interestRatePct = DEFAULT_ASSUMED_INTEREST_RATE_PCT;
    interestRateOrigin = "assumed";
  }

  const principal =
    customPrincipal !== null
      ? customPrincipal
      : totalDebt !== null
        ? finite(totalDebt * (repaymentPct / 100))
        : null;
  const principalIsCustomAmount = customPrincipal !== null;
  const repaymentPctForSizing =
    principalIsCustomAmount && totalDebt !== null && totalDebt !== 0 && principal !== null
      ? (principal / totalDebt) * 100
      : repaymentPct;
  const debtService =
    principal !== null && interest !== null ? finite(principal + interest) : null;
  const dscr = divide(cads, debtService);

  let dscrUnavailableReason: string | null = null;
  if (dscr === null) {
    if (cads === null) {
      dscrUnavailableReason =
        "DSCR cannot be calculated because CFO/FCF is unavailable.";
    } else if (totalDebt === null && customPrincipal === null) {
      dscrUnavailableReason =
        "Assumption-Based DSCR unavailable. Requires total debt.";
    } else if (interest === null) {
      dscrUnavailableReason =
        "Assumption-Based DSCR unavailable. Requires interest expense.";
    } else {
      dscrUnavailableReason = "Insufficient data.";
    }
  }

  const dscrLabel = usesCfoProxy
    ? "Assumption-Based DSCR — CFO proxy"
    : "Assumption-Based DSCR";
  const band = dscrBand(dscr);
  const dscrInterpretation =
    dscr === null
      ? (dscrUnavailableReason ?? "Insufficient data.")
      : `FINVISTA's modeled DSCR is ${dscr.toFixed(2)}x. ${band}.`;

  const canSize = cads !== null && interestRatePct !== null;
  const maxDebtService = canSize ? divide(cads, options.targetDscr) : null;
  const maxDebt = canSize
    ? indicativeDebtCapacity(maxDebtService, repaymentPctForSizing, interestRatePct)
    : null;
  const additionalCapacity =
    maxDebt !== null && totalDebt !== null ? finite(maxDebt - totalDebt) : null;

  const interestRateLabel =
    interestRateOrigin === "implied"
      ? `Implied interest rate ${interestRatePct?.toFixed(2)}% = interest expense / total debt (model input, not a stated borrowing rate)`
      : interestRateOrigin === "extracted"
        ? `Extracted facility interest rate ${interestRatePct?.toFixed(2)}% (not presented as the company's contractual borrowing rate unless disclosed)`
        : `Model assumption: ${interestRatePct}% interest rate (not the company's actual borrowing rate)`;

  const capacityAssumptions: string[] = [
    principalIsCustomAmount
      ? `Custom assumed principal repayment ${principal} (user-entered amount).`
      : `Model assumption: ${repaymentPct}% of outstanding debt repaid annually.`,
    `Cash-flow basis: ${cashFlowBasis.toUpperCase()}.`,
    interestRateLabel,
    `Target DSCR = ${options.targetDscr.toFixed(2)}x (user-selected assumption).`,
    "Analytical estimate based on model assumptions.",
  ];
  if (cashFlowBasisNote) capacityAssumptions.unshift(cashFlowBasisNote);
  if (totalDebt === null) {
    capacityAssumptions.push("Existing debt is unavailable; additional capacity cannot be compared to a current book.");
  }

  const scenarioTargets: { key: CapacityScenario["key"]; label: string; targetDscr: TargetDscr }[] = [
    { key: "conservative", label: "Conservative", targetDscr: 1.75 },
    { key: "base", label: "Base", targetDscr: 1.5 },
    { key: "aggressive", label: "Aggressive", targetDscr: 1.25 },
  ];
  const scenarios: CapacityScenario[] = scenarioTargets.map((scenario) => {
    const service = canSize ? divide(cads, scenario.targetDscr) : null;
    const debt = canSize
      ? indicativeDebtCapacity(service, repaymentPctForSizing, interestRatePct)
      : null;
    return {
      ...scenario,
      maxDebtService: service,
      maxDebt: debt,
      existingDebt: totalDebt,
      additionalCapacity:
        debt !== null && totalDebt !== null ? finite(debt - totalDebt) : null,
      impliedDscr: canSize ? scenario.targetDscr : null,
    };
  });

  const canStress = dscr !== null && cads !== null && debtService !== null;
  const stressDeclines: StressDeclinePct[] = [0, 10, 20, 30];
  const stressRows: StressRow[] = stressDeclines.map((declinePct) => {
    if (!canStress) {
      return {
        declinePct,
        ebitda: ebitda !== null ? finite(ebitda * (1 - declinePct / 100)) : null,
        cads: null,
        dscr: null,
        surplus: null,
        aboveOne: null,
        aboveTarget: null,
      };
    }
    const stressedCads =
      cads === null ? null : finite(cads * (1 - declinePct / 100));
    const stressedEbitda =
      ebitda !== null ? finite(ebitda * (1 - declinePct / 100)) : null;
    const stressedDscr = divide(stressedCads, debtService);
    return {
      declinePct,
      ebitda: stressedEbitda,
      cads: stressedCads,
      dscr: stressedDscr,
      surplus:
        stressedCads !== null && debtService !== null
          ? finite(stressedCads - debtService)
          : null,
      aboveOne: stressedDscr !== null ? stressedDscr >= 1 : null,
      aboveTarget: stressedDscr !== null ? stressedDscr >= options.targetDscr : null,
    };
  });
  const selectedStress =
    stressRows.find((row) => row.declinePct === options.stressDeclinePct) ??
    stressRows[0]!;
  const stressInterpretation = describeStress(stressRows, options.targetDscr);

  const sensitivity: DscrSensitivityRow[] = REPAYMENT_PRESETS.map((pct) => {
    const assumedPrincipal =
      totalDebt !== null ? finite(totalDebt * (pct / 100)) : null;
    const assumedDebtService =
      assumedPrincipal !== null && interest !== null
        ? finite(assumedPrincipal + interest)
        : null;
    return {
      repaymentPct: pct,
      assumedPrincipal,
      assumedDebtService,
      dscr: divide(cads, assumedDebtService),
    };
  });

  const dscrMetric = metric({
    label: dscrLabel,
    value: dscr,
    unit: "x",
    source: dscr !== null ? calculatedSource : periodSource,
    methodology: usesCfoProxy
      ? "CFO ÷ (interest + assumed principal repayment)"
      : "FCF ÷ (interest + assumed principal repayment)",
    requiredHint: dscrUnavailableReason ?? undefined,
    origin: dscr !== null ? "CALCULATED" : undefined,
  });

  const headlineDebtEquity = metric({
    label: "Debt / Equity",
    value: debtEquity,
    unit: "x",
    source: extractedDe !== null ? extractedSource : calculatedSource,
    methodology: "Total Debt / Shareholders' Equity",
    requiredHint: "Requires Total Debt and Shareholders' Equity.",
    origin: debtEquity !== null ? (extractedDe !== null ? "EXTRACTED" : "CALCULATED") : undefined,
    ...deCompare,
  });
  const headlineDebtEbitda = metric({
    label: "Debt / EBITDA",
    value: debtEbitda,
    unit: "x",
    source: calculatedSource,
    methodology: "Total Debt / EBITDA",
    requiredHint: "Requires Total Debt and EBITDA.",
    origin: debtEbitda !== null ? "CALCULATED" : undefined,
  });
  const headlineCoverage = metric({
    label: "Interest Coverage",
    value: interestCoverage,
    unit: "x",
    source: extractedCoverage !== null ? extractedSource : calculatedSource,
    methodology: "EBIT / Interest Expense",
    requiredHint: "Requires EBIT and Interest Expense.",
    origin: interestCoverage !== null ? (extractedCoverage !== null ? "EXTRACTED" : "CALCULATED") : undefined,
    ...coverageCompare,
  });

  const leverage: CreditMetric[] = [
    metric({
      label: "Total Debt",
      value: totalDebt,
      source: periodSource,
      methodology: "Extracted total debt / borrowings, or ST + LT debt",
      requiredHint: "Requires balance-sheet debt.",
      origin: totalDebt !== null ? "EXTRACTED" : undefined,
    }),
    metric({
      label: "Shareholders' Equity",
      value: equity,
      source: periodSource,
      methodology: "Extracted shareholders' funds / equity",
      requiredHint: "Requires shareholders' equity.",
    }),
    metric({
      label: "Cash & Cash Equivalents",
      value: cash,
      source: periodSource,
      methodology: "Extracted cash and cash equivalents",
      requiredHint: "Requires cash on the balance sheet.",
    }),
    metric({
      label: "Net Debt",
      value: netDebt,
      source: extractedNetDebt !== null ? extractedSource : calculatedSource,
      methodology: "Total Debt − Cash & Cash Equivalents",
      requiredHint: "Requires Total Debt and Cash.",
      origin: netDebt !== null ? (extractedNetDebt !== null ? "EXTRACTED" : "CALCULATED") : undefined,
      ...netDebtCompare,
    }),
    headlineDebtEquity,
    headlineDebtEbitda,
    metric({
      label: "Net Debt / EBITDA",
      value: netDebtEbitda,
      unit: "x",
      source: calculatedSource,
      methodology: "Net Debt / EBITDA",
      requiredHint: "Requires Net Debt and EBITDA.",
    }),
    metric({
      label: "Debt / Assets",
      value: debtAssets,
      unit: "x",
      source: calculatedSource,
      methodology: "Total Debt / Total Assets",
      requiredHint: "Requires Total Debt and Total Assets.",
    }),
    metric({
      label: "Short-Term Debt",
      value: shortTerm,
      source: periodSource,
      methodology: "Extracted short-term / current borrowings",
      requiredHint: "Requires short-term borrowings.",
    }),
    metric({
      label: "Long-Term Debt",
      value: longTerm,
      source: periodSource,
      methodology: "Extracted long-term borrowings",
      requiredHint: "Requires long-term borrowings.",
    }),
  ];

  const coverageMetrics: CreditMetric[] = [
    headlineCoverage,
    metric({
      label: "CFO / Interest",
      value: cfoInterest,
      unit: "x",
      source: calculatedSource,
      methodology: "CFO / Interest Expense",
      requiredHint: "Requires CFO and Interest Expense.",
      origin: cfoInterest !== null ? "CALCULATED" : undefined,
    }),
    metric({
      label: "FCF / Interest",
      value: fcfInterest,
      unit: "x",
      source: calculatedSource,
      methodology: "FCF / Interest Expense",
      requiredHint: "Requires FCF (or CFO and Capex) and Interest Expense.",
      origin: fcfInterest !== null ? "CALCULATED" : undefined,
    }),
  ];

  const cashFlowMetrics: CreditMetric[] = [
    metric({
      label: "CFO",
      value: cfo,
      source: cashSource,
      methodology: "Cash from Operating Activities",
      requiredHint: "Requires Cash Flow screenshot / statement.",
    }),
    metric({
      label: "Capex",
      value: capex,
      source: cashSource,
      methodology: "Capital expenditure",
      requiredHint: "Requires Capex.",
    }),
    metric({
      label: "CFI",
      value: investingCf,
      source: cashSource,
      methodology: "Cash from Investing Activities",
      requiredHint: "Requires investing cash flow.",
    }),
    metric({
      label: "CFF",
      value: financingCf,
      source: cashSource,
      methodology: "Cash from Financing Activities",
      requiredHint: "Requires financing cash flow.",
    }),
    metric({
      label: "FCF",
      value: fcf,
      source: fcfCalculated ? calculatedSource : periodSource,
      methodology: "CFO − Capex",
      requiredHint: "Requires CFO and Capex.",
    }),
    metric({
      label: "FCF Margin",
      value: fcfMargin,
      unit: "%",
      source: calculatedSource,
      methodology: "FCF / Revenue",
      requiredHint: "Requires FCF and Revenue.",
    }),
    metric({
      label: "CFO Margin",
      value: cfoMargin,
      unit: "%",
      source: calculatedSource,
      methodology: "CFO / Revenue",
      requiredHint: "Requires CFO and Revenue.",
    }),
    metric({
      label: "CFO / PAT",
      value: cfoToPat,
      unit: "x",
      source: calculatedSource,
      methodology: "CFO / PAT",
      requiredHint: "Requires CFO and PAT.",
    }),
    metric({
      label: "FCF / PAT",
      value: fcfToPat,
      unit: "x",
      source: calculatedSource,
      methodology: "FCF / PAT",
      requiredHint: "Requires FCF and PAT.",
    }),
    metric({
      label: "Revenue",
      value: revenue,
      source: periodSource,
      methodology: "Extracted revenue / sales",
      requiredHint: "Requires P&L revenue.",
    }),
    metric({
      label: "EBITDA",
      value: ebitda,
      source: periodSource,
      methodology:
        latest?.incomeStatement.ebitda !== null
          ? "Extracted EBITDA"
          : "EBIT + Depreciation",
      requiredHint: "Requires EBITDA, or EBIT and depreciation.",
    }),
    metric({
      label: "EBIT",
      value: ebit,
      source: periodSource,
      methodology: "Extracted EBIT / operating profit",
      requiredHint: "Requires EBIT.",
    }),
    metric({
      label: "Operating margin",
      value: operatingMargin,
      unit: "%",
      source: extractedOpm !== null ? extractedSource : calculatedSource,
      methodology: opmMethod,
      requiredHint: "Requires operating profit or EBITDA, and revenue.",
    }),
    metric({
      label: "Interest Expense",
      value: interest,
      source: interestSource,
      methodology: interestMethod,
      requiredHint: "Requires finance cost, or EBIT and PBT.",
    }),
  ];

  const position = [...leverage, ...coverageMetrics, ...cashFlowMetrics];

  const cadsMetric = metric({
    label: usesCfoProxy ? "Cash Available (CFO proxy)" : "Cash Available for Debt Service",
    value: cads,
    source: cashFlowBasis === "fcf"
      ? fcfCalculated
        ? "Calculated: CFO − Capex"
        : cashSource
      : cashSource,
    methodology: cadsMethod,
    requiredHint: "DSCR cannot be calculated because CFO/FCF is unavailable.",
    origin:
      cads === null
        ? undefined
        : cashFlowBasis === "fcf" && fcfCalculated
          ? "CALCULATED"
          : "EXTRACTED",
  });
  const interestMetric = metric({
    label: "Interest Expense",
    value: interest,
    source: interestSource,
    methodology: "Extracted from uploaded financial documents (Screener / statements)",
    requiredHint: "Requires interest / finance cost.",
    origin:
      interest !== null
        ? interestMethod.startsWith("Extracted")
          ? "EXTRACTED"
          : "CALCULATED"
        : undefined,
  });
  const principalMetric = metric({
    label: "Assumed Principal Repayment",
    value: principal,
    source: "User assumption",
    methodology: principalIsCustomAmount
      ? "Custom assumed annual principal repayment (user-entered amount)"
      : `Total debt × ${repaymentPct}% annual repayment assumption`,
    requiredHint: "Requires total debt or a custom principal amount.",
    origin: principal !== null ? "ASSUMED" : undefined,
    originLabel: principal !== null
      ? principalIsCustomAmount
        ? "ASSUMED — custom"
        : `ASSUMED — ${repaymentPct}%`
      : undefined,
  });
  const debtServiceMetric = metric({
    label: "Total Debt Service",
    value: debtService,
    source: calculatedSource,
    methodology: "Interest expense + assumed principal repayment",
    requiredHint: "Requires total debt (or custom principal) and interest expense.",
    origin: debtService !== null ? "CALCULATED" : undefined,
  });
  const cashInterestMetric = metric({
    label: "CFO / Interest",
    value: cfoInterest,
    unit: "x",
    source: calculatedSource,
    methodology: "CFO / Interest Expense — coverage indicator, not DSCR",
    requiredHint: "Requires CFO and Interest Expense.",
  });
  const fcfInterestMetric = metric({
    label: "FCF / Interest",
    value: fcfInterest,
    unit: "x",
    source: calculatedSource,
    methodology: "FCF / Interest Expense — coverage indicator, not DSCR",
    requiredHint: "Requires FCF (or CFO and Capex) and Interest Expense.",
  });

  const scoreComponents: ScoreComponent[] = [];
  if (dscr !== null) {
    const points = dscr > 1.5 ? 20 : dscr >= 1.25 ? 16 : dscr >= 1 ? 10 : 3;
    scoreComponents.push({
      label: "Assumption-Based DSCR",
      score: points,
      max: 20,
      detail: `Modeled DSCR ${dscr.toFixed(2)}x`,
    });
  } else if (cfoInterest !== null) {
    const points =
      cfoInterest >= 8 ? 20 : cfoInterest >= 4 ? 16 : cfoInterest >= 2 ? 10 : 4;
    scoreComponents.push({
      label: "CFO / Interest",
      score: points,
      max: 20,
      detail: `CFO/Interest ${cfoInterest.toFixed(2)}x (coverage indicator, not DSCR)`,
    });
  } else {
    scoreComponents.push({
      label: "Assumption-Based DSCR",
      score: null,
      max: 20,
      detail: dscrUnavailableReason ?? "Insufficient data",
    });
  }
  if (debtEquity !== null) {
    const points = debtEquity < 0.5 ? 20 : debtEquity < 1 ? 14 : debtEquity < 1.5 ? 8 : 3;
    scoreComponents.push({
      label: "Leverage",
      score: points,
      max: 20,
      detail: `Debt/equity ${debtEquity.toFixed(2)}x`,
    });
  } else {
    scoreComponents.push({
      label: "Leverage",
      score: null,
      max: 20,
      detail: "Debt/equity unavailable",
    });
  }
  if (interestCoverage !== null) {
    const points =
      interestCoverage >= 8 ? 15 : interestCoverage >= 4 ? 11 : interestCoverage >= 2 ? 7 : 3;
    scoreComponents.push({
      label: "Interest coverage",
      score: points,
      max: 15,
      detail: `${interestCoverage.toFixed(1)}x`,
    });
  } else {
    scoreComponents.push({
      label: "Interest coverage",
      score: null,
      max: 15,
      detail: "Unavailable",
    });
  }
  if (cfo !== null || fcf !== null) {
    const cashGen = fcf ?? cfo!;
    scoreComponents.push({
      label: "Cash generation",
      score: cashGen > 0 ? 15 : 4,
      max: 15,
      detail: fcf !== null ? `FCF ${formatNumber(fcf)}` : `CFO ${formatNumber(cfo)}`,
    });
  } else {
    scoreComponents.push({
      label: "Cash generation",
      score: null,
      max: 15,
      detail: "CFO/FCF unavailable",
    });
  }
  const priorDebt = prior?.balanceSheet.totalDebt ?? null;
  if (totalDebt !== null && priorDebt !== null) {
    const rising = totalDebt > priorDebt * 1.05;
    const falling = totalDebt < priorDebt * 0.95;
    scoreComponents.push({
      label: "Debt trend",
      score: falling ? 15 : rising ? 4 : 10,
      max: 15,
      detail: falling ? "Debt declined" : rising ? "Debt increased" : "Debt roughly stable",
    });
  } else {
    scoreComponents.push({
      label: "Debt trend",
      score: null,
      max: 15,
      detail: "Need debt in two periods",
    });
  }
  if (currentRatio !== null || cash !== null) {
    const points =
      currentRatio !== null
        ? currentRatio >= 1.5
          ? 15
          : currentRatio >= 1
            ? 10
            : 4
        : 8;
    scoreComponents.push({
      label: "Liquidity",
      score: points,
      max: 15,
      detail:
        currentRatio !== null
          ? `Current ratio ${currentRatio.toFixed(2)}x`
          : "Cash present; current ratio unavailable",
    });
  } else {
    scoreComponents.push({
      label: "Liquidity",
      score: null,
      max: 15,
      detail: "Need current ratio or cash",
    });
  }

  const scored = scoreComponents.filter((item) => item.score !== null);
  const overallScore =
    scored.length < 2
      ? null
      : Math.round(
          (scored.reduce((total, item) => total + (item.score ?? 0), 0) /
            scored.reduce((total, item) => total + item.max, 0)) *
            100,
        );
  const grade: CreditGrade =
    overallScore === null
      ? "INSUFFICIENT DATA"
      : overallScore >= 75
        ? "STRONG"
        : overallScore >= 60
          ? "HEALTHY"
          : overallScore >= 40
            ? "MODERATE"
            : "WEAK";

  const lendingRisk: LendingRisk =
    overallScore === null
      ? "INSUFFICIENT DATA"
      : dscr !== null && dscr < 1
        ? "HIGH RISK"
        : overallScore >= 70 && (dscr === null || dscr >= 1.25)
          ? "LOW RISK"
          : overallScore >= 45
            ? "MODERATE RISK"
            : "HIGH RISK";

  const explanationParts: string[] = [];
  if (dscr !== null) {
    explanationParts.push(
      `FINVISTA's modeled DSCR is ${dscr.toFixed(2)}x (${dscrBand(dscr)})`,
    );
  }
  if (debtEquity !== null) {
    explanationParts.push(
      `debt/equity of ${debtEquity.toFixed(2)}x ${
        debtEquity > 1.5 ? "indicates elevated leverage" : "indicates moderate leverage"
      }`,
    );
  }
  if (interestCoverage !== null) {
    explanationParts.push(`interest coverage is ${interestCoverage.toFixed(1)}x`);
  }
  if (cfoInterest !== null) {
    explanationParts.push(`CFO/Interest coverage is ${cfoInterest.toFixed(1)}x`);
  }
  if (fcfInterest !== null) {
    explanationParts.push(`FCF/Interest coverage is ${fcfInterest.toFixed(1)}x`);
  }
  if (dscr === null) {
    explanationParts.push(
      dscrUnavailableReason
        ? `assumption-based DSCR is unavailable (${dscrUnavailableReason.replace(/\.$/, "")})`
        : "assumption-based DSCR is unavailable",
    );
  }
  const lendingExplanation =
    explanationParts.length > 0
      ? `${explanationParts.join(", ")}.`
      : "Insufficient data for a complete credit assessment.";

  const availableFields = position
    .filter((item) => item.available)
    .map((item) => item.label);
  if (cads !== null) availableFields.push("Cash available for debt service");
  if (dscr !== null) availableFields.push("DSCR");
  if (principal !== null) availableFields.push("Principal repayment");
  const unavailableFields = [
    ...position.filter((item) => !item.available).map((item) => item.label),
    ...(cads === null ? ["Cash available for debt service"] : []),
    ...(dscr === null ? ["DSCR"] : []),
    ...(principal === null ? ["Principal repayment"] : []),
    ...(facilities.length === 0 ? ["Debt schedule / facilities"] : []),
  ];

  return {
    company: data.company,
    latestPeriodLabel: period,
    documentCoverage: coverage,
    sourceSummary,
    position,
    headline: {
      dscr: dscrMetric,
      debtEquity: headlineDebtEquity,
      debtEbitda: headlineDebtEbitda,
      interestCoverage: headlineCoverage,
    },
    dscrBand: band,
    dscrInterpretation,
    dscrUnavailableReason,
    usesCfoProxy,
    leverage,
    coverageMetrics,
    cashFlowMetrics,
    cads: cadsMetric,
    interest: interestMetric,
    principal: principalMetric,
    debtService: debtServiceMetric,
    cashInterestCover: cashInterestMetric,
    fcfInterest: fcfInterestMetric,
    model: {
      repaymentPct: repaymentPctForSizing,
      principalIsCustomAmount,
      cashFlowBasis,
      cashFlowBasisNote,
      dscrLabel,
      interestRatePct,
      interestRateOrigin,
      targetDscr: options.targetDscr,
      inputs: [
        metric({
          label: "FCF",
          value: fcf,
          source: fcfCalculated ? "Calculated: CFO − Capex" : cashSource,
          methodology: "Extracted FCF, or CFO − Capex",
          requiredHint: "Requires FCF, or CFO and Capex.",
          origin: fcf !== null ? (fcfCalculated ? "CALCULATED" : "EXTRACTED") : undefined,
        }),
        metric({
          label: "CFO",
          value: cfo,
          source: cashSource,
          methodology: "Cash from Operating Activities",
          requiredHint: "Requires Cash Flow statement.",
          origin: cfo !== null ? "EXTRACTED" : undefined,
        }),
        interestMetric,
        metric({
          label: "Total Debt",
          value: totalDebt,
          source: periodSource.includes("Screener")
            ? periodSource
            : "Screener / uploaded Balance Sheet",
          methodology: "Extracted total debt / borrowings",
          requiredHint: "Requires total debt.",
          origin: totalDebt !== null ? "EXTRACTED" : undefined,
        }),
        principalMetric,
        debtServiceMetric,
        dscrMetric,
      ],
    },
    sensitivity,
    stressInterpretation,
    periodOptions,
    selectedPeriodKey: latest ? periodIdentityKey(latest) : null,
    facilities,
    capacity: {
      existingDebt: metric({
        label: "Existing Debt",
        value: totalDebt,
        source: periodSource,
        methodology: "Extracted / aggregated outstanding debt",
        requiredHint: "Requires total debt.",
      }),
      maxSustainableDebt: metric({
        label: "Indicative Debt Capacity",
        value: maxDebt,
        source: "Analytical estimate",
        methodology:
          "Maximum sustainable debt service / (repayment % + interest rate)",
        requiredHint:
          "Requires cash available (CFO or FCF) and an interest-rate assumption.",
        origin: maxDebt !== null ? "CALCULATED" : undefined,
      }),
      additionalCapacity: metric({
        label: "Additional Debt Capacity",
        value: additionalCapacity,
        source: "Analytical estimate",
        methodology: "Maximum sustainable debt − existing debt",
        requiredHint: "Requires both existing debt and maximum sustainable debt.",
      }),
      maxSustainableDebtService: metric({
        label: "Maximum Sustainable Debt Service",
        value: maxDebtService,
        source: calculatedSource,
        methodology: "Cash available / target DSCR",
        requiredHint: "Requires CFO or FCF.",
        origin: maxDebtService !== null ? "CALCULATED" : undefined,
      }),
      targetDscr: options.targetDscr,
      assumptionsUsed: capacityAssumptions,
    },
    scenarios,
    stress: {
      available: canStress,
      unavailableReason: canStress
        ? null
        : "DSCR stress test requires cash available (CFO or FCF), total debt, and interest expense.",
      rows: stressRows,
      selected: selectedStress,
    },
    score: {
      value: overallScore,
      grade,
      components: scoreComponents,
      explanation:
        overallScore === null
          ? "Insufficient data for a complete credit assessment."
          : `Credit strength ${overallScore}/100 from ${scored.length} scored components.`,
    },
    lending: {
      risk: lendingRisk,
      explanation: lendingExplanation,
    },
    charts: {
      existingVsMax: [
        ...(totalDebt !== null ? [{ label: "Existing Debt", value: totalDebt }] : []),
        ...(maxDebt !== null
          ? [{ label: "Max Sustainable", value: maxDebt }]
          : []),
      ],
      scenarioDscr: scenarios
        .filter((scenario) => scenario.impliedDscr !== null)
        .map((scenario) => ({
          label: scenario.label,
          value: scenario.impliedDscr as number,
        })),
      stressDscr: canStress
        ? stressRows
            .filter((row) => row.dscr !== null)
            .map((row) => ({
              label: `${row.declinePct}%`,
              value: row.dscr as number,
            }))
        : [],
      maturity: (() => {
        const byYear = new Map<string, number>();
        for (const facility of facilities) {
          if (facility.outstanding === null) continue;
          const label = facility.maturityYear
            ? String(facility.maturityYear)
            : facility.maturity ?? "Unspecified";
          byYear.set(label, (byYear.get(label) ?? 0) + facility.outstanding);
        }
        return [...byYear.entries()].map(([label, value]) => ({ label, value }));
      })(),
    },
    availableFields: Array.from(new Set(availableFields)),
    unavailableFields: Array.from(new Set(unavailableFields)),
  };
}
