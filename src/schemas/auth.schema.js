import Joi from "joi";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

export const registerSchema = Joi.object({
    firstname: Joi.string().trim().min(2).max(100).required().label("First name"),
    lastname: Joi.string().trim().min(2).max(100).required().label("Last name"),
    email: Joi.string().email().lowercase().required().label("Email"),
    password: Joi.string()
        .pattern(passwordRegex)
        .required()
        .label("Password")
        .messages({
            "string.pattern.base":
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        }),
    phone: Joi.string()
        .trim()
        .pattern(phoneRegex)
        .required()
        .label("Phone")
        .messages({
            "string.pattern.base":
                "Phone must be a valid international number format.",
        }),
    country_id: Joi.number().integer().positive().required().label("Country ID"),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().required().label("Email"),
    password: Joi.string().required().label("Password"),
    vendor_id: Joi.number().integer().positive().optional().label("Vendor ID"),
});

export default {
    registerSchema,
    loginSchema,
};