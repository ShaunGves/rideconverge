'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { MapMarkerData } from '../../../components/MapPicker';

const MapPicker = dynamic(() => import('../../../components/MapPicker'), { ssr: false });

interface Participant {
  id: string;
  name: string;
  role: 'driver' | 'rider';
  location: { lat: number; lng: number };
  capacity?: number;
  arrivalDeadlineMinutes?: number;
}

interface Trip {
  id: string;
  name: string;
  destination: { lat: number; lng: number };
  destinationLabel: string;
  participants: Participant[];
}

interface RouteStop {
  type: 'driver_start' | 'rider' | 'destination';
  id: string;
  name: string;
  location: { lat: number; lng: number };
}

interface CarAssignment {
  driver: { id: string; name: string; capacity: number };
  route: RouteStop[];
  riders: { id: string; name: string }[];
  totalDistanceKm: number;
}

interface MatchResult {
  assignments: CarAssignment[];
  unassignedRiders: { id: string; name: string }[];
}

const ROUTE_COLORS = ['#f2a93b', '#34d399', '#4fa8ff', '#f2664b', '#c084fc', '#fbbf24'];

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchResult | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // join form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<'driver' | 'rider'>('rider');
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [capacity, setCapacity] = useState(3);
  const [deadline, setDeadline] = useState(45);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, []);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail on non-HTTPS/local contexts — the link
      // is still visible and selectable in the box either way.
    }
  }

  const loadTrip = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Trip not found');
    setTrip(data);
  }, [tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name.');
    if (!pin) return setError('Click the map to drop your pickup pin.');

    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          location: { lat: pin[0], lng: pin[1] },
          capacity: role === 'driver' ? capacity : undefined,
          arrivalDeadlineMinutes: role === 'rider' ? deadline : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrip(data);
      setName('');
      setPin(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }

  async function handleCompute() {
    setResultsError(null);
    const res = await fetch(`/api/trips/${tripId}/results`);
    const data = await res.json();
    if (!res.ok) return setResultsError(data.error);
    setResults(data);
  }

  if (error && !trip) {
    return (
      <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="card">Couldn't load this trip: {error}</div>
      </main>
    );
  }
  if (!trip) {
    return (
      <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem', color: 'var(--text-dim)' }}>
        Loading trip…
      </main>
    );
  }

  const markers: MapMarkerData[] = [
    ...trip.participants.map((p) => ({
      id: p.id,
      lat: p.location.lat,
      lng: p.location.lng,
      label: `${p.name} (${p.role})`,
      kind: p.role,
    })),
    {
      id: 'dest',
      lat: trip.destination.lat,
      lng: trip.destination.lng,
      label: trip.destinationLabel,
      kind: 'destination' as const,
    },
  ];

  const routes = results
    ? results.assignments.map((car, i) => ({
        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
        points: car.route.map((s) => [s.location.lat, s.location.lng] as [number, number]),
      }))
    : [];

  const drivers = trip.participants.filter((p) => p.role === 'driver');
  const riders = trip.participants.filter((p) => p.role === 'rider');

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div className="eyebrow">Trip</div>
      <h1 style={{ fontSize: '1.7rem', margin: '0.3rem 0 0.2rem' }}>{trip.name}</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
        Destination: {trip.destinationLabel}
      </p>

      <div className="share-row">
        <span className="share-link">{shareUrl}</span>
        <button className="btn btn-outline" onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <MapPicker
        center={[trip.destination.lat, trip.destination.lng]}
        zoom={11}
        markers={markers}
        routes={routes}
        heightPx={420}
      />

      <div className="trip-grid">
        {/* Join form */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: '0.8rem' }}>Join this trip</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zayn" />
            </div>
            <div>
              <label>I am a...</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'driver' | 'rider')}>
                <option value="rider">Rider — I need a ride</option>
                <option value="driver">Driver — I'm driving</option>
              </select>
            </div>
            {role === 'driver' ? (
              <div>
                <label>Seats available</label>
                <input type="number" min={1} max={8} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
              </div>
            ) : (
              <div>
                <label>Need to arrive within (minutes)</label>
                <input type="number" min={5} max={180} value={deadline} onChange={(e) => setDeadline(Number(e.target.value))} />
              </div>
            )}
            <div>
              <label>Click the small map below to drop your pickup pin{pin ? ` — ${pin[0].toFixed(4)}, ${pin[1].toFixed(4)}` : ''}</label>
              <MapPicker
                center={[trip.destination.lat, trip.destination.lng]}
                zoom={10}
                pickable
                onPick={(lat, lng) => setPin([lat, lng])}
                pickedLocation={pin}
                heightPx={200}
              />
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
            <button className="btn btn-accent" onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining…' : 'Join trip'}
            </button>
          </div>
        </div>

        {/* Participants + compute */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: '0.8rem' }}>
            Participants — {drivers.length} driver{drivers.length !== 1 ? 's' : ''}, {riders.length} rider{riders.length !== 1 ? 's' : ''}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {trip.participants.map((p) => (
              <li key={p.id} style={{ fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  <span style={{ color: p.role === 'driver' ? 'var(--driver)' : 'var(--rider)' }}>●</span>{' '}
                  {p.name}
                </span>
                <span className="mono" style={{ color: 'var(--text-dim)' }}>
                  {p.role === 'driver' ? `${p.capacity} seats` : `≤${p.arrivalDeadlineMinutes}min`}
                </span>
              </li>
            ))}
            {trip.participants.length === 0 && (
              <li style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No one's joined yet.</li>
            )}
          </ul>

          <button
            className="btn btn-outline"
            style={{ marginTop: '1rem', width: '100%' }}
            onClick={handleCompute}
          >
            Compute carpool assignment
          </button>
          {resultsError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{resultsError}</div>}

          {results && (
            <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {results.assignments.map((car, i) => (
                <div key={car.driver.id} style={{ borderLeft: `3px solid ${ROUTE_COLORS[i % ROUTE_COLORS.length]}`, paddingLeft: '0.7rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{car.driver.name}</div>
                  <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {car.totalDistanceKm.toFixed(2)} km route
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    {car.riders.length > 0 ? car.riders.map((r) => r.name).join(', ') : 'No riders assigned'}
                  </div>
                </div>
              ))}
              {results.unassignedRiders.length > 0 && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                  Unassigned (no capacity left): {results.unassignedRiders.map((r) => r.name).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
