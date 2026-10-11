import type { Destination } from '@/components/HeroSearch';

let cachedDestinations: Destination[] | null = null;
let fetchPromise: Promise<Destination[]> | null = null;

export async function getClientDestinations(): Promise<Destination[]> {
  if (cachedDestinations && cachedDestinations.length > 0) {
    return cachedDestinations;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = fetch('/api/destinations')
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data?.destinations) && data.destinations.length > 0) {
        cachedDestinations = data.destinations;
        return data.destinations;
      }
      return [];
    })
    .catch((err) => {
      console.error('[getClientDestinations] Failed to fetch destinations:', err);
      return [];
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}
