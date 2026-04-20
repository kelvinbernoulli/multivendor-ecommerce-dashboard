import pool from "#services/pg_pool.js";
import { ROLES } from "#utils/helpers.js";

class VendorModel {
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

    static async getVendorByEmail(email) {
        const { rows } = await pool.query(
            `SELECT u.*, v.*
                FROM users u
                JOIN vendors v ON v.user_id = u.id
                WHERE u.email = $1
                AND u.role = $2
                AND u.deleted_at IS NULL`,
            [email, ROLES.VENDOR]
        );
        return rows[0] ?? null;
    }

    static async getVendorByPhone(phone) {
        const { rows } = await pool.query(
            `SELECT u.*, v.*
            FROM users u
            JOIN vendors v ON v.user_id = u.id
            WHERE u.phone = $1
            AND u.role = $2
            AND u.deleted_at IS NULL`,
            [phone, ROLES.VENDOR]
        );
        return rows[0] ?? null;
    }

    static async getVendorById(id) {
        const { rows } = await pool.query(
            `SELECT u.*, v.*
            FROM users u
            JOIN vendors v ON v.user_id = u.id
            WHERE u.id = $1
            AND u.role = $2
            AND u.deleted_at IS NULL`,
            [id, ROLES.VENDOR]
        );
        return rows[0] ?? null;
    }

    static async getVendorAdminByEmail(email, vendorId) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password, u.firstname, u.lastname,
                u.phone, u.role, u.status, u.email_verified,
                v.vendor_id
            FROM users u
            JOIN admins v ON v.user_id = u.id
            WHERE u.email = $1
            AND u.role = $2
            AND v.vendor_id = $3
            AND u.deleted_at IS NULL
            LIMIT 1`,
            [email, ROLES.VENDOR_ADMIN, vendorId]
        );
        return rows[0] ?? null;
    }

    static async getVendorAdminByPhone(phone, vendorId) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password, u.firstname, u.lastname,
                u.phone, u.role, u.status, u.email_verified,
                v.vendor_id
            FROM users u
            JOIN admins v ON v.user_id = u.id
            WHERE u.phone = $1
            AND u.role = $2
            AND v.vendor_id = $3
            AND u.deleted_at IS NULL
            LIMIT 1`,
            [phone, ROLES.VENDOR_ADMIN, vendorId]
        );
        return rows[0] ?? null;
    }

    static async getVendorAdminById(id, vendorId) {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password, u.firstname, u.lastname,
                u.phone, u.role, u.status, u.email_verified,
                v.vendor_id
            FROM users u
            JOIN admins v ON v.user_id = u.id
            WHERE u.id = $1
            AND u.role = $2
            AND v.vendor_id = $3
            AND u.deleted_at IS NULL
            LIMIT 1`,
            [id, ROLES.VENDOR_ADMIN, vendorId]
        );
        return rows[0] ?? null;
    }
};

export default VendorModel;