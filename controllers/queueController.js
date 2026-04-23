import mongoose from "mongoose";
import Queue from "../models/queueSchema.js";
import Appointment from "../models/appointmentSchema.js";
import wrapAsync from "../utils/wrapAsync.js";

export const moveQueueNext = wrapAsync(async (req, res) => {
    const doctorId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ success: false, message: "Invalid doctor ID in token" });
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const queue = await Queue.findOne({ doctorId, date: today });
    if (!queue) {
        return res.status(404).json({ success: false, message: "Queue not found for today" });
    }

    // ✅ BUG FIX: guard against advancing past the last token
    if (queue.currentNumber >= queue.lastTokenNumber) {
        return res.status(400).json({ success: false, message: "Queue is already at the last token" });
    }

    // Mark current appointment as served
    if (queue.currentNumber > 0) {
        await Appointment.findOneAndUpdate(
            { doctorId, date: today, appointmentNumber: queue.currentNumber },
            { status: "served" }
        );
    }

    queue.currentNumber += 1;
    queue.lastUpdatedAt = new Date();
    await queue.save();

    return res.status(200).json({
        success: true,
        message: "Queue moved to next patient",
        currentNumber: queue.currentNumber
    });
});