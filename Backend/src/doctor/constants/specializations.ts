export const VALID_SPECIALIZATIONS = [
  'cardiologist',
  'dermatologist',
  'neurologist',
  'pediatrician',
  'orthopedist',
  'general physician',
  'gynecologist',
  'psychiatrist',
  'ophthalmologist',
  'ent specialist',
] as const;

export type Specialization = (typeof VALID_SPECIALIZATIONS)[number];

export function isValidSpecialization(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return VALID_SPECIALIZATIONS.some((s) => s === normalized);
}

export function normalizeSpecialization(value: string): string {
  return value.trim().toLowerCase();
}
