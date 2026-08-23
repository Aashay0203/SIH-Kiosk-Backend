import express from "express";
const router = express.Router();
import { signup, login, doctorSignup, logout, getSession } from "../controllers/authControllers.js";
import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
    signupSchema,
    loginSchema,
    doctorSignupSchema,
} from "../validators/authValidators.js";

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/doctorSignup", validate(doctorSignupSchema), doctorSignup);
router.get("/session", protect, getSession);
router.post("/logout", logout);

export default router;