import { activateAccount, register } from "#controllers/auth.controller.js";
import { Router } from "express";
const router = Router();

router.post("/register", register);
router.post("/verify-email", activateAccount);

export default router;