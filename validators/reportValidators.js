// backend/validators/reportValidators.js
import Joi from "joi";

const objectIdPattern = /^[a-f\d]{24}$/i;

// PATCH /reports/:id  — update metadata
export const reportMetaSchema = Joi.object({
    reportType: Joi.string().trim().max(120).optional().allow(""),
    doctorClinicName: Joi.string().trim().max(120).optional().allow(""),

    reportDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .allow("", null)
        .messages({ "string.pattern.base": "reportDate must be YYYY-MM-DD" }),

    uploadedBy: Joi.string().valid("Me", "Doctor", "Lab", "").optional(),

    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
});

// GET /reports/:id  — param
export const reportIdParamSchema = Joi.object({
    id: Joi.string().pattern(objectIdPattern).required()
        .messages({ "string.pattern.base": "Report id is not a valid ObjectId" }),
});