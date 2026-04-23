import * as Sentry from "@sentry/node";
import bcrypt from "bcryptjs";
import Appointment from "../models/appointmentSchema.js";
import Queue from "../models/queueSchema.js";
import { calculateETA } from "../utils/calculateETA.js";
import Doctor from "../models/docterSchema.js";
import User from "../models/userSchema.js";
import mongoose from "mongoose";
import wrapAsync from "../utils/wrapAsync.js";
import { decryptPin } from "../utils/pinUtils.js";
import { createCashfreeOrder } from "../utils/cashfree.js";

// ✅ Helper: calculate appointment start time
const calculateAppointmentStartTime = (startTime, waitMinutes) => {
    try {
        let hours, minutes, isPM = false;

        if (startTime.toLowerCase().includes('am') || startTime.toLowerCase().includes('pm')) {
            isPM = startTime.toLowerCase().includes('pm');
            const timePart = startTime.split(' ')[0];
            [hours, minutes] = timePart.split(':').map(Number);
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
        } else {
            [hours, minutes] = startTime.split(':').map(Number);
        }

        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        startDate.setMinutes(startDate.getMinutes() + waitMinutes);

        const resultHours = String(startDate.getHours()).padStart(2, '0');
        const resultMinutes = String(startDate.getMinutes()).padStart(2, '0');

        return `${resultHours}:${resultMinutes}`;
    } catch (err) {
        Sentry.captureException(err);
        return startTime;
    }
};
export const appointmentBook = wrapAsync(async (req, res) => {
    const patientId = req.user.userId;
    const { doctorId, date, slotTime } = req.body;

    if (!date || !slotTime) {
        return res.status(400).json({ success: false, message: "date and slotTime are required" });
    }

    if (!doctorId) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const doctor = await Doctor.findById(doctorId).select("name speciality startTime avgConsultTime fees");
    if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const user = await User.findById(patientId).select("name phone");
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Parse date string to UTC (IST-safe — never use setUTCHours on local Date)
    const [y, m, d] = date.split("-").map(Number);
    const appointmentDate = new Date(Date.UTC(y, m - 1, d));

    const existing = await Appointment.findOne({ patientId, doctorId, date: appointmentDate });
    if (existing) {
        return res.status(409).json({
            success: false,
            message: "You already have an appointment with this doctor on this date"
        });
    }

    // ✅ Create appointment with paymentStatus: 'pending' first
    // appointmentNumber and pinHash will be assigned after payment confirmation
    const appointment = await Appointment.create({
        patientId,
        doctorId,
        date: appointmentDate,
        slotTime,
        paymentStatus: "pending",
    });

    // ✅ Create Cashfree order using appointment._id as the reference
    const cashfreeOrderId = `appt_${appointment._id.toString().slice(-12)}_${Date.now()}`;


    let orderRes = await createCashfreeOrder({
        order_id: cashfreeOrderId,
        order_amount: doctor.fees,
        order_currency: "INR",
        customer_details: {
            customer_id: patientId,
            customer_phone: String(user.phone),
            customer_name: user.name,
        }
    });

    // ✅ Persist cashfreeOrderId on the appointment so verifyPayment can look it up
    appointment.cashfreeOrderId = cashfreeOrderId;
    await appointment.save();

    return res.status(200).json({
        success: true,
        message: "Slot is available, please complete payment",
        appointmentId: appointment._id.toString(),
        orderId: orderRes.data.order_id,
        paymentSessionId: orderRes.data.payment_session_id,
        fees: doctor.fees,
    });
});


export const getAppointmentStatus = wrapAsync(async (req, res) => {
    const appointmentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.patientId.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    const doctor = await Doctor.findById(appointment.doctorId).select("name speciality startTime avgConsultTime fees");
    if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const dateObj = new Date(appointment.date);
    const normalizedDate = new Date(Date.UTC(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate()
    ));

    let queue = await Queue.findOne({ doctorId: doctor._id, date: normalizedDate });
    if (!queue) {
        queue = await Queue.create({ doctorId: doctor._id, date: normalizedDate, currentNumber: 0 });
    }

    const { remaining, etaMinutes } = calculateETA(
        appointment.appointmentNumber,
        queue.currentNumber,
        doctor.avgConsultTime
    );

    let status = "waiting";
    if (remaining <= 0) status = "serving";
    else if (remaining <= 2) status = "near";

    return res.status(200).json({
        success: true,
        appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        currentNumber: queue.currentNumber,
        remaining,
        etaMinutes,
        status
    });
});

export const markAppointmentArrived = wrapAsync(async (req, res) => {
    const appointmentId = req.params.id;
    const { pin } = req.body;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    }

    if (!pin) {
        return res.status(400).json({ success: false, message: "PIN is required" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (!appointment.pinHash) {
        return res.status(400).json({ success: false, message: "Appointment not yet confirmed" });
    }
    if (appointment.status === "arrived") {
        return res.status(200).json({ success: true, message: "Patient already arrived" });
    }

    const isMatch = await bcrypt.compare(pin, appointment.pinHash);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid PIN" });
    }

    appointment.status = "arrived";
    await appointment.save();

    return res.status(200).json({
        success: true,
        message: "Patient marked as arrived",
        appointmentId: appointment._id
    });
});

export const getTokenCount = wrapAsync(async (req, res) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
        return res.status(400).json({ success: false, message: "doctorId and date are required" });
    }

    const [y, m, d] = date.split("-").map(Number);
    const appointmentDate = new Date(Date.UTC(y, m - 1, d));

    const doctor = await Doctor.findById(doctorId).select("name speciality startTime avgConsultTime fees");
    if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const bookedCount = await Appointment.countDocuments({
        doctorId,
        date: appointmentDate,
        paymentStatus: { $in: ["paid", "pending"] }
    });

    const queue = await Queue.findOne({ doctorId, date: appointmentDate });

    const currentNumber = queue?.currentNumber || 0;
    const nextToken = bookedCount + 1;
    const tokensAhead = Math.max(nextToken - currentNumber - 1, 0);
    const approxWaitMinutes = tokensAhead * doctor.avgConsultTime;

    const appointmentStartTime = calculateAppointmentStartTime(doctor.startTime, approxWaitMinutes);

    return res.status(200).json({
        success: true,
        bookedCount,
        nextToken,
        currentNumber,
        avgConsultTime: doctor.avgConsultTime,
        approxWaitMinutes,
        startTime: doctor.startTime,
        appointmentStartTime,
        fees: doctor.fees
    });
});

export const myAppointments = wrapAsync(async (req, res) => {
    const userId = req.user.userId;

    // ✅ BUG FIX: .select("+pin") removed — pin is never stored, only pinHash is
    const appointments = await Appointment.find({ patientId: userId })
        .populate("doctorId", "name speciality fees avgConsultTime startTime clinicName clinicAddress");

    // Decrypt the PIN on the server since frontend cannot decrypt AES securely
    const formattedAppointments = appointments.map((appt) => {
        const apptObj = appt.toObject();

        if (apptObj.encryptedPin) {
            try {
                apptObj.pin = decryptPin(apptObj.encryptedPin);
            } catch (err) {
                console.error("Error decrypting pin for appointment", apptObj._id, err);
                apptObj.pin = null;
            }
        } else {
            apptObj.pin = null;
        }

        // Optionally remove sensitive server fields before sending to client
        delete apptObj.encryptedPin;
        delete apptObj.pinHash;

        return apptObj;
    });

    res.status(200).json({ success: true, appointments: formattedAppointments });
});

// GET /api/appointments/:id/pin — patient retrieves their appointment PIN
export const getPinForAppointment = wrapAsync(async (req, res) => {
    const appointmentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Only the booking patient may retrieve the PIN
    if (req.user.userId !== appointment.patientId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    // PIN is only available after payment is confirmed
    if (appointment.paymentStatus === "pending") {
        return res.status(400).json({ success: false, message: "Appointment not yet confirmed — PIN unavailable" });
    }

    const pin = decryptPin(appointment.encryptedPin);

    return res.status(200).json({ success: true, pin });
});