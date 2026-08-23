import User from "../models/userSchema.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import wrapAsync from "../utils/wrapAsync.js";

// ✅ BUG FIX: export upload so the router can apply it as middleware
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

// ✅ BUG FIX: explicit Cloudinary config in this file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getUser = wrapAsync(async (req, res) => {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, user });
});

export const patchUser = wrapAsync(async (req, res) => {
    const allowedFields = ['dob', 'gender', 'address', 'abhaId'];
    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: updates },
        { returnDocument: "after", runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, user });
});

export const uploadprofilePic = wrapAsync(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const uploadToCloudinary = () =>
        new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'delhi_med/profile_pictures',
                    public_id: `profile_${req.user.userId}`,
                    resource_type: 'image',
                    overwrite: true,
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

    const result = await uploadToCloudinary();

    const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { profilePicture: result.secure_url } },
        { returnDocument: "after" }
    ).select('-password');

    res.status(200).json({ success: true, user, profilePicture: result.secure_url });
});