import pool from "#services/pg_pool.js";
import { select_column_by_key } from "./query.model.js";
import { config } from "dotenv";

config();

const ROLES = {
    VENDOR: parseInt(process.env.VENDOR_ROLE_ID),
    CUSTOMER: parseInt(process.env.CUSTOMER_ROLE_ID),
    VENDOR_ADMIN: parseInt(process.env.VENDOR_ADMIN_ROLE_ID),
    ADMIN: parseInt(process.env.ADMIN_ROLE_ID),
};

const TABLE_NAME = "users";
export class UserModel {
    static async emailExists(email) {
        const data = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (data.rowCount === 0) {
            return false;
        } else {
            return true;
        }
    };

    static async getUserByEmail(email) {
        const queryResult = await select_column_by_key("users", "*", "email", email);
        const user = queryResult.rows[0] ? queryResult.rows[0] : null;
        if (user) {
            return user;
        } else {
            return null;
        }
    };

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

    static async getUserById(id) {
        const queryResult = await select_column_by_key("users", "*", "id", id);
        const user = queryResult.rows[0] ? queryResult.rows[0] : null;
        if (user) {
            return user;
        } else {
            return null;
        }
    };

    static async getCountryById(countryId) {
        try {
            const query = `SELECT * FROM countries WHERE id = $1`;
            const result = await pool.query(query, [countryId]);
            if (result.rowCount > 0) {
                return result.rows[0];
            } else {
                throw new Error("Country not found");
            }
        } catch (error) {
            console.error("Error fetching country by ID:", error);
            throw new Error("Error fetching country by ID");
        }
    }

    static async phoneExists(phone) {
        try {
            const queryResult = await select_column_by_key(TABLE_NAME, "*", "phone", phone);
            return queryResult.rowCount > 0;
        } catch (error) {
            console.error(error);
            throw new Error("Error fetching phone");
        }
    }

    static async createUser(data, vendorId = null) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const requestBodyKeys = Object.keys(data);
            const requestBodyValues = Object.values(data);

            const insertUserQuery = `
                INSERT INTO users (${requestBodyKeys.join(', ')})
                VALUES (${requestBodyValues.map((_, i) => `$${i + 1}`).join(', ')})
                RETURNING *
            `;

            const userResult = await client.query(insertUserQuery, requestBodyValues);
            if (userResult.rowCount === 0) throw new Error('Error while creating user.');

            const user = userResult.rows[0];
            const userId = user.id;

            if (data.role === ROLES.VENDOR) {
                await client.query(
                    `INSERT INTO vendors (user_id) VALUES ($1)`,
                    [userId]
                );

            } else if (data.role === ROLES.CUSTOMER) {
                if (!vendorId) throw new Error('vendorId is required for customer registration.');
                await client.query(
                    `INSERT INTO vendor_customers (user_id, vendor_id) VALUES ($1, $2)`,
                    [userId, vendorId]
                );
                await client.query(
                    `INSERT INTO users_info (user_id, vendor_id) VALUES ($1, $2)`,
                    [userId, vendorId]
                );

            } else if (data.role === ROLES.VENDOR_ADMIN) {
                if (!vendorId) throw new Error('vendorId is required for vendor admin registration.');
                await client.query(
                    `INSERT INTO vendor_admins (user_id, vendor_id) VALUES ($1, $2)`,
                    [userId, vendorId]
                );

            } else if (data.role === ROLES.ADMIN) {
                await client.query(
                    `INSERT INTO admins (user_id) VALUES ($1)`,
                    [userId]
                );

            } else {
                throw new Error(`Unrecognised role: ${data.role}`);
            }

            await client.query('COMMIT');

            const { password_hash, ...safeUser } = user;
            return safeUser;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

export default UserModel;