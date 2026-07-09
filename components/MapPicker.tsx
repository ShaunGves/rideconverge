'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useMemo } from 'react';

// Leaflet's default marker icons reference image files by path, which breaks
// under bundlers. Rebuild icons per-role with inline colored SVG instead.
function coloredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 16px; height: 16px; border-radius: 50%;
      background: ${color}; border: 2px solid #0b0f14;
      box-shadow: 0 0 0 2px ${color}55;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const icons = {
  driver: coloredIcon('#4fa8ff'),
  rider: coloredIcon('#34d399'),
  destination: coloredIcon('#f2a93b'),
  picker: coloredIcon('#e8edf2'),
};

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: 'driver' | 'rider' | 'destination';
}

interface Props {
  center: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  routes?: { color: string; points: [number, number][] }[];
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickedLocation?: [number, number] | null;
  heightPx?: number;
}

function ClickCatcher({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  center,
  zoom = 11,
  markers = [],
  routes = [],
  pickable = false,
  onPick,
  pickedLocation,
  heightPx = 360,
}: Props) {
  const key = useMemo(() => JSON.stringify(center), [center]);

  return (
    <div style={{ height: heightPx, borderRadius: 10, overflow: 'hidden' }}>
      <MapContainer key={key} center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickable && <ClickCatcher onPick={onPick} />}

        {routes.map((r, i) => (
          <Polyline key={i} positions={r.points} pathOptions={{ color: r.color, weight: 3, opacity: 0.85 }} />
        ))}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icons[m.kind]}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}

        {pickedLocation && (
          <Marker position={pickedLocation} icon={icons.picker}>
            <Popup>Your pin</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
