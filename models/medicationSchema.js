import mongoose, { mongo } from "mongoose";

const medicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    dosage: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    taken: { type: Boolean, default: false }

}, { timestamps: true });

export default mongoose.model("Medication", medicationSchema);