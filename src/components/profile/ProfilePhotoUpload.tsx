"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  currentPhotoUrl?: string | null;
  onUploadComplete?: (url: string) => void;
};

export default function ProfilePhotoUpload({
  userId,
  currentPhotoUrl,
  onUploadComplete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(
    currentPhotoUrl ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      const extension = file.name.split(".").pop();
      const filePath = `${userId}/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const newPhotoUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          photo_url: newPhotoUrl,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setPhotoUrl(newPhotoUrl);

      onUploadComplete?.(newPhotoUrl);
    } catch (error) {
      console.error("Photo upload error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to upload photo."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-eduke-green/10 flex items-center justify-center">
            <User size={42} className="text-eduke-green" />
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-eduke-green text-white flex items-center justify-center shadow hover:bg-eduke-green-dark disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Camera size={18} />
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-3 text-sm font-medium text-eduke-green hover:underline"
      >
        {uploading ? "Uploading..." : "Upload Profile Photo"}
      </button>

      <p className="text-xs text-gray-400 mt-1">
        JPG, PNG or WEBP · Maximum 5MB
      </p>

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}