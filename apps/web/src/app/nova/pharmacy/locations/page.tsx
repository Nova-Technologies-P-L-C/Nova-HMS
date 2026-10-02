"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useNovaRole } from "@/components/nova/nova-role-context";
import {
  PageShell,
  Card,
  FormField,
  inputCls,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from "@/components/nova/nova-ui";
import {
  ArrowLeftRight,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function LocationsPage() {
  const { role } = useNovaRole();
  const qc = useQueryClient();

  // Full access and control granted strictly to Pharmacist and Hospital Admin
  const hasControl = role === "Pharmacist" || role === "Hospital Admin";

  // Data fetching from real database
  const { data: locations = [], isLoading: locsLoading } = useQuery(
    trpc.inventory.locations.queryOptions()
  );
  const { data: inventoryItems = [] } = useQuery(
    trpc.inventory.items.queryOptions({})
  );
  const { data: staff = [] } = useQuery(trpc.tenant.staff.queryOptions());

  // Local state
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<{
    id: string;
    name: string;
    type: string;
    managerId: string;
  } | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transfer, setTransfer] = useState({
    fromLoc: "",
    toLoc: "",
    itemId: "",
    qty: "",
    note: "",
  });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state for creating a location
  const [newLoc, setNewLoc] = useState({
    name: "",
    type: "ward",
    managerId: "",
  });

  // Mutations
  const addLocationMutation = useMutation(
    trpc.inventory.addLocation.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.inventory.locations.queryKey() });
        setShowAddModal(false);
        setNewLoc({ name: "", type: "ward", managerId: "" });
        setNotification({
          type: "success",
          message: "Sub-location created successfully and ready for inventory.",
        });
      },
      onError: (err) => {
        setNotification({ type: "error", message: err.message });
      },
    })
  );

  const updateLocationMutation = useMutation(
    trpc.inventory.updateLocation.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.inventory.locations.queryKey() });
        setEditingLoc(null);
        setNotification({
          type: "success",
          message: "Location configuration updated successfully.",
        });
      },
      onError: (err) => {
        setNotification({ type: "error", message: err.message });
      },
    })
  );

  const deleteLocationMutation = useMutation(
    trpc.inventory.deleteLocation.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.inventory.locations.queryKey() });
        if (selectedLocId === editingLoc?.id) setSelectedLocId(null);
        setEditingLoc(null);
        setNotification({
          type: "success",
          message: "Sub-location removed successfully.",
        });
      },
      onError: (err) => {
        setNotification({ type: "error", message: err.message });
      },
    })
  );

  const transferMutation = useMutation(
    trpc.inventory.transfer.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.inventory.locations.queryKey() });
        setShowTransfer(false);
        setTransfer({ fromLoc: "", toLoc: "", itemId: "", qty: "", note: "" });
        setNotification({
          type: "success",
          message: "Inter-location stock transfer recorded and balances updated.",
        });
      },
      onError: (err) => {
        setNotification({ type: "error", message: err.message });
      },
    })
  );

  // Helper for manager name
  const resolveManager = (managerId: string) => {
    if (!managerId) return "Unassigned Manager";
    const found = staff.find(
      (s) => s.user.id === managerId || s.user.name === managerId
    );
    if (found?.user.name) return `${found.user.name} (${found.role})`;
    return managerId;
  };

  const LOC_TYPE_COLORS: Record<string, string> = {
    pharmacy: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    ward: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    or: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    emergency: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    clinic: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    storage: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const selectedLocation = locations.find((l) => l.id === selectedLocId);
  const selectedStock = selectedLocation?.stock ?? [];

  return (
    <PageShell
      title="Multi-Location Stock Control"
      subtitle={`${locations.length} authorized clinical storage locations`}
      action={
        <div className="flex items-center gap-2">
          {hasControl ? (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
              >
                <Plus size={15} /> Add Sub-Location
              </button>
              <button
                onClick={() => setShowTransfer(!showTransfer)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ArrowLeftRight size={14} /> Transfer Stock
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md border border-slate-200 dark:border-slate-700">
              <Lock size={12} /> View-Only Access ({role})
            </span>
          )}
        </div>
      }
    >
      {/* Role access pill */}
      <div className="flex items-center justify-between p-3 mb-5 rounded-xl bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/40 dark:to-slate-900 border border-teal-100 dark:border-teal-900 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" />
          <span>
            {hasControl ? (
              <strong>
                Full Control Active: Authorized as {role} to add, modify, and balance sub-locations.
              </strong>
            ) : (
              <span>
                Standard access as <strong>{role}</strong>. Sub-location additions and transfers require <strong>Pharmacist</strong> or <strong>Hospital Admin</strong> permissions.
              </span>
            )}
          </span>
        </div>
        <span className="font-mono text-[11px] text-teal-700 dark:text-teal-300 bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
          Role: {role}
        </span>
      </div>

      {/* Notifications banner */}
      {notification && (
        <div
          className={`mb-5 px-4 py-3 border text-sm rounded-lg flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ADD SUB-LOCATION MODAL / CARD */}
      {showAddModal && hasControl && (
        <Card className="p-5 mb-6 border-teal-300 shadow-md bg-teal-50/20 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Plus size={16} className="text-teal-600" /> Create New Clinical Sub-Location
            </h3>
            <span className="text-xs text-slate-400">Controlled by Pharmacist & Admin</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormField label="Location Name *">
              <input
                className={inputCls}
                placeholder="e.g. ICU Satellite Cabinet, Maternity Floor Stock"
                value={newLoc.name}
                onChange={(e) => setNewLoc((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>

            <FormField label="Location Category *">
              <select
                className={inputCls}
                value={newLoc.type}
                onChange={(e) => setNewLoc((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="ward">Inpatient Ward Sub-Store</option>
                <option value="pharmacy">Pharmacy / Dispensing Counter</option>
                <option value="emergency">Emergency / Resuscitation</option>
                <option value="or">Operating Theatre (OR)</option>
                <option value="clinic">Outpatient / Specialist Clinic</option>
                <option value="storage">Central Warehouse / Bulk Storage</option>
              </select>
            </FormField>

            <FormField label="Responsible Location Manager">
              <select
                className={inputCls}
                value={newLoc.managerId}
                onChange={(e) => setNewLoc((p) => ({ ...p, managerId: e.target.value }))}
              >
                <option value="">Select In-Charge Staff…</option>
                {staff.map((s) => (
                  <option key={s.user.id} value={s.user.name || s.user.id}>
                    {s.user.name ?? "Staff"} — {s.role}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="flex gap-2">
            <button
              disabled={!newLoc.name.trim() || addLocationMutation.isPending}
              onClick={() => addLocationMutation.mutate(newLoc)}
              className={btnPrimary}
            >
              {addLocationMutation.isPending ? "Creating…" : "Save New Location"}
            </button>
            <button
              className={btnSecondary}
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* EDIT LOCATION MODAL */}
      {editingLoc && hasControl && (
        <Card className="p-5 mb-6 border-blue-300 shadow-md bg-blue-50/20 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Edit2 size={15} className="text-blue-600" /> Edit Sub-Location Configuration
            </h3>
            <span className="text-xs text-slate-400">ID: {editingLoc.id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormField label="Location Name">
              <input
                className={inputCls}
                value={editingLoc.name}
                onChange={(e) =>
                  setEditingLoc((p) => p && { ...p, name: e.target.value })
                }
              />
            </FormField>

            <FormField label="Category / Type">
              <select
                className={inputCls}
                value={editingLoc.type}
                onChange={(e) =>
                  setEditingLoc((p) => p && { ...p, type: e.target.value })
                }
              >
                <option value="ward">Inpatient Ward Sub-Store</option>
                <option value="pharmacy">Pharmacy / Dispensing Counter</option>
                <option value="emergency">Emergency / Resuscitation</option>
                <option value="or">Operating Theatre (OR)</option>
                <option value="clinic">Outpatient / Specialist Clinic</option>
                <option value="storage">Central Warehouse / Bulk Storage</option>
              </select>
            </FormField>

            <FormField label="Responsible Manager">
              <select
                className={inputCls}
                value={editingLoc.managerId}
                onChange={(e) =>
                  setEditingLoc((p) => p && { ...p, managerId: e.target.value })
                }
              >
                <option value="">Select In-Charge Staff…</option>
                {staff.map((s) => (
                  <option key={s.user.id} value={s.user.name || s.user.id}>
                    {s.user.name ?? "Staff"} — {s.role}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                disabled={!editingLoc.name.trim() || updateLocationMutation.isPending}
                onClick={() => updateLocationMutation.mutate(editingLoc)}
                className={btnPrimary}
              >
                {updateLocationMutation.isPending ? "Updating…" : "Save Changes"}
              </button>
              <button
                className={btnSecondary}
                onClick={() => setEditingLoc(null)}
              >
                Cancel
              </button>
            </div>

            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete ${editingLoc.name}? Locations with active stock will be protected.`
                  )
                ) {
                  deleteLocationMutation.mutate({ id: editingLoc.id });
                }
              }}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 size={13} /> Delete Location
            </button>
          </div>
        </Card>
      )}

      {/* STOCK TRANSFER CARD */}
      {showTransfer && hasControl && (
        <Card className="p-5 mb-6 border-teal-200 dark:border-teal-900 bg-white dark:bg-slate-900">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-teal-600" /> Inter-Location Stock Transfer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <FormField label="From Source Location">
              <select
                className={inputCls}
                value={transfer.fromLoc}
                onChange={(e) =>
                  setTransfer((p) => ({ ...p, fromLoc: e.target.value, itemId: "" }))
                }
              >
                <option value="">Select origin…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="To Destination Location">
              <select
                className={inputCls}
                value={transfer.toLoc}
                onChange={(e) => setTransfer((p) => ({ ...p, toLoc: e.target.value }))}
              >
                <option value="">Select destination…</option>
                {locations
                  .filter((l) => l.id !== transfer.fromLoc)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="Medication Item">
              <select
                className={inputCls}
                value={transfer.itemId}
                onChange={(e) => setTransfer((p) => ({ ...p, itemId: e.target.value }))}
              >
                <option value="">Select item…</option>
                {(() => {
                  const source = locations.find((l) => l.id === transfer.fromLoc);
                  const available = source?.stock.filter((s) => s.qty > 0) ?? [];
                  if (available.length === 0) {
                    return <option disabled>No stocked items at origin</option>;
                  }
                  return available.map((s) => (
                    <option key={s.itemId} value={s.itemId}>
                      {s.item?.name} ({s.qty} in stock)
                    </option>
                  ));
                })()}
              </select>
            </FormField>

            <FormField label="Quantity to Transfer">
              <input
                type="number"
                min="1"
                className={inputCls}
                placeholder="Units count"
                value={transfer.qty}
                onChange={(e) => setTransfer((p) => ({ ...p, qty: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="flex gap-2">
            <button
              disabled={
                !transfer.fromLoc ||
                !transfer.toLoc ||
                !transfer.itemId ||
                !transfer.qty ||
                parseInt(transfer.qty) <= 0 ||
                transferMutation.isPending
              }
              className={btnPrimary}
              onClick={() => {
                transferMutation.mutate({
                  fromLocationId: transfer.fromLoc,
                  toLocationId: transfer.toLoc,
                  itemId: transfer.itemId,
                  qty: parseInt(transfer.qty),
                  note: transfer.note || "Transfer via Locations Control",
                });
              }}
            >
              {transferMutation.isPending ? "Transferring…" : "Execute Transfer"}
            </button>
            <button className={btnSecondary} onClick={() => setShowTransfer(false)}>
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* LOCATIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {locsLoading ? (
          <p className="text-sm text-slate-400 p-6 col-span-3 text-center">
            Loading hospital storage locations…
          </p>
        ) : locations.length === 0 ? (
          <Card className="p-8 text-center col-span-3 text-slate-400">
            <MapPin size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">No storage locations configured yet.</p>
            {hasControl && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 px-3 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700"
              >
                + Add First Location
              </button>
            )}
          </Card>
        ) : (
          locations.map((loc) => {
            const stockEntries = loc.stock ?? [];
            const activeItemsCount = stockEntries.filter((s) => s.qty > 0).length;
            const totalUnits = stockEntries.reduce((acc, s) => acc + s.qty, 0);

            return (
              <div
                key={loc.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-5 cursor-pointer transition-all shadow-sm ${
                  selectedLocId === loc.id
                    ? "border-teal-500 ring-2 ring-teal-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
                onClick={() =>
                  setSelectedLocId(selectedLocId === loc.id ? null : loc.id)
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {loc.name}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded capitalize font-medium ${
                      LOC_TYPE_COLORS[loc.type] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {loc.type}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between">
                  <span>Manager: {resolveManager(loc.managerId)}</span>
                </p>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-3">
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Stocked Items</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {activeItemsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">Total Units</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {totalUnits.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-teal-600 dark:text-teal-400 font-medium">
                    {selectedLocId === loc.id ? "Showing Shelf Inventory ↓" : "Click to view shelf stock"}
                  </span>

                  {hasControl && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setEditingLoc({
                            id: loc.id,
                            name: loc.name,
                            type: loc.type,
                            managerId: loc.managerId,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Edit Location"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete location "${loc.name}"? Only empty locations can be removed.`
                            )
                          ) {
                            deleteLocationMutation.mutate({ id: loc.id });
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Delete Location"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SELECTED LOCATION DETAILED SHELF INVENTORY TABLE */}
      {selectedLocation && (
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {selectedLocation.name} — Live Shelf Inventory
              </h2>
              <p className="text-xs text-slate-500">
                In-Charge: {resolveManager(selectedLocation.managerId)} · Type:{" "}
                <span className="capitalize">{selectedLocation.type}</span>
              </p>
            </div>
            <button
              onClick={() => setSelectedLocId(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close shelf view ✕
            </button>
          </div>

          {selectedStock.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              No inventory currently stored in this location. Use &ldquo;Transfer Stock&rdquo; to stock this shelf.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-xs uppercase">
                    <th className="text-left px-3 py-2 font-semibold">Medication Item</th>
                    <th className="text-left px-3 py-2 font-semibold">Category</th>
                    <th className="text-left px-3 py-2 font-semibold">Quantity on Shelf</th>
                    <th className="text-left px-3 py-2 font-semibold">Reorder Threshold (ROP)</th>
                    <th className="text-left px-3 py-2 font-semibold">Inventory Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStock.map((s) => {
                    const item = s.item;
                    if (!item) return null;
                    const rop = item.rop || 50;
                    const status =
                      s.qty <= rop * 0.5 ? "critical" : s.qty <= rop ? "low" : "ok";

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-bold ${
                              status === "critical"
                                ? "text-red-600"
                                : status === "low"
                                ? "text-amber-600"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {s.qty.toLocaleString()} {item.uomBase ?? "units"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">
                          {rop} {item.uomBase ?? "units"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                              status === "critical"
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : status === "low"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
}
