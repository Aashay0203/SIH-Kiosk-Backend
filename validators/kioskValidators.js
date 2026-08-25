import Joi from "joi";

export const submitKioskSummarySchema = Joi.object({
    structuredSummary: Joi.object({
        chiefComplaint: Joi.string().allow(""),
        hpi: Joi.string().allow(""),
        pastHistory: Joi.string().allow(""),
        drugAllergyHistory: Joi.string().allow(""),
        familyHistory: Joi.string().allow(""),
        personalHistory: Joi.string().allow(""),
        reviewOfSystems: Joi.string().allow(""),
        plainSummary: Joi.string().allow(""),
    }).required(),
});