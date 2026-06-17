export interface ConsultationSlot {
  start: string;
  end: string;
}
export type ConsultationHours = Record<string, ConsultationSlot[]>;

export type AvailabilityStatus = 'available' | 'unavailable';

export function getAvailabilityStatus(
  consultationHours: ConsultationHours | null | undefined,
): AvailabilityStatus {
  return isDoctorAvailable(consultationHours) ? 'available' : 'unavailable';
}

export function isDoctorAvailable(
  consultationHours: ConsultationHours | null | undefined,
): boolean {
  if (!consultationHours || typeof consultationHours !== 'object') {
    return false;
  }

  return Object.values(consultationHours).some(
    (slots) => Array.isArray(slots) && slots.length > 0,
  );
}
