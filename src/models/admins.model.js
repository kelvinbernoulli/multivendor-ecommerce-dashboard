import pool from "#services/pg_pool.js";
import { ROLES } from "#utils/helpers.js";
import { query } from "express-validator";

export class AdminModel {
    static async fetchAdmins(vendorId, offset = 0, limit = 40) {
        try {
            const values = [];
            let query = `
                SELECT 
                    u.id, u.firstname, u.lastname, u.email, 
                    u.phone, u.role, u.status, u.admin_role,
                    u.created_at,
                    ui.avatar, ui.gender, ui.date_of_birth,
                    ui.city, ui.state, ui.country_id
                FROM users u
                LEFT JOIN users_info ui ON ui.user_id = u.id
                WHERE u.role IN ($1, $2)
                AND u.deleted_at IS NULL
            `;

            let paramCount = 3;
            if (vendorId) {
                query += ` AND u.vendor_id = $${paramCount++}`;
                values.push(ROLES.ADMIN, ROLES.VENDOR_ADMIN, vendorId, limit, offset);
            } else {
                values.push(ROLES.ADMIN, ROLES.VENDOR_ADMIN, limit, offset);
            }

            query += `
                ORDER BY u.created_at DESC
                LIMIT $${paramCount++} OFFSET $${paramCount++}
            `;

            const { rows } = await pool.query(query, values);
            return rows;

        } catch (error) {
            console.error("Error fetching admins:", error);
            throw error;
        }
    }

    // More explicit vendor validation
    static async fetchAdminById(adminId, vendorId = null) {
        try {
            if (!adminId) {
                throw new Error("Admin ID is required");
            }

            const adminQuery = `
            SELECT 
                u.id, u.firstname, u.lastname, u.email, 
                u.phone, u.role, u.status, u.admin_role,
                u.vendor_id,
                u.created_at, u.updated_at,
                ui.avatar, ui.gender, ui.date_of_birth,
                ui.city, ui.state, ui.country_id
            FROM users u
            LEFT JOIN users_info ui ON ui.user_id = u.id
            WHERE u.id = $1
            AND u.role IN ($2, $3, $4)
            AND u.deleted_at IS NULL
        `;

            const { rows } = await pool.query(adminQuery, [
                adminId,
                ROLES.SUPER_ADMIN,
                ROLES.ADMIN,
                ROLES.VENDOR_ADMIN
            ]);

            if (rows.length === 0) {
                return null;
            }

            const admin = rows[0];

            // If vendorId is provided, validate vendor ownership
            if (vendorId && admin.vendor_id !== vendorId) {
                console.warn(
                    `Unauthorized access attempt`
                );
                return null;
            }

            return admin;

        } catch (error) {
            console.error("Error fetching admin by ID:", error);
            throw error;
        }
    }

    static async deleteAdmin(adminId, vendorId) {
    try {
        if (!adminId) {
            throw new Error("Admin ID is required");
        }

        const adminQuery = `
            SELECT u.* FROM users u
            WHERE u.id = $1
            AND u.role IN ($2, $3, $4)
            AND u.deleted_at IS NULL
        `;

        const { rows } = await pool.query(adminQuery, [
            adminId,
            ROLES.SUPER_ADMIN,
            ROLES.ADMIN,
            ROLES.VENDOR_ADMIN
        ]);

        if (rows.length === 0) {
            return null;
        }

        const admin = rows[0];

        // If vendorId provided, validate vendor membership
        if (vendorId) {
            const { rows: memberRows } = await pool.query(
                `SELECT id FROM vendor_members WHERE user_id = $1 AND vendor_id = $2`,
                [adminId, vendorId]
            );
            if (memberRows.length === 0) {
                console.warn(`Unauthorized delete attempt on admin ${adminId}`);
                return null;
            }
        }

        const { rows: deleted } = await pool.query(
            `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id, firstname, lastname, email, role`,
            [adminId]
        );

        return deleted[0] ?? null;
    } catch (error) {
        console.error("Error deleting admin:", error);
        throw error;
    }
}
}

export default AdminModel;