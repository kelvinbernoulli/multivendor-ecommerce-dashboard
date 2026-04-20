import Joi from "joi";

export const updateAdminPermissionsSchema = Joi.object({
    admin_id: Joi.number().integer().positive().required().label("Admin ID"),
    sub_role: Joi.array().items(Joi.number().integer().min(1)).required().label("Sub Roles"),
    permissions: Joi.object().pattern(
        Joi.number().integer().min(1),
        Joi.object({
            create: Joi.boolean().optional().default(false),
            read: Joi.boolean().optional().default(false),
            update: Joi.boolean().optional().default(false),
            delete: Joi.boolean().optional().default(false),
        }).min(1).required()
    ).required().label("Role Permissions"),
});