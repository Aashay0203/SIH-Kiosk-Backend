import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
        },
        date: {
            type: String, // YYYY-MM-DD
            required: true,
        },
        slotTime: {
            type: String, // "14:00"
            required: true,
        },
        appointmentNumber: {
            type: Number
        },
        pinHash: {
            type: String
        },
        encryptedPin: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["booked", "arrived", "served"],
            default: "booked",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending",
        },
        paymentMethod: {
            type: String,
            default: null,
        },
        cashfreeOrderId: {
            type: String,
            default: null,
        }
    },
    { timestamps: true }
);

appointmentSchema.index(
    { doctorId: 1, date: 1, appointmentNumber: 1 },
    { unique: true }
);

export default mongoose.model("Appointment", appointmentSchema);