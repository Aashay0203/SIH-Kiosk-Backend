import wrapAsync from "../utils/wrapAsync.js";
import Medication from "../models/medicationSchema.js";

export const getMedication = wrapAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await Medication.countDocuments({ userId: req.user.userId });

    const medication = await Medication.find({ userId: req.user.userId })
        .skip((page - 1) * limit)
        .limit(limit);

    res.status(200).json({
        success: true,
        data: medication,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
});

export const addMedication = wrapAsync(async (req, res) => {
    const med = await Medication.create({
        userId: req.user.userId,
        ...req.body
    });

    res.status(201).json({ success: true, med });
});

export const updateMedication = wrapAsync(async (req, res) => {
    const medicationId = req.params.id;

    const med = await Medication.findById(medicationId);
    if (!med) {
        return res.status(404).json({ success: false, message: "Medication not found" });
    }

    if (med.userId.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Unauthorized: You can't update others' medications" });
    }

    const updatedMed = await Medication.findByIdAndUpdate(
        medicationId,
        { taken: req.body.taken },
        { returnDocument: "after" }
    );

    res.status(200).json({ success: true, med: updatedMed });
});

export const resetDailyMedications = wrapAsync(async (req, res) => {
    // ✅ BUG FIX: was req.user._id — JWT payload uses userId, not _id
    await Medication.updateMany(
        { userId: req.user.userId },
        { taken: false }
    );

    res.status(200).json({ success: true, message: "Medications reset" });
});