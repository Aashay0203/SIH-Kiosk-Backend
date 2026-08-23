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

    chiefComplaint: Joi.string().trim().max(500).allow(null, "").optional(),

    socratesHpi: Joi.object({
        site: Joi.string().allow(null, "").optional(),
        onset: Joi.string().allow(null, "").optional(),
        character: Joi.string().allow(null, "").optional(),
        radiation: Joi.string().allow(null, "").optional(),
        associations: Joi.array().items(Joi.string()).optional(),
        timing: Joi.string().allow(null, "").optional(),
        exacerbating: Joi.string().allow(null, "").optional(),
        severity: Joi.number().min(1).max(10).allow(null).optional(),
    }).optional(),

    ayushAssessment: Joi.object({
        prakriti: Joi.string().allow(null, "").optional(),
        vikriti: Joi.string().allow(null, "").optional(),
        agni: Joi.string().allow(null, "").optional(),
        koshtha: Joi.string().allow(null, "").optional(),
        dietType: Joi.string().allow(null, "").optional(),
        appetite: Joi.string().allow(null, "").optional(),
        sleepQuality: Joi.string().allow(null, "").optional(),
    }).optional(),

    redFlagAlert: Joi.object({
        isTriggered: Joi.boolean().default(false),
        severity: Joi.string().valid("CRITICAL", "URGENT", "MODERATE", "NONE").default("NONE"),
        reasons: Joi.array().items(Joi.string()).optional(),
        triggeredAt: Joi.date().allow(null).optional(),
    }).optional(),

    consentAndAbha: Joi.object({
        abhaId: Joi.string().allow(null, "").optional(),
        consentGranted: Joi.boolean().default(false),
        consentTimestamp: Joi.date().allow(null).optional(),
        language: Joi.string().default("en").optional(),
    }).optional(),
}).unknown(true);