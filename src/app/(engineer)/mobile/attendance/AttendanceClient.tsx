"use client";

import React, { useState } from "react";
import { LiveAttendanceCamera } from "@/components/camera/LiveAttendanceCamera";
import { submitClockIn, submitClockOut } from "./actions";
import { formatWIB } from "@/lib/date";
import { CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AttendanceClientProps {
  locations: Array<{ id: string; name: string; floor: string; areaType: string }>;
  activeAttendance: {
    id: string;
    clockInAt: string;
    locationName: string;
  } | null;
}

export function AttendanceClient({ locations, activeAttendance }: AttendanceClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCapture = async (data: {
    photoData: string;
    locationId: string;
    consentGiven: boolean;
  }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (activeAttendance) {
        // Clock Out
        const res = await submitClockOut({
          attendanceId: activeAttendance.id,
          photoData: data.photoData,
          locationId: data.locationId,
        });
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("Clock Out berhasil dicatat. Terima kasih atas dedikasi Anda!");
          setTimeout(() => router.push("/mobile/home"), 2000);
        }
      } else {
        // Clock In
        const res = await submitClockIn({
          photoData: data.photoData,
          locationId: data.locationId,
          consentGiven: data.consentGiven,
        });
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("Clock In berhasil diverifikasi di Area CEO! Anda siap menerima tiket.");
          setTimeout(() => router.push("/mobile/home"), 2000);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan sistem saat memproses absensi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/mobile/home"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-appText-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Beranda Mobile</span>
      </Link>

      {/* Active Clock In Status Banner */}
      {activeAttendance && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-card text-xs text-emerald-900 flex items-center justify-between">
          <div>
            <p className="font-bold">Status: Sedang Bertugas (Clocked In)</p>
            <p className="text-[11px] text-emerald-800">
              Lokasi: {activeAttendance.locationName} &bull; Masuk: {formatWIB(activeAttendance.clockInAt)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-control text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-card text-xs text-emerald-900 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {!success && (
        <LiveAttendanceCamera
          locations={locations}
          onCapture={handleCapture}
          isClockOut={!!activeAttendance}
        />
      )}
    </div>
  );
}
