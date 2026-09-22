"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2 } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

type Vehicle = {
  id: string;
  registration_number: string;
  vehicle_type: string;
  capacity: number | null;
  driver_name: string | null;
  status: string;
};
type Trip = {
  id: string;
  trip_date: string;
  purpose: string;
  driver_name: string | null;
  departure_time: string | null;
  return_time: string | null;
  notes: string | null;
  vehicle: { registration_number: string; vehicle_type: string } | null;
};

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default function TransportModule({
  schoolId,
  profileId,
  vehicles,
  trips,
}: {
  schoolId: string;
  profileId: string;
  vehicles: Vehicle[];
  trips: Trip[];
}) {
  const [tab, setTab] = useState<"vehicles" | "trips">("trips");
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);
  const router = useRouter();

  const tripsToday = useMemo(() => trips.filter((t) => isToday(t.trip_date)), [trips]);
  const outNow = useMemo(() => trips.filter((t) => t.departure_time && !t.return_time), [trips]);

  async function markReturned(id: string) {
    const supabase = createClient();
    await supabase.from("vehicle_trips").update({ return_time: new Date().toISOString() }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <StatCard label="Vehicles" value={vehicles.length} />
        <StatCard label="Trips Today" value={tripsToday.length} />
        <StatCard label="Currently Out" value={outNow.length} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200">
          <button onClick={() => setTab("trips")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "trips" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Trips
          </button>
          <button onClick={() => setTab("vehicles")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "vehicles" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Vehicles ({vehicles.length})
          </button>
        </div>
        {tab === "trips" ? (
          <button onClick={() => setShowTripForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
            <Plus size={15} /> Log Trip
          </button>
        ) : (
          <button onClick={() => setShowVehicleForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
            <Plus size={15} /> Add Vehicle
          </button>
        )}
      </div>

      {tab === "trips" ? (
        trips.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No trips logged yet.</p>
        ) : (
          <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Date</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Driver</th>
                  <th className="p-3">Departed</th>
                  <th className="p-3">Returned</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="p-3 text-gray-700 text-xs">{formatDateDMY(t.trip_date)}</td>
                    <td className="p-3 font-medium text-gray-900 text-xs">{t.vehicle?.registration_number ?? "-"}</td>
                    <td className="p-3 text-gray-600 text-xs">{t.purpose}</td>
                    <td className="p-3 text-gray-600 text-xs">{t.driver_name ?? "-"}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {t.departure_time ? new Date(t.departure_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {t.return_time ? new Date(t.return_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                    </td>
                    <td className="p-3">
                      {t.departure_time && !t.return_time && (
                        <button onClick={() => markReturned(t.id)} className="text-xs font-medium text-eduke-green hover:underline inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> Mark Returned
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No vehicles added yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Registration</th>
                <th className="p-3">Type</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{v.registration_number}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.vehicle_type}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.capacity ?? "-"}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.driver_name ?? "-"}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showVehicleForm && <VehicleForm schoolId={schoolId} onClose={() => setShowVehicleForm(false)} />}
      {showTripForm && <TripForm schoolId={schoolId} profileId={profileId} vehicles={vehicles} onClose={() => setShowTripForm(false)} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function VehicleForm({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const [registration, setRegistration] = useState("");
  const [vehicleType, setVehicleType] = useState("Bus");
  const [capacity, setCapacity] = useState("");
  const [driverName, setDriverName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("vehicles").insert({
      school_id: schoolId,
      registration_number: registration,
      vehicle_type: vehicleType,
      capacity: capacity ? Number(capacity) : null,
      driver_name: driverName || null,
      status: "Active",
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Add Vehicle</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Registration number" value={registration} onChange={(e) => setRegistration(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option>Bus</option>
              <option>Van</option>
              <option>Car</option>
              <option>Other</option>
            </select>
            <input type="number" min={0} placeholder="Capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <input placeholder="Default driver (optional)" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !registration.trim()} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Vehicle
          </button>
        </form>
      </div>
    </div>
  );
}

function TripForm({
  schoolId,
  profileId,
  vehicles,
  onClose,
}: {
  schoolId: string;
  profileId: string;
  vehicles: Vehicle[];
  onClose: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [purpose, setPurpose] = useState("");
  const [driverName, setDriverName] = useState(vehicles[0]?.driver_name ?? "");
  const [departNow, setDepartNow] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) {
      setError("Select a vehicle.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("vehicle_trips").insert({
      school_id: schoolId,
      vehicle_id: vehicleId,
      purpose,
      driver_name: driverName || null,
      departure_time: departNow ? new Date().toISOString() : null,
      notes: notes || null,
      recorded_by: profileId,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Log Trip</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {vehicles.length === 0 && <option value="">No vehicles yet — add one first</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} ({v.vehicle_type})
              </option>
            ))}
          </select>
          <input required placeholder="Purpose of trip" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Driver (optional)" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={departNow} onChange={(e) => setDepartNow(e.target.checked)} />
            Departing now
          </label>
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !vehicleId} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Trip
          </button>
        </form>
      </div>
    </div>
  );
}