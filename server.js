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
import kioskRouter from "./routes/kioskRoute.js";

// ✅ BUG FIX: fallback to 8080 if PORT missing from .env
const PORT = process.env.PORT || 8080;
const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://sih-kiosk-fronted.vercel.app'
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

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use("/api/kiosk", kioskRouter);

// Sentry error handler must come BEFORE your own errorHandler
Sentry.setupExpressErrorHandler(app);

// Your centralized error handler
app.use(errorHandler);

const connectMongoDb = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is not configured");
        }

        await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 10000,
        });
        logger.info("MongoDB connected successfully");
    } catch (err) {
        logger.error(
            `MongoDB connection failed (${err.name}, code ${err.code ?? "unknown"}): ${err.message}`
        );
        process.exit(1);
    }
};

const startServer = async () => {
    await connectMongoDb();

    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
};

startServer();