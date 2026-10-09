import { NovaRoleProvider } from "@/components/nova/nova-role-context";
import { NovaStoreProvider } from "@/lib/nova-store";
import { NovaThemeProvider } from "@/components/nova/nova-theme-context";
import NovaAppShell from "@/components/nova/nova-app-shell";

export const metadata = { title: "Nova HMS" };

export default function NovaLayout({ children }: { children: React.ReactNode }) {
  return (
    <NovaThemeProvider>
      <NovaRoleProvider>
        <NovaStoreProvider>
          <NovaAppShell>{children}</NovaAppShell>
        </NovaStoreProvider>
      </NovaRoleProvider>
    </NovaThemeProvider>
  );
}
