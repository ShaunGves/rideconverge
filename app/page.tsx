'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('../components/MapPicker'), { ssr: false });

const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [destLabel, setDestLabel] = useState('');
  const [dest, setDest] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return setError('Give the trip a name.');
    if (!dest) return setError('Click the map to drop the destination pin.');

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          destination: { lat: dest[0], lng: dest[1] },
          destinationLabel: destLabel || name,
        }),
      });
      const trip = await res.json();
      if (!res.ok) throw new Error(trip.error || 'Failed to create trip');
      router.push(`/trip/${trip.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div className="eyebrow">RideConverge</div>
      <h1 style={{ fontSize: '2rem', margin: '0.4rem 0 0.5rem', letterSpacing: '-0.02em' }}>
        One clean routing plan. No group chat guesswork.
      </h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.5 }}>
        Set where everyone's headed. Send the link. Everyone drops a pin for where
        they're starting from. The map figures out who rides with who — minimizing
        the total detour across every car, not just guessing who "seems close."
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label>Trip name</label>
          <input
            placeholder="e.g. Hackathon @ BITS Pilani Dubai"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label>Destination label</label>
          <input
            placeholder="e.g. BITS Pilani Dubai Campus"
            value={destLabel}
            onChange={(e) => setDestLabel(e.target.value)}
          />
        </div>
        <div>
          <label>Click the map to drop the destination pin{dest ? ` — ${dest[0].toFixed(4)}, ${dest[1].toFixed(4)}` : ''}</label>
          <MapPicker
            center={DUBAI_CENTER}
            pickable
            onPick={(lat, lng) => setDest([lat, lng])}
            pickedLocation={dest}
            heightPx={320}
          />
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}

        <button className="btn btn-accent" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : 'Create trip & get shareable link'}
        </button>
      </div>
    </main>
  );
}
