# 🏥 DelhiMed — Full Stack Healthcare Platform

> **Backend:** Node.js · Express · MongoDB · Gemini AI · Razorpay · Cloudinary  
> **Frontend:** React 18 · Vite · Axios · Context API

Full-stack healthcare platform powering doctor appointments, medication tracking, AI-analyzed medical reports, patient health profiles, and modern web UI.

---

## 📋 Table of Contents

### Backend

- [Getting Started](#-getting-started)
- [Tech Stack (Backend/Frontend)](#-tech-stack)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Backend Architecture](#-backend-architecture)
- [API Routes](#-api-routes)
  - [Auth](#auth----apiauth)
  - [Appointments](#appointments----apiappointment)
  - [Doctor](#doctor----apidoctor)
  - [Health Profile](#health-profile----apihealthprofile)
  - [Medication](#medication----apimedication)
  - [Payment](#payment----apipayment)
  - [Queue](#queue----apiqueue)
  - [Report](#report----apireport)
  - [User](#user----apiuser)
- [MongoDB Schemas](#-mongodb-schemas)
- [Services · Jobs · Utils](#-services--jobs--utils)
- [Middleware](#-middleware)

### Frontend

- [Frontend Tech Stack](#-frontend-tech-stack)
- [Frontend Routes](#-frontend-routes)
- [Component Architecture](#-component-architecture)
- [State Management](#-state-management)

### General

- [Known Issues / Gotchas](#-known-issues--gotchas)
- [Full Documentation Reference](#-full-documentation-reference)

---

## 🚀 Getting Started

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file (see section below)

# 4. Start development server
npm run dev

# 5. Start production server
npm start
```

Backend server runs on `http://localhost:8080` by default.

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build for production
npm run build

# 5. Preview production build
npm run preview
```

Frontend dev server runs on `http://localhost:5173` by default (Vite).

### Running Both Together

```bash
# Terminal 1: Start Backend
cd backend && npm run dev

# Terminal 2: Start Frontend
cd frontend && npm run dev
```

Then open: `http://localhost:5173` in your browser (frontend will proxy API calls to backend)

---

## 🛠 Tech Stack

### Backend

| Layer         | Technology            |
| ------------- | --------------------- |
| Runtime       | Node.js               |
| Framework     | Express.js            |
| Database      | MongoDB (Mongoose)    |
| AI            | Google Gemini API     |
| Payments      | Razorpay              |
| File Storage  | Cloudinary            |
| Auth          | JWT                   |
| Notifications | Twilio (SMS/WhatsApp) |

### Frontend

| Layer            | Technology  |
| ---------------- | ----------- |
| Framework        | React 18    |
| Build Tool       | Vite        |
| State Management | Context API |
| HTTP Client      | Axios       |
| Styling          | CSS Modules |
| Package Manager  | npm         |

---

## 📁 Project Structure

### Backend Structure

```
backend/
├── server.js                   # Express app entry, mounts all routers
├── package.json
├── .env
│
├── controllers/                # Route handler logic (business logic)
│   ├── adminController.js
│   ├── appointmentController.js
│   ├── authControllers.js
│   ├── doctorController.js
│   ├── healthProfileController.js
│   ├── medicationController.js
│   ├── paymentController.js
│   ├── queueController.js
│   ├── reportController.js
│   └── userController.js
│
├── routes/                     # Express routers (URL mapping only)
│   ├── adminRoute.js
│   ├── authRoutes.js
│   ├── appointment.js
│   ├── doctorRoutes.js
│   ├── healthProfileRoute.js
│   ├── medicationRoute.js
│   ├── paymentRoute.js
│   ├── queueRoute.js
│   ├── reportRoute.js
│   ├── statusRoute.js
│   └── userRoute.js
│
├── models/                     # Mongoose schemas & models
│   ├── appointmentSchema.js
│   ├── docterSchema.js
│   ├── medicationSchema.js
│   ├── patientHealthSumSchema.js
│   ├── queueSchema.js
│   ├── reportSchema.js
│   └── userSchema.js
│
├── middleware/                 # Auth, role, admin guards
│   ├── authmiddleware.js
│   ├── adminOnly.js
│   └── roleMiddleware.js
│
├── services/                   # External API wrappers
│   └── geminiService.js
│
├── jobs/                       # Background async tasks
│   ├── processReport.js
│   └── updateHealthProfile.js
│
└── utils/                      # Pure helper functions
    └── calculateETA.js
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.jsx                # React app entry point
│   ├── App.jsx                 # Main router & route definitions
│   ├── App.css                 # Global styles
│   ├── index.css               # Base CSS resets
│   │
│   ├── api/
│   │   └── axios.jsx           # Axios instance with interceptors
│   │
│   ├── context/
│   │   ├── AuthContext.jsx     # Auth context definition
│   │   ├── AuthProvider.jsx    # Auth context provider
│   │   └── useAuth.js          # Custom auth hook
│   │
│   ├── components/             # Reusable UI components
│   │   ├── Navbar.jsx / .css
│   │   ├── SlideBar.jsx / .css
│   │   ├── BottomNav.jsx
│   │   ├── PageLoader.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── AppointmentCard.jsx / .css
│   │   ├── DoctorCard.jsx / .css
│   │   ├── MedicationBox.jsx / .css
│   │   ├── PatientIdCard.jsx / .css
│   │   ├── PinModal.jsx / .css
│   │   ├── UpcomingApp.jsx / .css
│   │   ├── UploadBox.jsx / .css
│   │   ├── UploadOptionSheet.jsx / .css
│   │   ├── PaymentUtils.jsx
│   │   └── HealthProfile/      # Health profile subcomponents
│   │
│   ├── pages/                  # Full page components (routes)
│   │   ├── Login.jsx / .css
│   │   ├── Signup.jsx
│   │   ├── DoctorSignUp.jsx / .css
│   │   ├── Home.jsx / .css
│   │   ├── AdminHome.jsx / .css
│   │   ├── DoctorHome.jsx / .css
│   │   ├── DoctorList.jsx / .css
│   │   ├── AppointmentBook.jsx / .css
│   │   ├── MyAppointment.jsx / .css
│   │   ├── Payment.jsx / .css
│   │   ├── LiveQueue.jsx / .css
│   │   ├── Profile.jsx / .css
│   │   ├── Report.jsx / .css
│   │   ├── ReportUpload.jsx / .css
│   │   ├── ReportDetails.jsx / .css
│   │   ├── PatientDetails.jsx / .css
│   │   ├── HealthProfile/
│   │   └── HealthProfileSetup/
│   │
│   ├── assets/                 # Images, icons, static files
│   └── utils/                  # Utility functions
│
├── package.json
├── vite.config.js
└── index.html
```

---

## 🔑 Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=8080
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash        # optional, has fallback

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE=your_twilio_phone
```

---

## 🏗️ Backend Architecture

### Data Flow

```
Request → Express Router → Middleware (JWT, Role Check) → Controller → Mongoose Model → MongoDB
                                                                ↓
                                                      Background Job (Gemini AI)
                                                                ↓
                                                      Health Profile Aggregation
```

### Key Design Patterns

1. **Token + PIN System** — On payment confirmation, patient receives a queue token (from `Queue.lastTokenNumber`) and a bcrypt-hashed PIN via SMS
2. **Fire-and-Forget Jobs** — AI processing happens asynchronously after HTTP response; controllers don't wait for AI completion
3. **No Service Layer** — Controllers directly invoke Mongoose models (except `geminiService.js` for external API)
4. **Razorpay Flow** — Frontend initiates payment, backend verifies HMAC signature, finalizes appointment
5. **Hard Deletes Only** — No soft deletes; Cloudinary assets deleted before database records

---

## 🔀 API Routes

All routes require `Authorization: Bearer <token>` unless marked **Public**.

---

### Auth — `/api/auth`

| Method | Endpoint           | Auth   | Description                                                     |
| ------ | ------------------ | ------ | --------------------------------------------------------------- |
| `POST` | `/api/auth/signup` | Public | Registers a new user account and returns JWT token.             |
| `POST` | `/api/auth/login`  | Public | Authenticates user or doctor credentials and returns JWT token. |

---

### Appointments — `/api/appointments`

| Method | Endpoint                             | Auth    | Description                                                          |
| ------ | ------------------------------------ | ------- | -------------------------------------------------------------------- |
| `GET`  | `/api/appointments/my-appointments`  | 🔒 User | Returns a protected test response with current user id.              |
| `GET`  | `/api/appointments/booked-slots`     | 🔒 User | Returns already booked slots for a doctor on a given date.           |
| `POST` | `/api/appointments/book`             | 🔒 User | Validates slot and creates a Razorpay order for appointment booking. |
| `GET`  | `/api/appointments/my-appointements` | 🔒 User | Returns logged-in patient appointments with doctor details.          |
| `GET`  | `/api/appointments/:id/status`       | 🔒 User | Returns queue position, ETA, and live appointment status.            |
| `PUT`  | `/api/appointments/:id/arrive`       | 🔒 User | Verifies appointment PIN and marks patient as arrived.               |

---

### Doctor — `/api/doctors`

| Method | Endpoint                  | Auth     | Description                                                      |
| ------ | ------------------------- | -------- | ---------------------------------------------------------------- |
| `POST` | `/api/doctors/signup`     | 🔒 Admin | Creates doctor account (admin-only) and returns JWT token.       |
| `GET`  | `/api/doctors/allDoctors` | Public   | Returns doctor listing with key profile and availability fields. |
| `GET`  | `/api/doctors/:id`        | Public   | Returns full details for a specific doctor.                      |

---

### Health Profile — `/api/healthProfile`

| Method   | Endpoint                       | Auth    | Description                                            |
| -------- | ------------------------------ | ------- | ------------------------------------------------------ |
| `GET`    | `/api/healthProfile/`          | 🔒 User | Returns complete patient health profile.               |
| `PUT`    | `/api/healthProfile/user-data` | 🔒 User | Saves manual user-provided health information.         |
| `DELETE` | `/api/healthProfile/`          | 🔒 User | Deletes patient health profile document.               |
| `GET`    | `/api/healthProfile/ai-only`   | 🔒 User | Returns only the AI-extracted section of the profile.  |
| `GET`    | `/api/healthProfile/user-only` | 🔒 User | Returns only the user-provided section of the profile. |

---

### Medication — `/api/medications`

| Method  | Endpoint                       | Auth    | Description                                              |
| ------- | ------------------------------ | ------- | -------------------------------------------------------- |
| `GET`   | `/api/medications/`            | 🔒 User | Returns all medications for the logged-in user.          |
| `POST`  | `/api/medications/`            | 🔒 User | Creates a new medication record for the user.            |
| `PATCH` | `/api/medications/reset-daily` | 🔒 User | Resets the taken flag to false for all user medications. |
| `PATCH` | `/api/medications/:id`         | 🔒 User | Updates the taken status of one medication entry.        |

---

### Payment — `/api/payment`

| Method | Endpoint                    | Auth    | Description                                                         |
| ------ | --------------------------- | ------- | ------------------------------------------------------------------- |
| `POST` | `/api/payment/verify`       | 🔒 User | Verifies Razorpay signature and finalizes a paid appointment.       |
| `POST` | `/api/payment/upi-confirm`  | 🔒 User | Confirms UPI payment flow and finalizes appointment with token/PIN. |
| `POST` | `/api/payment/cash-confirm` | 🔒 User | Finalizes cash appointment and reserves slot/token.                 |

---

### Queue — `/api/queues`

| Method | Endpoint           | Auth      | Description                                                       |
| ------ | ------------------ | --------- | ----------------------------------------------------------------- |
| `PUT`  | `/api/queues/next` | 🔒 Doctor | Advances doctor queue to next token and marks previous as served. |

---

### Report — `/api/reports`

| Method   | Endpoint                              | Auth    | Description                                                                    |
| -------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `POST`   | `/api/reports/upload`                 | 🔒 User | Uploads report to Cloudinary, saves metadata, starts AI background processing. |
| `GET`    | `/api/reports/`                       | 🔒 User | Returns all reports for the logged-in user.                                    |
| `GET`    | `/api/reports/:id/ai-status`          | 🔒 User | Returns AI processing state, summary, and AI error for one report.             |
| `POST`   | `/api/reports/:id/regenerate-summary` | 🔒 User | Resets AI state and re-triggers background summary generation.                 |
| `GET`    | `/api/reports/:id`                    | 🔒 User | Returns one report document for the user.                                      |
| `PATCH`  | `/api/reports/:id`                    | 🔒 User | Updates report metadata fields.                                                |
| `DELETE` | `/api/reports/:id`                    | 🔒 User | Deletes report from Cloudinary and database.                                   |

---

### User — `/api/user`

| Method  | Endpoint                    | Auth    | Description                                             |
| ------- | --------------------------- | ------- | ------------------------------------------------------- |
| `GET`   | `/api/user/profile`         | 🔒 User | Returns logged-in user profile (without password).      |
| `PATCH` | `/api/user/profile`         | 🔒 User | Updates editable profile fields for the logged-in user. |
| `POST`  | `/api/user/profile/picture` | 🔒 User | Uploads and updates profile picture via Cloudinary.     |

---

## 🗄️ MongoDB Schemas

### `userSchema`

`name` · `phone` · `email` · `password` · `role` · `abhaId` · `profilePicture` · `createdAt` · `updatedAt`

### `docterSchema`

`name` · `phone` · `email` · `password` · `speciality` · `startTime` · `avgConsultTime` · `fees`

### `appointmentSchema`

`patientId` · `doctorId` · `date` · `slotTime` · `appointmentNumber` · `pinHash` · `status` · `paymentStatus` · `createdAt` · `updatedAt`

### `medicationSchema`

`userId` · `name` · `dosage` · `time` · `taken` · `createdAt` · `updatedAt`

### `queueSchema`

`doctorId` · `date` · `currentNumber` · `lastTokenNumber` · `lastUpdatedAt` · `createdAt` · `updatedAt`

### `reportSchema`

`userId` · `fileName` · `fileUrl` · `fileType` · `fileSize` · `cloudinaryPublicId` · `reportType` · `doctorClinicName` · `reportDate` · `uploadedBy` · `tags` · `uploadedAt` · `aiStatus` · `aiSummary.testTable` · `aiSummary.plainSummary` · `aiSummary.extractedHealthData` · `aiSummary.reportTypeDetected` · `aiSummary.generatedAt` · `aiError` · `createdAt` · `updatedAt`

**aiStatus values:**

- `'pending'` — Just uploaded, AI processing not started
- `'processing'` — Gemini API call in progress
- `'completed'` — AI analysis complete, all fields populated
- `'failed'` — AI error occurred; check `aiError` field for reason

**plainSummary format:**
Array of 4–6 Hinglish strings in format: `"🟢 Hemoglobin normal hai, khoon ki kami nahi"` or `"🟡 💡 Oily khana kam karein"`. Each string must start with severity emoji, no medical jargon.

### `patientHealthSumSchema`

**`aiExtracted`**
`bloodGroup` · `detectedAllergies` · `currentMedications` · `personalizedInsights` · `lastUpdated`

`labValues`: `hemoglobin` · `wbc` · `platelets` · `bloodSugar` · `creatinine` · `urea` · `sodium` · `potassium` · `sgpt` · `sgot` · `bilirubin` · `cholesterol`

`specialFlags`: `anemia` · `infection` · `kidneyIssue` · `liverIssue` · `diabetesRisk`

`trends`: `hemoglobin` · `wbc` · `sugar`

**`userProvided`**
`conditions`: `diabetes` · `hypertension` · `thyroid`

`pastEvents`: `surgeries` · `injuries` · `majorIllness`

`medications` · `allergies` · `currentSymptoms` · `completedAt`

`familyHistory`: `diabetes` · `heartDisease` · `cancer` · `geneticConditions`

`lifestyle`: `smoking` · `alcohol`

**`quickSummary`**
`criticalAlerts` · `shortSummary` · `lastGenerated`

---

## ⚙️ Services · Jobs · Utils

### `services/geminiService.js`

| Function             | Description                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| `getGeminiModel`     | Returns Gemini model id from env or default fallback.                             |
| `fetchFileAsBase64`  | Downloads remote report file and converts it to base64 with content type.         |
| `resolveMimeType`    | Resolves effective MIME type using response header or file extension fallback.    |
| `parseGeminiJSON`    | Cleans Gemini response text and parses strict JSON output.                        |
| `analyzeReport`      | Sends one uploaded report to Gemini, returns structured extracted summary.        |
| `buildHealthProfile` | Sends multiple report summaries to Gemini, returns consolidated profile insights. |

### `jobs/processReport.js`

| Function                    | Description                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `processReportInBackground` | Updates report AI state, runs Gemini analysis, stores `aiSummary`, triggers profile refresh. |

### `jobs/updateHealthProfile.js`

| Function                    | Description                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `updateHealthProfileAI`     | Aggregates completed report summaries, calls Gemini, upserts `aiExtracted` profile data. |
| `updateHealthProfileManual` | Upserts user-provided health form data into profile with a completion timestamp.         |

### `utils/calculateETA.js`

| Function       | Description                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------- |
| `calculateETA` | Computes remaining queue count and estimated wait from token difference and avg consult time. |

---

## 🛡️ Middleware

| File                | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `authmiddleware.js` | Verifies JWT from `Authorization` header; attaches decoded user to `req.user`. |
| `adminOnly.js`      | Blocks non-admin requests; protects privileged routes like doctor signup.      |
| `roleMiddleware.js` | Checks `req.user.role` against allowed roles; returns 403 if access is denied. |

---

## 🎨 Frontend Tech Stack

| Layer            | Technology  |
| ---------------- | ----------- |
| Framework        | React 18    |
| Build Tool       | Vite        |
| State Management | Context API |
| HTTP Client      | Axios       |
| Styling          | CSS Modules |
| Package Manager  | npm         |

---

## 🎯 Frontend Routes

### Public Routes (No Auth Required)

```
GET  /login                 → Login.jsx      — User or Doctor login
GET  /signup                → Signup.jsx     — Patient registration
```

### Patient Routes (Auth + role='user')

```
GET  /home                      → Home.jsx                  — Patient dashboard
GET  /doctors                   → DoctorList.jsx            — Browse available doctors
GET  /appointment/book/:doctorId → AppointmentBook.jsx      — Slot selection & booking
GET  /my-appointments           → MyAppointment.jsx         — View booked appointments
GET  /appointment/:id/payment   → Payment.jsx               — Payment processing
GET  /profile                   → Profile.jsx               — Edit user profile
GET  /reports                   → Report.jsx                — Medical reports list
GET  /reports/upload            → ReportUpload.jsx          — Upload new report
GET  /reports/:id               → ReportDetails.jsx         — View report + AI analysis
GET  /health-profile            → PatientDetails.jsx        — View aggregated health profile
GET  /health-profile/setup      → HealthProfileSetup/       — Manual health info form
```

### Doctor Routes (Auth + role='doctor')

```
GET  /doctor/home               → DoctorHome.jsx            — Doctor dashboard
GET  /doctor/queue              → LiveQueue.jsx             — Monitor patient queue
GET  /doctor/patient/:appointmentId → PatientDetails.jsx    — View patient health profile
```

### Admin Routes (Auth + role='admin')

```
GET  /admin/home                → AdminHome.jsx             — Admin dashboard
```

---

## 🏛️ Component Architecture

### Authentication Flow

- **AuthContext.jsx** — Stores user, token, and auth methods globally
- **AuthProvider.jsx** — Wraps app, reads JWT from localStorage on mount
- **useAuth.js** — Custom hook to access auth context
- **ProtectedRoute.jsx** — Wrapper that redirects to login if unauthenticated or role-mismatched

### Axios Interceptors (api/axios.jsx)

```javascript
// Auto-inject JWT from localStorage on every API request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Component Organization

| Category            | Components                                                         |
| ------------------- | ------------------------------------------------------------------ |
| **Navigation**      | Navbar, SlideBar, BottomNav, ProtectedRoute                        |
| **Appointments**    | AppointmentCard, UpcomingApp, AppointmentBook, MyAppointment       |
| **Doctors**         | DoctorCard, DoctorList                                             |
| **Medical Reports** | UploadBox, UploadOptionSheet, Report, ReportDetails                |
| **Health Profile**  | PatientIdCard, PatientDetails, HealthProfile/, HealthProfileSetup/ |
| **Payments**        | PaymentUtils, Payment                                              |
| **Queue**           | LiveQueue, PinModal                                                |
| **Utilities**       | PageLoader                                                         |

---

## 🔄 State Management

### AuthContext Structure

```javascript
{
  user: {
    id: String,              // MongoDB _id
    name: String,
    email: String,
    phone: String,
    role: 'user' | 'doctor' | 'admin',
    profilePicture?: String,
    abhaId?: String
  },
  token: String,             // JWT
  isAuthenticated: Boolean,
  loading: Boolean,
  error: String | null
}
```

### localStorage Keys

```
token          — JWT token (used in Authorization header)
user           — JSON stringified user object
```

### API Response Pattern

- **Success:** `{ success: true, data: {...}, message: String }`
- **Error:** `{ success: false, message: String }`

---

## 🐛 Known Issues / Gotchas

### Backend

- `appointment.js` has typo: route is `/my-appointements` (double 'e') — don't fix without updating frontend too
- `docterSchema.js` filename typo (`docter` not `doctor`) — model exports correctly
- Jobs have no retry logic — if Gemini fails, user must manually hit `/regenerate-summary`
- No request validation (Joi/Zod) — validation is manual inside controllers

### Frontend

- Route typo sync: backend endpoint `/my-appointements` requires frontend to call exact same spelling
- JSON parse error in AuthProvider: Uses try-catch around localStorage parse to prevent crash
- Lab values rendering: PatientDetails.jsx handles both object and primitive value formats
- Role-based redirects: ProtectedRoute checks both auth + role; non-doctors redirected from `/doctor/*` routes
- No offline support: No service workers; requires active internet
- Token expiry: No automatic refresh — expired tokens cause 401 errors

---

## 📖 Full Documentation Reference

For complete architectural details, data flow diagrams, and implementation notes, see:

- **Backend:** [CodebaseContext.md](CodebaseContext.md) — Comprehensive backend architecture, schema details, and API contracts
- **Frontend:** Frontend architecture covered in CodebaseContext.md (see "FRONTEND ARCHITECTURE" section)

Open `doc.html` in your browser for interactive color-coded API documentation.

---

_DelhiMed — Full Stack Healthcare Platform · Aashay Gupta · ClinicFlow · 2026_
