import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RoleBottomNav } from "@/components/layout/RoleBottomNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    const userCount = await db.user.count();
    if (userCount === 0) {
      redirect("/setup");
    }
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      {/* Mobile Shell Frame - 100% Smartphone Dimension */}
      <div className="w-full max-w-md bg-background min-h-screen flex flex-col shadow-2xl relative pb-20">
        <MobileHeader
          userName={user.name}
          userRoles={user.roleCodes}
        />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </main>
        <RoleBottomNav userRoles={user.roleCodes} />
      </div>
    </div>
  );
}
