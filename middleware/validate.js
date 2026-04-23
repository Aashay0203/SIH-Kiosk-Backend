export const validate = (schema, target = "body") => {
    return (req, res, next) => {


        const { error, value } = schema.validate(req[target], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const messages = error.details.map((d) => d.message.replace(/"/g, "'"));
            return res.status(422).json({
                success: false,
                message: "Validation failed",
                errors: messages,
            });
        }

        req[target] = value;
        next();
    };
};