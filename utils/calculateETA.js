export const calculateETA = (appointmentNumber, currentNumber, avgConsultTime) => {
    const remaining = appointmentNumber - currentNumber;
    const etaMinutes = Math.max(remaining, 0) * avgConsultTime;
    return { remaining, etaMinutes };
}