// When to ask for a store rating: only after a flight that really delivered
// something, and not more often than every few months.
export const REVIEW_MIN_FLIGHT_MIN = 30;
export const REVIEW_MIN_SIGHTS = 3;
export const REVIEW_COOLDOWN_DAYS = 120;

export function shouldAskForReview(p: {
  minutes: number;
  sightsHeard: number;
  lastAskedAt: number;
  now: number;
}): boolean {
  if (p.minutes < REVIEW_MIN_FLIGHT_MIN || p.sightsHeard < REVIEW_MIN_SIGHTS) return false;
  return p.now - (p.lastAskedAt || 0) > REVIEW_COOLDOWN_DAYS * 24 * 3600 * 1000;
}
