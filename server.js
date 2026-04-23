import dotenv from "dotenv";
dotenv.config({ quiet: true });
import * as Sentry from "@sentry/node";

// ✅ BUG FIX: Sentry.init() must be called before importing anything else
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
});

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandlers.js";

import appointmentRoute from "./routes/appointment.js";
import authRoute from "./routes/authRoutes.js";
import doctorRoute from "./routes/doctorRoutes.js";
import queueRoute from "./routes/queueRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import medicationRoutes from "./routes/medicationRoute.js";
import reportRoute from "./routes/reportRoute.js";
import userRoute from "./routes/userRoute.js";
import healthProfileRoute from "./routes/healthProfileRoute.js";
import adminRoute from "./routes/adminRoute.js";

// ✅ BUG FIX: fallback to 8080 if PORT missing from .env
const PORT = process.env.PORT || 8080;
const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://saharamed.vercel.app'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/appointments", appointmentRoute);
app.use("/api/doctors", doctorRoute);
app.use("/api/queues", queueRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/medications", medicationRoutes);
app.use("/api/reports", reportRoute);
app.use("/api/user", userRoute);
app.use("/api/healthProfile", healthProfileRoute);
app.use("/api/admin", adminRoute);

// Sentry error handler must come BEFORE your own errorHandler
Sentry.setupExpressErrorHandler(app);

// Your centralized error handler
app.use(errorHandler);

const connectMongoDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        logger.info("MongoDB connected successfully");
    } catch (err) {
        // ✅ BUG FIX: log properly and exit — don't run server without DB
        logger.error({ message: "MongoDB connection failed", error: err });
        process.exit(1);
    }
};

app.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);
    await connectMongoDb();
});