import Category from "#models/categories.model.js";
import Product from "#models/products.model.js";
import Subcategory from "#models/subcategories.model.js";
import { createProductSchema, productSearchSchema, updateProductSchema } from "#schemas/products.schema.js";
import { getBase64Extension, S3delete, S3upload } from "#services/s3upload.js";
import ERROR_CODES from "#utils/error.codes.js";
import { ROLES } from "#utils/helpers.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";

export const createProduct = async (req, res) => {
    try {
        const { body, session } = req;
        const user = session?.user;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { error } = createProductSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details.map(err => err.message).join(', '), ERROR_CODES.VALIDATION_ERROR);
        }

        let vendorId;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        }

        if (!vendorId) {
            return respondWithError(res, 403, 'Forbidden: Vendor information not found', ERROR_CODES.FORBIDDEN);
        }

        // Check duplicate product name within same vendor
        const duplicateProduct = await Product.findByKey([{ key: 'name', value: body.name }], vendorId);
        if (duplicateProduct) {
            return respondWithError(res, 409, 'A product with this name already exists', ERROR_CODES.CONFLICT);
        }

        // Check category exists — platform wide no vendorId needed
        const category = await Category.fetchById(body.category_id);
        if (!category) {
            return respondWithError(res, 422, 'Invalid category ID', ERROR_CODES.VALIDATION_ERROR);
        }

        // Check subcategory exists
        if (body.subcategory_id) {
            const subcategory = await Subcategory.fetchById(body.subcategory_id);
            if (!subcategory) {
                return respondWithError(res, 404, 'Subcategory not found', ERROR_CODES.RESOURCE_NOT_FOUND);
            }
        }

        // S3 upload handled inside Product.create model
        const newProduct = await Product.create(vendorId, body);
        if (!newProduct) {
            return respondWithError(res, 400, 'Failed to add product', ERROR_CODES.RESOURCE_CREATE_FAILED);
        }

        return respondWithSuccess(res, 201, 'Product added successfully', newProduct);
    } catch (error) {
        console.error("Error creating product:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { body, session, params } = req;
        const user = session?.user;
        const { id } = params;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { error } = updateProductSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details.map(err => err.message).join(', '), ERROR_CODES.VALIDATION_ERROR);
        }

        let vendorId;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        }

        if (!vendorId) {
            return respondWithError(res, 403, 'Forbidden: Vendor information not found', ERROR_CODES.FORBIDDEN);
        }

        // Check product exists and belongs to vendor
        const productData = await Product.findById(id, vendorId);
        if (!productData) {
            return respondWithError(res, 404, "Product not found", ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        // Check duplicate name if name is being updated
        if (body.name && body.name !== productData.name) {
            const duplicateProduct = await Product.findByKey([{key: name, value: body.name}], vendorId);
            if (duplicateProduct) {
                return respondWithError(res, 409, 'A product with this name already exists', ERROR_CODES.CONFLICT);
            }
        }

        // Check category exists if being updated
        if (body.category_id) {
            const category = await Category.fetchById(body.category_id);
            if (!category) {
                return respondWithError(res, 422, 'Invalid category ID', ERROR_CODES.VALIDATION_ERROR);
            }
        }

        const updatedProduct = await Product.update(id, vendorId, body);
        if (!updatedProduct) {
            return respondWithError(res, 400, "Failed to update product", ERROR_CODES.RESOURCE_UPDATE_FAILED);
        }

        return respondWithSuccess(res, 200, "Product updated successfully", updatedProduct);
    } catch (error) {
        console.error("Error updating product:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchProducts = async (req, res) => {
    try {
        const { session, pagination } =req;
        const user = session?.user;
        const { offset, limit } = pagination;
        
        let vendorId;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        } else if (user.role === ROLES.CUSTOMER) {
            vendorId = user.vendor_id;
        }
        if (!vendorId) {
            return respondWithError(res, 401, "Forbiden: Unauthorized", ERROR_CODES.UNAUTHORIZED);
        }

        const products = await Product.findByVendorId(vendorId, {offset, limit});
        return respondWithSuccess(res, 200, "Products fetched successfully", products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchProductById = async (req, res) => {
    try {
        const { session, params } =req;
        const user = session?.user;
        const { productId } = params;
        
        let vendorId;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        } else if (user.role === ROLES.CUSTOMER) {
            vendorId = user.vendor_id;
        }
        if (!vendorId) {
            return respondWithError(res, 401, "Forbiden: Unauthorized", ERROR_CODES.UNAUTHORIZED);
        }

        const product = await Product.findById(productId, vendorId);
        if(!product){
            return respondWithError(res, 404, "Product not found", ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        return respondWithSuccess(res, 200, "Product fetched successfully", product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const { session, params } =req;
        const user = session?.user;
        const { id } = params;  

        let vendorId;
        if (user.role === ROLES.VENDOR) {
            vendorId = user.id;
        } else if (user.role === ROLES.VENDOR_ADMIN) {
            vendorId = user.vendor_id;
        }
        if (!vendorId) {
            return respondWithError(res, 401, "Forbiden: Unauthorized", ERROR_CODES.UNAUTHORIZED);
        }

        const productData = await Product.findById(id, vendorId);
        if (!productData) {
            return respondWithError(res, 404, "Product not found", ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        const deleted = await Product.delete(id, vendorId);
        if (!deleted) {
            return respondWithError(res, 400, "Failed to delete product", ERROR_CODES.RESOURCE_DELETE_FAILED);
        }
        if (productData.images) {
            await S3delete(productData.images);
        }
        return respondWithSuccess(res, 200, "Product deleted successfully", null);
    } catch (error) {
        console.error("Error deleting product:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const searchProducts = async (req, res) => {
    try {
        const { session, query, params } = req;
        const user = session?.user;

        const { error, value } = productSearchSchema.validate(query);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        const result = await Product.search(user.vendor_id, value);
        return respondWithSuccess(res, 200, 'Products fetched successfully', result);
    } catch (error) {
        console.error("Error searching products:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const getFilters = async (req, res) => {
    try {
        const { params } = req;
        const { vendor_id } = params;

        const filters = await Product.getFilters(vendor_id);
        return respondWithSuccess(res, 200, 'Filters fetched successfully', filters);
    } catch (error) {
        console.error("Error fetching filters:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const getRelatedProducts = async (req, res) => {
    try {
        const { params, query } = req;
        const { vendor_id, product_id } = params;
        const { limit } = query;

        const products = await Product.getRelatedProducts(
            product_id, vendor_id, parseInt(limit) || 8
        );
        return respondWithSuccess(res, 200, 'Related products fetched successfully', products);
    } catch (error) {
        console.error("Error fetching related products:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const getFeaturedProducts = async (req, res) => {
    try {
        const { params, query } = req;
        const { vendor_id } = params;
        const { limit } = query;

        const products = await Product.getFeaturedProducts(
            vendor_id, parseInt(limit) || 10
        );
        return respondWithSuccess(res, 200, 'Featured products fetched successfully', products);
    } catch (error) {
        console.error("Error fetching featured products:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};