import express from "express";
const router = express.Router();
import protect from "../middleware/authMiddleware.js";
import { appointmentBook, getAppointmentStatus, markAppointmentArrived, getTokenCount, myAppointments, getPinForAppointment } from "../controllers/appointmentController.js";
import { validate } from "../middleware/validate.js";
import {
    appointmentBookSchema,
    bookedSlotsQuerySchema,
    arriveSchema,
    appointmentIdParamSchema,
} from "../validators/appointmentValidators.js";

router.get("/my-appointments", protect, async (req, res) => {
    res.json({
        message: "Protected route accessed",
        userId: req.user.userId,
    });
});

router.get("/token-count", getTokenCount); // Add this line - NO protect needed
router.post("/book", validate(appointmentBookSchema), protect, appointmentBook);
router.get("/my-appointements", protect, myAppointments);
router.get("/:id/pin", protect, getPinForAppointment);
router.get("/:id/status", validate(appointmentIdParamSchema, "params"), protect, getAppointmentStatus);
router.put("/:id/arrive", validate(appointmentIdParamSchema, "params"),
    validate(arriveSchema), protect, markAppointmentArrived);

export default router;
