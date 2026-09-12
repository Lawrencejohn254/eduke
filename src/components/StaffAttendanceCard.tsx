"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { formatMinutesLate } from "@/lib/format";

type AttendanceRecord = {
  id: string;
  school_id: string;
  staff_id: string;
  attendance_date: string;
  sign_in_at: string | null;
  sign_out_at: string | null;
  sign_in_method: string | null;
  sign_out_method: string | null;
  status: string;
  minutes_late: number | null;
  created_at: string;
  updated_at: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type Props = {
  initialAttendance: AttendanceRecord | null;
  timezone: string;
};

function formatTime(timestamp: string | null, timezone: string) {
  if (!timestamp) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(new Date(timestamp));
}

function formatDuration(signIn: string | null, signOut: string | null) {
  if (!signIn || !signOut) return null;

  const start = new Date(signIn).getTime();
  const end = new Date(signOut).getTime();

  const difference = end - start;

  if (difference < 0) return null;

  const totalMinutes = Math.floor(difference / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

/*
 * =========================================================
 * GET CURRENT GPS LOCATION
 * =========================================================
 */

function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error("Location services are only available in the browser.")
      );
      return;
    }

    if (!navigator.geolocation) {
      reject(
        new Error(
          "Geolocation is not supported by this browser."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        console.log("GPS location received:", {
          latitude,
          longitude,
          accuracy,
        });

        resolve({
          latitude,
          longitude,
          accuracy,
        });
      },

      (geoError) => {
        console.error("Geolocation error code:", geoError.code);
        console.error("Geolocation error message:", geoError.message);

        let message =
          "Unable to determine your current location.";

        switch (geoError.code) {
          case 1:
            message =
              "Location permission was denied. Please allow location access in your browser settings.";
            break;

          case 2:
            message =
              "Your location is unavailable. Please turn on GPS/location services and try again.";
            break;

          case 3:
            message =
              "Location request timed out. Please move outdoors or to an area with better signal and try again.";
            break;
        }

        reject(new Error(message));
      },

      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  });
}

export default function StaffAttendanceCard({
  initialAttendance,
  timezone,
}: Props) {
  const supabase = createClient();

  const [attendance, setAttendance] =
    useState<AttendanceRecord | null>(initialAttendance);

  const [loading, setLoading] = useState(false);

  const [gettingLocation, setGettingLocation] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * =========================================================
   * SIGN IN WITH GPS VALIDATION
   * =========================================================
   */

  async function handleSignIn() {
    setLoading(true);
    setGettingLocation(true);
    setError(null);
    setMessage(null);

    try {
      /*
       * STEP 1
       * Get current GPS location
       */

      const location = await getCurrentLocation();

      setGettingLocation(false);

      /*
       * STEP 2
       * Validate GPS accuracy
       */

      const MAX_ACCURACY = 200;

      if (location.accuracy > MAX_ACCURACY) {
        throw new Error(
          `Your GPS accuracy is too low (${Math.round(
            location.accuracy
          )}m). Please move outdoors or to an area with better GPS signal and try again.`
        );
      }

      /*
       * STEP 3
       * Send coordinates to backend RPC
       */

      const { data, error: rpcError } = await supabase.rpc(
        "staff_sign_in",
        {
          p_latitude: location.latitude,
          p_longitude: location.longitude,
          p_accuracy: location.accuracy,
        }
      );

      if (rpcError) {
        console.error("Sign-in RPC error:", rpcError);
        throw new Error(rpcError.message);
      }

      if (!data) {
        throw new Error(
          "Attendance record was not returned."
        );
      }

      const record = Array.isArray(data)
        ? data[0]
        : data;

      if (!record) {
        throw new Error(
          "Attendance record was not returned."
        );
      }

      setAttendance(record);

      setMessage(
        `Signed in successfully at ${formatTime(
          record.sign_in_at,
          timezone
        )}. Location verified successfully.`
      );
    } catch (err) {
      console.error("Sign-in error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please try again."
      );
    } finally {
      setLoading(false);
      setGettingLocation(false);
    }
  }

  /*
   * =========================================================
   * SIGN OUT
   * =========================================================
   */

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "staff_sign_out"
      );

      if (rpcError) {
        console.error("Sign-out RPC error:", rpcError);
        throw new Error(rpcError.message);
      }

      if (!data) {
        throw new Error(
          "Attendance record was not returned."
        );
      }

      const record = Array.isArray(data)
        ? data[0]
        : data;

      if (!record) {
        throw new Error(
          "Attendance record was not returned."
        );
      }

      setAttendance(record);

      setMessage(
        `Signed out successfully at ${formatTime(
          record.sign_out_at,
          timezone
        )}.`
      );
    } catch (err) {
      console.error("Sign-out error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not sign out. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const signedIn =
    Boolean(attendance?.sign_in_at) &&
    !attendance?.sign_out_at;

  const completed =
    Boolean(attendance?.sign_in_at) &&
    Boolean(attendance?.sign_out_at);

  const duration = formatDuration(
    attendance?.sign_in_at ?? null,
    attendance?.sign_out_at ?? null
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* HEADER */}

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Staff Attendance
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Today's attendance
          </p>
        </div>

        <div className="w-10 h-10 rounded-full bg-eduke-green/10 flex items-center justify-center">
          <Clock
            size={20}
            className="text-eduke-green"
          />
        </div>
      </div>

      {/* NOT SIGNED IN */}

      {!attendance?.sign_in_at && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MapPin
                size={18}
                className="text-eduke-green mt-0.5 shrink-0"
              />

              <div>
                <p className="text-sm font-medium text-gray-900">
                  You have not signed in today.
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Your location will be verified before recording
                  official attendance.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-eduke-green-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                {gettingLocation
                  ? "Verifying location..."
                  : "Signing in..."}
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-gray-400">
            <MapPin
              size={11}
              className="inline mr-1"
            />
            Location verification is required for attendance.
          </p>
        </div>
      )}

      {/* CURRENTLY ON DUTY */}

      {signedIn && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className="text-green-600"
              />

              <p className="text-sm font-semibold text-green-800">
                Currently On Duty
              </p>
            </div>

            <p className="text-sm text-green-700 mt-3">
              Signed in at{" "}
              <span className="font-semibold">
                {formatTime(
                  attendance?.sign_in_at ?? null,
                  timezone
                )}
              </span>
            </p>

            {attendance?.minutes_late !== null &&
              attendance?.minutes_late !== undefined &&
              attendance.minutes_late > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {formatMinutesLate(attendance.minutes_late)} late
                </p>
              )}
          </div>

          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Signing out...
              </>
            ) : (
              <>
                <LogOut size={16} />
                Sign Out
              </>
            )}
          </button>
        </div>
      )}

      {/* COMPLETED */}

      {completed && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2
                size={18}
                className="text-blue-600"
              />

              <p className="text-sm font-semibold text-blue-800">
                Attendance Completed
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Signed in
                </span>

                <span className="font-medium text-gray-900">
                  {formatTime(
                    attendance?.sign_in_at ?? null,
                    timezone
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Signed out
                </span>

                <span className="font-medium text-gray-900">
                  {formatTime(
                    attendance?.sign_out_at ?? null,
                    timezone
                  )}
                </span>
              </div>

              {duration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Duration
                  </span>

                  <span className="font-medium text-gray-900">
                    {duration}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="mt-4 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          ✓ {message}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="mt-4 flex gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle
            size={15}
            className="shrink-0"
          />

          <span>{error}</span>
        </div>
      )}
    </div>
  );
}