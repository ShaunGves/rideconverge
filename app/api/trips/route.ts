import { NextRequest, NextResponse } from 'next/server';
import { createTrip } from '../../../lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, destination, destinationLabel } = body;

  if (!name || !destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
    return NextResponse.json({ error: 'name and destination {lat,lng} are required' }, { status: 400 });
  }

  const trip = await createTrip(name, destination, destinationLabel ?? 'Destination');
  return NextResponse.json(trip);
}
