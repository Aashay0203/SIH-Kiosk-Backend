import twilio from "twilio";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (to, message) => {
    return await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE,  // your Twilio number, same one you already use
        to: `+91${to}`,
    });
};