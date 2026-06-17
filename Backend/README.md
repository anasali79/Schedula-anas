# 🚀 Schedula Backend

A NestJS backend server for the Schedula doctor booking app.

---

## 📸 Screenshot

![Hello World Response](../Screenshot/Screenshot 2026-06-04 155720.jpg)

> Server running on `http://localhost:3000` (or `http://localhost:5000` as configured)

---

## 🗂️ ER Diagram

![ER Diagram](../ER-Diagram/ER-diagram.png)

---

## ⚙️ Setup & Run

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or above)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/) database

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Migrations
```bash
npx typeorm migration:run -d dist/data-source.js
```

### 4. Start Development Server
```bash
npm run start:dev
```

---

## 📖 A to Z API Reference & Documentation

### Base Configuration
- **Root Prefix:** `/api`
- **Port:** `3000` (Default)
- **Authentication:** Sessions/Authentications are managed via HTTP-Only JWT Cookie (`token`).

---

## 1. Authentication APIs (`/api/auth`)

### A. Signup
Creates a new user profile with either `DOCTOR` or `PATIENT` role. Saves a JWT cookie named `token`.

- **Route:** `POST /api/auth/signup`
- **Request Body:**
```json
{
  "email": "doctor.test@example.com",
  "password": "SecurePassword123",
  "role": "DOCTOR"
}
```
*Roles can be `"DOCTOR"` or `"PATIENT"`.*

- **Response (`201 Created`):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "e8a93a02-23c2-4a0b-8dfb-f6cd851239aa",
    "email": "doctor.test@example.com",
    "role": "DOCTOR"
  }
}
```

---

### B. Login
Authenticates an existing user and sets an HTTP-Only cookie.

- **Route:** `POST /api/auth/login`
- **Request Body:**
```json
{
  "email": "doctor.test@example.com",
  "password": "SecurePassword123"
}
```
- **Response (`200 OK`):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "e8a93a02-23c2-4a0b-8dfb-f6cd851239aa",
    "email": "doctor.test@example.com",
    "role": "DOCTOR"
  }
}
```

---

### C. Logout
Clears the JWT `token` authentication cookie.

- **Route:** `POST /api/auth/logout`
- **Response (`200 OK`):**
```json
{
  "message": "Logged out successfully"
}
```

---

### D. Get Current User (`me`)
Returns the authenticated user's details.

- **Route:** `GET /api/auth/me`
- **Headers:** Requires valid auth cookie.
- **Response (`200 OK`):**
```json
{
  "user": {
    "id": "e8a93a02-23c2-4a0b-8dfb-f6cd851239aa",
    "email": "doctor.test@example.com",
    "role": "DOCTOR"
  }
}
```

---

## 2. Doctor Discovery & Profile APIs (`/api/doctor`)

### A. Create Doctor Profile
Sets up specialized profile details for an authenticated doctor.

- **Route:** `POST /api/doctor/profile`
- **Access:** Authenticated `DOCTOR` only.
- **Request Body:**
```json
{
  "name": "Dr. John Doe",
  "specialization": "Cardiologist",
  "experience": 10,
  "consultationFee": 500,
  "clinicAddress": "123 Health Street, Clinic City",
  "phoneNumber": "+1234567890"
}
```
- **Response (`201 Created`):**
```json
{
  "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
  "userId": "e8a93a02-23c2-4a0b-8dfb-f6cd851239aa",
  "name": "Dr. John Doe",
  "specialization": "Cardiologist",
  "experience": 10,
  "consultationFee": 500,
  "clinicAddress": "123 Health Street, Clinic City",
  "phoneNumber": "+1234567890",
  "createdAt": "2026-06-12T15:00:00.000Z",
  "updatedAt": "2026-06-12T15:00:00.000Z"
}
```

---

### B. Get Doctor Profile
Retrieves the logged-in doctor's profile.

- **Route:** `GET /api/doctor/profile`
- **Access:** Authenticated `DOCTOR` only.
- **Response (`200 OK`):**
```json
{
  "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
  "name": "Dr. John Doe",
  "specialization": "Cardiologist",
  "experience": 10,
  "consultationFee": 500,
  "clinicAddress": "123 Health Street, Clinic City",
  "phoneNumber": "+1234567890"
}
```

---

### C. Find All Doctors (Discovery)
Public search route to let patients look up doctors based on specialization, search terms, or name.

- **Route:** `GET /api/doctor`
- **Query Params:**
  - `specialization`: filter by doctor's field
  - `search`: search by name or clinic address
  - `page`: default `1`
  - `limit`: default `10`
- **Example:** `GET /api/doctor?specialization=Cardiologist&limit=2`
- **Response (`200 OK`):**
```json
{
  "data": [
    {
      "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
      "name": "Dr. John Doe",
      "specialization": "Cardiologist",
      "experience": 10,
      "consultationFee": 500,
      "clinicAddress": "123 Health Street, Clinic City"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 2,
    "totalPages": 1
  }
}
```

---

## 3. Doctor Availability APIs (`/api/doctor/availability`)

### A. Create Recurring Availability
Enters a weekly availability block (e.g. MONDAYs 09:00 to 12:00) with custom slot duration.

- **Route:** `POST /api/doctor/availability`
- **Access:** Authenticated `DOCTOR` only.
- **Request Body:**
```json
{
  "dayOfWeek": "MONDAY",
  "startTime": "09:00",
  "endTime": "12:00",
  "slotDuration": 30
}
```
*`slotDuration` defaults to `15` if omitted.*

- **Response (`201 Created`):**
```json
{
  "message": "Recurring availability slot created successfully",
  "data": {
    "id": "76eb0a4e-d63c-4573-bd60-44a69e715aa1",
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "12:00",
    "slotDuration": 30
  }
}
```

---

### B. Get Detailed Schedule Dashboard
Retrieves a 30-day schedule overview with pre-divided slots (`dividedSlots`).

- **Route:** `GET /api/doctor/availability`
- **Access:** Authenticated `DOCTOR` only.
- **Response (`200 OK`):**
```json
{
  "message": "Detailed availability dashboard retrieved successfully",
  "data": {
    "doctorId": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
    "generatedSchedule": [
      {
        "date": "2026-06-15",
        "dayOfWeek": "MONDAY",
        "source": "recurring",
        "slots": [
          {
            "id": "76eb0a4e-d63c-4573-bd60-44a69e715aa1",
            "startTime": "09:00",
            "endTime": "12:00",
            "slotDuration": 30,
            "dividedSlots": [
              { "startTime": "09:00", "endTime": "09:30" },
              { "startTime": "09:30", "endTime": "10:00" },
              { "startTime": "10:00", "endTime": "10:30" },
              { "startTime": "10:30", "endTime": "11:00" },
              { "startTime": "11:00", "endTime": "11:30" },
              { "startTime": "11:30", "endTime": "12:00" }
            ]
          }
        ]
      }
    ]
  }
}
```

---

### C. Create Custom Override
Allows specifying date-specific work hours that override weekly schedules.

- **Route:** `POST /api/doctor/availability/override`
- **Access:** Authenticated `DOCTOR` only.
- **Request Body:**
```json
{
  "date": "2026-06-20",
  "startTime": "14:00",
  "endTime": "16:00",
  "slotDuration": 20
}
```
- **Response (`201 Created`):**
```json
{
  "message": "Custom availability override created successfully",
  "data": {
    "id": "cf14ab92-9cf0-4bb5-8664-cd25a2e573ff",
    "date": "2026-06-20",
    "startTime": "14:00",
    "endTime": "16:00",
    "slotDuration": 20
  }
}
```

---

### D. Cancel Specific Occurrence
Removes a specific range on a given date. If no slots are left for that date, a blockout (`00:00 - 00:00`) override is generated to mark the doctor unavailable.

- **Route:** `POST /api/doctor/availability/cancel`
- **Access:** Authenticated `DOCTOR` only.
- **Request Body:**
```json
{
  "date": "2026-06-22",
  "startTime": "09:00",
  "endTime": "12:00"
}
```
- **Response (`200 OK`):**
```json
{
  "message": "Slot 09:00-12:00 on 2026-06-22 has been cancelled successfully"
}
```

---

### E. Set Unavailable (Auto-Reschedule)
Marks a specific slot or an entire day as unavailable for a doctor. Automatically reschedules any affected appointments to the next available slot within 30 days and notifies via response.

- **Route:** `POST /api/doctor/availability/unavailable`
- **Access:** Authenticated `DOCTOR` only.
- **Request Body:**
```json
{
  "date": "2026-06-22",
  "startTime": "09:00",
  "endTime": "12:00"
}
```
*`startTime` and `endTime` are optional. If omitted, the entire day is blocked.*

- **Response (`200 OK`):**
```json
{
  "message": "Slot 09:00-12:00 on 2026-06-22 is now marked as unavailable. Affected appointments have been rescheduled.",
  "rescheduledAppointments": [
    {
      "appointmentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "patientId": "fa15f013-1cf0-4bb5-8664-cd25a2e57305",
      "previousDate": "2026-06-22",
      "previousStartTime": "09:00",
      "previousEndTime": "09:15",
      "newDate": "2026-06-22",
      "newStartTime": "13:00",
      "newEndTime": "13:15",
      "tokenNumber": 2
    }
  ]
}
```

---

### F. Get Patient Bookable Slots (The Core Feature)
Allows patients to fetch all bookable slots. Filters out past times and overlapping appointments.

- **Route:** `GET /api/doctor/:doctorId/slots`
- **Query Params:**
  - `date`: `YYYY-MM-DD` (Required)
  - `duration`: `number` (Optional - override slot size)
- **Example:** `GET /api/doctor/2a15f013-1cf0-4bb5-8664-cd25a2e57303/slots?date=2026-06-20`
- **Response (`200 OK`):**
```json
{
  "message": "Available slots retrieved successfully",
  "data": [
    { "startTime": "14:00", "endTime": "14:20" },
    { "startTime": "14:20", "endTime": "14:40" },
    { "startTime": "14:40", "endTime": "15:00" },
    { "startTime": "15:00", "endTime": "15:20" },
    { "startTime": "15:20", "endTime": "15:40" },
    { "startTime": "15:40", "endTime": "16:00" }
  ]
}
```

---

## 4. Patient Profile APIs (`/api/patient`)

### A. Create Patient Profile
Sets up patient record card details.

- **Route:** `POST /api/patient/profile`
- **Access:** Authenticated `PATIENT` only.
- **Request Body:**
```json
{
  "name": "Jane Smith",
  "dateOfBirth": "1995-08-22",
  "gender": "FEMALE",
  "phoneNumber": "+1987654321",
  "bloodGroup": "O+"
}
```
- **Response (`201 Created`):**
```json
{
  "id": "fa15f013-1cf0-4bb5-8664-cd25a2e57305",
  "userId": "d7a93a02-23c2-4a0b-8dfb-f6cd851239bb",
  "name": "Jane Smith",
  "dateOfBirth": "1995-08-22",
  "gender": "FEMALE",
  "phoneNumber": "+1987654321",
  "bloodGroup": "O+"
}
```

---

### B. Get Patient Dashboard
Provides dashboard statistics for patient view.

- **Route:** `GET /api/patient/dashboard`
- **Access:** Authenticated `PATIENT` only.
- **Response (`200 OK`):**
```json
{
  "message": "Patient dashboard",
  "data": {
    "patientId": "fa15f013-1cf0-4bb5-8664-cd25a2e57305",
    "email": "patient@example.com",
    "role": "PATIENT",
    "stats": {
      "upcomingAppointments": 0,
      "pastAppointments": 0,
      "prescriptions": 0
    }
  }
}
```

---

## 5. Appointment Booking & Management APIs

### Appointment Status Enum

| Status | Description |
|--------|-------------|
| `BOOKED` | Appointment is active and confirmed |
| `CANCELLED` | Appointment was cancelled by the patient |

---

### A. Book Appointment
Patient books an available slot with a doctor. Validates doctor existence, slot availability, future date/time, duplicate booking, and patient role.

- **Route:** `POST /api/appointment`
- **Access:** Authenticated `PATIENT` only.
- **Request Body:**
```json
{
  "doctorId": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
  "date": "2026-06-20",
  "startTime": "10:00",
  "endTime": "10:15"
}
```
- **Response (`201 Created`):**
```json
{
  "message": "Appointment booked successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "date": "2026-06-20",
    "startTime": "10:00",
    "endTime": "10:15",
    "status": "BOOKED",
    "tokenNumber": 1,
    "doctor": {
      "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
      "fullName": "Dr. John Doe",
      "specialization": "Cardiologist",
      "consultationFee": 500
    },
    "createdAt": "2026-06-15T14:00:00.000Z",
    "updatedAt": "2026-06-15T14:00:00.000Z"
  }
}
```

*Note: The `tokenNumber` field is only returned if the appointment was booked on a `WAVE` scheduling slot. It is omitted for `STREAM` slots.*

**Validation Error Examples:**
- `400` — Doctor not found
- `400` — Cannot book past date/time
- `400` — Invalid/unavailable slot
- `409` — Slot already booked
- `403` — Unauthorized (non-patient role)

---

### B. Patient Appointments View
Returns all appointments for the authenticated patient with doctor details.

- **Route:** `GET /api/appointment/my`
- **Access:** Authenticated `PATIENT` only.
- **Response (`200 OK`):**
```json
{
  "message": "Appointments retrieved successfully",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "date": "2026-06-20",
      "startTime": "10:00",
      "endTime": "10:15",
      "status": "BOOKED",
      "tokenNumber": 1,
      "doctor": {
        "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
        "fullName": "Dr. John Doe",
        "specialization": "Cardiologist",
        "consultationFee": 500
      },
      "createdAt": "2026-06-15T14:00:00.000Z",
      "updatedAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

---

### C. Cancel Appointment
Patient cancels their own appointment. Cannot cancel others' appointments, already-cancelled, or past appointments.

- **Route:** `PATCH /api/appointment/:id/cancel`
- **Access:** Authenticated `PATIENT` only (appointment owner).
- **Response (`200 OK`):**
```json
{
  "message": "Appointment cancelled successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "date": "2026-06-20",
    "startTime": "10:00",
    "endTime": "10:15",
    "status": "CANCELLED",
    "tokenNumber": 1,
    "doctor": {
      "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
      "fullName": "Dr. John Doe",
      "specialization": "Cardiologist",
      "consultationFee": 500
    },
    "createdAt": "2026-06-15T14:00:00.000Z",
    "updatedAt": "2026-06-15T14:30:00.000Z"
  }
}
```

**Validation Error Examples:**
- `404` — Appointment not found
- `403` — Not the appointment owner
- `400` — Already cancelled
- `400` — Cannot cancel past appointment

---

### D. Reschedule Appointment
Patient reschedules their own appointment to a new date and time. Must be done at least 30 minutes prior to the original appointment. Automatically cancels the old slot and reserves the new one.

- **Route:** `PATCH /api/appointment/:id/reschedule`
- **Access:** Authenticated `PATIENT` only (appointment owner).
- **Request Body:**
```json
{
  "date": "2026-06-21",
  "startTime": "11:00",
  "endTime": "11:15"
}
```
- **Response (`200 OK`):**
```json
{
  "message": "Appointment rescheduled successfully",
  "data": {
    "previousAppointment": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "date": "2026-06-20",
      "startTime": "10:00",
      "endTime": "10:15",
      "status": "RESCHEDULED"
    },
    "newAppointment": {
      "id": "b2c3d4e5-f678-90ab-cdef-123456789012",
      "date": "2026-06-21",
      "startTime": "11:00",
      "endTime": "11:15",
      "status": "BOOKED",
      "tokenNumber": 1,
      "doctor": {
        "id": "2a15f013-1cf0-4bb5-8664-cd25a2e57303",
        "fullName": "Dr. John Doe",
        "specialization": "Cardiologist",
        "consultationFee": 500
      },
      "createdAt": "2026-06-15T15:00:00.000Z",
      "updatedAt": "2026-06-15T15:00:00.000Z"
    }
  }
}
```

---

### E. Doctor Appointments View
Returns all appointments booked with the authenticated doctor, with patient details.

- **Route:** `GET /api/doctor/appointments`
- **Access:** Authenticated `DOCTOR` only.
- **Response (`200 OK`):**
```json
{
  "message": "Appointments retrieved successfully",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "date": "2026-06-20",
      "startTime": "10:00",
      "endTime": "10:15",
      "status": "BOOKED",
      "tokenNumber": 1,
      "patient": {
        "id": "fa15f013-1cf0-4bb5-8664-cd25a2e57305",
        "fullName": "Jane Smith",
        "age": 30,
        "gender": "FEMALE",
        "phone": "+1987654321"
      },
      "createdAt": "2026-06-15T14:00:00.000Z",
      "updatedAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

---

### Edge Cases Handled

| Edge Case | HTTP Status | Error Message |
|-----------|-------------|---------------|
| Doctor not found | `404` | Doctor with ID {id} not found |
| Patient profile missing | `404` | Patient profile not found |
| Invalid slot | `400` | Slot is not available for this doctor |
| Slot already booked | `409` | This slot is already booked |
| Past date booking | `400` | Cannot book appointment for a past date |
| Past time booking | `400` | Cannot book appointment for a past time slot |
| Invalid appointment ID | `400` | Invalid appointment ID format |
| Unauthorized access | `403` | Access denied |
| Already cancelled | `400` | This appointment is already cancelled |
| Cancel past appointment | `400` | Cannot cancel a past appointment |
| No appointments found | `200` | No appointments found (empty array) |

---

## 📜 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Run in local hot-reload dev mode |
| `npm run build` | Compile code for production |
| `npm run start:prod` | Run the compiled production build |
| `npx typeorm migration:run -d dist/data-source.js` | Run database schema updates |
