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

    static async getUserByEmailAndVendorId(email, vendorId) {
        const queryResult = `SELECT * FROM users WHERE email = $1 AND vendor_id = $2`;
        const result = await pool.query(queryResult, [email, vendorId]);
        const user = result.rows[0] ? result.rows[0] : null;
        if (user) {
            return user;
        } else {
            return null;
        }
    };

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

    static async createUser(data) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const filtered = Object.fromEntries(
                Object.entries(data).filter(([key]) => data.includes(key))
            );
            const columns = Object.keys(filtered);
            const values = Object.values(filtered);
            const placeholders = values.map((_, i) => `$${i + 1}`);

            // 2. Insert user row
            const { rows, rowCount } = await client.query(
                `INSERT INTO users (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
                RETURNING *`,
                values
            );

            if (rowCount === 0) throw new Error('Failed to create user');

            const user = rows[0];
            const userId = user.id;

            // 3. Role-specific linked table inserts — same transaction
            if (data.role === ROLES.VENDOR) {
                await client.query(
                    `INSERT INTO vendors (user_id) VALUES ($1)`,
                    [userId]
                );
            } else if (data.role === ROLES.CUSTOMER) {
                await client.query(
                    `INSERT INTO vendor_users (user_id) VALUES ($1)`,
                    [userId]
                );
                await client.query(
                    `INSERT INTO users_info (user_id) VALUES ($1)`,
                    [userId]
                );
            } else if (data.role === ROLES.VENDOR_ADMIN) {
                await client.query(
                    `INSERT INTO vendor_admins (user_id) VALUES ($1)`,
                    [userId]
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