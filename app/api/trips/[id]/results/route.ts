import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '../../../../../lib/store';
import { matchRidersToCars } from '../../../../../lib/matcher';
import { Driver, Rider } from '../../../../../lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const trip = await getTrip(params.id);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const drivers: Driver[] = trip.participants
    .filter((p) => p.role === 'driver')
    .map((p) => ({ id: p.id, name: p.name, location: p.location, capacity: p.capacity ?? 1 }));

  const riders: Rider[] = trip.participants
    .filter((p) => p.role === 'rider')
    .map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
      arrivalDeadlineMinutes: p.arrivalDeadlineMinutes ?? 60,
    }));

  if (drivers.length === 0) {
    return NextResponse.json({ error: 'No drivers yet — add at least one driver before computing results' }, { status: 400 });
  }

  const result = matchRidersToCars(drivers, riders, trip.destination);
  return NextResponse.json(result);
}
