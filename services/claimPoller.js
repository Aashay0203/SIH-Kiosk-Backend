import cron from "node-cron";
import AyushmanClaim from "../models/ayushmanClaimSchema.js";
import { fetchClaimStatusFromABDM } from "./abdmService.js";
import { sendSMS } from "../services/twilioService.js";
import User from "../models/userSchema.js";

// Runs every 6 hours
export function startClaimPoller() {
    cron.schedule("0 */6 * * *", async () => {
        console.log("[ClaimPoller] Checking pending claims...");

        const pendingClaims = await AyushmanClaim.find({
            claimStatus: { $in: ["pending", "processing", "unknown"] },
            notificationSent: false,
        });

        for (const claim of pendingClaims) {
            try {
                const result = await fetchClaimStatusFromABDM(claim.abhaId, claim.ayushmanCardNo);
                claim.claimStatus = result.status;
                claim.amountCredited = result.amount || claim.amountCredited;
                claim.lastChecked = new Date();

                if (result.status === "credited") {
                    const user = await User.findById(claim.userId);
                    if (user?.phone) {

                        await sendSMS(req.user.phone, `ClinicFlow: Aapka Ayushman claim credit ho gaya! Amount: Rs.$${result.amount}. Hospital: ${result.hospitalName}`);

                        claim.notificationSent = true;
                    }
                }

                await claim.save();
            } catch (e) {
                console.error(`[ClaimPoller] Failed for claim ${claim._id}:`, e.message);
            }
        }
    });
}