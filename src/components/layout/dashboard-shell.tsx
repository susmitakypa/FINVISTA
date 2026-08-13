import { Sidebar } from "./sidebar";
import { Header } from "./header";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-[#060912]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.08)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.06)_0%,_transparent_50%)]" />
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
