import "dotenv/config";
import jwt from "jsonwebtoken";

export const onlyAdminEmail = (req, res, next) => {
    if (
        req.user.role !== "admin" ||
        req.user.email !== process.env.ADMIN_EMAIL
    ) {
        return res.status(403).json({
            message: "Only system admin can add doctors",
        });
    }

    next();
};