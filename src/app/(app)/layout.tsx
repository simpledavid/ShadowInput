export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { getSessionUserFromCookies } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUserFromCookies();

  if (!user) redirect("/login");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      <TopNav user={user as any} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
