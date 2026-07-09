import { haversineDistance } from './geo';
import { Driver, Rider, CarAssignment, RouteStop, MatchResult } from './types';

interface CarState {
  driver: Driver;
  route: RouteStop[];
  assignedRiders: Rider[];
  remainingCapacity: number;
}

function routeDistance(route: RouteStop[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += haversineDistance(route[i].location, route[i + 1].location);
  }
  return total;
}

/** Cheapest place to slot `rider` into an existing route, and what it costs. */
function bestInsertion(route: RouteStop[], rider: Rider): { cost: number; position: number } {
  let bestCost = Infinity;
  let bestPos = -1;

  for (let i = 0; i < route.length - 1; i++) {
    const prev = route[i];
    const next = route[i + 1];
    const added =
      haversineDistance(prev.location, rider.location) +
      haversineDistance(rider.location, next.location) -
      haversineDistance(prev.location, next.location);

    if (added < bestCost) {
      bestCost = added;
      bestPos = i + 1;
    }
  }

  return { cost: bestCost, position: bestPos };
}

const TIE_EPSILON_KM = 0.05;

/**
 * Greedy nearest-insertion clustering with global tie-breaking.
 * See rideconverge (algorithm-core repo) README for full explanation.
 */
export function matchRidersToCars(
  drivers: Driver[],
  riders: Rider[],
  destination: { lat: number; lng: number }
): MatchResult {
  const cars: CarState[] = drivers.map((driver) => ({
    driver,
    route: [
      { type: 'driver_start', id: driver.id, name: driver.name, location: driver.location },
      { type: 'destination', id: 'destination', name: 'Destination', location: destination },
    ],
    assignedRiders: [],
    remainingCapacity: driver.capacity,
  }));

  let pool = [...riders];
  const unassigned: Rider[] = [];

  while (pool.length > 0) {
    const candidates: { rider: Rider; car: CarState; cost: number; position: number }[] = [];

    for (const rider of pool) {
      for (const car of cars) {
        if (car.remainingCapacity <= 0) continue;
        const { cost, position } = bestInsertion(car.route, rider);
        candidates.push({ rider, car, cost, position });
      }
    }

    if (candidates.length === 0) {
      unassigned.push(...pool);
      break;
    }

    candidates.sort((a, b) => a.cost - b.cost);
    const minCost = candidates[0].cost;

    const tied = candidates
      .filter((c) => c.cost <= minCost + TIE_EPSILON_KM)
      .sort((a, b) => a.rider.arrivalDeadlineMinutes - b.rider.arrivalDeadlineMinutes);

    const winner = tied[0];

    winner.car.route.splice(winner.position, 0, {
      type: 'rider',
      id: winner.rider.id,
      name: winner.rider.name,
      location: winner.rider.location,
    });
    winner.car.assignedRiders.push(winner.rider);
    winner.car.remainingCapacity -= 1;

    pool = pool.filter((r) => r.id !== winner.rider.id);
  }

  const assignments: CarAssignment[] = cars.map((car) => ({
    driver: car.driver,
    route: car.route,
    riders: car.assignedRiders,
    totalDistanceKm: routeDistance(car.route),
  }));

  return { assignments, unassignedRiders: unassigned };
}
