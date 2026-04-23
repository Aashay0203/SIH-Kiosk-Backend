import Appointment from "../models/appointmentSchema.js";
import Queue from "../models/queueSchema.js";

export const getTodayAppointments = async (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Fetch all today's appointments across all doctors
        const appointments = await Appointment.find({ date: today })
            .populate("patientId", "name phone email")
            .populate("doctorId", "name speciality")
            .sort({ appointmentNumber: 1 });

        // Fetch all queues for today
        const queues = await Queue.find({ date: today });

        // Build a map doctorId → currentNumber
        const queueMap = {};
        queues.forEach((q) => {
            queueMap[q.doctorId.toString()] = q.currentNumber;
        });

        // Stats
        const total = appointments.length;
        const arrived = appointments.filter(a => a.status === "arrived").length;
        const served = appointments.filter(a => a.status === "served").length;
        const booked = appointments.filter(a => a.status === "booked").length;

        return res.status(200).json({
            success: true,
            appointments,
            queueMap,
            stats: { total, arrived, served, booked }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};