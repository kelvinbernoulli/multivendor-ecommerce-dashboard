import CustomerModel from "#models/customer.model.js";
import pool from "./pg_pool";


export const paystackWebhook = async (req, res) => {
    try {
        // Verify webhook signature
        const hash = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        const event = req.body;

        // Handle different event types
        switch (event.event) {
            case 'charge.success':
                await handleSuccessfulPayment(event.data);
                break;

            case 'charge.failed':
                await handleFailedPayment(event.data);
                break;

            case 'refund.success':
                await handleRefund(event.data);
                break;

            default:
                console.log('Unhandled event type:', event.event);
        }

        // Always return 200 to acknowledge receipt
        return res.status(200).send();

    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).send();
    }
};

// Handle successful payment
const handleSuccessfulPayment = async (data) => {
    const {
        id: paystack_id,
        reference,
        domain,
        amount,
        currency,
        status,
        gateway_response,
        message,
        channel,
        ip_address,
        fees,
        metadata,
        authorization,
        customer,
        paid_at,
        created_at
    } = data;

    try {
        // Check if transaction already exists
        const queryText = `SELECT * FROM transactions WHERE reference = $1 LIMIT 1`
        const existingTx = await pool.query(queryText,[reference]);

        if (existingTx.rowCount > 0 && existingTx.rows[0].status === 'success') {
            return;
        }

        // Prepare transaction data
        const transactionData = {
            // Paystack data
            paystack_id: paystack_id,
            reference: reference,
            domain: domain,

            // Payment details
            amount: amount,
            currency: currency || 'NGN',
            status: status,

            // User and package
            user_id: parseInt(metadata.user_id),
            package_id: parseInt(metadata.package_id),
            package_name: metadata.package_name,

            // Pricing
            original_amount: parseFloat(metadata.original_amount),
            discount_amount: parseFloat(metadata.discount_amount || 0),
            final_amount: amount / 100, // Convert kobo to Naira

            // Coupon
            coupon_code: metadata.coupon_code || null,
            coupon_id: metadata.coupon_id ? parseInt(metadata.coupon_id) : null,

            // Transaction details
            gateway_response: gateway_response,
            message: message,
            channel: channel,
            ip_address: ip_address,
            fees: fees || 0,

            // Card/Authorization details (if available)
            authorization_code: authorization?.authorization_code || null,
            card_type: authorization?.card_type?.trim() || null,
            card_last4: authorization?.last4 || null,
            card_exp_month: authorization?.exp_month || null,
            card_exp_year: authorization?.exp_year || null,
            card_bin: authorization?.bin || null,
            card_bank: authorization?.bank || null,
            card_brand: authorization?.brand || null,
            card_country_code: authorization?.country_code || null,
            card_signature: authorization?.signature || null,
            card_reusable: authorization?.reusable || false,

            // Customer details
            customer_email: customer.email,
            customer_code: customer.customer_code,
            customer_id: customer.id,

            // Timestamps
            paid_at: paid_at ? new Date(paid_at) : new Date(),
            verified_at: new Date(),
            metadata: data
        };

        // Save or update transaction
        let transactionId;
        if (existingTx.rowCount > 0) {
            // Update existing transaction
            // const existingTxn = await queryModel.fetch_one_by_key("transactions", "reference", reference);
            // console.log('Existing transaction found:', existingTxn);
            await queryModel.update_by_id('transactions', existingTx.rows[0].id, transactionData);
            transactionId = existingTx.rows[0].id;
        } else {
            // Insert new transaction
            const keys = Object.keys(transactionData);
            const values = Object.values(transactionData);

            const result = await queryModel.insert('transactions', keys, values);
            transactionId = result.rows[0].id;
        }

        // Verify amount matches
        const expectedAmount = Math.round(parseFloat(metadata.original_amount) * 100);
        if (amount !== expectedAmount && parseFloat(metadata.discount_amount) === 0) {
            // await updateTransactionStatus(reference, 'failed', 'Amount mismatch');
            console.error('Amount mismatch for transaction:', reference, 'Expected:', expectedAmount, 'Received:', amount);
            throw new Error('Amount mismatch');
            // return ;
        }

        const user = await CustomerModel.getCustomerById(metadata.user_id, metadata.vendor_id);

        const sendEmail = await sendPaymentReceipt(user, transactionData)
        // console.log("sendViaEmail:", sendViaEmail);

        console.log('✅ Payment processed successfully:', reference);

    } catch (error) {
        console.error('Error processing successful payment:', error);
        throw error;
    }
};

// Handle failed payment
const handleFailedPayment = async (data) => {
    const { id: paystack_id, reference, domain, amount, status, gateway_response, message, customer } = data;

    try {
        const transactionData = {
            paystack_id: paystack_id,
            reference: reference,
            domain: domain,
            amount: amount,
            status: 'failed',
            user_id: parseInt(metadata.user_id),
            order_id: parseInt(metadata.order_id),
            gateway_response: gateway_response,
            message: message,
            customer_email: customer.email,
            verified_at: new Date(),
            metadata: data
        };

        // Check if exists
        const queryText = `SELECT * FROM transactions WHERE reference = $1 LIMIT 1`
        const existingTxn = await pool.query(queryText,[reference]);

        if (existingTxn.rowCount > 0) {
            await queryModel.update_by_id('transactions', existing.rows[0].id, transactionData);
        } else {
            const keys = Object.keys(transactionData);
            const values = Object.values(transactionData);
            await queryModel.insert('transactions', keys, values);
        }

        console.log('❌ Payment failed:', reference);

    } catch (error) {
        console.error('Error processing failed payment:', error);
    }
};

const handleRefund = async (data) => {
    try {
        await client.query(
            `UPDATE refunds SET status = 'success', refunded_at = NOW()
            WHERE gateway_ref = $1`,
            [data.id.toString()]
        );
    } catch (error) {
        console.error('Error processing refund:', error);
    }
}

export default paystackWebhook;