import Auth from "#models/auth.model.js";
import UserModel from "#models/user.model.js";
import { registerSchema } from "#schemas/auth.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import { normalizePhone, passwordHash, validatePassword } from "#utils/helpers.js";

export const register = async (req, res) => {
    try {
        const { body } = req;
        const { email, password, country_id, vendor_id } = body;

        const { error } = registerSchema.validate(body);
        if (error) {
            return respondWithError(res, 422, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        if (!validatePassword(password)) {
            return respondWithError(res, 422, "Password does not meet the required criteria!", ERROR_CODES.VALIDATION_ERROR);
        }

        const [emailExist, countryData, vendorData] = await Promise.allSettled([
            UserModel.emailExists(email),
            UserModel.getCountryById(country_id),
            vendor_id ? UserModel.getVendorById(vendor_id) : null
        ]);

        if (emailExist) {
            return respondWithError(res, 409, `Email ${email} already exists!`, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        if (!countryData) {
            return respondWithError(res, 422, "Invalid country ID!", ERROR_CODES.VALIDATION_ERROR);
        }

        if (vendor_id && !vendorData) {
            return respondWithError(res, 422, "Invalid vendor ID!", ERROR_CODES.VALIDATION_ERROR);
        }

        const phone = normalizePhone(phone, countryData.code);

        const phoneExist = await UserModel.phoneExists(phone);
        if (phoneExist) {
            return respondWithError(res, 409, `Phone ${phone} already exists!`, ERROR_CODES.DUPLICATE_RESOURCE);
        }

        const hashpassword = await passwordHash(password)
        const ROLES = {
            VENDOR: 3,
            CUSTOMER: 4,
        };

        const role = is_vendor ? ROLES.VENDOR : ROLES.CUSTOMER;

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

export const activateAccount = async (req, res) => {
    try {
        const { body } = req;
        const { email, otp } = body;
        const user = await UserModel.getUserByEmail(email, vendorId);
        const verifyResult = await Auth.validateOTP(email, otp);

        if (!verifyResult.success) {
            return respondWithError(res, 400, verifyResult.message, ERROR_CODES.VALIDATION_ERROR);
        }
    } catch (error) {
        console.error("Error during account activation:", error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export default {
    register,
    activateAccount
};