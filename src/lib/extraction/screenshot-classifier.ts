export type ScreenshotSection =
  | "profit-loss"
  | "quarterly"
  | "annual-results"
  | "balance-sheet"
  | "cash-flow"
  | "ratios"
  | "shareholding"
  | "working-capital"
  | "valuation"
  | "charts"
  | "other";

const SECTION_HINTS: { section: ScreenshotSection; pattern: RegExp }[] = [
  { section: "quarterly", pattern: /quarterly results/i },
  { section: "profit-loss", pattern: /profit\s*&\s*loss|profit and loss/i },
  { section: "annual-results", pattern: /annual results/i },
  { section: "balance-sheet", pattern: /balance sheet/i },
  { section: "cash-flow", pattern: /cash flows?/i },
  { section: "shareholding", pattern: /shareholding pattern/i },
  { section: "working-capital", pattern: /working capital/i },
  { section: "ratios", pattern: /\bratios\b/i },
  { section: "valuation", pattern: /\bvaluation\b|price to earning|pe ratio/i },
  { section: "charts", pattern: /\bchart\b|\bgraph\b|trend/i },
];

export function classifyScreenshotSection(text: string): ScreenshotSection {
  for (const hint of SECTION_HINTS) {
    if (hint.pattern.test(text)) return hint.section;
  }
  return "other";
}

export function isQuarterlySection(section: ScreenshotSection): boolean {
  return section === "quarterly";
}

export function isLikelyAnnualSection(section: ScreenshotSection): boolean {
  return (
    section === "profit-loss" ||
    section === "annual-results" ||
    section === "balance-sheet" ||
    section === "cash-flow"
  );
}
