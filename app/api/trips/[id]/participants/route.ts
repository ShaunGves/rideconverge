import { NextRequest, NextResponse } from 'next/server';
import { addParticipant } from '../../../../../lib/store';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, role, location, capacity, arrivalDeadlineMinutes } = body;

  if (!name || !role || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return NextResponse.json({ error: 'name, role, and location {lat,lng} are required' }, { status: 400 });
  }
  if (role === 'driver' && (!capacity || capacity < 1)) {
    return NextResponse.json({ error: 'drivers need a capacity of at least 1' }, { status: 400 });
  }

  const trip = await addParticipant(params.id, {
    name,
    role,
    location,
    capacity: role === 'driver' ? capacity : undefined,
    arrivalDeadlineMinutes: role === 'rider' ? (arrivalDeadlineMinutes ?? 60) : undefined,
  });

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  return NextResponse.json(trip);
}
