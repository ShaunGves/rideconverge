import { LatLng } from './geo';

export type Role = 'driver' | 'rider';

export interface Participant {
  id: string;
  name: string;
  role: Role;
  location: LatLng;
  /** Only used when role === 'driver' */
  capacity?: number;
  /** Only used when role === 'rider'. Minutes from now they need to arrive by. */
  arrivalDeadlineMinutes?: number;
  joinedAt: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: LatLng;
  destinationLabel: string;
  createdAt: string;
  participants: Participant[];
}

// --- Matching engine types ---

export interface Driver {
  id: string;
  name: string;
  location: LatLng;
  capacity: number;
}

export interface Rider {
  id: string;
  name: string;
  location: LatLng;
  arrivalDeadlineMinutes: number;
}

export interface RouteStop {
  type: 'driver_start' | 'rider' | 'destination';
  id: string;
  name: string;
  location: LatLng;
}

export interface CarAssignment {
  driver: Driver;
  route: RouteStop[];
  riders: Rider[];
  totalDistanceKm: number;
}

export interface MatchResult {
  assignments: CarAssignment[];
  unassignedRiders: Rider[];
}
