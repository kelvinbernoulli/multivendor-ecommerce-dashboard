import pool from "#services/pg_pool.js";
import { ROLES } from "#utils/helpers.js";
import { select_column_by_key } from "./query.model.js";
import { config } from "dotenv";

config();

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
        const queryText = `SELECT * FROM users WHERE email = $1 AND vendor_id IS NULL AND deleted_at IS NULL LIMIT 1`;
        const queryValues = [email];
        const queryResult = await pool.query(queryText, queryValues);
        return queryResult.rows[0] ?? null;
    };

    static async getUserByPhone(phone) {
        const queryText = `SELECT * FROM users WHERE phone = $1 AND vendor_id IS NULL AND deleted_at IS NULL LIMIT 1`;
        const queryValues = [phone];
        const queryResult = await pool.query(queryText, queryValues);
        return queryResult.rows[0] ?? null;
    };

    static async getUserByEmailAndRole(email, role) {
        const queryText = `SELECT * FROM users WHERE email = $1 AND role = ANY($2) AND vendor_id IS NULL AND deleted_at IS NULL LIMIT 1`;
        const queryValues = [email, role];
        const queryResult = await pool.query(queryText, queryValues);
        return queryResult.rows[0] ?? null;
    };

    static async getAdminUserByPhone(phone) {
        const queryText = `SELECT * FROM users WHERE phone = $1 AND vendor_id IS NULL AND deleted_at IS NULL LIMIT 1`;
        const queryValues = [phone];
        const queryResult = await pool.query(queryText, queryValues);
        return queryResult.rows[0] ?? null;
    };

    static async getAdminUserById(id) {
        const queryText = `SELECT * FROM users WHERE id = $1 AND vendor_id IS NULL AND deleted_at IS NULL LIMIT 1`;
        const queryValues = [id];
        const queryResult = await pool.query(queryText, queryValues);
        return queryResult.rows[0] ?? null;
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

    static async createUser(data, vendorId = null) {
        console.log("data:", data, "vendorId:", vendorId)
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
            console.log('Created user with ID:', userId);

            if (data.role === ROLES.VENDOR) {
                await client.query(
                    `INSERT INTO vendors (user_id) VALUES ($1)`,
                    [userId]
                );

            } else if (data.role === ROLES.CUSTOMER) {
                if (!vendorId) throw new Error('vendorId is required for customer registration.');
                
                await client.query(
                    `INSERT INTO users_info (user_id, vendor_id) VALUES ($1, $2)`,
                    [userId, vendorId]
                );

            } else if (data.role === ROLES.VENDOR_ADMIN) {
                if (!vendorId) throw new Error('vendorId is required for vendor admin registration.');
                await client.query(
                    `INSERT INTO admins (user_id, vendor_id) VALUES ($1, $2)`,
                    [userId, vendorId]
                );

            } else if (data.role === ROLES.ADMIN) {
                await client.query(
                    `INSERT INTO admins (user_id) VALUES ($1)`,
                    [userId]
                );
                // await 

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

    static async updateAdmin(id, data) {
        const setClauses = [];
        const values = [];
        let i = 1;
        for (const [key, value] of Object.entries(data)) {
            setClauses.push(`${key} = $${i}`);
            values.push(value);
            i++;
        }
        values.push(id);

        const query = `
            UPDATE users
            SET ${setClauses.join(', ')}
            WHERE id = $${i} AND vendor_id IS NULL AND deleted_at IS NULL
            RETURNING *
        `;
        const result = await pool.query(query, values);
        return result.rows[0] ?? null;

    }
}

export default UserModel;