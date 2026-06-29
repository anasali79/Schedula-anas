// ─── Appointment Socket Event Payload ────────────────────────────────────────
// Sent to doctor:{doctorId} and patient:{patientId} rooms on every
// appointment status change.  Shape is consistent across all events so
// the frontend can use a single handler.

export interface AppointmentEventPayload {
  /** UUID of the appointment that changed */
  appointmentId: string;

  /** UUID of the patient (used to route to patient:{patientId} room) */
  patientId: string;

  /** UUID of the doctor  (used to route to doctor:{doctorId} room) */
  doctorId: string;

  /** New status value, e.g. "CHECKED_IN" | "IN_CONSULTATION" | … */
  status: string;

  /** ISO-8601 timestamp of when the status changed */
  updatedAt: string;
}
