import Subcategory from "#models/subcategories.model.js";
import { createSubcategorySchema, updateSubcategorySchema } from "#schemas/subcategories.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import { getVendorId } from "#utils/helpers.js";
import { respondWithError } from "#utils/response.js";

export const createSubcategory = async (req, res) => {
    try {
        const { body, user } = req;
        const { error } = createSubcategorySchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const vendorId = await getVendorId(user);
        const { subcategory_name, category_id, subcategory_image, description } = body;
        const duplicateCheck = await Subcategory.duplicateCheck(subcategory_name, vendorId);
        if (duplicateCheck) {
            return respondWithError(res, 409, 'Subcategory already exists', ERROR_CODES.DUPLICATE_RESOURCE);
        }
        const result = await Subcategory.create({ subcategory_name, category_id, vendorId, subcategory_image, description });
        if (result.rowCount === 0) {
            return respondWithError(res, 400, 'Failed to create subcategory', ERROR_CODES.RESOURCE_CREATE_FAILED);
        }
        return respondWithSuccess(res, 201, 'Subcategory created successfully', result.rows[0]);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const updateSubcategory = async (req, res) => {
    try {
        const { user, body, params } = req;
        const { subcategoryId } = params;
        const vendorId = await getVendorId(user);
        const { error } = updateSubcategorySchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const { subcategory_name, category_id, status, vendor_id, subcategory_image, description } = body;
        const duplicateCheck = await Subcategory.duplicateCheck(subcategory_name, vendor_id);
        if (duplicateCheck) {
            return respondWithError(res, 409, 'Subcategory already exists', ERROR_CODES.DUPLICATE_RESOURCE);
        }
        const result = await Subcategory.update(subcategoryId, vendorId, body);
        if (!result) {
            return respondWithError(res, 404, 'Subcategory not found or no changes made', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Subcategory updated successfully', result);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const fetchVendorSubcategories = async (req, res) => {
    try {
        const { user, pagination } = req;
        const { limit, offset } = pagination;
        const vendorId = await getVendorId(user);
        const result = Subcategory.fetchByVendorId(vendorId, { limit, offset });
        return respondWithSuccess(res, 200, 'Subcategories fetched successfully', result.rows);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const fetchSubcategoryById = async (req, res) => {
    try {
        const { user, params } = req;
        const { subcategoryId } = params;
        const vendorId = await getVendorId(user);
        const result = Subcategory.fetchById(subcategoryId, vendorId);
        if (!result) {
            return respondWithError(res, 404, 'Subcategory not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Subcategory fetched successfully', result);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const deleteSubcategory = async (req, res) => {
    try {
        const { user, params } = req;
        const { subcategoryId } = params;
        const vendorId = await getVendorId(user);
        const result = Subcategory.delete(subcategoryId, vendorId);
        if (!result) {
            return respondWithError(res, 404, 'Subcategory not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Subcategory deleted successfully', result);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export default {
    createSubcategory,
    updateSubcategory,
    fetchSubcategoryById,
    fetchVendorSubcategories,
    deleteSubcategory
}