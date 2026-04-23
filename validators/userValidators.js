// backend/validators/userValidators.js
import Joi from "joi";

export const patchUserSchema = Joi.object({
    dob: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .allow("", null)
        .custom((value, helpers) => {
            if (!value) return value;
            const d = new Date(value);
            if (isNaN(d.getTime())) return helpers.error("date.invalid");
            if (d > new Date()) return helpers.error("date.future");
            return value;
        })
        .messages({
            "string.pattern.base": "dob must be YYYY-MM-DD",
            "date.invalid": "dob is not a valid date",
            "date.future": "Date of birth cannot be in the future",
        }),

    gender: Joi.string()
        .valid("Male", "Female", "Other", "Prefer not to say", "")
        .optional()
        .allow(""),

    address: Joi.string().trim().max(500).optional().allow("", null),

    abhaId: Joi.string()
        .pattern(/^\d{2}-\d{4}-\d{4}-\d{4}$/)
        .optional()
        .allow("", null)
        .messages({ "string.pattern.base": "ABHA ID format must be XX-XXXX-XXXX-XXXX" }),
});