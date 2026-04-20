import pool from "#services/pg_pool.js";
import { ROLES } from "#utils/helpers.js";

class CustomerModel {
    static async getCustomerByEmail(email, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password, u.firstname, u.lastname,
              u.role, u.status, u.email_verified, vc.vendor_id
            FROM users u
            INNER JOIN vendor_customers vc ON vc.user_id = u.id
            WHERE u.email = $1 AND vc.vendor_id = $2 AND u.role = $3
            LIMIT 1`,
            [email, vendor_id, ROLES.CUSTOMER]
        );
        return rows[0] ?? null;
    }

    static async getCustomerByPhone(phone, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password, u.firstname, u.lastname,
              u.role, u.status, u.email_verified, vc.vendor_id
            FROM users u
            INNER JOIN vendor_customers vc ON vc.user_id = u.id
            WHERE u.phone = $1 AND vc.vendor_id = $2 AND u.role = $3
            LIMIT 1`,
            [phone, vendor_id, ROLES.CUSTOMER]
        );
        return rows[0] ?? null;
    }

    static async getCustomerById(user_id, vendor_id) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.firstname, u.lastname,
              u.role, u.status, u.email_verified, vc.vendor_id
            FROM users u
            INNER JOIN vendor_customers vc ON vc.user_id = u.id
            WHERE u.id = $1 AND vc.vendor_id = $2 AND u.role = $3
            LIMIT 1`,
            [user_id, vendor_id, ROLES.CUSTOMER]
        );
        return rows[0] ?? null;
    }

    static async createCustomer({ vendor_id, email, password, firstname, lastname, phone }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // User may already exist globally (same person, different vendor)
            const { rows: existing } = await client.query(
                `SELECT id FROM users WHERE email = $1 AND role = ${ROLES.CUSTOMER} LIMIT 1`,
                [email]
            );

            let user_id;
            if (existing[0]) {
                user_id = existing[0].id;
            } else {
                const { rows: userRows } = await client.query(
                    `INSERT INTO users (email, password, firstname, lastname, phone, role)
                    VALUES ($1, $2, $3, $4, $5, ${ROLES.CUSTOMER})
                    RETURNING id`,
                    [email, password, firstname, lastname, phone ?? null]
                );
                user_id = userRows[0].id;
            }

            await client.query('COMMIT');

            const { rows } = await client.query(
                `SELECT u.id, u.email, u.firstname, u.lastname,
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
};

export default CustomerModel;