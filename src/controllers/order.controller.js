import Order from "#models/order.model.js";
import { cancelOrderSchema, orderSchema } from "#schemas/order.schema.js";
import ERROR_CODES from "#utils/error.codes.js";
import { respondWithError, respondWithSuccess } from "#utils/response.js";

export const placeOrder = async (req, res) => {
    try {
        const { body, session, params } = req;
        const user = session?.user;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { error } = orderSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        const result = await Order.placeOrder(user.id, user.vendor_id, body);
        if (result?.error) {
            return respondWithError(res, result.code, result.error, ERROR_CODES.VALIDATION_ERROR);
        }

        // Send order confirmation email
        await sendOrderConfirmationEmail(user, result);

        return respondWithSuccess(res, 201, 'Order placed successfully', result);
    } catch (error) {
        console.error("Error placing order:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const getCustomerOrders = async (req, res) => {
    try {
        const { session, query, pagination } = req;
        const user = session?.user;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { offset, limit } = pagination;
        const { status } = query;

        const orders = await Order.fetchCustomerOrders(user.id, user.vendor_id, status, { offset: parseInt(offset), limit: parseInt(limit) });

        return respondWithSuccess(res, 200, 'Orders fetched successfully', orders);
    } catch (error) {
        console.error("Error fetching customer orders:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const getCustomerOrderById = async (req, res) => {
    try {
        const { session, params } = req;
        const user = session?.user;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { orderId } = params;

        const order = await Order.fetchCustomerOrderById(user.id, user.vendor_id, orderId);

        return respondWithSuccess(res, 200, 'Order fetched successfully', order);
    } catch (error) {
        console.error("Error fetching customer orders:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const { session, params, body } = req;
        const user = session?.user;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { order_id } = params;

        const { error } = cancelOrderSchema.validate(body);
        if (error) {
            return respondWithError(res, 400, error.details[0].message, ERROR_CODES.VALIDATION_ERROR);
        }

        const result = await Order.cancelOrder(order_id, user.id, body);
        if (result?.error) {
            return respondWithError(res, result.code, result.error, ERROR_CODES.VALIDATION_ERROR);
        }

        // Send cancellation email
        await sendOrderCancellationEmail(user, result);

        return respondWithSuccess(res, 200, 'Order cancelled successfully', result);
    } catch (error) {
        console.error("Error cancelling order:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

export const getOrderHistory = async (req, res) => {
    try {
        const { session, params } = req;
        const user = session?.user;

        if (!user) {
            return respondWithError(res, 401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED);
        }

        const { orderId } = params;
        const history = await Order.fetchOrderHistory(orderId, user.vendor_id, user.id);

        return respondWithSuccess(res, 200, 'Order history fetched successfully', history);
    } catch (error) {
        console.error("Error fetching order history:", error);
        return respondWithError(res, 500, error.message || 'Internal Server Error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};