import Joi from 'joi';

const doctorSignupSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    speciality: Joi.string().required(),
    fees: Joi.number().positive().required(),
    avgConsultTime: Joi.number().integer().min(5).max(60).default(15),
    startTime: Joi.string().required()
});

export default doctorSignupSchema;