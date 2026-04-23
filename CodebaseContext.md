# CODEBASE_CONTEXT.md

# DelhiMed — AI Codebase Context

# This file exists so any AI assistant (Claude, Copilot, Cursor, GPT-4, Gemini)

# can understand this project instantly without reading every file.

# Keep this file updated whenever you add routes, schemas, or major logic.

---

## PROJECT IDENTITY

- **Name:** DelhiMed (part of ClinicFlow startup)
- **Type:** Healthcare backend REST API
- **Stage:** MVP
- **Owner:** Aashay Gupta
- **Stack:** Node.js · Express.js · MongoDB (Mongoose) · Gemini AI · Cashfree · Cloudinary · JWT · Twilio · Sentry · Winston

---

## WHAT THIS PROJECT DOES

DelhiMed is a healthcare platform backend with 3 core modules:

1. **Appointments** — Patients book slots with doctors. Payments via Cashfree (UPI, card, cash). Each confirmed appointment gets a token number and a PIN for physical arrival verification.

2. **Medical Reports** — Patients upload lab reports (images/PDFs). They go to Cloudinary for storage. A background job sends them to Gemini AI which extracts blood values, allergies, medications, and health flags into structured JSON.

3. **Health Profile** — An aggregated patient profile auto-built from all AI-analyzed reports. Also accepts manual user input (conditions, family history, lifestyle). Doctors can view this before consultation.

Additional modules: medication tracker with daily reset, live queue management for doctor clinics.

---

## ARCHITECTURE OVERVIEW

```
Request → Express Router → Middleware (JWT / Role) → Controller → Model (MongoDB)
                                                            ↓
                                                    Background Job (Gemini AI)
                                                            ↓
                                                    Update Health Profile
```

- **No service layer for business logic** — controllers directly call Mongoose models.
- **geminiService.js** is the only service; it wraps all Gemini API calls.
- **Jobs are NOT queued** (no Bull/BullMQ). They are fire-and-forget async functions called from controllers after sending HTTP response.
- **Authentication:** JWT stored client-side. `authmiddleware.js` decodes it and sets `req.user`.
- **File uploads:** Handled by Cloudinary. Multer (or similar) processes multipart form data before the controller.
- **Validation & Error Handling:** Joi validations handled in middleware before controllers (`validate.js`). Handled using Winston logger and sentry error tracking locally on Server.

---

## DIRECTORY MAP

```
backend/
├── server.js                    # App entry. Connects MongoDB, mounts all routers.
├── controllers/                 # All business logic lives here
├── routes/                      # Only routing + middleware chaining, no logic
├── models/                      # Mongoose schemas + model exports
├── middleware/                  # JWT auth, role checks, admin guard
├── services/geminiService.js    # All Gemini API interaction
├── jobs/                        # Async background tasks (AI processing)
└── utils/calculateETA.js        # Queue ETA math
```

---

## ROUTE → CONTROLLER MAPPING

### Auth (`/api/auth` ← `authRoutes.js` ← `authControllers.js`)

```
POST /api/auth/signup     → signup()        — hash password, create User, return JWT
POST /api/auth/login      → login()         — find User or Doctor, compare hash, return JWT
```

### Appointments (`/api/appointments` ← `appointment.js` ← `appointmentController.js`)

```
GET  /api/appointments/my-appointments    → testProtected()     — dev/test endpoint
GET  /api/appointments/booked-slots       → getBookedSlots()    — query Appointment by doctorId+date
POST /api/appointments/book               → bookAppointment()   — validate slot → create Cashfree order
GET  /api/appointments/my-appointements   → getMyAppointments() — populate doctorId on Appointment
GET  /api/appointments/:id/status         → getStatus()         — calls calculateETA(), returns queue info
PUT  /api/appointments/:id/arrive         → arriveAppointment() — bcrypt compare PIN → set status=arrived
```

### Doctor (`/api/doctors` ← `doctorRoutes.js` ← `doctorController.js`)

```
POST /api/doctors/signup       → doctorSignup()   — adminOnly middleware, create Doctor, return JWT
GET  /api/doctors/allDoctors   → getAllDoctors()  — find all, select public fields
GET  /api/doctors/:id          → getDoctorById()  — findById Doctor
GET  /api/doctors/patient-profile/:patientId → getPatientHealthProfile() — find patient profile (verifies appointment existence to enforce ownership)
```

### Health Profile (`/api/healthProfile` ← `healthProfileRoute.js` ← `healthProfileController.js`)

```
GET    /api/healthProfile/           → getProfile()        — findOne by userId
PUT    /api/healthProfile/user-data  → saveUserData()       — calls updateHealthProfileManual() job
DELETE /api/healthProfile/           → deleteProfile()      — deleteOne by userId
GET    /api/healthProfile/ai-only    → getAiSection()       — return only aiExtracted field
GET    /api/healthProfile/user-only  → getUserSection()     — return only userProvided field
```

### Medication (`/api/medications` ← `medicationRoute.js` ← `medicationController.js`)

```
GET   /api/medications/              → getMedications()   — find all by userId
POST  /api/medications/              → addMedication()    — create new Medication doc
PATCH /api/medications/reset-daily   → resetDaily()       — updateMany taken=false for userId
PATCH /api/medications/:id           → updateTaken()      — findByIdAndUpdate taken field (validates userId)
```

### Payment (`/api/payment` ← `paymentRoute.js` ← `paymentController.js`)

```
POST /api/payment/verify       → verifyPayment()    — validate Cashfree HMAC signature → finalize appointment
POST /api/payment/upi-confirm  → upiConfirm()       — confirm UPI → assign token, generate PIN, set paymentStatus=paid
POST /api/payment/cash-confirm → cashConfirm()      — skip payment → assign token, generate PIN, set paymentStatus=cash
```

### Queue (`/api/queues` ← `queueRoute.js` ← `queueController.js`)

```
PUT /api/queues/next   → nextInQueue()   — increment Queue.currentNumber, mark previous Appointment as served
```

### Report (`/api/reports` ← `reportRoute.js` ← `reportController.js`)

```
POST  /api/reports/upload                   → uploadReport()         — upload to Cloudinary, save Report doc, fire processReportInBackground()
GET   /api/reports/                         → getAllReport()         — get user reports (paginated)
GET   /api/reports/:id/ai-status            → getAiStatus()          — return aiStatus + aiSummary + aiError
POST  /api/reports/:id/regenerate-summary   → regenerateSummary()    — reset aiStatus=pending, re-fire processReportInBackground()
GET   /api/reports/:id                      → getReport()            — findById, verify ownership
PATCH /api/reports/:id                      → updateReport()         — update metadata fields
DELETE /api/reports/:id                     → deleteReport()         — Cloudinary delete + deleteOne from DB
```

### User (`/api/user` ← `userRoute.js` ← `userController.js`)

```
GET   /api/user/profile          → getProfile()        — findById, exclude password
PATCH /api/user/profile          → updateProfile()     — findByIdAndUpdate allowed fields
POST  /api/user/profile/picture  → uploadPicture()     — Cloudinary upload → update profilePicture field
```

---

## MONGODB SCHEMAS

### User

```js
{
  (name,
    phone,
    email,
    password(hashed),
    role("user" | "doctor" | "admin"),
    abhaId,
    profilePicture,
    createdAt,
    updatedAt);
}
```

### Doctor

```js
{
  (name,
    phone,
    email,
    password(hashed),
    speciality,
    startTime,
    avgConsultTime(minutes),
    fees);
}
```

### Appointment

```js
{
  patientId(ref:User), doctorId(ref:Doctor), date, slotTime,
  appointmentNumber(token), pinHash(bcrypt),
  status('pending'|'arrived'|'served'|'cancelled'),
  paymentStatus('pending'|'paid'|'cash'),
  createdAt, updatedAt
}
```

### Medication

```js
{ userId(ref:User), name, dosage, time, taken(bool, default:false), createdAt, updatedAt }
```

### Queue

```js
{ doctorId(ref:Doctor), date, currentNumber, lastTokenNumber, lastUpdatedAt, createdAt, updatedAt }
```

### Report

```js
{
  userId(ref:User), fileName, fileUrl, fileType, fileSize,
  cloudinaryPublicId, reportType, doctorClinicName, reportDate,
  uploadedBy, tags([]),
  aiStatus('pending'|'processing'|'completed'|'failed'),
  aiSummary: { testTable([]), plainSummary([]), extractedHealthData({}), reportTypeDetected, generatedAt },
  aiError,
  createdAt, updatedAt
}
```

**aiSummary structure:**

- `testTable`: Array of { testName, value, unit, referenceRange, status } objects. Empty if no lab values detected.
- `plainSummary`: Array of 4-6 Hinglish strings, each prefixed with emoji (🟢/🟡/🔴/💡/👨‍⚕️). Human-readable health summary.
- `extractedHealthData`: Object with bloodGroup, hemoglobin, wbc, platelets, bloodSugar, creatinine, urea, sodium, potassium, sgpt, sgot, bilirubin, cholesterol, detectedAllergies[], currentMedications[]
- `reportTypeDetected`: Auto-detected report category (CBC, LFT, KFT, Lipid Profile, etc.) — helps categorize uploads
- `generatedAt`: Timestamp when this aiSummary was generated

````

### PatientHealthSummary

```js
{
  userId(ref:User),
  aiExtracted: {
    bloodGroup, detectedAllergies([]), currentMedications([]),
    labValues: { hemoglobin, wbc, platelets, bloodSugar, creatinine, urea,
                 sodium, potassium, sgpt, sgot, bilirubin, cholesterol },
    specialFlags: { anemia, infection, kidneyIssue, liverIssue, diabetesRisk },
    personalizedInsights([]), trends: { hemoglobin, wbc, sugar },
    lastUpdated
  },
  userProvided: {
    conditions: { diabetes, hypertension, thyroid },
    pastEvents: { surgeries([]), injuries([]), majorIllness([]) },
    medications([]), allergies([]), currentSymptoms([]),
    familyHistory: { diabetes, heartDisease, cancer, geneticConditions([]) },
    lifestyle: { smoking, alcohol },
    completedAt
  },
  quickSummary: { criticalAlerts([]), shortSummary, lastGenerated },
  createdAt, updatedAt
}
````

---

## MIDDLEWARE

| File                | Applied to                 | What it does                                                                        |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `authmiddleware.js` | All protected routes       | Reads `Authorization: Bearer <token>`, verifies JWT, sets `req.user = { id, role }` |
| `adminOnly.js`      | `POST /api/doctors/signup` | Checks `req.user.role === 'admin'`, returns 403 otherwise                           |
| `roleMiddleware.js` | Queue routes (doctor-only) | Generic role checker — `allowRoles('doctor')` pattern                               |

---

## SERVICES

### `geminiService.js`

| Function                          | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `getGeminiModel()`                | Returns model string from `process.env.GEMINI_MODEL` or fallback             |
| `fetchFileAsBase64(url)`          | Downloads file from Cloudinary URL, converts to base64                       |
| `resolveMimeType(response, url)`  | Gets MIME type from headers or extension                                     |
| `parseGeminiJSON(text)`           | Strips markdown fences, parses JSON from Gemini response                     |
| `analyzeReport(report)`           | Sends single report to Gemini → returns structured `aiSummary` JSON          |
| `buildHealthProfile(summaries[])` | Sends all report summaries → returns consolidated `aiExtracted` profile JSON |

**Gemini prompt contract — `analyzeReport` expects back:**

```json
{
  "testTable": [
    {
      "testName": "...",
      "value": "...",
      "unit": "...",
      "referenceRange": "...",
      "status": "High|Low|Normal|Critical|Unknown"
    }
  ],
  "plainSummary": [
    "🟢 Normal result...",
    "🟡 Mild concern...",
    "🔴 Serious issue...",
    "🟡 💡 Diet/lifestyle tip...",
    "🟢 👨‍⚕️ Doctor advice..."
  ],
  "extractedHealthData": {
    "bloodGroup": null,
    "hemoglobin": null,
    "wbc": null,
    "detectedAllergies": [],
    "currentMedications": []
  },
  "specialFlags": {
    "anemia": false,
    "infection": false,
    "kidneyIssue": false,
    "liverIssue": false,
    "diabetesRisk": false
  },
  "reportTypeDetected": "CBC|LFT|KFT|Lipid Profile|Sugar|X-Ray|Prescription|ECG|Unknown"
}
```

**AI Prompt Format Notes:**

- `plainSummary`: Hinglish (Hindi + English mix) with emoji prefix required on each line
- Severity emojis: 🟢 (normal), 🟡 (mild concern), 🔴 (serious issue)
- Optional: 💡 (diet tip), 👨‍⚕️ (doctor advice) — must still follow emoji rule
- Example: "🟡 💡 Pani zyada piyen, oily khana avoid karein"
- No medical jargon — explain simply and conversationally
- Return exactly 4–6 lines; empty arrays when no items found (never null for array fields)

````

**Gemini prompt contract — `buildHealthProfile` expects back:**

```json
{
  "bloodGroup": "",
  "detectedAllergies": [],
  "labValues": {},
  "specialFlags": {},
  "personalizedInsights": [],
  "trends": {},
  "quickSummary": { "criticalAlerts": [], "shortSummary": "" }
}
````

---

## BACKGROUND JOBS

### `processReport.js` → `processReportInBackground(reportId, cloudinaryUrl, fileType, userId)`

1. Set `report.aiStatus = 'processing'`, clear `aiError`
2. Call `analyzeReport(cloudinaryUrl, fileType)` from geminiService
3. Guard: if aiResult is null/undefined, set `aiStatus = 'failed'`, throw error (will be caught and logged)
4. Normalize `plainSummary` to array of strings (handle raw string, array, or empty)
5. Save to `report.aiSummary` with fields: `testTable`, `plainSummary`, `extractedHealthData`, `reportTypeDetected`, `generatedAt`
6. Set `aiStatus = 'completed'`, clear `aiError`
7. Non-blocking: Trigger `updateHealthProfileAI(userId)` to consolidate all completed reports into health profile
8. On any error: catch, log, set `aiStatus = 'failed'`, save error message to `aiError`

**Important:** This is a background job (fire-and-forget) — it does NOT return HTTP responses. No `res.status()` calls here.

### `updateHealthProfile.js`

- **`updateHealthProfileAI(userId)`** — Fetch all `done` reports for user → call `buildHealthProfile()` → upsert `PatientHealthSummary.aiExtracted`
- **`updateHealthProfileManual(userId, data)`** — Upsert `PatientHealthSummary.userProvided` with form data + set `completedAt`

---

## UTILS

### `calculateETA(currentToken, patientToken, avgConsultTime)`

```
remainingPatients = patientToken - currentToken
estimatedWait     = remainingPatients × avgConsultTime (minutes)
returns: { remainingPatients, estimatedWaitMinutes }
```

---

## KEY PATTERNS & CONVENTIONS

1. **Token + PIN system** — On payment confirmation, `appointmentNumber` (queue token) is assigned from `Queue.lastTokenNumber + 1`. A random PIN is generated, bcrypt-hashed, stored as `pinHash`. Raw PIN is sent to patient via SMS (Twilio). On arrival, patient enters PIN → bcrypt compare.

2. **Fire-and-forget jobs** — Controllers call background jobs without `await` after sending `res.json()`. This means AI processing never blocks HTTP response.

3. **Cashfree flow:**
   - `POST /book` → creates Cashfree order, returns `orderId` to frontend
   - Frontend completes payment, sends `cashfree_payment_id + cashfree_order_id + cashfree_signature`
   - `POST /payment/verify` → HMAC-SHA256 verify → finalize appointment

4. **No soft delete** — Reports and profiles are hard deleted. Cloudinary asset is deleted before DB record.

5. **Date handling** — Appointments use `date` (string or Date) + `slotTime` (string like "10:30"). No timezone normalization currently.

6. **Role values:** `'user'` | `'doctor'` | `'admin'` — stored in User schema, also present in JWT payload.

7. **Error responses** follow pattern: `res.status(4xx).json({ message: "..." })`

---

## FRONTEND ARCHITECTURE

### Technology Stack

- **Framework:** React 18 (Vite)
- **State Management:** React Context API (AuthContext)
- **HTTP Client:** Axios (api/axios.jsx)
- **Styling:** CSS modules (component-scoped CSS files)
- **Build Tool:** Vite
- **Package Manager:** npm

### Frontend Directory Map

```
frontend/
├── src/
│   ├── main.jsx                 # App entry point
│   ├── App.jsx                  # Main router & route definitions
│   ├── App.css                  # Global styles
│   ├── index.css                # Base CSS resets
│   │
│   ├── api/
│   │   └── axios.jsx            # Axios instance with base URL & interceptors
│   │
│   ├── context/
│   │   ├── AuthContext.jsx      # Auth context definition (user, token, role)
│   │   ├── AuthProvider.jsx     # Auth context provider wrapper
│   │   └── useAuth.js           # Custom hook to consume AuthContext
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Navbar.jsx / .css    # Top navigation bar
│   │   ├── SlideBar.jsx / .css  # Sidebar navigation
│   │   ├── BottomNav.jsx        # Bottom navigation bar (mobile)
│   │   ├── PageLoader.jsx       # Loading spinner component
│   │   ├── ProtectedRoute.jsx   # Route wrapper for auth/role checks
│   │   ├── AppointmentCard.jsx / .css  # Appointment display card
│   │   ├── DoctorCard.jsx / .css       # Doctor listing card
│   │   ├── MedicationBox.jsx / .css    # Medication display box
│   │   ├── PatientIdCard.jsx / .css    # Patient ID card display
│   │   ├── PinModal.jsx / .css         # PIN entry modal
│   │   ├── UpcomingApp.jsx / .css      # Upcoming appointments widget
│   │   ├── UploadBox.jsx / .css        # File upload component
│   │   ├── UploadOptionSheet.jsx / .css # Upload options/method selector
│   │   ├── PaymentUtils.jsx            # Payment method selection
│   │   └── HealthProfile/              # Health profile sub-components
│   │
│   ├── pages/                   # Full page components (routes)
│   │   ├── Login.jsx / .css     # User/Doctor login page
│   │   ├── Signup.jsx           # Patient signup page
│   │   ├── DoctorSignUp.jsx / .css    # Doctor signup page (admin-only)
│   │   ├── Home.jsx / .css             # Patient home page
│   │   ├── AdminHome.jsx / .css        # Admin dashboard
│   │   ├── DoctorHome.jsx / .css       # Doctor dashboard
│   │   ├── DoctorList.jsx / .css       # Browse doctors
│   │   ├── AppointmentBook.jsx / .css  # Book appointment flow
│   │   ├── MyAppointment.jsx / .css    # View booked appointments
│   │   ├── Payment.jsx / .css          # Payment processing page
│   │   ├── LiveQueue.jsx / .css        # Real-time queue status (doctor view)
│   │   ├── Profile.jsx / .css          # User profile management
│   │   ├── Report.jsx / .css           # Medical reports list
│   │   ├── ReportUpload.jsx / .css     # Upload new report
│   │   ├── ReportDetails.jsx / .css    # View single report + AI analysis
│   │   ├── PatientDetails.jsx / .css   # Patient health profile view
│   │   ├── HealthProfile/              # Health profile pages (setup & view)
│   │   └── HealthProfileSetup/         # Health profile form wizard
│   │
│   ├── assets/                  # Images, icons, static files
│   └── utils/                   # Utility functions
│
├── package.json                 # Frontend dependencies
├── vite.config.js              # Vite build configuration
└── index.html                   # HTML template
```

---

## FRONTEND ROUTING MAP

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
GET  /profile                   → Profile.jsx               — Edit profile
GET  /reports                   → Report.jsx                — Medical reports list
GET  /reports/upload            → ReportUpload.jsx          — Upload new report
GET  /reports/:id               → ReportDetails.jsx         — View report analysis
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

## COMPONENT → API INTEGRATION

### Authentication Flow

- **AuthContext.jsx:** Stores `{ user, token, role, login, logout }`
- **AuthProvider.jsx:** Wraps app, manages JWT from localStorage
- **useAuth.js:** Custom hook to consume auth state
- **ProtectedRoute.jsx:** Wrapper that redirects to login if no token or wrong role

**Key:** On app load, AuthProvider reads JWT from `localStorage.getItem("token")` and initializes auth state.

### Data Fetching

- **api/axios.jsx:** Base Axios instance with:
  - `baseURL` pointing to backend (`http://localhost:5000/api`)
  - Default `Authorization: Bearer ${token}` header (from localStorage)
  - Automatic token injection on all requests (if token exists)

### Page → Controller Flow Example (Appointment Booking)

```
AppointmentBook.jsx
  ↓ (User selects date/time, clicks "Book")
  ↓ axios.post('/appointments/book', { doctorId, date, slotTime })
  ↓
Backend: appointmentController.bookAppointment()
  ↓ (Validates slot, creates Cashfree order)
  ↓ Response: { orderId, appointmentId, fees }
  ↓
Frontend: Payment.jsx (receives orderId, loads Cashfree)
  ↓ (User completes payment via Cashfree SDK)
  ↓ axios.post('/payment/verify', { cashfree_payment_id, ... })
  ↓
Backend: paymentController.verifyPayment()
  ↓ (HMAC verify, assign token + PIN, send SMS)
  ↓ Response: { appointmentNumber, ...appointment details }
  ↓
Frontend: Redirect to MyAppointment.jsx (show token + PIN)
```

### Components by Feature

**Appointments:**

- `AppointmentCard.jsx` — Display single appointment with status badge
- `UpcomingApp.jsx` — Widget showing next upcoming appointment
- `AppointmentBook.jsx` — Slot picker & booking form
- `MyAppointment.jsx` — List all booked appointments

**Doctors:**

- `DoctorCard.jsx` — Doctor profile card (name, specialty, fee, rating)
- `DoctorList.jsx` — Grid of all doctors with filters

**Medical Reports:**

- `UploadBox.jsx` — File drag-drop or selection
- `UploadOptionSheet.jsx` — Choose upload method (camera, file, gallery)
- `Report.jsx` — List all uploaded reports with AI status
- `ReportDetails.jsx` — View report image + AI analysis (testTable, plainSummary, extracted health data)

**Health Profile:**

- `PatientIdCard.jsx` — Display patient info card
- `PatientDetails.jsx` — Consolidated view of aiExtracted + userProvided data
- `HealthProfile/` — Subcomponents (allergies, medications, conditions, etc.)
- `HealthProfileSetup/` — Form wizard for manual data entry

**Payment:**

- `PaymentUtils.jsx` — Payment method selector (UPI, Card, Cash)
- `Payment.jsx` — Cashfree integration & order processing

**Queue:**

- `LiveQueue.jsx` — Real-time token display (currentNumber, patient queue)
- `PinModal.jsx` — Modal for patient PIN entry on arrival

**Navigation:**

- `Navbar.jsx` — Top bar with logo, user menu, logout
- `SlideBar.jsx` — Sidebar for desktop navigation
- `BottomNav.jsx` — Bottom tab bar for mobile

---

## STATE MANAGEMENT PATTERNS

### AuthContext Data Structure

```javascript
{
  user: {
    id: String (MongoDB _id),
    name: String,
    email: String,
    phone: String,
    role: 'user' | 'doctor' | 'admin',
    profilePicture?: String,
    abhaId?: String
  },
  token: String (JWT),
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

### Common API Response Pattern

- **Success:** `{ success: true, data: {...}, message: String }`
- **Error:** `{ success: false, message: String }`

---

## AXIOS CONFIGURATION

File: [frontend/src/api/axios.jsx](../frontend/src/api/axios.jsx)

```javascript
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Auto-inject JWT from localStorage on every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
```

---

## KNOWN FRONTEND ISSUES / GOTCHAS

- **Route typo sync:** appointment.js backend route is `/my-appointements` (double 'e') — frontend MyAppointment.jsx calls this exact endpoint, don't "fix" one without the other
- **JSON parse error in AuthProvider:** Uses try-catch around `localStorage.getItem("user")` parse to prevent crash on corrupted data
- **Lab values rendering:** PatientDetails.jsx safely handles both object-shaped lab values (with `value`, `unit`, `referenceRange`) and primitive values
- **Role-based redirects:** ProtectedRoute checks both `isAuthenticated` and `role` match; non-doctor users attempting `/doctor/*` routes get 403 automatically
- **No offline support:** No service workers or offline caching — requires active internet connection
- **Token expiry:** No automatic token refresh — expired tokens will cause 401 errors on API calls

---

## KNOWN ISSUES / GOTCHAS

- `appointment.js` has a typo: route is `/my-appointements` (double 'e') — don't fix without updating frontend too.
- `docterSchema.js` has a typo in filename (`docter` not `doctor`) — model is still exported correctly.
- Jobs have no retry logic — if Gemini fails, user must manually hit `/regenerate-summary`.
- No request validation library (Joi/Zod) — validation is manual inside controllers.
- Queue and Appointment are separate collections — they are kept in sync manually in controllers, not via transactions.

---

## ENVIRONMENT VARIABLES REFERENCE

```
MONGO_URI               MongoDB connection string
JWT_SECRET              Secret for signing/verifying JWTs
CASHFREE_APP_ID         Cashfree public key
CASHFREE_SECRET_KEY     Cashfree secret (used for HMAC verify)
CLOUDINARY_CLOUD_NAME   Cloudinary account name
CLOUDINARY_API_KEY      Cloudinary API key
CLOUDINARY_API_SECRET   Cloudinary API secret
GEMINI_API_KEY          Google Gemini API key
GEMINI_MODEL            Model string (optional, default: gemini-1.5-flash)
TWILIO_ACCOUNT_SID      Twilio account SID
TWILIO_AUTH_TOKEN       Twilio auth token
TWILIO_PHONE            Twilio sender phone number
PORT                    Server port (default: 5000)
```

---

## RECENT UPDATES (March 2026)

### AI/Gemini Improvements

- ✅ **Enhanced plainSummary format**: Updated Gemini prompt to return Hinglish (Hindi + English) summaries with emoji prefixes
  - Severity emojis: 🟢 (normal) · 🟡 (mild concern) · 🔴 (serious issue)
  - Optional secondary emojis: 💡 (diet/lifestyle tip) · 👨‍⚕️ (doctor advice)
  - Example: "🟡 💡 Pani zyada piyen, oily khana reduce karein"
  - Returns exactly 4–6 strings, no medical jargon

- ✅ **reportTypeDetected field**: Added to `aiSummary` to auto-detect report category (CBC, LFT, KFT, Lipid Profile, Sugar, X-Ray, Prescription, ECG, Unknown)

- ✅ **Error handling fixes in processReport.js**:
  - Removed invalid `res.status()` calls (background job context)
  - Proper null-check guard on `aiResult`
  - Normalized `plainSummary` array handling

- ✅ **Schema update**: `reportSchema.aiSummary` now includes `reportTypeDetected` field (String, default: "Unknown")

### Frontend Improvements

### Frontend Improvements

- ✅ **Navigation buttons**: Added Home button (→ /home) on MyAppointment, DoctorList, and HealthProfile pages, positioned right of Back button
- ✅ **Mobile table scrolling**: Fixed ReportDetails table overflow by adding `overflow-x: auto` to `.rd-test-table-wrap`

- ✅ **AuthProvider.jsx — JSON parse error fix**:
  - Added try-catch block around `JSON.parse(localStorage.getItem("user"))`
  - Added explicit check: `saved !== "undefined"` to handle cases where localStorage contains the string `"undefined"`
  - Returns `null` safely if JSON parsing fails, preventing app crash on startup
  - Logs error to console for debugging

- ✅ **PatientDetails.jsx — Lab values object rendering fix**:
  - Lab values from Gemini AI can be objects with shape `{ value, unit, referenceRange, lastUpdated, status }`
  - Updated rendering to safely handle both object and primitive values
  - Extracts and displays as `"{value} {unit}"` when object, otherwise displays primitive directly
  - Prevents "Objects are not valid as a React child" error

- ✅ **App.jsx — Route protection for role-based access**:
  - Implemented `ProtectedRoute` wrapper on sensitive routes
  - Doctor-only routes (`/doctor/home`, `/doctor/patient/:appointmentId`) now require `role === "doctor"` token
  - Patient routes wrapped with basic `ProtectedRoute` requiring valid token
  - Redirects to login if no token; redirects to home if wrong role
  - Prevents 403/400 API errors from unauthorized role access
  - Returns 403 (Forbidden) when non-doctor user attempts doctor endpoints (caught by frontend before API call)

---

## SECURITY ISSUES & RESOLUTIONS

### ❌ 1. .env File Committed to Git (CRITICAL)

**Issue:** Backend/.env file is committed and visible in shared repositories. Contains real MongoDB URL, Cashfree keys, Cloudinary secrets, and Gemini API key.

**Resolution Status:** ✅ RESOLVED

- ✅ Added `.env` to `backend/.gitignore`
- ✅ Rotated ALL secrets immediately:
  - New MongoDB password in URI
  - New Cashfree KEY_ID and KEY_SECRET
  - New Cloudinary API_KEY and API_SECRET
  - New Gemini API key
  - New Twilio credentials (SID, AUTH_TOKEN)
- ✅ Set environment variables in hosting provider (Railway/Render/Vercel)
  - Do NOT paste .env file into provider — use their dashboard to set individual variables
  - Enable environment variable encryption if available
- ✅ Local .env is git-ignored; developers create local `.env` from documentation

**Before deploying to production:**

- Verify `.env` is in `.gitignore` before any git push
- Confirm all secrets are different from those ever committed
- Use hosting provider's secret management, not .env files in production

---

### ❌ 2. No Rate Limiting on Auth Routes (HIGH PRIORITY)

**Issue:** `/api/auth/login` and `/api/auth/signup` have zero rate limiting. Attackers can brute-force passwords or spam account creation without throttling.

**Resolution Status:** ✅ RESOLVED

- ✅ Installed `express-rate-limit` package
- ✅ Applied rate limiting to auth routes in `authRoutes.js`:
  - `POST /api/auth/signup`: Max 5 requests per 15 minutes per IP
  - `POST /api/auth/login`: Max 10 requests per 15 minutes per IP
- ✅ Rate limiter returns 429 (Too Many Requests) when limit exceeded
- ✅ Includes `retry-after` header in response

**Impact:**

- Prevents credential stuffing attacks
- Protects against signup spam
- Minimal impact on legitimate users

**Further considerations:**

- Monitor logs for repeated rate limit hits (potential attack)
- Consider stricter limits for production (3 requests per 15 min for signup)

---

### ❌ 3. CORS is Wide Open (HIGH PRIORITY)

**Issue:** `server.js` has `app.use(cors())` with no origin restriction. Accepts requests from ANY domain.

**Resolution Status:** ✅ RESOLVED

- ✅ Configured CORS with origin whitelist in `server.js`:
  ```javascript
  app.use(
    cors({
      origin: [
        "http://localhost:5173", // Local dev (Vite default port)
        "http://localhost:3000", // Alternative local port
        process.env.FRONTEND_URL, // Production frontend URL
      ],
      credentials: true, // Allow cookies
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  ```
- ✅ Added `FRONTEND_URL` to `.env` (hosting provider variable)
- ✅ Rejects requests from unauthorized domains with 403 CORS error

**Before production:**

- Update `FRONTEND_URL` environment variable to your actual frontend domain
- Remove localhost origins from production config
- Test CORS with staging frontend URL before deploying

---

### ❌ 4. No Helmet.js — Missing HTTP Security Headers (HIGH PRIORITY)

**Issue:** No helmet middleware configured. API lacks critical security headers: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, Strict-Transport-Security, etc.

**Resolution Status:** ✅ RESOLVED

- ✅ Installed `helmet` package
- ✅ Added Helmet middleware in `server.js` (before other middleware):
  ```javascript
  const helmet = require("helmet");
  app.use(helmet());
  ```
- ✅ Helmet now automatically sets:
  - `X-Content-Type-Options: nosniff` — Prevents MIME type sniffing
  - `X-Frame-Options: DENY` — Prevents clickjacking
  - `Strict-Transport-Security: max-age=31536000` — Forces HTTPS
  - `Content-Security-Policy` — Restricts script injection
  - Additional security headers (X-XSS-Protection, Referrer-Policy, etc.)

**Impact:**

- Protects against common web vulnerabilities
- Minimal performance overhead
- Recommended for all Node.js + Express apps

**Production considerations:**

- If you serve static files (images, CSS), may need CSP policy adjustment
- Helmet looks for `https://` in production — ensure HTTPS is enabled
- Monitor headers with `curl -I https://your-api.com/api/...`

---

### ⚠️ 5. JWT in localStorage (XSS Vulnerability — MEDIUM PRIORITY)

**Issue:** **Frontend** stores JWT in `localStorage`, readable by any JavaScript on the page. If an XSS vulnerability occurs, attackers can steal the JWT.

**More secure approach:** Use `httpOnly`, `sameSite=strict` cookies instead. Requires frontend + backend refactor.

**Resolution Status:** ⏳ DEFERRED (Lower priority for MVP, important for production)

**Why it's a risk:**

- Compromised npm package → malicious NPM script → JWT stolen
- XSS vulnerability in component library → `localStorage.getItem('token')` exposed
- Healthcare data (medical records, appointments) could be accessed without user consent

**Short-term mitigation (MVP phase):**

- ✅ Implement Content-Security-Policy (done via Helmet)
- ✅ Regular security audits of npm dependencies (`npm audit`)
- ✅ Use `.js` for frontend code only (no template injection)
- ✅ Sanitize user inputs before rendering (avoid `dangerouslySetInnerHTML`)

**Long-term solution (Before full production):**

1. **Backend changes:**
   - Remove JWT from response body (`res.json({ token })`)
   - Instead, set `httpOnly, sameSite=strict` cookie on login
   - Verify cookie on protected routes (replace header check with cookie check)
   - Example:
     ```javascript
     res.cookie("authToken", jwtToken, {
       httpOnly: true, // JS cannot access
       sameSite: "strict", // CSRF protection
       secure: true, // HTTPS only
       maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
     });
     ```

2. **Frontend changes:**
   - Remove `localStorage.getItem('token')` from `AuthProvider.jsx`
   - Remove manual `Authorization: Bearer ${token}` header injection
   - Axios will automatically send cookies with `withCredentials: true`
   - Update CORS to allow `credentials: true` (already done above)

3. **Testing:**
   - Cookies should NOT be visible in browser DevTools > Application > Cookies (httpOnly)
   - API calls should still work without manual header setting

**Timeline:** Schedule this refactor before full healthcare data launch or regulatory compliance requirements.

---

## WHAT DOES NOT EXIST YET (Planned)

- [ ] Prescription manager (Gemini API + Twilio reminders) — not yet built
- [ ] React Native mobile app
- [ ] Webhook handler for Cashfree `payment.captured` event (production payment flow)
- [ ] Request validation (Joi or Zod)
- [ ] Job queue (Bull/BullMQ) for reliable background processing
- [ ] Doctor-side appointment management endpoints
- [ ] Notification system for appointment reminders
- [ ] JWT-to-httpOnly cookie migration
- [ ] Database encryption at rest
- [ ] Request logging & monitoring for security events

---

_Last updated: 5 April 2026 · DelhiMed Backend · Aashay Gupta · Security hardening pass completed_
