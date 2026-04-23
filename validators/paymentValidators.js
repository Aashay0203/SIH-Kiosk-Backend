// backend/validators/paymentValidators.js
import Joi from "joi";

const objectIdPattern = /^[a-f\d]{24}$/i;

// POST /payment/verify  (Cashfree)
export const verifyPaymentSchema = Joi.object({
    orderId: Joi.string().trim().min(1).required(),
});



// POST /payment/cash-confirm
export const cashConfirmSchema = Joi.object({
    appointmentId: Joi.string().pattern(objectIdPattern).required(),
});