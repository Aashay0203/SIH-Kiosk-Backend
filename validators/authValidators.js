// backend/validators/authValidators.js
import Joi from "joi";

export const signupSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required()
        .messages({ "string.min": "Name must be at least 2 characters" }),

    email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),

    phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
            "string.pattern.base": "Phone number must be exactly 10 digits",
            "any.required": "Phone number is required"
        }),

    password: Joi.string().min(6).max(128).required()
        .messages({ "string.min": "Password must be at least 6 characters" }),

    role: Joi.string().valid("patient").default("patient"),
});

export const loginSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
    password: Joi.string().min(1).required(),
});

export const doctorSignupSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required(),
    phone: Joi.number().integer().min(1000000000).max(9999999999).required(),
    password: Joi.string().min(6).max(128).required(),
    speciality: Joi.string().trim().min(2).max(100).required(),

    // Accept "09:00 AM", "9:00 AM", "09:00" — flexible
    startTime: Joi.string()
        .pattern(/^([0-1]?\d|2[0-3]):[0-5]\d(\s?(AM|PM))?$/i)
        .required()
        .messages({ "string.pattern.base": "startTime must be like '09:00 AM' or '14:30'" }),

    avgConsultTime: Joi.number().integer().min(1).max(120).default(10),
    fees: Joi.number().min(0).max(100000).required()
        .messages({ "number.min": "Fees cannot be negative" }),
});