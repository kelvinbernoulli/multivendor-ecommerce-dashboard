import Joi from "joi";

const base64ImagePattern = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/]+={0,2}$/;

export const createCategorySchema = Joi.object({
  category_name: Joi.string().trim().min(2).max(100).required().label('Category Name'),
  description:   Joi.string().trim().max(500).optional().label('Description'),
  category_image: Joi.string().pattern(base64ImagePattern).optional().label('Category Image'),
});

export const updateCategorySchema = Joi.object({
  category_name:  Joi.string().trim().min(2).max(100).label('Category Name'),
  description:    Joi.string().trim().max(500).allow('', null).label('Description'),
  category_image: Joi.string().pattern(base64ImagePattern).allow('', null).label('Category Image'),
  status:         Joi.boolean().label('Status'),
}).min(1);

export default {
  createCategorySchema,
  updateCategorySchema,
};