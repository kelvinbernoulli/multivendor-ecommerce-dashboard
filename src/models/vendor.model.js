import pool from "#services/pg_pool.js";

class VendorModel  {
    static async getVendorUserByEmail(email, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.*, vu.vendor_id
       FROM users u
       INNER JOIN vendor_users vu ON vu.user_id = u.id
       WHERE u.email = $1 AND vu.vendor_id = $2
       LIMIT 1`,
            [email, vendor_id]
        );
        return rows[0] ?? null;
    }

    static async getVendorUserById(user_id, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.firstname, u.lastname,
              u.role, u.status, u.email_verified, vu.vendor_id
       FROM users u
       INNER JOIN vendor_users vu ON vu.user_id = u.id
       WHERE u.id = $1 AND vu.vendor_id = $2
       LIMIT 1`,
            [user_id, vendor_id]
        );
        return rows[0] ?? null;
    }

    static async createVendorUser({ vendor_id, email, password, firstname, lastname, phone, role }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { rows: userRows } = await client.query(
                `INSERT INTO users (email, password, firstname, lastname, phone, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, email, firstname, lastname, role, status, email_verified, created_at`,
                [email, password, firstname, lastname, phone ?? null, role]
            );
            const user = userRows[0];

            await client.query(
                `INSERT INTO vendor_users (user_id, vendor_id) VALUES ($1, $2)`,
                [user.id, vendor_id]
            );

            await client.query('COMMIT');
            return { ...user, vendor_id };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async updateVendorUser(user_id, fields) {
        const keys = Object.keys(fields);
        const values = Object.values(fields);
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const { rows } = await pool.query(
            `UPDATE users
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${keys.length + 1}
       RETURNING id, email, firstname, lastname, role, status, email_verified, updated_at`,
            [...values, user_id]
        );
        return rows[0] ?? null;
    }
};

export default VendorModel;