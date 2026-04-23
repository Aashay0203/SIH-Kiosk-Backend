import Joi from "joi";

const objectIdPattern = /^[a-f\d]{24}$/i;

// POST /appointments/book
export const appointmentBookSchema = Joi.object({
    doctorId: Joi.string().pattern(objectIdPattern).required()
        .messages({ "string.pattern.base": "doctorId must be a valid MongoDB ObjectId" }),

    // YYYY-MM-DD
    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .custom((value, helpers) => {
            const d = new Date(value);
            if (isNaN(d.getTime())) return helpers.error("date.invalid");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) return helpers.error("date.past");
            return value;
        })
        .messages({
            "string.pattern.base": "date must be in YYYY-MM-DD format",
            "date.invalid": "date is not a valid calendar date",
            "date.past": "Cannot book appointments in the past",
        }),

    // HH:MM  24-hour
    slotTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
        .required()
        .messages({ "string.pattern.base": "slotTime must be HH:MM (24-hour), e.g. '09:00'" }),
});

// GET /appointments/booked-slots?doctorId=...&date=...
export const bookedSlotsQuerySchema = Joi.object({
    doctorId: Joi.string().pattern(objectIdPattern).required()
        .messages({ "string.pattern.base": "doctorId must be a valid MongoDB ObjectId" }),

    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({ "string.pattern.base": "date must be YYYY-MM-DD" }),
});

// PUT /appointments/:id/arrive
export const arriveSchema = Joi.object({
    pin: Joi.string().length(4).pattern(/^\d{4}$/).required()
        .messages({
            "string.length": "PIN must be exactly 4 digits",
            "string.pattern.base": "PIN must be numeric",
        }),
});

// GET /appointments/:id  (params)
export const appointmentIdParamSchema = Joi.object({
    id: Joi.string().pattern(objectIdPattern).required()
        .messages({ "string.pattern.base": "Appointment id is not a valid ObjectId" }),
});