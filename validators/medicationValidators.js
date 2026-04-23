// backend/validators/medicationValidators.js
import Joi from "joi";

const objectIdPattern = /^[a-f\d]{24}$/i;

export const addMedicationSchema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    dosage: Joi.string().trim().min(1).max(100).required(),
    time: Joi.string().trim().min(1).max(50).required()
        .messages({ "string.base": "time is required (e.g. '08:00 AM')" }),
});

export const updateMedicationSchema = Joi.object({
    taken: Joi.boolean().required()
        .messages({ "any.required": "'taken' (boolean) is required" }),
});

export const medicationIdParamSchema = Joi.object({
    id: Joi.string().pattern(objectIdPattern).required()
        .messages({ "string.pattern.base": "Medication id is not a valid ObjectId" }),
});