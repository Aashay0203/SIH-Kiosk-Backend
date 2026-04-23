import { logger } from "@sentry/node";
import jwt from "jsonwebtoken";

const protect = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: "You are not Authorised or Token Not Found" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach user to request
        req.user = decoded;
        next();
    } catch (err) {
        logger.error({ error: err });
        return res.status(401).json({ message: "Invalid token" });
    }
};
export default protect; 
