import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
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
        required: true
    },
    role: {
        type: String,
        enum: ["patient", "admin", "doctor"],
        default: "patient",
    },
    abhaId: { type: String, default: null },
    profilePicture: {
        type: String,
        default: "https://cdn1.iconfinder.com/data/icons/mix-color-3/502/Untitled-7-1024.png",
    },
    dateOfBirth: {
        type: Date,
        default: null,
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: null,
    },
    address: {
        type: String,
        default: null,
    },
},
    { timestamps: true }
);

export default mongoose.model("User", UserSchema);