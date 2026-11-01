import { shouldAskForReview } from '../utils/reviewRule';

const DAY = 24 * 3600 * 1000;
const now = Date.UTC(2026, 10, 1);

describe('review prompt rule', () => {
  test('asks after a real flight when never asked before', () => {
    expect(shouldAskForReview({ minutes: 120, sightsHeard: 8, lastAskedAt: 0, now })).toBe(true);
  });
  test('does not ask after a short or empty session', () => {
    expect(shouldAskForReview({ minutes: 10, sightsHeard: 8, lastAskedAt: 0, now })).toBe(false);
    expect(shouldAskForReview({ minutes: 120, sightsHeard: 1, lastAskedAt: 0, now })).toBe(false);
  });
  test('respects the cooldown', () => {
    expect(shouldAskForReview({ minutes: 120, sightsHeard: 8, lastAskedAt: now - 30 * DAY, now })).toBe(false);
    expect(shouldAskForReview({ minutes: 120, sightsHeard: 8, lastAskedAt: now - 200 * DAY, now })).toBe(true);
  });
});
