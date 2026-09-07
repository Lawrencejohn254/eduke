"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number;
  longitude: number;
  radius: number;
  onLocationChange: (latitude: number, longitude: number) => void;
};

/*
 * Fix Leaflet marker icons in Next.js
 */

const markerIcon = L.divIcon({
  className: "custom-school-marker",
  html: `
    <div style="
      width: 38px;
      height: 38px;
      background: #15803d;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
    ">
      📍
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

function MapUpdater({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(
      [latitude, longitude],
      map.getZoom(),
      {
        animate: true,
      }
    );
  }, [latitude, longitude, map]);

  return null;
}

function DraggableMarker({
  latitude,
  longitude,
  onLocationChange,
}: {
  latitude: number;
  longitude: number;
  onLocationChange: (
    latitude: number,
    longitude: number
  ) => void;
}) {
  const [position, setPosition] = useState<
    [number, number]
  >([latitude, longitude]);

  useEffect(() => {
    setPosition([latitude, longitude]);
  }, [latitude, longitude]);

  const eventHandlers = useMemo(
    () => ({
      dragend(event: L.LeafletEvent) {
        const marker = event.target;
        const newPosition = marker.getLatLng();

        const newLatitude =
          newPosition.lat;

        const newLongitude =
          newPosition.lng;

        setPosition([
          newLatitude,
          newLongitude,
        ]);

        onLocationChange(
          newLatitude,
          newLongitude
        );
      },
    }),
    [onLocationChange]
  );

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={eventHandlers}
      icon={markerIcon}
    />
  );
}

/*
 * Allows clicking anywhere on map
 * to move the school location
 */

function MapClickHandler({
  onLocationChange,
}: {
  onLocationChange: (
    latitude: number,
    longitude: number
  ) => void;
}) {
  useMapEvents({
    click(event) {
      onLocationChange(
        event.latlng.lat,
        event.latlng.lng
      );
    },
  });

  return null;
}

export default function SchoolLocationMap({
  latitude,
  longitude,
  radius,
  onLocationChange,
}: Props) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return (
    <div className="space-y-3">

      <div className="overflow-hidden rounded-xl border border-gray-200">

        <MapContainer
          center={[latitude, longitude]}
          zoom={17}
          scrollWheelZoom
          className="h-[400px] w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater
            latitude={latitude}
            longitude={longitude}
          />

          <Circle
            center={[latitude, longitude]}
            radius={radius}
            pathOptions={{
              color: "#15803d",
              fillColor: "#22c55e",
              fillOpacity: 0.12,
            }}
          />

          <DraggableMarker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={
              onLocationChange
            }
          />

          <MapClickHandler
            onLocationChange={
              onLocationChange
            }
          />

        </MapContainer>

      </div>

      <p className="text-xs text-gray-500 text-center">
        Drag the marker or click anywhere on the map to adjust
        the official school location. The circle shows the
        attendance geofence.
      </p>

    </div>
  );
}