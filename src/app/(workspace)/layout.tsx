import { WorkspaceProvider } from "@/components/workspace-provider";
import { AppShell } from "@/components/app-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
