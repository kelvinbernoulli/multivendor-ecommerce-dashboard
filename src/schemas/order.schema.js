import Joi from "joi";

export const orderSchema = Joi.object({
    note: Joi.string().trim().max(500).optional().label("Order Note"),
    shipping_address: Joi.object({
        firstname:  Joi.string().trim().max(100).required().label("First Name"),
        lastname:   Joi.string().trim().max(100).required().label("Last Name"),
        phone:      Joi.string().trim().pattern(/^(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/).required().label("Phone"),
        address:    Joi.string().trim().max(500).required().label("Address"),
        city:       Joi.string().trim().max(100).required().label("City"),
        state:      Joi.string().trim().max(100).required().label("State"),
        country:    Joi.string().trim().max(100).required().label("Country"),
        zip_code:   Joi.string().trim().max(20).optional().label("Zip Code"),
    }).required().label("Shipping Address"),
});

export const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled')
        .required()
        .label("Status"),
    note: Joi.string().trim().max(500).optional().label("Note"),
});

export const cancelOrderSchema = Joi.object({
    reason: Joi.string().trim().max(500).required().label("Cancellation Reason"),
});

export default {
    orderSchema,
    updateOrderStatusSchema,
    cancelOrderSchema,
}