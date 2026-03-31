import pool from "#services/pg_pool.js";

class VendorModel {
    static async emailExists(email, vendorId) {
        if (!vendorId) throw new Error('vendorId is required for emailExists check');

        const { rows } = await pool.query(
            `SELECT id FROM users
            WHERE email = $1 AND vendor_id = $2 AND deleted_at IS NULL
            LIMIT 1`,
            [email, vendorId]
        );

        return rows.length > 0;
    }
}

export default VendorModel;