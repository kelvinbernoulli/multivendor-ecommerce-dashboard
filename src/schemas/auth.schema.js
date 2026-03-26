import Joi from "joi";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

export const registerSchema = Joi.object({
    firstname: Joi.string().trim().min(2).required().label("First name"),
    lastname: Joi.string().trim().min(2).required().label("Last name"),
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
                "Phone must be a valid Nigerian number (e.g. 08012345678 or +2348012345678).",
        }),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required().label("Password")
});

export default {
    registerSchema,
    loginSchema,
};