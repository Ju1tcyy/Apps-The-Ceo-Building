import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AttendanceClient } from "./AttendanceClient";
import { EmptyState } from "@/components/ui/EmptyState";
import { MapPin } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [locations, activeAttendance] = await Promise.all([
    db.location.findMany({
      where: { isActive: true },
      orderBy: { areaType: "asc" },
    }),
    db.attendanceRecord.findFirst({
      where: {
        engineerUserId: user.id,
        clockOutAt: null,
      },
      include: { clockInLocation: true },
      orderBy: { clockInAt: "desc" },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-appText">
          {activeAttendance ? "Clock Out Kehadiran" : "Clock In Kehadiran (Area CEO)"}
        </h2>
        <p className="text-xs text-appText-muted">
          Ambil foto selfie langsung dan verifikasi lokasi fisik Anda
        </p>
      </div>

      {locations.length === 0 ? (
        <EmptyState
          title="Lokasi Belum Terdaftar"
          description="Supervisor (SPV) atau Manager perlu menambahkan titik lokasi fisik gedung (Area CEO) di Master Data sebelum absensi dapat dilakukan."
          icon={MapPin}
          action={
            user.roleCodes.includes("spv") || user.roleCodes.includes("manager")
              ? { label: "Buka Master Data", href: "/settings?tab=locations" }
              : undefined
          }
        />
      ) : (
        <AttendanceClient
          locations={locations}
          activeAttendance={
            activeAttendance
              ? {
                  id: activeAttendance.id,
                  clockInAt: activeAttendance.clockInAt.toISOString(),
                  locationName: activeAttendance.clockInLocation.name,
                }
              : null
          }
        />
      )}
    </div>
  );
}
