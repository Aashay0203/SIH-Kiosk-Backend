// services/abdmService.js
// Sandbox → replace BASE_URL with production when go-live
const ABDM_BASE = "https://sandbox.abdm.gov.in/api/v1";

let cachedToken = null;
let tokenExpiry = 0;

async function getABDMToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const res = await fetch(`${ABDM_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clientId: process.env.ABDM_CLIENT_ID,
            clientSecret: process.env.ABDM_CLIENT_SECRET,
        }),
    });
    const data = await res.json();
    cachedToken = data.accessToken;
    tokenExpiry = Date.now() + (data.expiresIn - 60) * 1000;
    return cachedToken;
}

export async function fetchClaimStatusFromABDM(abhaId, ayushmanCardNo) {
    const token = await getABDMToken();

    // NOTE: Exact endpoint path confirmed after sandbox registration
    // This is the expected NHA claim status endpoint pattern
    const res = await fetch(`${ABDM_BASE}/pmjay/claim-status`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-HIP-ID": process.env.ABDM_HIP_ID,
        },
        body: JSON.stringify({ abhaId, beneficiaryId: ayushmanCardNo }),
    });

    if (!res.ok) {
        // Graceful fallback — don't crash, mark as unknown
        return { status: "unknown", amount: 0 };
    }

    const data = await res.json();
    return {
        status: data.claimStatus?.toLowerCase() || "unknown",
        amount: data.approvedAmount || 0,
        hospitalName: data.hospitalName || "",
        treatmentDate: data.admissionDate || "",
    };
}