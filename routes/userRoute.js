import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getUser, patchUser, uploadprofilePic } from "../controllers/userController.js";
import multer from "multer";
import { validate } from "../middleware/validate.js";
import { patchUserSchema } from "../validators/userValidators.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are allowed"));
    },
});

router.get("/profile", protect, getUser);
router.patch("/profile", protect, validate(patchUserSchema), patchUser);
router.post(
    "/profile/picture",
    protect,
    upload.single("profilePicture"),
    uploadprofilePic
);

export default router;