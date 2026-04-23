import express from "express";
const router = express.Router();
import { verifyPayment, cashConfirm, markPaymentPaid } from "../controllers/paymentController.js";
import protect from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { onlyAdminEmail } from "../middleware/adminOnly.js";
import {
    verifyPaymentSchema,
    cashConfirmSchema,
} from "../validators/paymentValidators.js";

router.post("/verify", protect, validate(verifyPaymentSchema), verifyPayment);
router.post("/cash-confirm", protect, validate(cashConfirmSchema), cashConfirm);
router.post("/mark-paid", protect, onlyAdminEmail, markPaymentPaid);

export default router;