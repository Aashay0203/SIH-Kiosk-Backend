//import { startSession } from "mongoose";
import mongoose from "mongoose";

const DocterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: {
        type: Number,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    speciality: {
        type: String,
        default: "Gernal Physician",
    },
    startTime: {
        type: String,
        default: "09:00",
    },
    avgConsultTime: {
        type: Number,
        default: 10,
    },
    fees: {
        type: Number,
        default: 500,
    },
    role: {
        type: String,
        default: "doctor"
    },
    bio: { type: String, default: "" },
    experience: { type: Number, default: 0 },
    education: [{ degree: String, institute: String, year: Number }],
    languages: { type: [String], default: ["Hindi", "English"] },
    clinicName: { type: String, default: "" },
    clinicAddress: { type: String, default: "" },
    availableDays: {
        type: [String],
        default: ["Mon", "Tue", "Wed", "Thu", "Fri"]
    },
    profilePicture: { type: String, default: "" },
    introVideoUrl: { type: String, default: "" },
    totalPatientsSeen: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 }
})

export default mongoose.model("Doctor", DocterSchema);