import * as Sentry from "@sentry/node";
import User from "../models/userSchema.js";
import Doctor from "../models/docterSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import wrapAsync from "../utils/wrapAsync.js";

// 🛡️ Helper for secure cookie options
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax', // Fix: browser rejects sameSite: 'none' without secure: true
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
};

export const signup = wrapAsync(async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, phone, password: hashedPassword, role });

    const token = jwt.sign(
        { userId: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie('token', token, getCookieOptions());

    res.status(201).json({
        success: true,
        message: "Signup successful",
        user: { id: user._id, role: user.role, email: user.email, name: user.name }
    });
});

export const doctorSignup = wrapAsync(async (req, res) => {
    const { name, email, phone, password, speciality, startTime, avgConsultTime, fees, clinicAddress, clinicName } = req.body;

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
        return res.status(400).json({ success: false, message: "Doctor already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = await Doctor.create({
        name, email, phone, password: hashedPassword,
        speciality, startTime, avgConsultTime, fees, clinicAddress, clinicName
    });

    const token = jwt.sign(
        { userId: doctor._id, role: "doctor", email: doctor.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie('token', token, getCookieOptions());

    res.status(201).json({
        success: true,
        message: "Doctor signup successful",
        user: { id: doctor._id, role: "doctor", email: doctor.email, name: doctor.name }
    });
});

export const login = wrapAsync(async (req, res) => {
    const { email, password } = req.body;

    let account = null;
    let role = null;

    account = await User.findOne({ email });
    if (account) {
        role = account.role;
    } else {
        account = await Doctor.findOne({ email });
        if (account) role = "doctor";
    }

    if (!account) {
        return res.status(400).json({ success: false, message: "User Not Found" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { userId: account._id, role, email: account.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie('token', token, getCookieOptions());

    res.status(200).json({
        success: true,
        message: "Login successful",
        user: { id: account._id, role, email: account.email, name: account.name }
    });
});

// ✅ Sync — wrapAsync not needed
export const logout = (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
};