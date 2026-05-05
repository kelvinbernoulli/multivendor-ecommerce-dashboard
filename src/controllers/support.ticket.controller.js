import SupportTicket from "#models/support.tickets.model.js";
import supportTicketSchema from "#schemas/support.tickets.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import { generateTicketNumber, getVendorId } from "#utils/helpers.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";

export const createSupportTicket = async (req, res) => {
    try {
        const { session, body } = req;
        const user = session?.user;
        const { error } = supportTicketSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const userId = user.id;
        const vendorId = await getVendorId(user);
        const ticketNumber = generateTicketNumber();
        const result = await SupportTicket.vendorCreate(vendorId, {...body, ticketNumber, userId});
        if (result.rowCount === 0) {
            return respondWithError(res, 400, 'Failed to create support ticket', ERROR_CODES.RESOURCE_CREATE_FAILED);
        }
        return respondWithSuccess(res, 200, 'Support ticket created successfully', result.rows[0]);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const createGeneralSupportTicket = async (req, res) => {
    try {
        const { session, body } = req;
        const user = session?.user;
        const { error } = supportTicketSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }
        const userId = user.id;
        const ticketNumber = generateTicketNumber();
        const result = await SupportTicket.generalCreate({...body, ticketNumber, userId});
        if (result.rowCount === 0) {
            return respondWithError(res, 400, 'Failed to create support ticket', ERROR_CODES.RESOURCE_CREATE_FAILED);
        }
        return respondWithSuccess(res, 200, 'Support ticket created successfully', result.rows[0]);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchVendorSupportTickets = async (req, res) => {
    try {
        const { session, pagination, query } = req;
        const user = session?.user;
        const { offset, limit } = pagination;
        const vendorId = await getVendorId(user);
        const result = await SupportTicket.fetchVendorTickets(vendorId, { pagination, query });
        if (result.rowCount === 0) {
            return respondWithError(res, 404, 'No support ticket found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Support tickets retrieved successfully', result.rows);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchGeneralSupportTickets = async (req, res) => {
    try {
        const { session, pagination, query } = req;
        const user = session?.user;
        const { offset, limit } = pagination;
        const result = await SupportTicket.fetchGeneralUserTickets({ offset, limit, query });
        if (result.rowCount === 0) {
            return respondWithError(res, 404, 'No support ticket found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Support tickets retrieved successfully', result.rows);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchSupportTicketById = async (req, res) => {
    try {
        const { session, params } = req;
        const user = session?.user;
        const { ticketId } = params;
        const vendorId = await getVendorId(user);
        const result = await SupportTicket.fetchTicketById(vendorId, ticketId);
        if (result.rowCount === 0) {
            return respondWithError(res, 404, 'Support ticket found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Support ticket retrieved successfully', result.rows);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const fetchGeneralSupportTicketById = async (req, res) => {
    try {
        const { session, params } = req;
        const user = session?.user;
        const { ticketId } = params;
        const result = await SupportTicket.fetchGeneralTicketById(ticketId);
        if (result.rowCount === 0) {
            return respondWithError(res, 404, 'Support ticket found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Support ticket retrieved successfully', result.rows);
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const deleteSupportTicket = async (req, res) => {
    try {
        const { session, params } = req;
        const user = session?.user;
        const { ticketId } = params;
        const vendorId = await getVendorId(user);
        const result = await SupportTicket.deleteVendorTicket(vendorId, ticketId);
        if (result.rowCount === 0) {
            return respondWithError(res, 404, 'Support ticket found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Support ticket deleted successfully');
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export const deleteGeneralSupportTicket = async (req, res) => {
    try {
        const { params } = req;
        const { ticketId } = params;
        const result = await SupportTicket.deleteGeneralTicket(ticketId);
        if (result.rowCount === 0) {
            return respondWithError(res, 404, 'Support ticket not found', ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return respondWithSuccess(res, 200, 'Support ticket deleted successfully');
    } catch (error) {
        console.error(error);
        return respondWithError(res, 500, error.message || error, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
}

export default {
    createSupportTicket,
    createGeneralSupportTicket,
    fetchVendorSupportTickets,
    fetchGeneralSupportTickets,
    fetchSupportTicketById,
    fetchGeneralSupportTicketById,
    deleteSupportTicket,
    deleteGeneralSupportTicket,
};