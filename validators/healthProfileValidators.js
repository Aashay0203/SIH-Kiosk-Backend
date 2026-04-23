// backend/validators/healthProfileValidators.js
import Joi from "joi";

const smokingOptions = ["Never", "Current", "Former"];
const alcoholOptions = ["Never", "Occasionally", "Regularly"];

export const healthProfileUserDataSchema = Joi.object({
    conditions: Joi.object({
        diabetes: Joi.boolean().default(false),
        hypertension: Joi.boolean().default(false),
        thyroid: Joi.boolean().default(false),
    }).optional(),

    pastEvents: Joi.object({
        surgeries: Joi.array().items(Joi.string().trim().max(200)).max(20).optional(),
        injuries: Joi.array().items(Joi.string().trim().max(200)).max(20).optional(),
        majorIllness: Joi.array().items(Joi.string().trim().max(200)).max(20).optional(),
    }).optional(),

    medications: Joi.array().items(Joi.string().trim().max(200)).max(50).optional(),
    allergies: Joi.array().items(Joi.string().trim().max(200)).max(50).optional(),
    currentSymptoms: Joi.array().items(Joi.string().trim().max(200)).max(30).optional(),

    familyHistory: Joi.object({
        diabetes: Joi.boolean().default(false),
        heartDisease: Joi.boolean().default(false),
        cancer: Joi.boolean().default(false),
        geneticConditions: Joi.array().items(Joi.string().trim().max(200)).max(20).optional(),
    }).optional(),

    lifestyle: Joi.object({
        smoking: Joi.string().valid(...smokingOptions, null).allow(null).optional(),
        alcohol: Joi.string().valid(...alcoholOptions, null).allow(null).optional(),
    }).optional(),
});