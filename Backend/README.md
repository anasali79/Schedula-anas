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

### E. Get Patient Bookable Slots (The Core Feature)
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

## 📜 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Run in local hot-reload dev mode |
| `npm run build` | Compile code for production |
| `npm run start:prod` | Run the compiled production build |
| `npx typeorm migration:run -d dist/data-source.js` | Run database schema updates |
