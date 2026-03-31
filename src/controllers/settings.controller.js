import Settings from "#models/settings.model.js";
import settingsSchema from "#schemas/settings.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import { getVendorId } from "#utils/helpers.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";

export const upsertSettings = async (req, res) => {
    try {
        const { body, user } = req;
        const vendorId = await getVendorId(user);
        const { error } = settingsSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const result = await Settings.upsert(vendorId, body);
        if (result.rowCount === 0) {
            return respondWithError(res, 400, 'Settings update Failed', ERROR_CODES.RESOURCE_UPDATE_FAILED);
        }
        return respondWithSuccess(res, 200, 'Settings updated successfully', result.rows[0]);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchSettings = async (req, res) => {
    try {
        const { user } = req;
        const vendorId = await getVendorId(user);
        const result = await Settings.fetch(vendorId);
        return respondWithSuccess(res, 200, 'Settings fetched successfully', result.rows[0]);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export default {
    upsertSettings,
    fetchSettings
}