import Subcategory from "#models/subcategories.model.js";
import { createSubcategorySchema, updateSubcategorySchema } from "#schemas/subcategories.schema.js";
import { getBase64Extension, S3delete, S3upload } from "#services/s3upload.js";
import ERROR_CODES from "#utils/error.codes.js";
import { getVendorId, ROLES } from "#utils/helpers.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";

export const createSubcategory = async (req, res) => {
    try {
        const { body, session } = req;
        const user = session?.user;
        const { error } = createSubcategorySchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const vendorId = await getVendorId(user);
        const { name, category_id, image, description } = body;
        const duplicateCheck = await Subcategory.duplicateCheck(name, vendorId);
        if (duplicateCheck) {
            return respondWithError(res, 409, 'Subcategory already exists', ERROR_CODES.DUPLICATE_RESOURCE);
        }

        let filename = null;
        if (image) {
            filename = `images/subcategory-images/${name}.${getBase64Extension(image)}`;
            await S3upload(req, res, filename, image);
        }

        const result = await Subcategory.create({ name, category_id, vendorId, image: filename, description });
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
        const { session, body, params } = req;
        const user = session?.user;
        const { subcategoryId } = params;

        const { error } = updateSubcategorySchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        const { name, category_id, status, image, description } = body;

        let vendorId = null;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        }

        if (!vendorId) {
            return respondWithError(res, 403, 'Forbidden: Invalid user role', ERROR_CODES.FORBIDDEN);
        }

        const existingSubcategory = await Subcategory.fetchById(subcategoryId, vendorId);
        if (!existingSubcategory) {
            return respondWithError(res, 404, 'Subcategory not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        let imageUrl = existingSubcategory.image;

        if (image) {
            const [uploadedUrl] = await Promise.all([
                S3upload(req, res, `images/subcategory-images/${name ?? existingSubcategory.name}.${getBase64Extension(image)}`, image),
                imageUrl ? S3delete(imageUrl) : Promise.resolve()
            ]);
            imageUrl = uploadedUrl;
        }

        body.image = imageUrl;

        const duplicateCheck = await Subcategory.duplicateCheck(name, vendorId);
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
        const { session, pagination } = req;
        const user = session?.user;
        const { limit, offset } = pagination;

        let vendorId = null;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        } else if (user.role === ROLES.CUSTOMER) {
            vendorId = user.vendor_id;
        }

        const result = await Subcategory.fetchByVendorId(vendorId, { limit, offset });
        return respondWithSuccess(res, 200, 'Subcategories fetched successfully', result.rows);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const fetchSubcategoryById = async (req, res) => {
    try {
        const { session, params } = req;
        const user = session?.user;
        const { subcategoryId } = params;

        let vendorId = null;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        } else if (user.role === ROLES.CUSTOMER) {
            vendorId = user.vendor_id;
        }

        const result = await Subcategory.fetchById(subcategoryId, vendorId);
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
        const { session, params } = req;
        const user = session?.user;
        const { subcategoryId } = params;

        let vendorId = null;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        }

        if (!vendorId) {
            return respondWithError(res, 403, 'Forbidden: Invalid user role', ERROR_CODES.FORBIDDEN);
        }
        const result = await Subcategory.delete(subcategoryId, vendorId);
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