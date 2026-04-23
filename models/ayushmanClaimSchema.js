
import mongoose from "mongoose";

const ayushmanClaimSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    abhaId: { type: String, required: true },
    ayushmanCardNo: { type: String, required: true },
    patientName: String,
    claimStatus: {
        type: String,
        enum: ["pending", "processing", "approved", "credited", "rejected", "unknown"],
        default: "unknown"
    },
    amountCredited: { type: Number, default: 0 },
    hospitalName: String,
    treatmentDate: String,
    lastChecked: { type: Date, default: Date.now },
    notificationSent: { type: Boolean, default: false },
    rawApiResponse: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model("AyushmanClaim", ayushmanClaimSchema);