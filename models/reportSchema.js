import mongoose from "mongoose";
const reportSchema = new mongoose.Schema({
    // Owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // File storage (Cloudinary)
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true,
        enum: ['pdf', 'jpeg', 'jpg', 'png', 'webp']
    },
    fileSize: {
        type: Number,
        required: true
    },
    cloudinaryPublicId: {
        type: String,
        required: true
    },
    fileMimeType: { type: String, default: "image/jpeg" },

    // User-entered metadata
    reportType: {
        type: String,
        default: ''
    },
    doctorClinicName: {
        type: String,
        default: ''
    },
    reportDate: {
        type: Date,
        default: null
    },
    uploadedBy: {
        type: String,
        enum: ['Me', 'Doctor', 'Lab', ''],
        default: ''
    },
    tags: [{
        type: String
    }],

    // System metadata
    uploadedAt: {
        type: Date,
        default: Date.now
    },

    // AI processing status
    aiStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    aiSummary: {
        testTable: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        plainSummary: {
            type: [String],
            default: []
        },
        extractedHealthData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        generatedAt: {
            type: Date,
            default: null
        }
    },
    aiError: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
reportSchema.index({ userId: 1, uploadedAt: -1 });

export default mongoose.model('Report', reportSchema);