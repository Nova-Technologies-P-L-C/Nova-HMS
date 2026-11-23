"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import {
  Bed,
  User,
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  Wrench,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

export default function BedBoardPage() {
  const qc = useQueryClient();
  const {
    data: beds = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    ...trpc.ward.beds.queryOptions(),
    refetchOnMount: true,
  });

  const updateStatus = useMutation(
    trpc.ward.updateBedStatus.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        toast.success("Bed status updated to Available");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update bed status");
      },
    })
  );

  const wards = Array.from(new Set(beds.map((b) => b.ward).filter(Boolean)));
  const totalBeds = beds.length;
  const occupied = beds.filter((b) => b.status === "occupied" || b.admissions?.length > 0).length;
  const available = beds.filter((b) => b.status === "available" && (!b.admissions || b.admissions.length === 0)).length;
  const maintenance = beds.filter((b) => b.status === "maintenance").length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  return (
    <PageShell
      title="Bed Occupancy Board"
      subtitle="Floor plan capacity and real-time room status across clinic wards"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh bed statuses"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/nurse"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <ClipboardList size={14} className="text-teal-600" />
            <span>Nurse Census View</span>
          </Link>

          <Link
            href="/nova/ward/admissions"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Admit Patient</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 pb-12 w-full max-w-[1600px] mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Occupied Beds
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{occupied}</span>
              <span className="text-xs text-slate-400 font-medium">({occupancyRate}%)</span>
            </div>
            <div className="mt-2 text-[11px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Inpatients admitted</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Available Free Beds
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {available}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ {totalBeds}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Clean and ready for use
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Maintenance / Cleaning
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {maintenance}
              </span>
              <span className="text-xs text-slate-400 font-medium">beds</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Disinfected after discharge
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Capacity
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalBeds}</span>
                <span className="text-xs text-slate-400 font-medium">across {wards.length} wards</span>
              </div>
            </div>
            <Link
              href="/nova/ward/admissions"
              className="mt-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Admissions</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Wards & Beds */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading beds…</div>
        ) : (
          <div className="space-y-4">
            {wards.map((ward) => {
              const wardBeds = beds.filter((b) => b.ward === ward);
              const wardOccupied = wardBeds.filter(
                (b) => b.status === "occupied" || b.admissions?.length > 0
              ).length;

              return (
                <div
                  key={ward}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bed size={16} className="text-teal-600" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{ward}</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {wardOccupied} / {wardBeds.length} Occupied
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {wardBeds.map((bed) => {
                      const activeAdmission = bed.admissions?.[0];
                      const isOccupied = bed.status === "occupied" || !!activeAdmission;
                      const isMaintenance = bed.status === "maintenance";

                      return (
                        <div
                          key={bed.id}
                          className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                            isOccupied
                              ? "bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800"
                              : isMaintenance
                              ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                              : "bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                Bed {bed.room}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                                  isOccupied
                                    ? "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300"
                                    : isMaintenance
                                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                                    : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                }`}
                              >
                                {isOccupied ? "Occupied" : isMaintenance ? "Cleaning" : "Available"}
                              </span>
                            </div>

                            {activeAdmission ? (
                              <div className="mt-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {activeAdmission.patient.nameEn}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {activeAdmission.patient.healthId}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 mt-1 italic">
                                {isMaintenance ? "Cleaning in progress" : "Ready for patient"}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            {isMaintenance ? (
                              <button
                                onClick={() => updateStatus.mutate({ id: bed.id, status: "available" })}
                                className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                              >
                                <CheckCircle2 size={11} /> Mark Ready
                              </button>
                            ) : isOccupied ? (
                              <Link
                                href="/nova/nurse"
                                className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-0.5"
                              >
                                <span>Patient Details</span>
                                <ArrowRight size={10} />
                              </Link>
                            ) : (
                              <Link
                                href="/nova/ward/admissions"
                                className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                              >
                                <Plus size={10} />
                                <span>Admit</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
