import { type TimetableSlot, getDb } from './db';

export interface SlotWithUnit extends TimetableSlot {
  unit_code: string;
  unit_name: string;
  unit_color: string;
}

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// 1 = Monday ... 7 = Sunday (matches the DB)
export function todayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

const SELECT = `
  SELECT s.*, u.code AS unit_code, u.name AS unit_name, u.color AS unit_color
  FROM timetable_slots s
  JOIN units u ON u.id = s.unit_id
`;

export async function listSlots(day?: number): Promise<SlotWithUnit[]> {
  const db = await getDb();
  if (day !== undefined) {
    return db.getAllAsync<SlotWithUnit>(
      `${SELECT} WHERE s.day = ? ORDER BY s.start`,
      day
    );
  }
  return db.getAllAsync<SlotWithUnit>(`${SELECT} ORDER BY s.day, s.start`);
}

export async function addSlot(
  unitId: number,
  day: number,
  startHour: number,
  durationHours: number,
  venue: string
): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO timetable_slots (unit_id, day, start, "end", venue) VALUES (?, ?, ?, ?, ?)',
    unitId,
    day,
    formatHour(startHour),
    formatHour(startHour + durationHours),
    venue.trim() === '' ? null : venue.trim()
  );
  return res.lastInsertRowId;
}

export async function deleteSlot(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM timetable_slots WHERE id = ?', id);
}
