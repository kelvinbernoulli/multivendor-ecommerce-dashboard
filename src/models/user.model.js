import pool from "#services/pg_pool.js";
import { select_column_by_key } from "./query.model.js";

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

    static async createUser(body) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const keys = Object.keys(body);
            const values = Object.values(body);

            const insertUserQuery = `
                INSERT INTO users 
                    (${keys.join(", ")})
                VALUES 
                    (${values.map((_, index) => "$" + (index + 1)).join(", ")})
                RETURNING *;
            `;

            const userResult = await client.query(insertUserQuery, values);
            if (userResult.rowCount === 0) throw new Error("Error while creating user.");
            const userId = userResult.rows[0].id;

            await client.query(`INSERT INTO users_info (user_id) VALUES ($1)`, [userId]);

            await client.query("COMMIT");

            delete body.password;

            return { success: true };

        } catch (error) {
            await client.query("ROLLBACK");
            console.error(error);
            return { code: 500, message: error.message };
        } finally {
            client.release();
        }
    };
}

export default UserModel;