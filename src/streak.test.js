import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreak, localDateKey, streakMilestone } from './streak.js';

test('the first learned country starts day one immediately', () => {
  assert.deepEqual(calculateStreak([], '2026-09-01'), { count: 0, learnedToday: false });
  assert.deepEqual(calculateStreak(['2026-09-01'], '2026-09-01'), { count: 1, learnedToday: true });
});

test('consecutive calendar days count even when less than 24 hours apart', () => {
  assert.deepEqual(calculateStreak(['2026-09-01', '2026-09-02'], '2026-09-02'), { count: 2, learnedToday: true });
});

test('yesterday remains active until the end of today', () => {
  assert.deepEqual(calculateStreak(['2026-09-01', '2026-09-02'], '2026-09-03'), { count: 2, learnedToday: false });
});

test('a missed day breaks the streak, and a new learned day restarts it', () => {
  assert.deepEqual(calculateStreak(['2026-09-01', '2026-09-02'], '2026-09-04'), { count: 0, learnedToday: false });
  assert.deepEqual(calculateStreak(['2026-09-01', '2026-09-02', '2026-09-04'], '2026-09-04'), { count: 1, learnedToday: true });
});

test('multiple countries on one day count once across month boundaries', () => {
  assert.deepEqual(calculateStreak(['2026-08-31', '2026-09-01', '2026-09-01'], '2026-09-01'), { count: 2, learnedToday: true });
});

test('date keys use the device calendar date', () => {
  const date = new Date(2026, 8, 1, 23, 59);
  assert.equal(localDateKey(date), '2026-09-01');
});

test('a celebration appears only for the first new learning day', () => {
  assert.deepEqual(streakMilestone([], '2026-09-01'), { count: 1, started: true });
  assert.equal(streakMilestone(['2026-09-01'], '2026-09-01'), null);
  assert.deepEqual(streakMilestone(['2026-09-01'], '2026-09-02'), { count: 2, started: false });
});
