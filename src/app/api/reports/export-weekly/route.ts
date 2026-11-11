import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canExportWeeklyReport } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatWIB } from "@/lib/date";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Strict RBAC enforcement: SPV is the ONLY role authorized to export weekly report
  if (!canExportWeeklyReport(user.roleCodes)) {
    return new NextResponse("Forbidden: Hanya SPV yang berwenang mengekspor Weekly Report.", {
      status: 403,
    });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const toDate = toParam ? new Date(toParam) : new Date();
  const fromDate = fromParam
    ? new Date(fromParam)
    : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch real tickets from database
  const tickets = await db.ticket.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      location: true,
      unit: true,
      assignedEngineer: true,
      consumables: {
        include: { item: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build CSV content
  const headers = [
    "NO",
    "NOMOR TIKET",
    "TANGGAL",
    "PEKERJAAN",
    "LOKASI",
    "PIC TEKNISI",
    "STATUS",
    "DURASI SELESAI",
    "BARANG TERPAKAI",
  ];

  const rows = tickets.map((t, idx) => {
    let durasiStr = "—";
    if (t.doneAt && t.startedAt) {
      const diffMin = Math.round((t.doneAt.getTime() - t.startedAt.getTime()) / (1000 * 60));
      durasiStr = `${diffMin} menit`;
    }

    const materialStr =
      t.consumables.length > 0
        ? t.consumables.map((c) => `${c.item.name} (${c.quantityUsed} ${c.item.unitOfMeasure})`).join("; ")
        : "Tidak ada material";

    return [
      idx + 1,
      `"${t.ticketNumber}"`,
      `"${formatWIB(t.createdAt)}"`,
      `"${t.category}: ${t.description.replace(/"/g, '""')}"`,
      `"${t.unit ? t.unit.unitCode : t.location.name} (${t.location.floor})"`,
      `"${t.assignedEngineer?.name || 'Belum Ditugaskan'}"`,
      `"${t.status}"`,
      `"${durasiStr}"`,
      `"${materialStr}"`,
    ].join(",");
  });

  const csvString = [headers.join(","), ...rows].join("\r\n");

  // Save weekly report record
  const reportRecord = await db.weeklyReport.create({
    data: {
      periodStart: fromDate,
      periodEnd: toDate,
      generatedBy: user.id,
      exportStatus: "EXPORTED",
    },
  });

  // Record audit trail for export
  await logAudit({
    actorUserId: user.id,
    actorRole: "spv",
    action: "WEEKLY_REPORT_EXPORT",
    module: "report",
    entityType: "weekly_report",
    entityId: reportRecord.id,
    afterJson: {
      exportedRows: tickets.length,
      periodStart: fromDate.toISOString(),
      periodEnd: toDate.toISOString(),
      format: "CSV",
    },
    source: "human",
  });

  const filename = `The_CEO_Weekly_Report_${fromDate.toISOString().slice(0, 10)}_sd_${toDate.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
