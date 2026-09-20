export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function calculateStreak(days, today = localDateKey()) {
  const learnedDays = new Set(days.filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)));
  const learnedToday = learnedDays.has(today);
  let date = learnedToday ? today : previousDateKey(today);
  let count = 0;
  while (learnedDays.has(date)) {
    count += 1;
    date = previousDateKey(date);
  }
  return { count, learnedToday };
}

export function streakMilestone(days, day = localDateKey()) {
  if (days.includes(day)) return null;
  const { count } = calculateStreak([...days, day], day);
  return { count, started: count === 1 };
}
