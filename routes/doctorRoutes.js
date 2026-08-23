import express from "express";
const router = express.Router();
import protect from "../middleware/authMiddleware.js";
import {
    getAllDoctors, doctorDetails, getTodayAppointments,
    getPatientHealthProfile, getDoctorProfile
} from "../controllers/doctorController.js"
import roleMiddleware from "../middleware/roleMiddleware.js";
import { doctorSignup } from "../controllers/authControllers.js";
import { signupLimiter } from "../middleware/rateLimiter.js";
import { validate } from '../middleware/validate.js';
import doctorSignupSchema from '../validators/doctorValidators.js';
import { onlyAdminEmail } from "../middleware/adminOnly.js";



router.post("/add", validate(doctorSignupSchema), signupLimiter, protect, onlyAdminEmail, doctorSignup);
router.get("/allDoctors", getAllDoctors);
router.get(
    "/today-appointments",
    protect,
    roleMiddleware("doctor"),
    getTodayAppointments
);
router.get(
    "/patient-profile/:patientId",
    protect,
    roleMiddleware("doctor"),
    getPatientHealthProfile
);
router.get("/:id/profile", getDoctorProfile);
router.get("/:id", doctorDetails);

export default router;
