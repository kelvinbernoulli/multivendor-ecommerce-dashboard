import Category from "#models/categories.model.js";
import { createCategorySchema, updateCategorySchema } from "#schemas/categories.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import { getVendorId } from "#utils/helpers.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";

export const createCategory = async (req, res) => {
    try {
        const { user, body } = req;
        const { error } = createCategorySchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const { category_name, category_image, description } = body;
        const vendorId = await getVendorId(user);
        const duplicateCheck = await Category.duplicateCheck(category_name, vendorId);
        if (duplicateCheck) {
            return respondWithError(res, 409, 'Category already exists', ERROR_CODES.DUPLICATE_RESOURCE);
        }
        const result = await Category.create({ category_name, vendorId, category_image, description });
        if (result.rowCount === 0) {
            return respondWithError(res, 400, 'Failed to create category', ERROR_CODES.RESOURCE_CREATE_FAILED);
        }
        return respondWithSuccess(res, 201, 'Category created successfully', result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { body, params } = req;
        const { categoryId } = params;
        const { error } = updateCategorySchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const vendorId = await getVendorId(user);
        const { category_name, status, category_image, description } = body;
        const duplicateCheck = await Category.duplicateCheck(category_name, vendorId);
        if (duplicateCheck) {
            return respondWithError(res, 409, 'Category already exists', ERROR_CODES.DUPLICATE_RESOURCE);
        }
        const result = await Category.update(categoryId, vendorId, body);
        if (!result) {
            return respondWithError(res, 404, 'Category not found or no changes made', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Category updated successfully', result);
    } catch (error) {
        console.error('Error updating category:', error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const fetchVendorCategories = async (req, res) => {
    try {
        const { user, pagination } = req;
        const { limit, offset } = pagination;
        const vendorId = await getVendorId(user);
        const result = Category.fetchByVendorId(vendorId, { limit, offset });
        return respondWithSuccess(res, 200, 'Categories fetched successfully', result.rows);
    } catch (error) {
        console.error('Error fetching vendor categories:', error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const fetchCategoryById = async (req, res) => {
    try {
        const { params } = req;
        const { categoryId } = params;
        const vendorId = await getVendorId(user);
        const result = Category.fetchById(categoryId, vendorId);
        if (!result) {
            return respondWithError(res, 404, 'Category not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Category fetched successfully', result);
    } catch (error) {
        console.error('Error fetching category by ID:', error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { user, params } = req;
        const { categoryId } = params;
        const vendorId = await getVendorId(user);
        const result = Category.delete(categoryId, vendorId);
        if (!result) {
            return respondWithError(res, 404, 'Category not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Category deleted successfully', result);
    } catch (error) {
        console.error('Error deleting category:', error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export default {
    createCategory,
    updateCategory,
    fetchCategoryById,
    fetchVendorCategories,
    deleteCategory
}