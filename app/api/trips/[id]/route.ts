import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '../../../../lib/store';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const trip = await getTrip(params.id);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  return NextResponse.json(trip);
}
