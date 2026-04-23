import * as Sentry from "@sentry/node";

export default (err, req, res, next) => {
    Sentry.captureException(err);
    console.error("[errorHandler]", err);

    if (err.isJoi || err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: err.details?.[0]?.message || "Validation failed."
        });
    }

    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || "Something went wrong. Please try again."
    });
};