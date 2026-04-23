import rateLimit from 'express-rate-limit';


// Minimal limit for login: 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { message: "Too many login attempts. Please try again after 15 minutes." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Limit for signup: 3 accounts per hour per IP to prevent spam
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { message: "Account creation limit reached. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});