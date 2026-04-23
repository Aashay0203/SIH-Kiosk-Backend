import axios from "axios";

const BASE_URL = process.env.CASHFREE_ENV === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const headers = {
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
    "x-api-version": "2023-08-01",
    "Content-Type": "application/json",
};

export const createCashfreeOrder = (body) =>
    axios.post(`${BASE_URL}/orders`, body, { headers });

export const fetchCashfreeOrder = (orderId) =>
    axios.get(`${BASE_URL}/orders/${orderId}`, { headers });