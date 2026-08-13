import type { QualitativeInsights } from "@/lib/financial-data-types";
import { createEmptyQualitative } from "@/lib/financial-data-types";

function captureSection(text: string, headings: RegExp[]): string | null {
  const normalized = text.replace(/\r/g, "\n");
  for (const heading of headings) {
    const match = normalized.match(heading);
    if (!match || match.index === undefined) continue;
    const from = match.index + match[0].length;
    const slice = normalized.slice(from, from + 600).trim();
    const cleaned = slice
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(" ");
    if (cleaned.length >= 20) return cleaned.slice(0, 400);
  }
  return null;
}

export function parseQualitativeText(text: string): QualitativeInsights {
  const insights = createEmptyQualitative();
  if (!text || text.trim().length < 20) return insights;

  insights.managementGuidance = captureSection(text, [
    /management guidance[:\s]/i,
    /outlook[:\s]/i,
    /guidance[:\s]/i,
  ]);
  insights.businessOutlook = captureSection(text, [
    /business outlook[:\s]/i,
    /industry outlook[:\s]/i,
    /market outlook[:\s]/i,
  ]);
  insights.growthDrivers = captureSection(text, [
    /growth drivers[:\s]/i,
    /key drivers[:\s]/i,
    /growth strategy[:\s]/i,
  ]);
  insights.risks = captureSection(text, [
    /key risks[:\s]/i,
    /risk factors[:\s]/i,
    /principal risks[:\s]/i,
  ]);
  insights.capexPlans = captureSection(text, [
    /capex plan[:\s]/i,
    /capital expenditure[:\s]/i,
    /capital allocation[:\s]/i,
  ]);
  insights.expansionPlans = captureSection(text, [
    /expansion plan[:\s]/i,
    /capacity expansion[:\s]/i,
    /new capacity[:\s]/i,
  ]);

  return insights;
}

export function mergeQualitative(
  existing: QualitativeInsights,
  incoming: QualitativeInsights,
  preferIncoming: boolean,
): QualitativeInsights {
  const merged = { ...existing };
  for (const key of Object.keys(incoming) as Array<keyof QualitativeInsights>) {
    if (!incoming[key]) continue;
    if (!merged[key] || preferIncoming) merged[key] = incoming[key];
  }
  return merged;
}
