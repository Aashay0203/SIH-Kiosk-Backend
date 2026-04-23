# ClinicFlow UI & Code Skill

# Paste this into Claude Code as a custom skill / system prompt prefix.

# Purpose: Every page and component built in ClinicFlow must follow this

# design system, architecture, and code-style contract — no exceptions.

---

## 1. PROJECT IDENTITY

- **Product:** ClinicFlow — Clinic Operating System for India
- **Codebase name:** DelhiMed (backend repo name, same project)
- **Stack:** React 18 + Vite · MUI (Material UI) · Axios · Node/Express · MongoDB/Mongoose · Cloudinary · Cashfree · Gemini AI · JWT · Sentry
- **Owner:** Aashay Gupta
- **Stage:** MVP → YC S26 application

---

## 2. DESIGN SYSTEM — FOLLOW EXACTLY

### 2.1 CSS Variables (always use these, never hardcode hex values)

```css
--bg: #e8ecee; /* Page background */
--card-bg: #ffffff; /* Card / panel background */
--blue: #3e7df5; /* Primary CTA, active states */
--blue-dark: #2d62d4; /* Hover on primary buttons */
--blue-light: #dce9ff; /* Chip backgrounds, subtle highlights */
--green: #d5eab3; /* Success, positive state */
--black: #010101; /* Primary text */
--text-muted: #7a8799; /* Secondary / helper text */
--border: #dde3ea; /* Card borders, dividers */
--error-bg: #fff0f0; /* Error banner background */
--error-text: #d94f4f; /* Error text color */
```

### 2.2 Border Radius

```
Cards / panels : 24px
Inputs         : 12px
Buttons        : 14px
Chips / badges : 999px (pill)
```

### 2.3 Shadow

```css
box-shadow: 0 12px 48px rgba(62, 125, 245, 0.1);
```

Use ONLY this shadow value for card elevation. No other shadows.

### 2.4 Typography

```
Headings  : font-family "Urbanist", weight 800
Body text : font-family "Nunito",   weight 600–700
```

Both fonts must be imported via Google Fonts in `index.html` or `index.css`. Never use system fonts for these roles.

### 2.5 Transitions

```css
transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
```

Apply to buttons, cards, inputs — any interactive element.

### 2.6 Report / Accent Card Color Cycle

Cycle these four colors in order for multi-card lists (reports, appointments, etc.):

```
#D5EAB3  (green-tint)
#DCE9FF  (blue-tint)
#FFE6F0  (pink-tint)
#FFF4E6  (orange-tint)
```

### 2.7 Layout Pattern

```
Page wrapper     : background var(--bg), min-height 100vh, padding 24px (desktop) / 16px (mobile)
Content max-width: 480px centered for single-column patient pages
                   100% with sidebar for doctor/admin dashboards
Card             : background var(--card-bg), border-radius 24px, padding 24px,
                   border 1px solid var(--border), box-shadow as above
```

---

## 3. CODE STYLE CONTRACT

### 3.1 File Structure — MANDATORY

Every page or component gets **its own pair of files**:

```
ComponentName.jsx   ← structure + logic only
ComponentName.css   ← all static styles
```

**No inline `style={{}}` props** — ever. The only exception is MUI's `sx` prop for truly dynamic/conditional values (e.g., state-dependent colors, computed widths).

### 3.2 Class Naming — BEM-scoped per component

Pick a 2–3 letter prefix per component and use it on every class:

```
dh-*   → DoctorHome
pd-*   → PatientDetail
pid-*  → PatientIDCard
rd-*   → ReportDetails
ab-*   → AppointmentBook
hp-*   → HealthProfile
ah-*   → AdminHome
lq-*   → LiveQueue
```

Example: `.dh-card`, `.dh-card__title`, `.dh-card--active`

### 3.3 MUI Usage Rules

**ALWAYS use direct path imports for MUI icons** — barrel imports destroy load time:

```js
// ✅ CORRECT
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

// ❌ WRONG — kills performance
import { ArrowBackIosNew } from "@mui/icons-material";
```

**Static MUI `sx` → move to CSS:**

```jsx
// ❌ Wrong: static style in sx
<Button sx={{ borderRadius: "14px", fontFamily: "Nunito" }}>

// ✅ Correct: static style in .css, sx only for dynamic
<Button className="cf-btn" sx={{ backgroundColor: isActive ? "var(--blue)" : "var(--border)" }}>
```

**MUI `TextField` internal overrides** (fieldset, label) are acceptable as `sx` exceptions since CSS cannot target MUI internals cleanly.

**MUI persistent `Drawer`** manages content shifting natively via flex — never add manual margin-left calculations.

### 3.4 Axios & Error Handling

Import the shared instance — never create a new `axios` instance inside a component:

```js
import api from "../api/axios";
// baseURL is http://localhost:8080/api (port 8080, not 5000)
// JWT is auto-injected via interceptor — no manual Authorization header needed
```

**Validation Errors:** API calls that fail Joi validation return `422 Unprocessable Entity` with an `errors` array. Always extract and display this array joined into a string in UI catch blocks:

```js
const errorMessage =
  err.response?.data?.errors?.join(", ") ||
  err.response?.data?.message ||
  "Action failed";
setError(errorMessage);
```

### 3.5 Auth

Read auth state from context — never read `localStorage` directly inside a component:

```js
import { useAuth } from "../context/useAuth";
const { user, token } = useAuth();
```

### 3.6 React Router

Use `useNavigate` for programmatic navigation. Doctor data and appointment context are passed via `location.state` (React Router v6 pattern):

```js
navigate("/appointment/book", { state: { doctor } });
// Receiving page:
const { state } = useLocation();
const { doctor } = state;
```

---

## 4. BACKEND ARCHITECTURE (for API integration)

### 4.1 Server

- Port: **8080**
- Base URL: `http://localhost:8080/api`
- All routes require `Authorization: Bearer <jwt>` (injected automatically by axios instance)

### 4.2 Route Map (ACTUAL IMPLEMENTATION)

#### Authentication Routes (`/api/auth`)

```
POST   /api/auth/signup              ← Create user (patient), includes validation
POST   /api/auth/login               ← Login user,returns JWT in httpOnly cookie
POST   /api/auth/doctorSignup        ← Create doctor account, includes validation
```

#### Appointment Routes (`/api/appointments`)

```
POST   /api/appointments/book                  ← Book appointment, requires auth
GET    /api/appointments/token-count          ← Get current queue token count (no auth)
GET    /api/appointments/my-appointements     ← Get user's appointments (NOTE: double 'e' typo)
GET    /api/appointments/:id/status           ← Get appointment status, requires auth
PUT    /api/appointments/:id/arrive           ← Mark as arrived + set PIN, requires auth
```

#### Doctor Routes (`/api/doctors`)

```
GET    /api/doctors/allDoctors                ← List all doctors (public)
GET    /api/doctors/:id                       ← Get doctor details (public)
POST   /api/doctors/add                       ← Add doctor (admin only)
```

#### Queue Routes (`/api/queues`)

```
PUT    /api/queues/next                       ← Move to next patient in queue
```

#### Payment Routes (`/api/payment`)

```
POST   /api/payment/verify                    ← Cashfree verification (Server-to-Server)
POST   /api/payment/upi-confirm               ← UPI payment confirm
POST   /api/payment/cash-confirm              ← Cash payment confirm
```

#### Reports Routes (`/api/reports`)

```
POST   /api/reports/upload                    ← Upload report file (multipart), triggers Gemini AI
GET    /api/reports/                          ← Get all reports for user, requires auth
GET    /api/reports/:id/ai-status             ← Poll AI processing status
POST   /api/reports/:id/regenerate-summary    ← Regenerate Gemini summary
GET    /api/reports/:id                       ← Get single report with AI summary
PATCH  /api/reports/:id                       ← Update report metadata
DELETE /api/reports/:id                       ← Delete report
```

#### Medications Routes (`/api/medications`)

```
GET    /api/medications/                      ← Get user medications, requires auth
POST   /api/medications/                      ← Add medication, requires auth
PATCH  /api/medications/reset-daily           ← Reset daily flags (MUST be before /:id)
PATCH  /api/medications/:id                   ← Update medication, requires auth
```

#### Health Profile Routes (`/api/healthProfile`)

```
GET    /api/healthProfile/                    ← Get full health profile, requires auth
PUT    /api/healthProfile/user-data           ← Update user-provided health data, requires auth
DELETE /api/healthProfile/                    ← Delete health profile, requires auth
GET    /api/healthProfile/ai-only             ← Get only AI-extracted data, requires auth
GET    /api/healthProfile/user-only           ← Get only user-provided data, requires auth
```

#### User Routes (`/api/user`)

```
GET    /api/user/profile                      ← Get user profile, requires auth
PATCH  /api/user/profile                      ← Update user profile, requires auth
POST   /api/user/profile/picture              ← Upload profile picture, requires auth
```

#### Admin Routes (`/api/admin`)

```
GET    /api/admin/today                       ← Get today's appointments (admin + specific email only)
```

#### Ayushman Routes (`/api/ayushman`)

```
[Ayushman Bharat integration routes]
```

### 4.3 Critical Express Ordering Rule

Static route segments MUST be registered **before** dynamic `/:id` params in the same router file, or Express will match the literal string as an ID:

```js
// ✅ CORRECT order
router.get("/reset-daily", resetDaily);
router.get("/my-appointments", getMyAppointments);
router.get("/:id", getById); // dynamic last
```

### 4.4 Date Handling (IST / India)

**Never** use `setUTCHours(0,0,0,0)` on local Date objects — it rolls the date back 5h30m in IST.

Parse `"YYYY-MM-DD"` strings via:

```js
const [y, m, d] = dateStr.split("-");
const date = new Date(Date.UTC(+y, +m - 1, +d));
```

### 4.5 Standard API Response Shape

```json
// Success
{ "success": true, "data": {}, "message": "..." }

// Error
{ "success": false, "message": "..." }
```

---

## 5. FRONTEND ROUTING MAP

### Public

```
/login    → Login.jsx
/signup   → Signup.jsx
```

### Patient (role = 'user')

```
/home                         → Home.jsx
/doctors                      → DoctorList.jsx
/appointment/book/:doctorId   → AppointmentBook.jsx
/my-appointments              → MyAppointment.jsx
/appointment/:id/payment      → Payment.jsx
/profile                      → Profile.jsx
/reports                      → Report.jsx
/reports/upload               → ReportUpload.jsx
/reports/:id                  → ReportDetails.jsx
/health-profile               → PatientDetails.jsx
/health-profile/setup         → HealthProfileSetup/
```

### Doctor (role = 'doctor')

```
/doctor/home                        → DoctorHome.jsx
/doctor/queue                       → LiveQueue.jsx
/doctor/patient/:appointmentId      → PatientDetails.jsx
```

### Admin (role = 'admin')

```
/admin/home   → AdminHome.jsx
```

---

## 6. BACKEND SCHEMAS (ACTUAL IMPLEMENTATION)

### 6.1 User Schema

```javascript
{
  _id: ObjectId,
  name: String (required),
  phone: Number (required),
  email: String (required, unique index),
  password: String (required, hashed with bcrypt),
  role: String (enum: "patient"|"admin"|"doctor", default: "patient"),
  abhaId: String (default: null),
  profilePicture: String (default: profile icon URL),
  dateOfBirth: Date (default: null),
  gender: String (enum: "Male"|"Female"|"Other", default: null),
  address: String (default: null),
  timestamps: { createdAt, updatedAt }
}
```

### 5.2 Doctor Schema (filename: `docterSchema.js` — note misspelling)

```javascript
{
  _id: ObjectId,
  name: String (required),
  phone: Number (required),
  email: String (required),
  password: String (required, hashed),
  speciality: String (default: "Gernal Physician"),
  startTime: String (default: "09:00", format: "HH:MM"),
  avgConsultTime: Number (default: 10, in minutes),
  fees: Number (default: 500),
  role: String (default: "doctor"),
  bio: String (default: ""),
  experience: Number (default: 0),
  education: [{ degree, institute, year }],
  languages: [String] (default: ["Hindi", "English"]),
  clinicName: String (default: ""),
  clinicAddress: String (default: ""),
  availableDays: [String] (default: ["Mon", "Tue", "Wed", "Thu", "Fri"]),
  profilePicture: String (default: ""),
  introVideoUrl: String (default: ""),
  totalPatientsSeen: Number (default: 0),
  rating: Number (default: 4.5),
  reviewCount: Number (default: 0)
}
```

### 6.3 Appointment Schema

```javascript
{
  _id: ObjectId,
  patientId: ObjectId (ref: "User", required),
  doctorId: ObjectId (ref: "Doctor", required),
  date: String (required, format: "YYYY-MM-DD"),
  slotTime: String (required, format: "HH:MM"),
  appointmentNumber: Number (required, token number),
  pinHash: String (required, bcrypt hash of 4-digit PIN),
  pin: String (raw PIN before hashing, default: null),
  status: String (enum: "booked"|"arrived"|"served", default: "booked"),
  paymentStatus: String (enum: "pending"|"paid", default: "pending"),
  timestamps: { createdAt, updatedAt },
  indexes: {
    unique: { doctorId, date, appointmentNumber }
  }
}
```

### 6.4 Report Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: "User", required),
  fileName: String (required, original filename),
  fileUrl: String (required, Cloudinary URL),
  fileType: String (required, enum: "pdf"|"jpeg"|"jpg"|"png"|"webp"),
  fileSize: Number (required, in bytes),
  cloudinaryPublicId: String (required, for deletion),

  // User-entered metadata
  reportType: String (default: ""),
  doctorClinicName: String (default: ""),
  reportDate: Date (default: null),
  uploadedBy: String (enum: "Me"|"Doctor"|"Lab"|"", default: ""),
  tags: [String],

  // AI processing
  aiStatus: String (enum: "pending"|"processing"|"completed"|"failed", default: "pending"),
  aiSummary: {
    testTable: [{
      testName: String,
      value: String|Number|Object,
      unit: String,
      referenceRange: String,
      status: String (enum: "normal"|"low"|"high")
    }],
    plainSummary: [String],  // Hinglish, emoji-prefixed: "🟢 ...", "🟡 ...", "🔴 ...", "💡 ...", "👨‍⚕️ ..."
    extractedHealthData: {
      bloodGroup: String,
      hemoglobin: Number|String|Object,
      wbc: Number|String|Object,
      platelets: Number|String|Object,
      bloodSugar: Number|String|Object,
      creatinine: Number|String|Object,
      urea: Number|String|Object,
      detectedAllergies: [String],
      currentMedications: [String]
    },
    reportTypeDetected: String (enum: "CBC"|"LFT"|"KFT"|"Lipid Profile"|"Sugar"|"X-Ray"|"Prescription"|"ECG"|"Unknown")
  },

  uploadedAt: Date (default: Date.now)
}
```

### 6.5 PatientHealthSummary Schema

```javascript
{
  userId: ObjectId (ref: "User", required, unique),

  aiExtracted: {
    bloodGroup: String,
    detectedAllergies: [String],
    currentMedications: [{ medName, dosage, frequency }],
    labValues: {
      hemoglobin: Number|Object,
      wbc: Number|Object,
      platelets: Number|Object,
      bloodSugar: Number|Object,
      creatinine: Number|Object,
      urea: Number|Object,
      sodium: Number|Object,
      potassium: Number|Object,
      sgpt: Number|Object,
      sgot: Number|Object,
      bilirubin: Number|Object,
      cholesterol: Number|Object
    },
    specialFlags: {
      anemia: Boolean,
      infection: Boolean,
      kidneyIssue: Boolean,
      liverIssue: Boolean,
      diabetesRisk: Boolean
    },
    personalizedInsights: [String],
    trends: {
      hemoglobin: [{ dateTime, value }],
      wbc: [{ dateTime, value }],
      sugar: [{ dateTime, value }]
    }
  },

  userProvided: {
    conditions: {
      diabetes: Boolean,
      hypertension: Boolean,
      thyroid: Boolean
    },
    pastEvents: {
      surgeries: [String],
      injuries: [String],
      majorIllness: [String]
    },
    medications: [{ medName, dosage, frequency, reason }],
    allergies: [String],
    currentSymptoms: [String],
    familyHistory: {
      diabetes: Boolean,
      heartDisease: Boolean,
      cancer: Boolean,
      geneticConditions: [String]
    },
    lifestyle: {
      smoking: String (enum: "never"|"former"|"active"),
      alcohol: String (enum: "never"|"occasional"|"regular")
    }
  },

  lastUpdated: Date
}
```

### 6.6 Medication Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: "User", required),
  medName: String (required),
  dosage: String (required, e.g., "500mg"),
  frequency: String (required, e.g., "twice daily"),
  reason: String (optional),
  startDate: Date (required),
  endDate: Date (optional),

  timesPerDay: Number (calculated from frequency),
  todayTaken: Number (default: 0),
  lastTakenTime: Date,

  timestamps: { createdAt, updatedAt }
}
```

### 6.7 Queue Schema

```javascript
{
  doctorId: ObjectId (ref: "Doctor", required),
  date: String (required, format: "YYYY-MM-DD"),
  appointmentNumber: Number (required, auto-incrementing token),

  nextNumber: Number (current being served),
  timestamps: { createdAt, updatedAt }
}
```

### 6.8 Ayushman Claim Schema

```javascript
{
  userId: ObjectId (ref: "User", required),
  appointmentId: ObjectId (ref: "Appointment", required),
  abhaId: String (required),
  claimStatus: String (enum: "pending"|"approved"|"rejected"|"processing"),
  claimAmount: Number,
  timestamps: { createdAt, updatedAt }
}
```

---

---

## 7. AUTHENTICATION WORKFLOW (COMPLETE)

### 7.1 User Registration Flow

1. Frontend sends POST `/api/auth/signup` with `{ name, email, phone, password, role }`
2. Validation via Joi schema in `validate` middleware → returns 422 if invalid
3. Backend extracts fields and checks if user exists
4. If exists → 400 error
5. Password hashed with `bcryptjs` (10 rounds)
6. User created in MongoDB with role = "patient" (default) or provided role
7. JWT token generated: `{ userId, role, email }` with 7-day expiry
8. Token SET in httpOnly cookie (secure in production, sameSite: 'none')
9. Response returns user object (NO token in body — authentication via cookie)

### 7.2 Doctor Registration Flow

Similar to user signup but:

- Endpoint: POST `/api/auth/doctorSignup`
- Includes additional fields: `speciality`, `startTime`, `avgConsultTime`, `fees`
- Role auto-set to "doctor"
- Additional Doctor schema fields populated

### 7.3 Login Flow

1. Frontend sends POST `/api/auth/login` with `{ email, password }`
2. Backend queries User collection by email
3. If not found → 401 "Invalid email or password"
4. Password compared with stored hash via `bcrypt.compare()`
5. If mismatch → 401 error
6. If match → JWT generated with same payload
7. Token set in httpOnly cookie
8. Response returns user object with role

### 7.4 Authentication Middleware (`protect`)

**Location:** `middleware/authmiddleware.js`

- Runs on all protected routes (appointed by route registration)
- Extracts token from `req.cookies.token`
- If missing → 401 "You are not Authorised or Token Not Found"
- Verifies JWT with `process.env.JWT_SECRET`
- If invalid/expired → 401 "Invalid token"
- If valid → decodes and attaches to `req.user` (contains `{ userId, role, email }`)
- Next middleware/controller runs with `req.user` available

### 7.5 Authorization Patterns

**Admin-Only Routes:** `middleware/adminOnly.js`

- Checks `req.user.email` against hardcoded admin email list
- If not in list → 403 Forbidden

**Role-Based Routes:** `middleware/roleMiddleware.js`

- Checks `req.user.role` against allowed roles
- Route-level protection via middleware chaining

### 7.6 JWT Token Lifecycle

- **Created at:** Signup or login
- **Stored in:** httpOnly cookie (not accessible to JS, sent automatically)
- **Expiry:** 7 days
- **Verified on:** Every protected route (before controller runs)
- **Payload:** `{ userId, role, email }`
- **Secret:** `process.env.JWT_SECRET`

### 7.7 Request Flow Example

```
Client Request to protected route
  ↓
Express receives request + cookies
  ↓
protect middleware runs
  - Extract token from req.cookies.token
  - Verify with JWT_SECRET
  - Attach decoded payload to req.user
  ↓
Route handler (controller) receives req with req.user populated
  - Can use req.user.userId for DB queries
  ↓
Response sent back
```

---

## 8. BACKEND SERVICES

### 8.1 Gemini Service (`services/geminiService.js`)

**Purpose:** AI-powered medical report analysis

**Main Function:** `analyzeReport(cloudinaryUrl, fileType)`

- Takes Cloudinary PDF/image URL and file type
- Fetches file as base64
- Sends to Gemini API with medical extraction prompt
- Returns parsed JSON with:
  - `testTable`: Array of test results with values, units, reference ranges
  - `plainSummary`: Hinglish emoji-prefixed insights (🟢 normal, 🟡 caution, 🔴 critical, 💡 note, 👨‍⚕️ advice)
  - `extractedHealthData`: Blood group, allergies, medications, lab values
  - `reportTypeDetected`: Auto-classified report type (CBC, LFT, KFT, etc.)

**Config:**

- Model: `process.env.GEMINI_MODEL || "gemini-2.5-flash"`
- API Key: `process.env.GEMINI_API_KEY`
- Supports: PDF, JPEG, PNG, WebP

**Error Handling:**

- If API key missing → throws error
- If JSON parsing fails → throws "Invalid JSON returned by Gemini"
- On medical extraction error → returns `aiStatus: 'failed'`

### 8.2 Twilio Service (`services/twilioService.js`)

**Purpose:** Send SMS OTP and appointment reminders

**Account Setup:**

- Account SID: `process.env.TWILIO_ACCOUNT_SID`
- Auth Token: `process.env.TWILIO_AUTH_TOKEN`
- From Phone: `process.env.TWILIO_PHONE`

**Possible Functions:**

- Send 4-digit PIN via SMS to appointment booker
- Send appointment reminders to patients

### 8.3 ABDM Service (`services/abdmService.js`)

**Purpose:** Ayushman Bharat Digital Mission integration

**Features:**

- Connect to ABDM APIs for health record sharing
- Validate ABHA IDs
- Sync patient records with national health infrastructure

### 8.4 Claim Poller Service (`services/claimPoller.js`)

**Purpose:** Poll Ayushman claim status

**Function:** `startClaimPoller()`

- Runs continuously in background via `setInterval`
- Monitors Ayushman claims for status updates
- Updates claim status in database when response received
- Likely syncs with external Ayushman API

---

## 9. BACKEND MIDDLEWARE

### 9.1 Auth Middleware (`middleware/authmiddleware.js`)

- Extracts JWT from cookie, verifies, attaches user to request
- [Details in Section 6.4 above]

### 9.2 Validation Middleware (`middleware/validate.js`)

**Function:** `validate(schema, target = "body")`

- Validates request body/params/query with Joi schema
- Returns 422 with error messages array if validation fails
- Strips unknown fields, converts types automatically
- Attaches validated data back to `req[target]`

**Usage:**

```javascript
router.post("/signup", validate(signupSchema), signup);
router.get("/:id", validate(idSchema, "params"), getById);
```

### 9.3 File Upload Middleware (`middleware/validateFileUpload.js`)

- Validates uploaded file size, type, presence
- Used with multer for report uploads

### 9.4 Role Middleware (`middleware/roleMiddleware.js`)

- Checks `req.user.role` against allowed roles
- Returns 403 if unauthorized

### 9.5 Admin-Only Middleware (`middleware/adminOnly.js`)

- Checks if user email is in admin whitelist
- Additional security layer beyond role check

### 9.6 Rate Limiter Middleware (`middleware/rateLimiter.js`)

- Limits requests per IP to prevent abuse
- Applied selectively to sensitive endpoints (login, payment, etc.)

---

## 10. REQUEST VALIDATION PATTERN

All validators use **Joi** schemas located in `validators/` folder.

**Example:** `validators/authValidators.js`

```javascript
export const signupSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.number().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("patient", "doctor").optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
```

**Validation Flow:**

1. Route handler receives request
2. `validate(schema)` middleware runs
3. If validation fails → 422 status with `{ success: false, message, errors: [array] }`
4. If valid → continues to controller with cleaned data in `req.body`

**Error Message Example:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "'password' must be at least 6 characters long",
    "'email' must be a valid email"
  ]
}
```

---

## 11. JOBS & BACKGROUND TASKS

### 11.1 Process Report Job (`jobs/processReport.js`)

- Triggered when report uploaded
- Calls Gemini service for analysis
- Updates report `aiStatus` field in real-time
- Frontend polls `/api/reports/:id/ai-status` to show processing status

### 11.2 Update Health Profile Job (`jobs/updateHealthProfile.js`)

- Processes newly extracted health data from Gemini
- Merges AI-extracted data into PatientHealthSummary schema
- Updates lab value trends
- Recalculates special flags (anemia, infection, etc.)

---

## 12. UTILITY FUNCTIONS

### 12.1 Logger (`utils/logger.js`)

- Logs errors, info, warnings to files and console
- Located in `backend/logs/` directory

**Usage:**

```javascript
import logger from "./utils/logger.js";
logger.error({ message: "...", error: err });
logger.info({ data: someData });
```

### 12.2 Calculate ETA (`utils/calculateETA.js`)

- Calculates appointment queue wait time
- Uses `doctorId`, current appointment number, avg consult time
- Returns estimated ETA for patient

---

## 13. COMPONENT PATTERNS

### 13.1 Page Shell (every page follows this)

```jsx
import "./PageName.css";

export default function PageName() {
  return (
    <div className="pn-root">
      {/* full page wrapper, bg: var(--bg) */}
      <div className="pn-container">
        {/* max-width + centered */}
        {/* content */}
      </div>
    </div>
  );
}
```

### 13.2 Card

```jsx
<div className="pn-card">
  <h2 className="pn-card__title">...</h2>
  {/* content */}
</div>
```

```css
.pn-card {
  background: var(--card-bg);
  border-radius: 24px;
  border: 1px solid var(--border);
  box-shadow: 0 12px 48px rgba(62, 125, 245, 0.1);
  padding: 24px;
}
```

### 13.3 Primary Button

```css
.pn-btn-primary {
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-family: "Nunito", sans-serif;
  font-weight: 700;
  padding: 12px 28px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
.pn-btn-primary:hover {
  background: var(--blue-dark);
  transform: translateY(-1px);
}
```

### 13.4 Loading State

```jsx
import CircularProgress from "@mui/material/CircularProgress";

if (loading)
  return (
    <div className="pn-loader">
      <CircularProgress sx={{ color: "var(--blue)" }} />
    </div>
  );
```

### 13.5 Error Banner

```jsx
{
  error && <div className="pn-error">{error}</div>;
}
```

```css
.pn-error {
  background: var(--error-bg);
  color: var(--error-text);
  border-radius: 12px;
  padding: 12px 16px;
  font-family: "Nunito", sans-serif;
  font-weight: 600;
}
```

---

## 14. KNOWN GOTCHAS

| Gotcha             | Rule                                                                |
| ------------------ | ------------------------------------------------------------------- |
| Route typo         | `/my-appointements` has double 'e' — match exactly on both sides    |
| Schema filename    | `docterSchema.js` is misspelled — do not rename                     |
| Cloudinary PDFs    | Use `resource_type: 'raw'` on upload                                |
| JWT location       | Stored in httpOnly cookie (not accessible to JS)                    |
| Appointment status | Must be: "booked"\|"arrived"\|"served" (not "pending"\|"completed") |
| Token expiry       | JWT has 7-day expiry — refresh logic needed for long sessions       |
| Gemini prompt      | `plainSummary` instructions outside JSON schema block               |
| Route ordering     | Static routes before dynamic `/:id` routes                          |

---

## 15. WORKFLOW — HOW TO BUILD A NEW FEATURE

Follow this checklist in order:

1. **Backend API**
   - Define route in `routes/` with proper HTTP method
   - Register static routes BEFORE dynamic `/:id` routes
   - Create schema validation in `validators/`
   - Add middleware chain: `validate(schema)`, `protect`, optional role check
   - Implement controller logic with error handling
   - Return standard response: `{ success, data, message }`

2. **Database Schema**
   - Update or create MongoDB schema in `models/`
   - Add necessary indexes for queries/uniqueness
   - Document field types and defaults

3. **Service Layer** (if needed)
   - Create service function in `services/` for complex logic
   - Use it from controller

4. **Frontend Page**
   - Identify route in `App.jsx` or create it
   - Create `ComponentName.jsx` + `ComponentName.css`
   - Write CSS first using CSS variables
   - Write JSX with BEM classes
   - Import `useAuth`, `api`, `useNavigate`
   - Add loading + error states
   - Test on mobile (375px width)
5. **Write JSX** — structure + logic only. Import CSS. Use `useAuth` for user state, `api` for HTTP.
6. **Add navigation** — Back button + Home button at top.
7. **Add loading + error states** — every async page must handle both.
8. **Test mobile** — check layout at 375px width before considering done.

---

## 16. AI-RELATED UI PATTERNS (FRONTEND)

### 16.1 AI Status Polling

Frontend polls `GET /api/reports/:id/ai-status` every **3 seconds** while `aiStatus === 'processing'`:

```js
useEffect(() => {
  if (aiStatus !== "processing") return;
  const interval = setInterval(async () => {
    const res = await api.get(`/reports/${id}/ai-status`);
    setAiStatus(res.data.aiStatus);
    if (res.data.aiStatus !== "processing") clearInterval(interval);
  }, 3000);
  return () => clearInterval(interval);
}, [aiStatus]);
```

### 16.2 plainSummary Rendering

Each item in `plainSummary` is Hinglish with emoji prefix (🟢 / 🟡 / 🔴 / 💡 / 👨‍⚕️). Render as-is, no emoji mapping.

### 16.3 Lab Values Display

Lab values can be primitive or object:

```js
const displayVal = (v) =>
  v && typeof v === "object" ? `${v.value} ${v.unit}` : (v ?? "—");
```

---

_Last updated: April 2026 · SharaMed · Aashay Gupta_
