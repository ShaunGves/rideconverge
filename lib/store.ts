import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { kv } from '@vercel/kv';
import { Trip, Participant } from './types';

/**
 * Storage layer with two backends, chosen automatically:
 *
 * - KV (Vercel KV / Upstash Redis via REST) — used whenever
 *   KV_REST_API_URL and KV_REST_API_TOKEN are set. This is what runs in
 *   production and preview deployments once you attach a KV store to the
 *   Vercel project, and it also works from plain `npm run dev` if you've
 *   pulled those env vars locally (`vercel env pull .env.local`).
 *
 * - Local JSON file — automatic fallback so `npm run dev` still works
 *   with zero cloud setup. NOT used once deployed to Vercel, since that
 *   filesystem is read-only outside /tmp — this path exists purely for
 *   convenience while developing on your own machine.
 *
 * Every route in app/api only ever calls the four functions exported at
 * the bottom of this file — neither backend leaks past this file.
 */

const useKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// ---------- KV backend ----------

async function kvGetTrip(id: string): Promise<Trip | null> {
  const trip = await kv.get<Trip>(`trip:${id}`);
  return trip ?? null;
}

async function kvSaveTrip(trip: Trip): Promise<void> {
  await kv.set(`trip:${trip.id}`, trip);
}

// ---------- Local file backend ----------

const DATA_FILE = path.join(process.cwd(), 'data', 'trips.json');

function fileReadAll(): Record<string, Trip> {
  if (!fs.existsSync(DATA_FILE)) return {};
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function fileWriteAll(trips: Record<string, Trip>) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(trips, null, 2));
}

function fileGetTrip(id: string): Trip | null {
  return fileReadAll()[id] ?? null;
}

function fileSaveTrip(trip: Trip): void {
  const trips = fileReadAll();
  trips[trip.id] = trip;
  fileWriteAll(trips);
}

// ---------- Public API (what app/api routes call) ----------

export async function createTrip(
  name: string,
  destination: { lat: number; lng: number },
  destinationLabel: string
): Promise<Trip> {
  const trip: Trip = {
    id: nanoid(8),
    name,
    destination,
    destinationLabel,
    createdAt: new Date().toISOString(),
    participants: [],
  };
  if (useKv) await kvSaveTrip(trip);
  else fileSaveTrip(trip);
  return trip;
}

export async function getTrip(id: string): Promise<Trip | null> {
  return useKv ? kvGetTrip(id) : fileGetTrip(id);
}

export async function addParticipant(
  tripId: string,
  participant: Omit<Participant, 'id' | 'joinedAt'>
): Promise<Trip | null> {
  const trip = await getTrip(tripId);
  if (!trip) return null;

  trip.participants.push({
    ...participant,
    id: nanoid(6),
    joinedAt: new Date().toISOString(),
  });

  if (useKv) await kvSaveTrip(trip);
  else fileSaveTrip(trip);
  return trip;
}
