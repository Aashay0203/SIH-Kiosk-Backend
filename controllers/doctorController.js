import * as Sentry from "@sentry/node";
import Doctor from "../models/docterSchema.js";
import Appointment from "../models/appointmentSchema.js";
import Queue from "../models/queueSchema.js";
import PatientHealthProfile from "../models/patientHealthSumSchema.js";
import mongoose from "mongoose";
import wrapAsync from "../utils/wrapAsync.js";

export const getAllDoctors = wrapAsync(async (req, res) => {
    const allDoctors = await Doctor.find().select("name speciality startTime avgConsultTime fees");

    if (allDoctors.length === 0) {
        return res.status(200).json({
            success: true,
            count: 0,
            allDoctors: [],
            message: "No doctors found",
        });
    }

    res.status(200).json({ success: true, count: allDoctors.length, allDoctors });
});

export const doctorDetails = wrapAsync(async (req, res) => {
    const { id } = req.params;

    const details = await Doctor.findById(id);
    if (!details) {
        // ✅ BUG FIX: was 400, should be 404
        return res.status(404).json({ success: false, message: "Doctor details not found" });
    }

    res.status(200).json({ success: true, message: "Doctor Details Fetch Successfully", details });
});

export const getTodayAppointments = wrapAsync(async (req, res) => {
    const doctorId = req.user.userId;

    // ✅ BUG FIX: was setUTCHours(0,0,0,0) — rolls back 5h30m in IST
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const appointments = await Appointment.find({ doctorId, date: today })
        .populate("patientId", "name phone email")
        .sort({ appointmentNumber: 1 });

    const queue = await Queue.findOne({ doctorId, date: today });

    const queueStatus = {
        currentNumber: queue?.currentNumber || 0,
        lastTokenNumber: queue?.lastTokenNumber || 0,
        remaining: Math.max(0, (queue?.lastTokenNumber || 0) - (queue?.currentNumber || 0)),
    };

    res.status(200).json({ success: true, appointments, queueStatus });
});

export const getPatientHealthProfile = wrapAsync(async (req, res) => {
    const { patientId } = req.params;
    const doctorId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }

    const appointment = await Appointment.findOne({ doctorId, patientId });
    if (!appointment) {
        return res.status(403).json({
            success: false,
            message: "Unauthorized: You don't have any appointments with this patient"
        });
    }

    const profile = await PatientHealthProfile.findOne({ userId: patientId });
    if (!profile) {
        return res.status(404).json({ success: false, message: "No health profile found" });
    }

    res.status(200).json({ success: true, profile });
});

export const getDoctorProfile = wrapAsync(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).select('-password');

    if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // ✅ BUG FIX: wrapped in { success: true, doctor } for consistent API shape
    res.status(200).json({ success: true, doctor });
});