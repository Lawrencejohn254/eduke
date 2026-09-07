"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  LocateFixed,
  Edit3,
  Trophy,
  Plus,
} from "lucide-react";

const SchoolLocationMap = dynamic(
  () => import("@/components/SchoolLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Loading map...
        </p>
      </div>
    ),
  }
);

type Props = {
  schoolId: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialRadius: number | null;
};

type LocationReading = {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
};

type FinalLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const MAX_SETUP_ACCURACY = 300;
const REQUIRED_READINGS = 3;

function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Location services are not supported by this browser."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),

      (error) => {
        console.error("School location capture error:", error);

        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            reject(
              new Error(
                "Location permission was denied. Please allow location access and try again."
              )
            );
            break;

          case GeolocationPositionError.POSITION_UNAVAILABLE:
            reject(
              new Error(
                "Your location is currently unavailable. Please enable GPS or location services and try again."
              )
            );
            break;

          case GeolocationPositionError.TIMEOUT:
            reject(
              new Error(
                "Location request timed out. Please move outdoors and try again."
              )
            );
            break;

          default:
            reject(
              new Error(
                "Unable to determine your current location."
              )
            );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  });
}

function getAccuracyInfo(accuracy: number) {
  if (accuracy <= 20) {
    return {
      label: "Excellent",
      className:
        "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (accuracy <= 50) {
    return {
      label: "Good",
      className:
        "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (accuracy <= 100) {
    return {
      label: "Fair",
      className:
        "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  return {
    label: "Acceptable",
    className:
      "bg-orange-50 text-orange-700 border-orange-200",
  };
}

export default function SchoolLocationSettings({
  schoolId,
  initialLatitude,
  initialLongitude,
  initialRadius,
}: Props) {
  const supabase = createClient();

  /*
   * ==========================================
   * EXISTING SAVED LOCATION
   * ==========================================
   */

  const [savedLocation, setSavedLocation] =
    useState<FinalLocation | null>(
      initialLatitude !== null &&
        initialLongitude !== null
        ? {
            latitude: initialLatitude,
            longitude: initialLongitude,
            accuracy: 0,
          }
        : null
    );

  /*
   * ==========================================
   * GPS READINGS
   * ==========================================
   */

  const [readings, setReadings] =
    useState<LocationReading[]>([]);

  /*
   * ==========================================
   * FINAL EDITABLE LOCATION
   * ==========================================
   */

  const [finalLatitude, setFinalLatitude] =
    useState<string>("");

  const [finalLongitude, setFinalLongitude] =
    useState<string>("");

  const [finalAccuracy, setFinalAccuracy] =
    useState<number | null>(null);

  const [radius, setRadius] = useState(
    initialRadius ?? 200
  );

  const [capturing, setCapturing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ==========================================
   * CAPTURE GPS READING
   * ==========================================
   */
  function handleMapLocationChange(
  latitude: number,
  longitude: number
) {
  setFinalLatitude(latitude.toFixed(6));
  setFinalLongitude(longitude.toFixed(6));
  setEditing(true);
}

  async function handleCaptureReading() {
    if (readings.length >= REQUIRED_READINGS) {
      return;
    }

    setCapturing(true);
    setError(null);
    setMessage(null);

    try {
      const position =
        await getCurrentLocation();

      const accuracy =
        position.coords.accuracy;

      if (accuracy > MAX_SETUP_ACCURACY) {
        throw new Error(
          `GPS accuracy is currently ${Math.round(
            accuracy
          )} metres. Please move outdoors or wait for a stronger signal before trying again.`
        );
      }

      const newReading: LocationReading = {
        id: Date.now(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy,
      };

      const updatedReadings = [
        ...readings,
        newReading,
      ];

      setReadings(updatedReadings);

      /*
       * Once we have 3 readings,
       * automatically choose the most accurate.
       */

      if (
        updatedReadings.length ===
        REQUIRED_READINGS
      ) {
        const bestReading =
          [...updatedReadings].sort(
            (a, b) =>
              a.accuracy - b.accuracy
          )[0];

        setFinalLatitude(
          bestReading.latitude.toFixed(6)
        );

        setFinalLongitude(
          bestReading.longitude.toFixed(6)
        );

        setFinalAccuracy(
          bestReading.accuracy
        );
      }
    } catch (err) {
      console.error(
        "Location capture error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not capture your location."
      );
    } finally {
      setCapturing(false);
    }
  }

  /*
   * ==========================================
   * RETRY ALL READINGS
   * ==========================================
   */

  function handleResetReadings() {
    setReadings([]);
    setFinalLatitude("");
    setFinalLongitude("");
    setFinalAccuracy(null);
    setEditing(false);
    setError(null);
    setMessage(null);
  }

  /*
   * ==========================================
   * SAVE FINAL LOCATION
   * ==========================================
   */

  async function handleSaveLocation() {
    const latitude =
      Number(finalLatitude);

    const longitude =
      Number(finalLongitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setError(
        "Please enter valid latitude and longitude coordinates."
      );
      return;
    }

    if (
      latitude < -90 ||
      latitude > 90
    ) {
      setError(
        "Latitude must be between -90 and 90."
      );
      return;
    }

    if (
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        "Longitude must be between -180 and 180."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("schools")
        .update({
          latitude,
          longitude,
          geofence_radius_meters: radius,
        })
        .eq("id", schoolId);

      if (error) {
        throw error;
      }

      setSavedLocation({
        latitude,
        longitude,
        accuracy: finalAccuracy ?? 0,
      });

      setReadings([]);
      setEditing(false);

      setMessage(
        "School location and geofence saved successfully."
      );
    } catch (err) {
      console.error(
        "School location save error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not save school location."
      );
    } finally {
      setSaving(false);
    }
  }

  const bestReading =
    readings.length > 0
      ? [...readings].sort(
          (a, b) =>
            a.accuracy - b.accuracy
        )[0]
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-eduke-green/10 flex items-center justify-center">
          <MapPin
            size={22}
            className="text-eduke-green"
          />
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">
            School Location & Geofence
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Configure the official school location for staff attendance.
          </p>
        </div>
      </div>

      {/* INFORMATION */}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex gap-3">
          <Navigation
            size={19}
            className="text-blue-600 shrink-0 mt-0.5"
          />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              More accurate location setup
            </p>

            <p className="text-sm text-blue-700 mt-1">
              Capture three GPS readings from the school compound.
              EduKe automatically selects the most accurate reading,
              which you can review and adjust before saving.
            </p>
          </div>
        </div>
      </div>

      {/* SAVED LOCATION */}

      {savedLocation &&
        readings.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">

            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2
                size={19}
                className="text-green-600"
              />

              <h2 className="font-semibold text-gray-900">
                Current School Location
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">
                  Latitude
                </p>

                <p className="font-mono font-semibold mt-1">
                  {savedLocation.latitude.toFixed(6)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">
                  Longitude
                </p>

                <p className="font-mono font-semibold mt-1">
                  {savedLocation.longitude.toFixed(6)}
                </p>
              </div>

            </div>

          </div>
        )}

      {/* GPS CAPTURE */}

      {readings.length < REQUIRED_READINGS && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

          <div className="flex items-center justify-between mb-5">

            <div>
              <h2 className="font-semibold text-gray-900">
                Capture GPS Readings
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Reading {readings.length} of{" "}
                {REQUIRED_READINGS} captured.
              </p>
            </div>

            <span className="text-sm font-bold text-eduke-green">
              {readings.length}/{REQUIRED_READINGS}
            </span>

          </div>

          {/* PROGRESS */}

          <div className="flex gap-2 mb-5">
            {Array.from({
              length: REQUIRED_READINGS,
            }).map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  index < readings.length
                    ? "bg-eduke-green"
                    : "bg-gray-100"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleCaptureReading}
            disabled={capturing}
            className="w-full flex justify-center items-center gap-2 bg-eduke-green text-white py-3 rounded-lg text-sm font-semibold hover:bg-eduke-green-dark disabled:opacity-60"
          >
            {capturing ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Capturing GPS...
              </>
            ) : (
              <>
                <LocateFixed size={17} />
                Capture Reading {readings.length + 1}
              </>
            )}
          </button>

        </div>
      )}

      {/* READINGS LIST */}

      {readings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">

          <div className="p-5 border-b">
            <h2 className="font-semibold text-gray-900">
              Captured GPS Readings
            </h2>
          </div>

          <div className="divide-y">

            {readings.map((reading, index) => {

              const info =
                getAccuracyInfo(
                  reading.accuracy
                );

              const isBest =
                bestReading?.id ===
                reading.id;

              return (
                <div
                  key={reading.id}
                  className="p-4 flex items-center justify-between gap-4"
                >
                  <div>

                    <div className="flex items-center gap-2">

                      <p className="text-sm font-semibold text-gray-900">
                        Reading {index + 1}
                      </p>

                      {isBest && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                          <Trophy size={13} />
                          Best accuracy
                        </span>
                      )}

                    </div>

                    <p className="font-mono text-xs text-gray-500 mt-1">
                      {reading.latitude.toFixed(6)},{" "}
                      {reading.longitude.toFixed(6)}
                    </p>

                  </div>

                  <span
                    className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${info.className}`}
                  >
                    ±{Math.round(reading.accuracy)}m
                  </span>

                </div>
              );
            })}

          </div>

        </div>
      )}

      {/* FINAL LOCATION */}

      {readings.length === REQUIRED_READINGS && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="p-5 border-b border-gray-100">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="font-semibold text-gray-900">
                  Recommended School Location
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  The most accurate GPS reading was automatically selected.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditing(!editing)
                }
                className="flex items-center gap-2 text-sm font-semibold text-eduke-green"
              >
                <Edit3 size={15} />

                {editing ? "Done" : "Adjust"}
              </button>

            </div>

          </div>

          <div className="p-5 space-y-5">

            {/* COORDINATES */}

            <div className="grid sm:grid-cols-2 gap-4">

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Latitude
                </label>

                <input
                  type="number"
                  step="any"
                  value={finalLatitude}
                  onChange={(e) =>
                    setFinalLatitude(
                      e.target.value
                    )
                  }
                  disabled={!editing}
                  className={`w-full mt-1 rounded-lg border px-3 py-2.5 text-sm font-mono outline-none ${
                    editing
                      ? "border-eduke-green bg-white"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Longitude
                </label>

                <input
                  type="number"
                  step="any"
                  value={finalLongitude}
                  onChange={(e) =>
                    setFinalLongitude(
                      e.target.value
                    )
                  }
                  disabled={!editing}
                  className={`w-full mt-1 rounded-lg border px-3 py-2.5 text-sm font-mono outline-none ${
                    editing
                      ? "border-eduke-green bg-white"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                />
              </div>

            </div>

            {finalAccuracy !== null && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">

                <div className="flex items-center gap-2">
                  <Trophy
                    size={17}
                    className="text-green-600"
                  />

                  <p className="text-sm font-semibold text-green-800">
                    Best GPS Reading Selected
                  </p>
                </div>

                <p className="text-sm text-green-700 mt-2">
                  Accuracy: ±
                  {Math.round(finalAccuracy)} metres
                </p>

              </div>
            )}

            {/* INTERACTIVE MAP */}

        {Number.isFinite(Number(finalLatitude)) &&
        Number.isFinite(Number(finalLongitude)) && (

            <div className="space-y-3">

            <div>
                <h3 className="text-sm font-semibold text-gray-900">
                Verify Location on Map
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                Drag the marker or click the map to fine-tune the
                school's official location.
                </p>
            </div>

            <SchoolLocationMap
                latitude={Number(finalLatitude)}
                longitude={Number(finalLongitude)}
                radius={radius}
                onLocationChange={handleMapLocationChange}
            />

            </div>
        )}

            {editing && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">

                <p className="text-xs text-amber-800">
                  You can make small coordinate adjustments if you know
                  the school's exact location. Large changes may affect
                  staff geofence verification.
                </p>

              </div>
            )}

          </div>

        </div>
      )}

      {/* GEOFENCE RADIUS */}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

        <h2 className="font-semibold text-gray-900">
          Attendance Geofence Radius
        </h2>

        <p className="text-sm text-gray-500 mt-1 mb-4">
          Staff must be within this distance from the school location.
        </p>

        <div className="grid grid-cols-4 gap-2">

          {[50, 100, 200, 300].map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setRadius(value)
                }
                className={`py-2.5 rounded-lg text-sm font-semibold border ${
                  radius === value
                    ? "bg-eduke-green text-white border-eduke-green"
                    : "border-gray-200 text-gray-700 hover:border-eduke-green"
                }`}
              >
                {value}m
              </button>
            )
          )}

        </div>

        <p className="text-xs text-gray-400 mt-3">
          Recommended starting radius: 200 metres.
        </p>

      </div>

      {/* ACTIONS */}

      {readings.length === REQUIRED_READINGS && (
        <div className="flex flex-col sm:flex-row gap-3">

          <button
            type="button"
            onClick={handleResetReadings}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <RotateCcw size={16} />
            Capture Again
          </button>

          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-eduke-green text-white py-3 rounded-lg text-sm font-semibold hover:bg-eduke-green-dark disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save School Location
              </>
            )}
          </button>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle
            size={17}
            className="shrink-0 mt-0.5"
          />

          {error}
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="flex gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
          <CheckCircle2
            size={17}
            className="shrink-0 mt-0.5"
          />

          {message}
        </div>
      )}

    </div>
  );
}