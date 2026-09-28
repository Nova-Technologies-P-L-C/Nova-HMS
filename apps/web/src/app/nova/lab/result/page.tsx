"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, Send, FlaskConical, ClipboardList } from "lucide-react";
import Link from "next/link";

type PageTab = "enter" | "completed";

function LabResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderIdParam = params.get("orderId") ?? "";
  const qc = useQueryClient();

  const [pageTab, setPageTab] = useState<PageTab>(orderIdParam ? "enter" : "completed");

  // Pending / in-progress orders (for lab tech entry)
  const { data: pendingOrders = [], refetch: refetchQueue } = useQuery({
    ...trpc.lab.queue.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Completed results (for doctor review)
  const { data: completedOrders = [], refetch: refetchCompleted } = useQuery({
    ...trpc.lab.completed.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const [selectedOrderId, setSelectedOrderId] = useState(orderIdParam);
  const order = pendingOrders.find((o) => o.id === selectedOrderId);

  const [resultText, setResultText] = useState("");
  const [interpretation, setInterpretation] = useState("Normal");
  const [submitted, setSubmitted] = useState(false);

  const startOrder = useMutation(trpc.lab.updateStatus.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() }),
  }));

  const enterResult = useMutation(trpc.lab.enterResult.mutationOptions({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.lab.completed.queryKey() });
    },
  }));

  const handleStart = async () => {
    if (!order) return;
    await startOrder.mutateAsync({ orderId: order.id, status: "in-progress" });
  };

  const handleSendToDoctor = async () => {
    if (!order || !resultText.trim()) return;
    await enterResult.mutateAsync({
      orderId: order.id,
      results: [{
        name: order.testName,
        value: resultText,
        unit: "",
        refRange: "",
        flag: interpretation === "Normal" ? "normal"
          : interpretation.includes("Critical") ? "critical"
          : interpretation.includes("High") ? "high"
          : "low",
      }],
      interpretation,
    });
    setSubmitted(true);
  };

  if (submitted && order) {
    return (
      <PageShell title="Lab Result Entry">
        <Card className="p-10 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
            <Send size={28} className="text-teal-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg mb-1">Result sent to doctor</h2>
          <p className="text-sm text-slate-600 mb-1">
            <strong>{order.testName}</strong> for <strong>{order.visit.patient.nameEn}</strong>
          </p>
          <p className="text-sm mb-2">
            Interpretation: <span className={`font-medium ${interpretation === "Critical" ? "text-red-600" : "text-teal-600"}`}>{interpretation}</span>
          </p>
          <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm text-slate-600 text-left">
            <p className="text-xs text-slate-400 mb-1">Result:</p>
            {resultText}
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Doctor notified. Result is now visible in the patient EMR and Completed Results tab.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => { setPageTab("completed"); refetchCompleted(); setSubmitted(false); setSelectedOrderId(""); setResultText(""); }} className={btnPrimary}>
              View completed results
            </button>
            <button onClick={() => { setSubmitted(false); setSelectedOrderId(""); setResultText(""); setInterpretation("Normal"); refetchQueue(); }} className={btnSecondary}>
              Enter another
            </button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Lab Results" subtitle="Enter results or review completed ones">
      {/* Page tab switcher */}
      <div className="flex gap-1 mb-5">
        <button
          onClick={() => setPageTab("enter")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded border transition-colors ${
            pageTab === "enter" ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"
          }`}
        >
          <FlaskConical size={14} /> Enter result ({pendingOrders.length} pending)
        </button>
        <button
          onClick={() => setPageTab("completed")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded border transition-colors ${
            pageTab === "completed" ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"
          }`}
        >
          <ClipboardList size={14} /> Completed results ({completedOrders.length})
        </button>
      </div>

      {/* ─── COMPLETED RESULTS TAB ─── */}
      {pageTab === "completed" && (
        <div className="space-y-3">
          {completedOrders.length === 0 && (
            <Card className="p-12 text-center">
              <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No completed results yet.</p>
            </Card>
          )}
          {completedOrders.map((o) => {
            const resultData = o.result ? (() => { try { return JSON.parse(o.result.resultsJson); } catch { return null; } })() : null;
            const flag = resultData?.[0]?.flag ?? "normal";
            const flagColor = flag === "critical" ? "bg-red-50 border-red-200" : flag === "high" || flag === "low" ? "bg-amber-50 border-amber-200" : "bg-teal-50 border-teal-200";
            const flagBadge = flag === "critical" ? "bg-red-100 text-red-700" : flag === "high" || flag === "low" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700";

            return (
              <Card key={o.id} className={`p-4 border ${flagColor}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-slate-800">{o.testName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${flagBadge}`}>
                        {o.result?.interpretation ?? "—"}
                      </span>
                      {o.priority === "urgent" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">URGENT</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      Patient: <strong>{o.visit.patient.nameEn}</strong> · {o.visit.patient.healthId}
                    </p>
                    {resultData && Array.isArray(resultData) && (
                      <div className="mt-2 text-sm text-slate-700 bg-white rounded p-2 border border-slate-100">
                        {resultData.map((r: { name?: string; value: string }, i: number) => (
                          <p key={i}>{r.name ? <span className="text-slate-500">{r.name}: </span> : null}<strong>{r.value}</strong></p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Result entered: {o.result ? new Date(o.result.enteredAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <StatusBadge status="completed" />
                    <Link
                      href={`/nova/doctor/emr?visitId=${o.visitId}`}
                      className="text-xs px-2.5 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 whitespace-nowrap"
                    >
                      Open EMR →
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── ENTER RESULT TAB ─── */}
      {pageTab === "enter" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left: Order selector */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                In progress ({pendingOrders.filter(o => o.status === "in-progress").length})
              </p>
              {pendingOrders.filter(o => o.status === "in-progress").map((o) => (
                <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setResultText(""); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors mb-1.5 ${selectedOrderId === o.id ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-300"}`}>
                  <p className="font-medium text-slate-800">{o.testName}</p>
                  <p className="text-xs text-slate-500">{o.visit.patient.nameEn}</p>
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Pending ({pendingOrders.filter(o => o.status === "pending").length})
              </p>
              {pendingOrders.filter(o => o.status === "pending").length === 0 && pendingOrders.filter(o => o.status === "in-progress").length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">No pending orders</p>
              )}
              {pendingOrders.filter(o => o.status === "pending").map((o) => (
                <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setResultText(""); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors mb-1.5 ${selectedOrderId === o.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}>
                  <p className="font-medium text-slate-800">{o.testName}</p>
                  <p className="text-xs text-slate-500">{o.visit.patient.nameEn}</p>
                  <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${o.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{o.priority}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="md:col-span-2 space-y-4">
            {!order ? (
              <Card className="p-12 text-center">
                <FlaskConical size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Select an order to enter results.</p>
              </Card>
            ) : (
              <>
                <Card className="p-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-slate-500">Test</span><span className="font-semibold text-slate-800">{order.testName}</span>
                    <span className="text-slate-500">Patient</span><span className="font-medium">{order.visit.patient.nameEn}</span>
                    <span className="text-slate-500">Health ID</span><span>{order.visit.patient.healthId}</span>
                    <span className="text-slate-500">Priority</span>
                    <span className={`font-medium ${order.priority === "urgent" ? "text-red-600" : "text-slate-700"}`}>{order.priority}</span>
                  </div>
                  {order.status === "pending" && (
                    <button onClick={handleStart} disabled={startOrder.isPending}
                      className="mt-3 text-xs px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
                      {startOrder.isPending ? "Starting…" : "▶ Mark in-progress"}
                    </button>
                  )}
                </Card>

                <Card className="p-5">
                  <FormField label={`${order.testName} — result values`}>
                    <textarea className={`${inputCls} resize-none h-28`} value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                      placeholder="e.g. WBC 7.2, RBC 4.5, Hgb 13.8 g/dL — all within normal range" />
                  </FormField>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Interpretation</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Normal", "Abnormal — Low", "Abnormal — High", "Critical"].map((opt) => (
                      <button key={opt} onClick={() => setInterpretation(opt)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          interpretation === opt
                            ? opt === "Critical" ? "bg-red-600 text-white border-red-600"
                              : opt === "Normal" ? "bg-teal-600 text-white border-teal-600"
                              : "bg-amber-500 text-white border-amber-500"
                            : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </Card>

                {enterResult.error && <p className="text-sm text-red-600">{enterResult.error.message}</p>}

                <div className="flex gap-2">
                  <button onClick={handleSendToDoctor} disabled={!resultText.trim() || enterResult.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                    <Send size={15} />
                    {enterResult.isPending ? "Sending…" : "Send result to doctor"}
                  </button>
                  <button onClick={() => setResultText("")} className={btnSecondary}>Clear</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function LabResultEntryPage() {
  return (
    <Suspense fallback={<PageShell title="Lab Results"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <LabResultContent />
    </Suspense>
  );
}
