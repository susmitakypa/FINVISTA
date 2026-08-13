export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export type AnalysisOption = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "trending-up" | "building" | "chart" | "scale";
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", description: "Overview & uploads" },
  {
    label: "Short-Term Investment",
    href: "/short-term-investment",
    description: "Near-term opportunity analysis",
  },
  {
    label: "Long-Term Investment",
    href: "/long-term-investment",
    description: "Strategic hold evaluation",
  },
  {
    label: "Financial Forecast",
    href: "/financial-forecast",
    description: "Projected performance modeling",
  },
  {
    label: "Debt Sizing & DSCR",
    href: "/debt-sizing",
    description: "Leverage & coverage analysis",
  },
];

export const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: "short-term",
    title: "Short-Term Investment",
    description:
      "Evaluate near-term opportunities using Screener snapshots and latest financials.",
    href: "/short-term-investment",
    icon: "trending-up",
  },
  {
    id: "long-term",
    title: "Long-Term Investment",
    description:
      "Assess multi-year thesis potential from balance sheet and P&L fundamentals.",
    href: "/long-term-investment",
    icon: "building",
  },
  {
    id: "forecast",
    title: "Financial Forecast",
    description:
      "Model forward-looking scenarios once historical statements are uploaded.",
    href: "/financial-forecast",
    icon: "chart",
  },
  {
    id: "debt-sizing",
    title: "Debt Sizing & DSCR",
    description:
      "Explore leverage capacity and debt service coverage when data is available.",
    href: "/debt-sizing",
    icon: "scale",
  },
];
