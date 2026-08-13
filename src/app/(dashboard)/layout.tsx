import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FinancialSessionProvider } from "@/context/financial-session-context";

export default function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <FinancialSessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </FinancialSessionProvider>
  );
}
