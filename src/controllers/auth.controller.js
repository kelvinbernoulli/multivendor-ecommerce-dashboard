import Auth from "#models/auth.model.js";
import UserModel from "#models/user.model.js";
import VendorModel from "#models/vendor.model.js";
import { loginSchema, registerSchema } from "#schemas/auth.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import bcrypt from "bcrypt";
import { buildOtpKey, normalizePhone, passwordHash, validatePassword, verifyPassword } from "#utils/helpers.js";
import CustomerModel from "#models/customer.model.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";
import redisClient from "#config/redis.js";
import { decrypt } from "#utils/encryption.js";
import pool from "#services/pg_pool.js";

export const vendorSignup = async (req, res) => {
    try {
        const { body } = req;

        const { error } = registerSchema.validate(body);
        if (error) {
            return respondWithError(res, 422, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        const { email, password, country_id, phone } = body;

        if (!validatePassword(password)) {
            return respondWithError(res, 422, "Password does not meet the required criteria!", ERROR_CODES.VALIDATION_ERROR);
        }

        const userData = await UserModel.getVendorByEmail(email);
        if (userData) {
            return respondWithError(res, 409, `Email ${email} already exists!`, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        const countryData = await UserModel.getCountryById(country_id);
        if (!countryData) {
            return respondWithError(res, 422, "Invalid country ID!", ERROR_CODES.VALIDATION_ERROR);
        }
        const normalizedphone = normalizePhone(phone, countryData.country_code);

        const phoneData = await UserModel.getVendorByPhone(normalizedphone);
        if (phoneData) {
            return respondWithError(res, 409, `Phone ${normalizedphone} already exists!`, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        const hashpassword = await passwordHash(password)

        const role = parseInt(3);

        const newUser = {
            ...body,
            password: hashpassword,
            phone: normalizedphone,
            role
        };

        const createUser = await UserModel.createUser(newUser);
        if (!createUser) {
            return respondWithError(res, 400, 'Failed to create user', ERROR_CODES.RESOURCE_CREATE_FAILED);
        }
        delete body.password;
        await Auth.activateAccount(createUser.id);

        return respondWithSuccess(res, 200, "Email Verification OTP sent, please check your email.", body);
    } catch (error) {
        console.error("Error during vendor registration:", error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const customerSignup = async (req, res) => {
    try {
        const { body } = req;

        const { error } = registerSchema.validate(body);
        if (error) {
            return respondWithError(res, 422, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        const { email, password, country_id, vendor_id } = body;

        if (!validatePassword(password)) {
            return respondWithError(res, 422, "Password does not meet the required criteria!", ERROR_CODES.VALIDATION_ERROR);
        }

        const [duplicateEmail, countryData, vendorData] = await Promise.allSettled([
            VendorModel.emailExists(email, vendor_id),
            UserModel.getCountryById(country_id),
            vendor_id ? UserModel.getVendorById(vendor_id) : null
        ]);

        if (duplicateEmail) {
            return respondWithError(res, 409, `Email ${email} already exists!`, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        if (!countryData) {
            return respondWithError(res, 422, "Invalid country ID!", ERROR_CODES.VALIDATION_ERROR);
        }

        if (vendor_id && !vendorData) {
            return respondWithError(res, 422, "Invalid vendor ID!", ERROR_CODES.VALIDATION_ERROR);
        }

        const phone = normalizePhone(phone, countryData.code);

        const duplicatePhone = await UserModel.phoneExists(phone);
        if (duplicatePhone) {
            return respondWithError(res, 409, `Phone ${phone} already exists!`, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        const hashpassword = await passwordHash(password)

        const role = 4;

        const newUser = {
            ...body,
            password: hashpassword,
            role
        };

        const createUser = await UserModel.createUser(newUser);
        if (!createUser.success) {
            return respondWithError(res, createUser.code, createUser.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
        }
        delete body.password;
        await Auth.activateAccount(email);

        return respondWithSuccess(res, 200, "Email Verification OTP sent, please check your email.", body);

    } catch (error) {
        console.error("Error during user registration:", error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token, userId, email, vendorId } = req.query;

        const decryptedToken = decrypt(token);
        const decryptedUserId = decrypt(userId);
        const decryptedVendorId = vendorId ? decrypt(vendorId) : null;

        const redisKey = buildOtpKey(email, 'email_verification', decryptedVendorId, decryptedUserId);

        console.log('RETRIEVE KEY:', redisKey);

        const stored = await redisClient.get(redisKey);
        console.log('Stored OTP:', stored);
        console.log('Sent OTP:', decryptedToken);

        if (!stored) {
            return respondWithError(res, 400, 'Verification link expired', ERROR_CODES.OTP_EXPIRED);
        }

        if (stored !== decryptedToken) {
            return respondWithError(res, 400, 'Invalid verification link', ERROR_CODES.OTP_INVALID);
        }

        await pool.query(
            `UPDATE users
       SET email_verified = true,
           email_verified_at = NOW(),
           status = 'active'
       WHERE id = $1`,
            [decryptedUserId]
        );

        await redisClient.del(redisKey);

        return respondWithSuccess(res, 200, 'Email verified successfully');
    } catch (error) {
        console.error('Error verifying email:', error);
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const resendVerification = async (req, res) => {
    try {
        const { email, vendorId } = req.body;
        let user;
        if (vendorId) {
            user = await VendorModel.getVendorUserByEmail(email, vendorId);
        } else {
            user = await UserModel.getUserByEmail(email);
        }
        if (!user) {
            return respondWithError(res, 404, 'User not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        const resend = await Auth.activateAccount(user.id, vendorId);
        if (!resend.success) {
            return respondWithError(res, 400, resend.message, resend.code);
        }
        return respondWithSuccess(res, 200, 'Verification link resent successfully');
    } catch (err) {
        console.error('Error resending verification link:', err);
        return respondWithError(res, 500, err.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const signIn = async (req, res) => {
    try {
        const { body } = req;
        const { error } = loginSchema.validate(body, { abortEarly: false });
        if (error) {
            return respondWithError(res, 400, error.details.map((d) => d.message).join(', '), ERROR_CODES.VALIDATION_ERROR);
        }

        const { email, password, vendor_id } = body;
        let user;

        if (vendor_id) {
            const { rows: vendorRows } = await pool.query(
                `SELECT id FROM vendors
                WHERE id = $1 AND status = 'active' LIMIT 1`,
                [vendor_id]
            );
            if (!vendorRows[0]) {
                return respondWithError(res, 404, 'Vendor not found', ERROR_CODES.RESOURCE_NOT_FOUND);
            }

            // Try vendor staff first (vendor_admin + vendor), then customer
            user =
                (await VendorModel.getVendorUserByEmail(email, vendor_id)) ??
                (await CustomerModel.getCustomerByEmail(email, vendor_id));
        } else {
            // Platform admin only
            user = await UserModel.getUserByEmail(email);
        }

        if (!user) {
            return respondWithError(res, 404, 'User not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        if (!user.email_verified) {
            return respondWithError(res, 403, 'Email not verified', ERROR_CODES.EMAIL_NOT_VERIFIED);
        }

        if (user.status !== 'active') {
            return respondWithError(res, 403, 'Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
        }

        const passwordValid = await verifyPassword(password, user.password);
        if (!passwordValid) {
            return respondWithError(res, 401, 'Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
        }

        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => (err ? reject(err) : resolve()));
        });

        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            ...(vendor_id && { vendor_id }),
        };

    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const customerSignin = async (req, res) => {
    try {
        const { body } = req;
        const { error } = loginSchema.validate(body, { abortEarly: false });
        if (error) {
            return respondWithError(res, 400, error.details.map((d) => d.message).join(', '), ERROR_CODES.VALIDATION_ERROR);
        }

        const { email, password, vendor_id } = body;

        const { rows: vendorRows } = await pool.query(
            `SELECT id FROM vendors
                WHERE id = $1 AND status = 'active' LIMIT 1`,
            [vendor_id]
        );
        if (!vendorRows[0]) {
            return respondWithError(res, 404, 'Vendor not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        const user = await CustomerModel.getCustomerByEmail(email, vendor_id);

        if (!user) {
            return respondWithError(res, 404, 'User not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        if (!user.email_verified) {
            return respondWithError(res, 403, 'Email not verified', ERROR_CODES.EMAIL_NOT_VERIFIED);
        }

        if (user.status !== 'active') {
            return respondWithError(res, 403, 'Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
        }

        const passwordValid = await verifyPassword(password, user.password);
        if (!passwordValid) {
            return respondWithError(res, 401, 'Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
        }

    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const signOut = async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            req.session.destroy((err) => (err ? reject(err) : resolve()));
        });

        res.clearCookie('connect.sid');

        return respondWithSuccess(res, 200, 'Logged out successfully');
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const requestPasswordReset = async (req, res) => {
    try {
        const { email, medium, vendor_id } = req.body;
        let user;

        if (vendor_id) {
            const { rows: vendorRows } = await pool.query(
                `SELECT id FROM vendors
                WHERE id = $1 AND status = 'active' LIMIT 1`,
                [vendor_id]
            );
            if (!vendorRows[0]) {
                return respondWithError(res, 404, 'Vendor not found', ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            user = await VendorModel.getVendorUserByEmail(email, vendor_id);
        } else {
            user = await UserModel.getUserByEmail(email);
        }

        const sendToken = await Auth.sendOTP(user, medium, 'password_reset');
        if (!sendToken.success) {
            return respondWithError(res, 400, sendToken.message, ERROR_CODES.EMAIL_SEND_FAILED);
        }
        return respondWithSuccess(res, 200, `Password reset OTP sent via ${medium}. Please check your ${medium}.`);

    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const confirmPasswordReset = async (req, res) => {
    try {
        const { email, otp, new_password, medium, vendor_id } = req.body;
        let user;

        if (vendor_id) {
            const { rows: vendorRows } = await pool.query(
                `SELECT id FROM vendors
                WHERE id = $1 AND status = 'active' LIMIT 1`,
                [vendor_id]
            );
            if (!vendorRows[0]) {
                return respondWithError(res, 404, 'Vendor not found', ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            user = await VendorModel.getVendorUserByEmail(email, vendor_id);
        } else {
            user = await UserModel.getUserByEmail(email);
        }
        const verifyResult = await Auth.validateOTP(user, medium, 'password_reset', otp);
        if (!verifyResult.success) {
            return respondWithError(res, 400, verifyResult.message, ERROR_CODES.VALIDATION_ERROR);
        }

    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export default {
    vendorSignup,
    customerSignup,
    verifyEmail,
    signIn,
    signOut,
    requestPasswordReset,
    confirmPasswordReset
};