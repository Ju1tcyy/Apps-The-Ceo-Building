"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, CheckCircle2, AlertTriangle, RefreshCw, QrCode, ShieldCheck } from "lucide-react";

interface LocationOption {
  id: string;
  name: string;
  floor: string;
  areaType: string;
}

interface LiveAttendanceCameraProps {
  locations: LocationOption[];
  onCapture: (data: { photoData: string; locationId: string; consentGiven: boolean }) => void;
  isClockOut?: boolean;
}

export function LiveAttendanceCamera({
  locations,
  onCapture,
  isClockOut = false,
}: LiveAttendanceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Set default location to first CEO area
  useEffect(() => {
    const ceoArea = locations.find((l) => l.areaType === "ceo_area");
    if (ceoArea) {
      setSelectedLocationId(ceoArea.id);
    } else if (locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations]);

  // Start live video stream from camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError(
        "Kamera tidak dapat diakses atau izin ditolak. Harap izinkan akses kamera langsung."
      );
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
    }
  };

  const retakeSnapshot = () => {
    setCapturedPhoto(null);
    if (!stream) {
      startCamera();
    }
  };

  const handleSubmit = () => {
    if (!capturedPhoto || !selectedLocationId || !consentGiven) return;
    onCapture({
      photoData: capturedPhoto,
      locationId: selectedLocationId,
      consentGiven,
    });
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvas for snapshot rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video preview / Snapshot container */}
      <div className="relative aspect-[4/3] w-full max-w-sm mx-auto bg-slate-900 rounded-card overflow-hidden border-2 border-primary/20 shadow-md">
        {capturedPhoto ? (
          <img
            src={capturedPhoto}
            alt="Selfie Attendance"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Live indicator badge */}
        {!capturedPhoto && !cameraError && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] text-white font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kamera Langsung Aktif</span>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs font-semibold mb-1">Akses Kamera Diperlukan</p>
            <p className="text-[11px] text-slate-300 mb-4">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="px-3 py-1.5 bg-primary border border-white/20 text-white rounded-control text-xs flex items-center gap-1.5 hover:bg-primary-hover"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}
      </div>

      {/* Snapshot Action Buttons */}
      <div className="flex justify-center gap-3">
        {capturedPhoto ? (
          <button
            type="button"
            onClick={retakeSnapshot}
            className="px-4 py-2 border border-appBorder rounded-control text-xs font-semibold text-appText bg-white hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Foto Ulang</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={takeSnapshot}
            disabled={!!cameraError}
            className="px-5 py-2.5 bg-primary text-white rounded-control text-xs font-bold hover:bg-primary-hover shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-accent" />
            <span>Ambil Foto Langsung</span>
          </button>
        )}
      </div>

      {/* Location QR Verification Selector */}
      <div className="p-3.5 bg-slate-50 border border-appBorder rounded-control space-y-2">
        <label className="block text-xs font-bold text-appText flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-accent" />
          <span>Verifikasi QR Lokasi Keberadaan</span>
        </label>
        <p className="text-[11px] text-appText-muted">
          Pilih lokasi pemindaian QR code fisik area CEO gedung:
        </p>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-appBorder rounded-control bg-white font-medium"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.floor}) {loc.areaType === "ceo_area" ? "⭐ Area CEO" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* PDP Privacy Consent Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-control text-[11px] text-blue-900 space-y-1.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Foto kehadiran diambil langsung secara live dan disimpan privat maksimal <strong>30 hari</strong> (UU PDP) khusus untuk validasi SPV, setelahnya file foto otomatis dihapus.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer font-semibold pt-1">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="rounded border-blue-300 text-primary focus:ring-primary"
          />
          <span>Saya menyetujui pemrosesan data absensi</span>
        </label>
      </div>

      {/* Submit Button */}
      {capturedPhoto && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!consentGiven || !selectedLocationId}
          className="w-full py-3 bg-emerald-600 text-white rounded-control text-xs font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isClockOut ? "Konfirmasi Clock Out" : "Konfirmasi Clock In (Area CEO)"}</span>
        </button>
      )}
    </div>
  );
}
