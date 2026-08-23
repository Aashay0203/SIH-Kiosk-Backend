// controllers/ayushmanController.js
import AyushmanClaim from "../models/ayushmanClaimSchema.js";
import { fetchClaimStatusFromABDM } from "../services/abdmService.js";
import { sendSMS } from "../services/twilioService.js";

export const checkClaimStatus = async (req, res) => {
    try {
        const { abhaId, ayushmanCardNo } = req.body;
        const userId = req.user.userId;

        if (!abhaId || !ayushmanCardNo)
            return res.status(400).json({ success: false, message: "ABHA ID and Ayushman Card No. required" });

        // Call ABDM API
        const apiResult = await fetchClaimStatusFromABDM(abhaId, ayushmanCardNo);

        // Upsert claim record
        const claim = await AyushmanClaim.findOneAndUpdate(
            { userId, ayushmanCardNo },
            {
                userId, abhaId, ayushmanCardNo,
                claimStatus: apiResult.status,
                amountCredited: apiResult.amount || 0,
                hospitalName: apiResult.hospitalName,
                treatmentDate: apiResult.treatmentDate,
                lastChecked: new Date(),
                rawApiResponse: apiResult,
            },
            { upsert: true, returnDocument: "after" }
        );

        // Notify if credited and not already notified
        if (claim.claimStatus === "credited" && !claim.notificationSent) {
            await sendSMS(req.user.phone, `ClinicFlow: Aapka Ayushman claim credit ho gaya! Amount: Rs.${claim.amountCredited}. Hospital: ${claim.hospitalName}`);

            claim.notificationSent = true;
            await claim.save();
        }

        return res.json({ success: true, data: claim });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyClaims = async (req, res) => {
    try {
        const claims = await AyushmanClaim.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        return res.json({ success: true, data: claims });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};