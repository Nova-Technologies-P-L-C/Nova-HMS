"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, KpiCard, Pagination } from "@/components/nova/nova-ui";
import {
  Banknote, Search, Plus, Check, Edit2, Trash2,
  Filter, Tag, Sparkles, AlertCircle, RefreshCw, X
} from "lucide-react";

interface TariffItem {
  id: string;
  code: string;
  name: string;
  category: string;
  department: string;
  price: number;
  description: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const CATEGORIES = [
  { id: "all", label: "All Services", icon: "🌐" },
  { id: "registration", label: "Registration & OPD", icon: "📋" },
  { id: "consultation", label: "Consultations", icon: "🩺" },
  { id: "lab", label: "Lab Diagnostics", icon: "🔬" },
  { id: "procedure", label: "Radiology & Procedures", icon: "⚡" },
  { id: "inpatient", label: "Inpatient & Wards", icon: "🛏️" },
  { id: "pharmacy", label: "Pharmacy & Drugs", icon: "💊" },
];

const CATEGORY_COLORS: Record<string, string> = {
  registration: "bg-teal-50 text-teal-700 border-teal-200",
  consultation: "bg-blue-50 text-blue-700 border-blue-200",
  lab: "bg-purple-50 text-purple-700 border-purple-200",
  procedure: "bg-amber-50 text-amber-700 border-amber-200",
  inpatient: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pharmacy: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function HospitalTariffsPage() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inline editing state: { [tariffId]: string }
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<{
    id?: string;
    code: string;
    name: string;
    category: string;
    department: string;
    price: string;
    description: string;
    isActive: boolean;
  }>({
    code: "",
    name: "",
    category: "lab",
    department: "Laboratory",
    price: "",
    description: "",
    isActive: true,
  });

  // Query tariffs
  const { data: tariffs = [], isLoading, refetch } = useQuery(
    trpc.tariff.list.queryOptions({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      search: search.trim() || undefined,
      activeOnly,
    })
  );

  // Update single price mutation
  const updatePriceMutation = useMutation(
    trpc.tariff.updatePrice.mutationOptions({
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: trpc.tariff.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.categories.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.pricingMap.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tenant.get.queryKey() });
        setSavedRowId(data.id);
        setTimeout(() => setSavedRowId(null), 2500);
      },
      onError: (err) => {
        setErrorMessage(err.message);
        setTimeout(() => setErrorMessage(null), 4000);
      },
    })
  );

  // Toggle active status mutation
  const toggleActiveMutation = useMutation(
    trpc.tariff.toggleActive.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tariff.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.categories.queryKey() });
      },
    })
  );

  // Upsert tariff mutation
  const upsertMutation = useMutation(
    trpc.tariff.upsert.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tariff.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.categories.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.pricingMap.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tenant.get.queryKey() });
        setIsModalOpen(false);
      },
      onError: (err) => {
        setErrorMessage(err.message);
        setTimeout(() => setErrorMessage(null), 4000);
      },
    })
  );

  // Delete tariff mutation
  const deleteMutation = useMutation(
    trpc.tariff.delete.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tariff.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.categories.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tariff.pricingMap.queryKey() });
      },
      onError: (err) => {
        setErrorMessage(err.message);
        setTimeout(() => setErrorMessage(null), 4000);
      },
    })
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = tariffs.length;
    const active = tariffs.filter((t) => t.isActive).length;
    const labCount = tariffs.filter((t) => t.category === "lab").length;
    const avgPrice = total > 0 ? Math.round(tariffs.reduce((s, t) => s + t.price, 0) / total) : 0;
    return { total, active, labCount, avgPrice };
  }, [tariffs]);

  // Paginated slice for current page
  const paginatedTariffs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tariffs.slice(start, start + pageSize);
  }, [tariffs, currentPage, pageSize]);

  // Handle inline price change
  const handlePriceInputChange = (id: string, val: string) => {
    setEditingPrices((prev) => ({ ...prev, [id]: val }));
  };

  // Save inline price
  const handleSavePrice = async (item: TariffItem) => {
    const rawVal = editingPrices[item.id] !== undefined ? editingPrices[item.id] : String(item.price);
    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      setErrorMessage("Please enter a valid price in ETB (0 or greater).");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    await updatePriceMutation.mutateAsync({ id: item.id, price: parsed });
  };

  // Open modal for new service
  const handleOpenAdd = () => {
    setModalItem({
      code: "",
      name: "",
      category: selectedCategory === "all" ? "lab" : selectedCategory,
      department: "Laboratory",
      price: "",
      description: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing existing service
  const handleOpenEdit = (item: TariffItem) => {
    setModalItem({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      department: item.department,
      price: String(item.price),
      description: item.description,
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  // Save modal form
  const handleModalSave = async () => {
    if (!modalItem.name.trim() || !modalItem.code.trim()) {
      setErrorMessage("Service code and name are required.");
      return;
    }
    const priceNum = parseFloat(modalItem.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMessage("Please enter a valid price in ETB.");
      return;
    }

    await upsertMutation.mutateAsync({
      id: modalItem.id,
      code: modalItem.code.trim().toUpperCase(),
      name: modalItem.name.trim(),
      category: modalItem.category,
      department: modalItem.department.trim() || "General",
      price: priceNum,
      description: modalItem.description.trim(),
      isActive: modalItem.isActive,
    });
  };

  return (
    <PageShell
      title="Hospital Service Tariffs & Prices"
      subtitle="Configure, audit, and edit pricing for all clinical processes, diagnostics, consultations, beds, and drugs across Nova HMS."
    >
      {/* Top Banner & Alert Messages */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Services" value={metrics.total} sub="In catalog" accent />
        <KpiCard label="Active Tariffs" value={metrics.active} sub="Billable to patients" />
        <KpiCard label="Lab Diagnostics" value={metrics.labCount} sub="Tests configured" />
        <KpiCard label="Average Tariff" value={`ETB ${metrics.avgPrice}`} sub="Across all processes" />
      </div>

      {/* Filter and Control Bar */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  selectedCategory === c.id
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Action: Add Service */}
          <button
            onClick={handleOpenAdd}
            className="w-full md:w-auto px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus size={15} /> Add Hospital Service
          </button>
        </div>

        {/* Secondary Filters */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by service name, code, dept…"
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => {
                  setActiveOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="accent-teal-600 w-3.5 h-3.5"
              />
              <span>Show active only</span>
            </label>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-1 text-slate-500 hover:text-teal-600"
              title="Refresh list"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </Card>

      {/* Main Tariffs Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-teal-600" />
            <span className="font-semibold text-sm text-slate-800">
              Hospital Process Tariff Master ({tariffs.length} items)
            </span>
          </div>
          <span className="text-xs text-slate-500">
            💡 Changes take effect immediately in Reception, OPD, Doctor Orders, Pharmacy, and Billing.
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading service tariffs…</div>
        ) : tariffs.length === 0 ? (
          <div className="p-12 text-center">
            <Banknote size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700 text-sm">No hospital services found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing your search filter or click "+ Add Hospital Service".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Code & Name</th>
                  <th className="px-3 py-3">Category & Dept</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 w-48 text-right">Price (ETB)</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTariffs.map((item) => {
                  const currentValue =
                    editingPrices[item.id] !== undefined
                      ? editingPrices[item.id]
                      : String(item.price);
                  const isDirty =
                    editingPrices[item.id] !== undefined &&
                    editingPrices[item.id] !== String(item.price);
                  const isSaved = savedRowId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-teal-50/20 transition-colors ${
                        !item.isActive ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      {/* Name & Code */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Tag size={10} /> {item.code}
                        </div>
                      </td>

                      {/* Category & Department */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                            CATEGORY_COLORS[item.category] ?? "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.category}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">{item.department}</div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={item.description}>
                        {item.description || "—"}
                      </td>

                      {/* Editable Price Column */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-slate-400 font-medium">ETB</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentValue}
                            onChange={(e) => handlePriceInputChange(item.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePrice(item);
                            }}
                            className={`w-28 text-right px-2 py-1 border rounded text-xs font-bold transition-all ${
                              isDirty
                                ? "border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-200"
                                : isSaved
                                ? "border-teal-400 bg-teal-50 text-teal-800"
                                : "border-slate-200 bg-white text-slate-800 focus:border-teal-500"
                            }`}
                          />
                          {isDirty && (
                            <button
                              onClick={() => handleSavePrice(item)}
                              disabled={updatePriceMutation.isPending}
                              title="Save price change"
                              className="px-2 py-1 bg-amber-600 text-white rounded text-[11px] font-semibold hover:bg-amber-700 shadow-sm"
                            >
                              Save
                            </button>
                          )}
                          {isSaved && (
                            <span className="text-teal-600 flex items-center text-[11px] font-medium animate-pulse">
                              <Check size={14} /> Saved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: item.id,
                              isActive: !item.isActive,
                            })
                          }
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                            item.isActive
                              ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                          }`}
                        >
                          {item.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded"
                            title="Edit full details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete tariff ${item.name}?`)) {
                                deleteMutation.mutate({ id: item.id });
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete service"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tariffs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={tariffs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="services"
          />
        )}
      </Card>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-teal-600" />
                <h3 className="font-semibold text-slate-800 text-sm">
                  {modalItem.id ? "Edit Hospital Service Tariff" : "Add New Hospital Service"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Service Code (e.g. LAB_CRP)">
                  <input
                    type="text"
                    value={modalItem.code}
                    onChange={(e) =>
                      setModalItem((m) => ({ ...m, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="LAB_CBC"
                    className={`${inputCls} font-mono`}
                  />
                </FormField>

                <FormField label="Service Category">
                  <select
                    value={modalItem.category}
                    onChange={(e) =>
                      setModalItem((m) => ({ ...m, category: e.target.value }))
                    }
                    className={inputCls}
                  >
                    <option value="registration">Registration & OPD</option>
                    <option value="consultation">Doctor Consultation</option>
                    <option value="lab">Laboratory Diagnostics</option>
                    <option value="procedure">Radiology & Procedures</option>
                    <option value="inpatient">Inpatient & Ward Beds</option>
                    <option value="pharmacy">Pharmacy & Medications</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Service Display Name">
                <input
                  type="text"
                  value={modalItem.name}
                  onChange={(e) => setModalItem((m) => ({ ...m, name: e.target.value }))}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  className={inputCls}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Department / Unit">
                  <input
                    type="text"
                    value={modalItem.department}
                    onChange={(e) =>
                      setModalItem((m) => ({ ...m, department: e.target.value }))
                    }
                    placeholder="e.g. Laboratory, Emergency"
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Price (ETB)">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={modalItem.price}
                    onChange={(e) =>
                      setModalItem((m) => ({ ...m, price: e.target.value }))
                    }
                    placeholder="150"
                    className={`${inputCls} font-bold text-teal-800`}
                  />
                </FormField>
              </div>

              <FormField label="Description & Clinical Notes">
                <textarea
                  value={modalItem.description}
                  onChange={(e) =>
                    setModalItem((m) => ({ ...m, description: e.target.value }))
                  }
                  placeholder="Optional billing details or test description..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </FormField>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modalActive"
                  checked={modalItem.isActive}
                  onChange={(e) =>
                    setModalItem((m) => ({ ...m, isActive: e.target.checked }))
                  }
                  className="accent-teal-600 w-4 h-4"
                />
                <label htmlFor="modalActive" className="text-xs text-slate-700 cursor-pointer">
                  Service is active and billable in patient orders and cashier invoices
                </label>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSave}
                disabled={upsertMutation.isPending}
                className={btnPrimary}
              >
                {upsertMutation.isPending ? "Saving…" : "Save Service Tariff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
