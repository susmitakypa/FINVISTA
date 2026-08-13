import type { DebtFacility } from "@/lib/financial-data-types";
import type { UploadCategory } from "@/lib/upload-types";
import { extractNumbersFromLine, normalizeText, parseFinancialNumber } from "./financial-parser";

const FACILITY_LINE =
  /(term loan|working capital|ncd|debenture|bond|external commercial|ecb|facility|bank loan|borrowings? from)/i;

export function parseDebtFacilities(
  text: string,
  source: UploadCategory,
): DebtFacility[] {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const facilities: DebtFacility[] = [];

  for (const line of lines) {
    if (!FACILITY_LINE.test(line) || line.length > 220) continue;

    const numbers = extractNumbersFromLine(line);
    const rateMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);
    const yearMatch = line.match(/\b(20\d{2})\b/);
    const outstanding =
      numbers.find((value) => Math.abs(value) > 1) ?? numbers[0] ?? null;
    const rate = rateMatch
      ? parseFinancialNumber(rateMatch[1] ?? "")
      : numbers.find((value) => value > 0 && value <= 25) ?? null;

    const nameMatch = line.match(
      /((?:term loan|working capital|ncd|debenture|bond|ecb|facility)[^0-9%]{0,40})/i,
    );

    if (outstanding === null && rate === null) continue;

    facilities.push({
      lender: null,
      facility: nameMatch?.[1]?.trim() ?? line.slice(0, 60),
      openingDebt: null,
      outstanding,
      interestRatePct: rate,
      maturity: yearMatch?.[1] ?? null,
      maturityYear: yearMatch?.[1] ? Number.parseInt(yearMatch[1], 10) : null,
      annualPrincipal: null,
      annualInterest:
        outstanding !== null && rate !== null ? (outstanding * rate) / 100 : null,
      source,
    });
  }

  return facilities.slice(0, 12);
}

export function mergeDebtFacilities(
  existing: DebtFacility[],
  incoming: DebtFacility[],
): DebtFacility[] {
  const merged = [...existing];
  for (const facility of incoming) {
    const key = `${facility.facility ?? ""}-${facility.outstanding ?? ""}-${facility.maturity ?? ""}`;
    const duplicate = merged.some(
      (item) =>
        `${item.facility ?? ""}-${item.outstanding ?? ""}-${item.maturity ?? ""}` ===
        key,
    );
    if (!duplicate) merged.push(facility);
  }
  return merged;
}
