import Joi from "joi";

const base64ImagePattern = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/]+={0,2}$/;

export const createSubcategorySchema = Joi.object({
    subcategory_name: Joi.string().trim().min(2).max(50).required().label('Subcategory Name'),
    category_id: Joi.number.required().label('Category ID'),
    subcategory_image: Joi.string().pattern(base64ImagePattern).optional().label('Subcategory Image'),
    description: Joi.string().trim().max(500).allow('', null).optional().label('Subcategory description')
})

export const updateSubcategorySchema = Joi.object({
    subcategory_name: Joi.string().trim().min(2).max(50).optional().label('Subcategory Name'),
    category_id: Joi.number.optional().label('Category ID'),
    status: Joi.boolean.optional(),
    subcategory_image: Joi.string().pattern(base64ImagePattern).optional().label('Subcategory Image'),
    description: Joi.string().trim().max(500).allow('', null).optional().label('Subcategory description')
}).min(1);

export default { createSubcategorySchema, updateSubcategorySchema }