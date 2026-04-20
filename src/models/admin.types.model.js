import pool from "#services/pg_pool.js";

class AdminType {
    static async duplicateType(name, vendorId = null) {
        const { rows } = await pool.query(
            `SELECT * FROM admin_types WHERE admin_type = $1 AND ($2::int IS NULL OR vendor_id = $2) AND deleted_at IS NULL`,
            [name, vendorId]
        );
        return rows[0] ?? null;
    }

    static async deleteType(id, vendorId = null) {
        const { rows } = await pool.query(
            `UPDATE admin_types SET deleted_at = NOW() WHERE id = $1 AND ($2::int IS NULL OR vendor_id = $2) AND deleted_at IS NULL RETURNING *`,
            [id, vendorId]
        );
        return rows[0] ?? null;
    }

    static async fetchAdminTypes(vendorId = null, filters = {}, offset = 0, limit = 20) {
        const values = [];
        let whereClauses = [`deleted_at IS NULL`];
        let i = 1;

        if (vendorId) {
            whereClauses.push(`vendor_id = $${i++}`);
            values.push(vendorId);
        }

        if (filters.search) {
            whereClauses.push(`admin_type ILIKE $${i++}`);
            values.push(`%${filters.search}%`);
        }

        if (filters.status !== undefined) {
            whereClauses.push(`status = $${i++}`);
            values.push(filters.status);
        }

        if (filters.from_date) {
            whereClauses.push(`created_at >= $${i++}`);
            values.push(filters.from_date);
        }

        if (filters.to_date) {
            whereClauses.push(`created_at <= $${i++}`);
            values.push(filters.to_date);
        }

        const query = `
            SELECT *
            FROM admin_types
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY created_at DESC
            LIMIT $${i++} OFFSET $${i}
        `;

        values.push(Number(limit), Number(offset));

        const { rows } = await pool.query(query, values);

        return rows;
    }
}

export default AdminType;