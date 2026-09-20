"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ProfilePhotoUpload from "@/components/profile/ProfilePhotoUpload";

/** Same self-service update the staff profile page performs: a parent may edit only their own profile row. */
export default function AccountForm({ profile }: { profile: { id: string; first_name: string | null; last_name: string | null; phone: string | null; photo_url: string | null } }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null })
        .eq("id", profile.id);
      if (error) {
        setError(error.message);
        return;
      }
      setMessage("Your details have been updated.");
      router.refresh();
    } catch {
      setError("Unable to update your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const field = "min-h-11 w-full rounded-md border border-pp-rule-strong bg-pp-surface px-3 text-[0.9375rem] text-pp-ink";

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr]">
      <div className="flex justify-center md:justify-start">
        <ProfilePhotoUpload userId={profile.id} currentPhotoUrl={profile.photo_url} onUploadComplete={() => router.refresh()} />
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pp-first" className="mb-1.5 block text-[0.8125rem] font-medium text-pp-muted">First name</label>
            <input id="pp-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" className={field} />
          </div>
          <div>
            <label htmlFor="pp-last" className="mb-1.5 block text-[0.8125rem] font-medium text-pp-muted">Last name</label>
            <input id="pp-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="pp-phone" className="mb-1.5 block text-[0.8125rem] font-medium text-pp-muted">Phone number</label>
          <input id="pp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="07XX XXX XXX" className={field} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-pp-green px-5 text-[0.9375rem] font-semibold text-white hover:bg-pp-green-deep disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <Save size={17} aria-hidden />} Save changes
          </button>
          <p role="status" aria-live="polite" className={`text-[0.875rem] ${error ? "text-pp-danger" : "text-pp-green"}`}>
            {error ?? message}
          </p>
        </div>
      </form>
    </div>
  );
}
