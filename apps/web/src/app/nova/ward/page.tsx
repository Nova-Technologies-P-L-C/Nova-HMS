"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";

const STATUS_COLOR: Record<string, string> = {
  occupied: "bg-orange-100 border-orange-300",
  available: "bg-emerald-50 border-emerald-300",
  maintenance: "bg-slate-100 border-slate-300",
  reserved: "bg-blue-50 border-blue-300",
};

export default function BedBoardPage() {
  const qc = useQueryClient();
  const { data: beds = [] } = useQuery(trpc.ward.beds.queryOptions());

  const updateStatus = useMutation(
    trpc.ward.updateBedStatus.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() }),
    })
  );

  const wards = [...new Set(beds.map((b) => b.ward))];
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const available = beds.filter((b) => b.status === "available").length;

  return (
    <PageShell title="Bed Occupancy Board">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Occupied" value={occupied} accent />
        <KpiCard label="Available" value={available} />
        <KpiCard label="Maintenance" value={beds.filter((b) => b.status === "maintenance").length} />
      </div>

      <div className="space-y-6">
        {wards.map((ward) => {
          const wardBeds = beds.filter((b) => b.ward === ward);
          return (
            <Card key={ward} className="p-5">
              <p className="font-semibold text-slate-800 mb-4">{ward}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {wardBeds.map((bed) => {
                  const activeAdmission = bed.admissions[0];
                  return (
                    <div key={bed.id} className={`rounded-lg border p-3 ${STATUS_COLOR[bed.status] ?? "bg-white border-slate-200"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-700">Bed {bed.room}</span>
                        <StatusBadge status={bed.status} />
                      </div>
                      {activeAdmission ? (
                        <p className="text-xs text-slate-600 mt-1">{activeAdmission.patient.nameEn}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">{bed.status === "maintenance" ? "Under maintenance" : "Empty"}</p>
                      )}
                      {bed.status === "maintenance" && (
                        <button onClick={() => updateStatus.mutate({ id: bed.id, status: "available" })} className="mt-2 text-xs text-teal-600 hover:underline">Mark available</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
