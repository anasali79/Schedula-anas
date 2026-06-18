# 🚀 Schedula Backend

A NestJS backend server for the Schedula doctor appointment booking application.

---

## 🌍 Live Links

- **Live Server URL:** [https://schedula-backend-j9k6.onrender.com](https://schedula-backend-j9k6.onrender.com)
- **Postman API Collection:** [View and Test APIs Here](https://www.postman.com/work-anas79-6594293/workspace/anas-ali-s-workspace/collection/50962245-d9f6454f-bca8-472e-91cd-a1de685fce2c?action=share&source=copy-link&creator=50962245)

---

## ✨ Features & Implementations

- **Role-Based Access Control (RBAC):** Secure access for `DOCTOR` and `PATIENT` roles.
- **Authentication:** HTTP-Only JWT Cookie-based session management.
- **Advanced Doctor Scheduling System:**
  - **Recurring Availability:** Weekly schedules with customizable slot durations.
  - **Custom Overrides:** Date-specific schedule modifications.
  - **Unavailability & Auto-Reschedule:** Mark specific dates/times as unavailable and automatically reschedule affected patient appointments.
- **Appointment Booking System:**
  - **Wave and Stream Strategies:** Advanced appointment queue management (e.g., token generation for Wave slots).
  - **Conflict Prevention:** Duplicate booking and overlapping schedule prevention.
- **Dashboards:** Comprehensive Doctor and Patient dashboards with statistics.
- **Data Integrity:** Strict input validation, error handling, and structured RESTful responses.

---

## 🗂️ ER Diagram

![ER Diagram](../ER-Diagram/ER-diagram.png)

---

## 🔐 Environment Variables

Create a `.env` file in the root of the `Backend` directory and configure the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=7d

# Option 1: Hosted DB connection string (Neon / Supabase / Railway)
# DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Option 2: Local PostgreSQL (use when DATABASE_URL is not set)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=schedula
```

---

## ⚙️ Project Setup & Run

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

## 📖 API Documentation (Deep Detail)

### Base Configuration
- **Root Prefix:** `/api`
- **Authentication:** Sessions/Authentications are managed via HTTP-Only JWT Cookie (`token`).

---

## 1. Authentication Section (`/api/auth`)

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

### C. Logout
Clears the JWT `token` authentication cookie.

- **Route:** `POST /api/auth/logout`

### D. Get Current User (`me`)
Returns the authenticated user's details.

- **Route:** `GET /api/auth/me`

---

## 2. Doctor Section (`/api/doctor`)

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

### B. Get Doctor Profile
Retrieves the logged-in doctor's profile.

- **Route:** `GET /api/doctor/profile`
- **Access:** Authenticated `DOCTOR` only.

### C. Find All Doctors (Discovery)
Public search route to let patients look up doctors based on specialization, search terms, or name.

- **Route:** `GET /api/doctor`
- **Query Params:** `specialization`, `search`, `page`, `limit`

### D. Create Recurring Availability
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

### E. Get Detailed Schedule Dashboard
Retrieves a 30-day schedule overview with pre-divided slots (`dividedSlots`).

- **Route:** `GET /api/doctor/availability`
- **Access:** Authenticated `DOCTOR` only.

### F. Create Custom Override
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

### G. Set Unavailable (Auto-Reschedule)
Marks a specific slot or an entire day as unavailable for a doctor. Automatically reschedules any affected appointments to the next available slot within 30 days.

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

### H. Doctor Appointments View
Returns all appointments booked with the authenticated doctor, with patient details.

- **Route:** `GET /api/doctor/appointments`
- **Access:** Authenticated `DOCTOR` only.

---

## 3. Patient Section (`/api/patient` & Booking)

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

### B. Get Patient Dashboard
Provides dashboard statistics for patient view.

- **Route:** `GET /api/patient/dashboard`
- **Access:** Authenticated `PATIENT` only.

### C. Get Patient Bookable Slots
Allows patients to fetch all bookable slots for a specific doctor. Filters out past times and overlapping appointments.

- **Route:** `GET /api/doctor/:doctorId/slots`
- **Query Params:** `date` (Required), `duration` (Optional)

### D. Book Appointment
Patient books an available slot with a doctor.

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

### E. Patient Appointments View
Returns all appointments for the authenticated patient.

- **Route:** `GET /api/appointment/my`
- **Access:** Authenticated `PATIENT` only.

### F. Reschedule Appointment
Patient reschedules their own appointment to a new date and time. Must be done at least 30 minutes prior.

- **Route:** `PATCH /api/appointment/:id/reschedule`
- **Access:** Authenticated `PATIENT` only.
- **Request Body:**
```json
{
  "date": "2026-06-21",
  "startTime": "11:00",
  "endTime": "11:15"
}
```

### G. Cancel Appointment
Patient cancels their own appointment.

- **Route:** `PATCH /api/appointment/:id/cancel`
- **Access:** Authenticated `PATIENT` only.

---

## 📜 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Run in local hot-reload dev mode |
| `npm run build` | Compile code for production |
| `npm run start:prod` | Run the compiled production build |
| `npx typeorm migration:run -d dist/data-source.js` | Run database schema updates |
