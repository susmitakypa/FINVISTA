import type {
  DebtFacility,
  DocumentCoverage,
  FinancialValue,
  NormalizedFinancialData,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import { countExtractedFields, createEmptyDocumentCoverage } from "@/lib/financial-data-types";
import { DOCUMENT_SOURCE_LABELS } from "@/lib/upload-types";

export type TargetDscr = 1.25 | 1.5 | 1.75 | 2;
export type StressDeclinePct = 0 | 10 | 20 | 30;

export type DebtSizingOptions = {
  targetDscr: TargetDscr;
  stressDeclinePct: StressDeclinePct;
  assumedInterestRatePct: FinancialValue;
  assumedTenorYears: FinancialValue;
  assumedPrincipal: FinancialValue;
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
};

export type DscrBand =
  | "Strong debt-service capacity"
  | "Healthy"
  | "Adequate / monitor"
  | "Debt-service shortfall"
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
  cads: CreditMetric;
  interest: CreditMetric;
  principal: CreditMetric;
  debtService: CreditMetric;
  cashInterestCover: CreditMetric;
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

const UNAVAILABLE = "Data unavailable";

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
  return unit ? `${formatted}${unit}` : formatted;
}

function metric(options: {
  label: string;
  value: FinancialValue;
  unit?: string;
  source: string;
  methodology: string;
  requiredHint?: string;
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
  };
}

function periodLabel(period: PeriodFinancialData | null): string | null {
  if (!period) return null;
  return period.period ?? (period.year ? `FY${period.year}` : null);
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
  const others = periods
    .filter((period) => period !== latest && countExtractedFields(period) > 0)
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
  if (dscr > 1.5) return "Strong debt-service capacity";
  if (dscr >= 1.25) return "Healthy";
  if (dscr >= 1) return "Adequate / monitor";
  return "Debt-service shortfall";
}

function annuityPrincipal(payment: FinancialValue, ratePct: FinancialValue, years: FinancialValue): FinancialValue {
  if (payment === null) return null;
  if (ratePct === null || ratePct <= 0) return null;
  const rate = ratePct / 100;
  if (years !== null && years > 0) {
    const factor = (1 - (1 + rate) ** -years) / rate;
    return finite(payment * factor);
  }
  return finite(payment / rate);
}

export const DEFAULT_DEBT_OPTIONS: DebtSizingOptions = {
  targetDscr: 1.5,
  stressDeclinePct: 0,
  assumedInterestRatePct: null,
  assumedTenorYears: null,
  assumedPrincipal: null,
};

export function analyzeDebtSizing(
  data: NormalizedFinancialData | null,
  options: DebtSizingOptions = DEFAULT_DEBT_OPTIONS,
): DebtSizingAnalysis | null {
  if (!data) return null;

  const latest = selectLatest(data.periods ?? []);
  const prior = selectPrior(data.periods ?? [], latest);
  const coverage = data.documentCoverage ?? createEmptyDocumentCoverage();
  const period = periodLabel(latest);
  const sourceFiles = (data.sourceFiles ?? [])
    .filter((file) => file.status !== "failed")
    .map((file) => DOCUMENT_SOURCE_LABELS[file.category] ?? file.category);
  const sourceSummary =
    sourceFiles.length > 0
      ? Array.from(new Set(sourceFiles)).join(", ")
      : "Uploaded documents";
  const periodSource = period ? `${sourceSummary} · ${period}` : sourceSummary;
  const facilities = data.debtFacilities ?? [];

  const revenue = latest?.incomeStatement.revenue ?? null;
  const ebitda = latest?.incomeStatement.ebitda ?? null;
  const ebit = latest?.incomeStatement.ebit ?? null;
  const pbt = latest?.incomeStatement.profitBeforeTax ?? null;
  const extractedInterest = latest?.incomeStatement.interestExpense ?? null;
  const impliedInterest =
    ebit !== null && pbt !== null && ebit > pbt ? finite(ebit - pbt) : null;
  const facilityInterest = sum(facilities.map((item) => item.annualInterest));
  let interest: FinancialValue = extractedInterest;
  let interestSource = periodSource;
  let interestMethod = "Extracted finance cost / interest expense";
  if (interest === null && impliedInterest !== null) {
    interest = impliedInterest;
    interestMethod = "Implied interest = EBIT − PBT (P&L)";
  }
  if (interest === null && facilityInterest !== null) {
    interest = facilityInterest;
    interestMethod = "Sum of extracted facility annual interest";
  }

  const extractedPrincipal = latest?.cashFlow.principalRepayment ?? null;
  const facilityPrincipal = sum(facilities.map((item) => item.annualPrincipal));
  let principal: FinancialValue = extractedPrincipal ?? facilityPrincipal;
  let principalMethod = extractedPrincipal !== null
    ? "Extracted repayment of borrowings / principal"
    : facilityPrincipal !== null
      ? "Sum of facility annual principal"
      : "Not extracted";
  let principalSource = periodSource;
  if (principal === null && options.assumedPrincipal !== null) {
    principal = options.assumedPrincipal;
    principalMethod = "Assumption: user-entered annual principal repayment";
    principalSource = "Assumption";
  }

  const cfo = latest?.cashFlow.operatingCashFlow ?? null;
  const cashTaxes = latest?.cashFlow.cashTaxes ?? null;
  const maintenanceCapex = latest?.cashFlow.maintenanceCapex ?? null;
  let cads: FinancialValue = null;
  let cadsMethod = "Not available";
  if (cfo !== null) {
    cads = cfo;
    cadsMethod = "Operating cash flow (CFO)";
  } else if (
    ebitda !== null &&
    cashTaxes !== null &&
    maintenanceCapex !== null
  ) {
    cads = finite(ebitda - cashTaxes - maintenanceCapex);
    cadsMethod = "EBITDA − cash taxes − maintenance capex";
  }

  const debtService =
    interest !== null && principal !== null
      ? finite(interest + principal)
      : null;
  const dscr = divide(cads, debtService);
  const cashInterestCover = divide(cads, interest);

  const equity = latest?.balanceSheet.totalEquity ?? null;
  const cash = latest?.balanceSheet.cash ?? null;
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
  const netDebt =
    extractedNetDebt ??
    (totalDebt !== null && cash !== null ? finite(totalDebt - cash) : null);
  const extractedDe = latest?.ratios.debtToEquity ?? null;
  const debtEquity = extractedDe ?? divide(totalDebt, equity);
  const debtEbitda = divide(totalDebt, ebitda);
  const extractedCoverage = latest?.ratios.interestCoverage ?? null;
  const interestCoverage = extractedCoverage ?? divide(ebit, interest);
  const currentAssets = latest?.balanceSheet.currentAssets ?? null;
  const currentLiabilities = latest?.balanceSheet.currentLiabilities ?? null;
  const currentRatio = divide(currentAssets, currentLiabilities);
  const fcf = latest?.cashFlow.freeCashFlow ?? null;

  const facilityRate = (() => {
    const rates = facilities
      .map((item) => item.interestRatePct)
      .filter((value): value is number => value !== null && value > 0);
    if (rates.length === 0) return null;
    return rates.reduce((total, value) => total + value, 0) / rates.length;
  })();
  const rateForSizing = options.assumedInterestRatePct ?? facilityRate;
  const tenorForSizing = options.assumedTenorYears;

  const maxDebtService = divide(cads, options.targetDscr);
  const maxDebt = annuityPrincipal(maxDebtService, rateForSizing, tenorForSizing);
  const additionalCapacity =
    maxDebt !== null && totalDebt !== null ? finite(maxDebt - totalDebt) : null;

  const capacityAssumptions: string[] = [
    `Target DSCR = ${options.targetDscr.toFixed(2)}x`,
    cads !== null ? `CADS method: ${cadsMethod}` : "CADS unavailable",
  ];
  if (rateForSizing !== null) {
    capacityAssumptions.push(
      options.assumedInterestRatePct !== null
        ? `Interest rate assumption ${rateForSizing}%`
        : `Extracted average facility rate ${rateForSizing.toFixed(2)}%`,
    );
  } else {
    capacityAssumptions.push(
      "Maximum debt stock requires an interest rate (extracted or assumption).",
    );
  }
  if (tenorForSizing !== null) {
    capacityAssumptions.push(
      `Amortising tenor assumption ${tenorForSizing} years`,
    );
  } else if (rateForSizing !== null) {
    capacityAssumptions.push(
      "No tenor entered — debt stock estimated on an interest-only basis (PMT / rate).",
    );
  }

  const scenarioTargets: { key: CapacityScenario["key"]; label: string; targetDscr: TargetDscr }[] = [
    { key: "conservative", label: "Conservative", targetDscr: 1.75 },
    { key: "base", label: "Base", targetDscr: 1.5 },
    { key: "aggressive", label: "Aggressive", targetDscr: 1.25 },
  ];
  const scenarios: CapacityScenario[] = scenarioTargets.map((scenario) => {
    const service = divide(cads, scenario.targetDscr);
    const debt = annuityPrincipal(service, rateForSizing, tenorForSizing);
    return {
      ...scenario,
      maxDebtService: service,
      maxDebt: debt,
      existingDebt: totalDebt,
      additionalCapacity:
        debt !== null && totalDebt !== null ? finite(debt - totalDebt) : null,
      impliedDscr: service !== null ? scenario.targetDscr : null,
    };
  });

  const canStress = cads !== null && debtService !== null;
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

  const dscrMetric = metric({
    label: "DSCR",
    value: dscr,
    unit: "x",
    source: periodSource,
    methodology:
      dscr !== null
        ? `${cadsMethod} / (interest + principal)`
        : "DSCR = cash available for debt service / total debt service",
    requiredHint:
      "Required: CFO (or EBITDA, cash taxes and maintenance capex) and debt-service information (interest and principal).",
  });

  const headlineDebtEquity = metric({
    label: "Debt / Equity",
    value: debtEquity,
    unit: "x",
    source: periodSource,
    methodology: extractedDe !== null ? "Extracted D/E" : "Total debt / shareholders' equity",
    requiredHint: "Requires total debt and shareholders' equity.",
  });
  const headlineDebtEbitda = metric({
    label: "Debt / EBITDA",
    value: debtEbitda,
    unit: "x",
    source: periodSource,
    methodology: "Total debt / EBITDA",
    requiredHint: "Requires total debt and EBITDA.",
  });
  const headlineCoverage = metric({
    label: "Interest Coverage",
    value: interestCoverage,
    unit: "x",
    source: periodSource,
    methodology:
      extractedCoverage !== null ? "Extracted interest coverage" : "EBIT / interest expense",
    requiredHint: "Requires EBIT and interest expense.",
  });

  const position: CreditMetric[] = [
    metric({
      label: "Total Debt",
      value: totalDebt,
      source: periodSource,
      methodology: "Extracted total debt / borrowings, or ST + LT debt, or facility sum",
      requiredHint: "Requires balance-sheet debt or a debt schedule.",
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
    metric({
      label: "Cash",
      value: cash,
      source: periodSource,
      methodology: "Extracted cash and cash equivalents",
      requiredHint: "Requires cash on the balance sheet.",
    }),
    metric({
      label: "Net Debt",
      value: netDebt,
      source: periodSource,
      methodology: extractedNetDebt !== null ? "Extracted net debt" : "Total debt − cash",
      requiredHint: "Requires total debt and cash.",
    }),
    headlineDebtEquity,
    headlineDebtEbitda,
    metric({
      label: "Interest Expense",
      value: interest,
      source: interestSource,
      methodology: interestMethod,
      requiredHint: "Requires finance cost, or EBIT and PBT, or facility interest.",
    }),
    headlineCoverage,
    metric({
      label: "Revenue",
      value: revenue,
      source: periodSource,
      methodology: "Extracted revenue",
      requiredHint: "Requires P&L revenue.",
    }),
    metric({
      label: "EBITDA",
      value: ebitda,
      source: periodSource,
      methodology: "Extracted EBITDA",
      requiredHint: "Requires EBITDA.",
    }),
    metric({
      label: "EBIT",
      value: ebit,
      source: periodSource,
      methodology: "Extracted EBIT / operating profit",
      requiredHint: "Requires EBIT.",
    }),
    metric({
      label: "Operating Cash Flow",
      value: cfo,
      source: periodSource,
      methodology: "Extracted CFO",
      requiredHint: "Requires cash-flow statement.",
    }),
    metric({
      label: "Free Cash Flow",
      value: fcf,
      source: periodSource,
      methodology: "Extracted FCF",
      requiredHint: "Requires free cash flow or CFO and capex.",
    }),
  ];

  const cadsMetric = metric({
    label: "Cash Available for Debt Service",
    value: cads,
    source: periodSource,
    methodology: cadsMethod,
    requiredHint:
      "Required: operating cash flow, or EBITDA plus cash taxes and maintenance capex. EBITDA alone is not used as CADS.",
  });
  const interestMetric = metric({
    label: "Interest",
    value: interest,
    source: interestSource,
    methodology: interestMethod,
    requiredHint: "Requires interest / finance cost.",
  });
  const principalMetric = metric({
    label: "Principal repayment",
    value: principal,
    source: principalSource,
    methodology: principalMethod,
    requiredHint:
      "Requires extracted principal repayment or a user assumption. Not invented.",
  });
  const debtServiceMetric = metric({
    label: "Total Debt Service",
    value: debtService,
    source: periodSource,
    methodology: "Interest + principal repayment",
    requiredHint: "Requires both interest and principal (extracted or assumed).",
  });
  const cashInterestMetric = metric({
    label: "Cash / Interest (not DSCR)",
    value: cashInterestCover,
    unit: "x",
    source: periodSource,
    methodology: "CADS / interest — shown only when principal is missing; this is not DSCR",
    requiredHint: "Requires CADS and interest.",
  });

  const scoreComponents: ScoreComponent[] = [];
  if (dscr !== null) {
    const points = dscr > 1.5 ? 20 : dscr >= 1.25 ? 16 : dscr >= 1 ? 10 : 3;
    scoreComponents.push({
      label: "DSCR",
      score: points,
      max: 20,
      detail: `DSCR ${dscr.toFixed(2)}x`,
    });
  } else {
    scoreComponents.push({
      label: "DSCR",
      score: null,
      max: 20,
      detail: "DSCR unavailable",
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
      `DSCR of ${dscr.toFixed(2)}x indicates ${dscrBand(dscr).toLowerCase()}`,
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
    dscrBand: dscrBand(dscr),
    cads: cadsMetric,
    interest: interestMetric,
    principal: principalMetric,
    debtService: debtServiceMetric,
    cashInterestCover: cashInterestMetric,
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
        label: "Maximum Sustainable Debt",
        value: maxDebt,
        source: rateForSizing !== null && options.assumedInterestRatePct !== null
          ? "Assumption"
          : periodSource,
        methodology:
          tenorForSizing !== null
            ? "Annuity: (CADS / target DSCR) × amortisation factor"
            : "Interest-only: (CADS / target DSCR) / interest rate",
        requiredHint:
          "Requires CADS plus an interest rate (extracted or assumption).",
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
        source: periodSource,
        methodology: "CADS / target DSCR",
        requiredHint: "Requires cash available for debt service.",
      }),
      targetDscr: options.targetDscr,
      assumptionsUsed: capacityAssumptions,
    },
    scenarios,
    stress: {
      available: canStress,
      unavailableReason: canStress
        ? null
        : "Stress test unavailable — insufficient cash-flow/debt-service data.",
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
