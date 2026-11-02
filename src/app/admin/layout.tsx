import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  return (
    <>
      <AppHeader
        email={profile.email}
        nav={[
          { href: "/admin", label: "Carriers" },
          { href: "/admin/leads", label: "Leads" },
        ]}
      />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">{children}</main>
    </>
  );
}
