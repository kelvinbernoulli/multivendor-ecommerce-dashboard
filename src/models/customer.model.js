import pool from "#services/pg_pool.js";

class CustomerModel {
    static async getCustomerByEmail(email, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password, u.first_name, u.last_name,
              u.role, u.status, u.email_verified, vc.vendor_id
       FROM users u
       INNER JOIN vendor_customers vc ON vc.user_id = u.id
       WHERE u.email = $1 AND vc.vendor_id = $2
       LIMIT 1`,
            [email, vendor_id]
        );
        return rows[0] ?? null;
    }

    static async getCustomerById(user_id, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name,
              u.role, u.status, u.email_verified, vc.vendor_id
       FROM users u
       INNER JOIN vendor_customers vc ON vc.user_id = u.id
       WHERE u.id = $1 AND vc.vendor_id = $2
       LIMIT 1`,
            [user_id, vendor_id]
        );
        return rows[0] ?? null;
    }

    static async createCustomer({ vendor_id, email, password, first_name, last_name, phone }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // User may already exist globally (same person, different vendor)
            const { rows: existing } = await client.query(
                `SELECT id FROM users WHERE email = $1 AND role = 'customer' LIMIT 1`,
                [email]
            );

            let user_id;
            if (existing[0]) {
                user_id = existing[0].id;
            } else {
                const { rows: userRows } = await client.query(
                    `INSERT INTO users (email, password, first_name, last_name, phone, role)
           VALUES ($1, $2, $3, $4, $5, 'customer')
           RETURNING id`,
                    [email, password, first_name, last_name, phone ?? null]
                );
                user_id = userRows[0].id;
            }

            await client.query(
                `INSERT INTO vendor_customers (user_id, vendor_id) VALUES ($1, $2)`,
                [user_id, vendor_id]
            );

            await client.query('COMMIT');

            const { rows } = await client.query(
                `SELECT u.id, u.email, u.first_name, u.last_name,
                u.role, u.status, u.email_verified, vc.vendor_id
         FROM users u
         INNER JOIN vendor_customers vc ON vc.user_id = u.id
         WHERE u.id = $1 AND vc.vendor_id = $2`,
                [user_id, vendor_id]
            );
            return rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async updateCustomer(user_id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const { rows } = await pool.query(
            `UPDATE users
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${keys.length + 1}
       RETURNING id, email, first_name, last_name, role, status, email_verified, updated_at`,
            [...values, user_id]
        );
        return rows[0] ?? null;
    }
};

export default CustomerModel;