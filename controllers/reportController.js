import Report from "../models/reportSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { processReportInBackground } from "../jobs/processReport.js";
import streamifier from "streamifier";
import wrapAsync from "../utils/wrapAsync.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (buffer, options) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(stream);
    });

// ✅ Maps MIME type → Cloudinary resource_type (needed for correct upload AND delete)
const getResourceType = (mimetype) =>
    mimetype === "application/pdf" ? "raw" : "image";

const mimeTypeMap = {
    "application/pdf": "pdf",
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
};

export const saveCloudinaryResult = wrapAsync(async (req, res) => {
    // ✅ BUG FIX: guard against missing file
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const file = req.file;

    const sanitizedFileName = file.originalname
        .replace(/\s+/g, "_")
        .replace(/[()]/g, "");

    const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: "reports",
        resource_type: getResourceType(file.mimetype),
        public_id: sanitizedFileName,
    });

    const fileTypeEnum = mimeTypeMap[file.mimetype] || file.mimetype;

    const report = new Report({
        userId: req.user.userId,
        fileName: file.originalname,
        fileUrl: cloudinaryResult.secure_url,
        fileType: fileTypeEnum,
        fileMimeType: file.mimetype, // ✅ store original mimetype for regenerate
        fileSize: file.size,
        cloudinaryPublicId: cloudinaryResult.public_id,
        reportType: req.body.reportType || "",
        doctorClinicName: req.body.doctorClinicName || "",
        reportDate: req.body.reportDate || null,
        uploadedBy: req.body.uploadedBy || "",
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    });

    await report.save();

    processReportInBackground(
        report._id,
        cloudinaryResult.secure_url,
        file.mimetype,
        req.user.userId
    );

    return res.status(201).json({ success: true, message: "Report uploaded successfully", report });
});

export const getAllReport = wrapAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    const reports = await Report.find({ userId: req.user.userId })
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit);


    const totalCount = await Report.countDocuments({ userId: req.user.userId });

    res.status(200).json({
        success: true,
        data: reports,
        pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
    });
});

export const getSingleReport = wrapAsync(async (req, res) => {
    const report = await Report.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    res.status(200).json({ success: true, report });
});

export const saveMetaData = wrapAsync(async (req, res) => {
    const { reportType, doctorClinicName, reportDate, uploadedBy, tags } = req.body;

    const report = await Report.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (reportType !== undefined) report.reportType = reportType;
    if (doctorClinicName !== undefined) report.doctorClinicName = doctorClinicName;
    if (reportDate !== undefined) report.reportDate = reportDate;
    if (uploadedBy !== undefined) report.uploadedBy = uploadedBy;
    if (tags !== undefined) report.tags = tags;

    await report.save();

    res.status(200).json({ success: true, message: "Report updated successfully", report });
});

export const deleteReport = wrapAsync(async (req, res) => {
    const report = await Report.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    // ✅ BUG FIX: must pass resource_type for PDFs or Cloudinary silently skips deletion
    await cloudinary.uploader.destroy(report.cloudinaryPublicId, {
        resource_type: getResourceType(report.fileMimeType || "image/jpeg")
    });

    await Report.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, message: "Report deleted successfully" });
});

export const aiStatus = wrapAsync(async (req, res) => {
    const report = await Report.findOne({ _id: req.params.id, userId: req.user.userId })
        .select("aiStatus aiSummary aiError");

    if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    res.status(200).json({
        success: true,
        aiStatus: report.aiStatus,
        aiSummary: report.aiSummary,
        aiError: report.aiError
    });
});

export const regenerateSummary = wrapAsync(async (req, res) => {
    const report = await Report.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    report.aiStatus = "pending";
    report.aiError = null;
    await report.save();

    // ✅ BUG FIX: was passing report.fileType ("pdf") — must pass fileMimeType ("application/pdf")
    processReportInBackground(report._id, report.fileUrl, report.fileMimeType, req.user.userId);

    res.status(200).json({ success: true, message: "AI analysis started", aiStatus: "pending" });
});