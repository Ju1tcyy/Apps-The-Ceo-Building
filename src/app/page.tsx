import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    const userCount = await db.user.count();
    if (userCount === 0) {
      redirect("/setup");
    }
    redirect("/login");
  }

  if (
    user.roleCodes.includes("engineer") &&
    !user.roleCodes.includes("spv") &&
    !user.roleCodes.includes("manager") &&
    !user.roleCodes.includes("direksi")
  ) {
    redirect("/mobile/home");
  }

  redirect("/dashboard");
}
