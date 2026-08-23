import { Cashfree } from "cashfree-pg";
import bcrypt from "bcryptjs";
import Appointment from "../models/appointmentSchema.js";
import Queue from "../models/queueSchema.js";
import wrapAsync from "../utils/wrapAsync.js";
import { encryptPin } from "../utils/pinUtils.js";
import { fetchCashfreeOrder } from "../utils/cashfree.js";

// ✅ Helper: generate 4-digit PIN and its bcrypt hash
const generatePinAndHash = async () => {
    const rawPin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await bcrypt.hash(rawPin, 10);
    return { rawPin, pinHash };
};

// ✅ Helper: assign token number and PIN to an existing pending appointment
export const confirmAppointment = async (appointment, paymentStatus, paymentMethod = null) => {
    const normalizedDate = appointment.date; // already UTC from appointmentBook

    const queue = await Queue.findOneAndUpdate(
        { doctorId: appointment.doctorId, date: normalizedDate },
        { $inc: { lastTokenNumber: 1 } },
        { upsert: true, returnDocument: "after" }
    );

    const { rawPin, pinHash } = await generatePinAndHash();

    appointment.appointmentNumber = queue.lastTokenNumber;
    appointment.pinHash = pinHash;
    appointment.encryptedPin = encryptPin(rawPin);
    appointment.paymentStatus = paymentStatus;
    if (paymentMethod) appointment.paymentMethod = paymentMethod;

    await appointment.save();

    return { appointmentNumber: appointment.appointmentNumber, rawPin };
};

// ─── Cashfree card/UPI SDK flow ───────────────────────────────────────────────
// Frontend sends: { orderId } (the cashfreeOrderId stored on the appointment)
// Backend fetches order status server-to-server — no client signature to verify
export const verifyPayment = wrapAsync(async (req, res) => {
    const { orderId } = req.body;
    console.log(orderId);

    if (!orderId) {
        return res.status(400).json({ success: false, message: "orderId is required" });
    }

    // 1. Server-to-server verify with Cashfree
    let orderRes;
    try {
        orderRes = await fetchCashfreeOrder(orderId);
    } catch (cashfreeErr) {
        if (cashfreeErr.response?.status === 401) {
            return res.status(500).json({
                success: false,
                message: "Payment gateway is not configured. Please contact support.",
                error: process.env.NODE_ENV === "development" ? cashfreeErr.message : undefined
            });
        }
        throw cashfreeErr;
    }

    const orderStatus = orderRes.data?.order_status;

    if (orderStatus !== "PAID") {
        return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    // 2. Find the pending appointment by cashfreeOrderId with atomic lock to prevent race conditions
    const appointment = await Appointment.findOneAndUpdate(
        { cashfreeOrderId: orderId, paymentStatus: "pending" },
        { $set: { paymentStatus: "paid" } }
    );

    if (!appointment) {
        const existingAppt = await Appointment.findOne({ cashfreeOrderId: orderId });
        if (!existingAppt) {
            return res.status(404).json({ success: false, message: "Appointment not found for this order" });
        }
        if (existingAppt.patientId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        return res.status(200).json({ success: true, message: "Already confirmed", appointmentNumber: existingAppt.appointmentNumber });
    }

    if (appointment.patientId.toString() !== req.user.userId) {
        appointment.paymentStatus = "pending";
        await appointment.save();
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    // 3. Assign token + PIN, mark paid
    const { appointmentNumber, rawPin } = await confirmAppointment(appointment, "paid");

    return res.status(200).json({
        success: true,
        message: "Appointment Confirmed",
        appointmentNumber,
        rawPin,
    });
});



// ─── Cash confirm ─────────────────────────────────────────────────────────────
// No gateway involved — patient pays at clinic
// Frontend sends: { appointmentId }
export const cashConfirm = wrapAsync(async (req, res) => {
    const { appointmentId } = req.body;

    if (!appointmentId) {
        return res.status(400).json({ success: false, message: "appointmentId is required" });
    }

    // ✅ ATOMIC UPDATE: Ensure we only claim a token once, even if double-clicked
    const appointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, paymentMethod: null, paymentStatus: "pending" },
        { $set: { paymentMethod: "Cash" } }
    );

    if (!appointment) {
        const existingAppt = await Appointment.findById(appointmentId);
        if (!existingAppt) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        if (existingAppt.patientId.toString() !== req.user.userId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        return res.status(200).json({ success: true, message: "Already confirmed", appointmentNumber: existingAppt.appointmentNumber });
    }

    if (appointment.patientId.toString() !== req.user.userId) {
        appointment.paymentMethod = null;
        await appointment.save();
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    // ✅ Issue token and PIN immediately, but keep paymentStatus "pending"
    const { appointmentNumber, rawPin } = await confirmAppointment(appointment, "pending", "Cash");

    return res.status(200).json({
        success: true,
        message: "Appointment Reserved. Waiting for cash payment at clinic.",
        appointmentNumber,
        rawPin,
    });
});

export const markPaymentPaid = wrapAsync(async (req, res) => {
    const { appointmentId } = req.body;

    if (!appointmentId) {
        return res.status(400).json({ success: false, message: "appointmentId is required" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.paymentStatus === "paid") {
        return res.status(400).json({ success: false, message: "Already paid" });
    }

    appointment.paymentStatus = "paid";
    await appointment.save();

    return res.status(200).json({
        success: true,
        message: "Status updated to paid successfully",
        appointmentNumber: appointment.appointmentNumber
    });
});