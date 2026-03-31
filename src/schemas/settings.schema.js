import Joi from "joi";

export const settingsSchema = Joi.object({
    site_name: Joi.string().optional().label('Site Name'),
    logo: Joi.string().pattern().optional().label('Logo'),
    phone_one: Joi.number().optional().label('Phone One'),
    phone_two: Joi.number().optional().label('Phone Two'),
    email: Joi.string().email.optional().label('Email'),
    facebook: Joi.string().uri().optional().label('Facebook link'),
    twitter: Joi.string().uri().optional().label('X link'),
    instagram: Joi.string().uri().optional().label('Instagram link'),
    whatsapp: Joi.string().uri().optional().label('Whatsapp'),
    linkedin: Joi.string().uri().optional().label('LinkedIn link'),
    snapchat: Joi.string().uri().optional().label('Snapchat link'),
    terms_and_condition: Joi.string().optional().label('Terms and Conditions'),
    privacy_policy: Joi.string().optional().label('Privacy Policy')
}).min(1)

export default settingsSchema;