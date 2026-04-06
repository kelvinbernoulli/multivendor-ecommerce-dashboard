import * as AuthController from "#controllers/auth.controller.js";
import { Router } from "express";
const router = Router();

router.post("/vendor/signup", AuthController.vendorSignup);
router.post("/customer/signup", AuthController.customerSignup);
router.get("/verify-email", AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post("/login", AuthController.signIn);
router.post("/customer/login", AuthController.customerSignin);

router.post("/password-reset/request", AuthController.requestPasswordReset);
router.post("/password-reset/confirm", AuthController.confirmPasswordReset);

export default router;