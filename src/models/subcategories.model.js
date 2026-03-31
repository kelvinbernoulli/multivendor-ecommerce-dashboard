import pool from "#services/pg_pool.js";

class Subcategory {
    static async create(data) {
        const { subcategory_name, category_id, subcategory_image, vendor_id, description } = data;
        const result = await pool.query(`
            INSERT INTO subcategories
                (subcategory_name, category_id, subcategory_image, status, vendor_id, description)
            VALUES ($1, $2, $3, true, $4)
            RETURNING *`,
            [subcategory_name, category_id, subcategory_image ?? null, vendor_id, description ?? null]
        );
        return result;
    }

    static async update(subcategoryId, vendorId, data) {
        const allowed = ['subcategory_name', 'category_id', 'description', 'subcategory_image', 'status'];
        const fields = [];
        const values = [];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${fields.length + 1}`);
                values.push(data[key]);
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        // subcategoryId and vendorId appended after dynamic fields
        const idIdx = fields.length + 1;
        const vendorIdx = fields.length + 2;

        const { rows } = await pool.query(`
                UPDATE subcategories
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${idIdx} AND vendor_id = $${vendorIdx} AND deleted_at IS NULL
                RETURNING *`,
            [...values, subcategoryId, vendorId]
        );

        return rows[0] ?? null; // null = not found or already deleted
    }

    static async fetchByVendorId(vendorId, { limit = 20, offset = 0 } = {}) {
        const result = await pool.query(`
            SELECT * FROM subcategories
            WHERE vendor_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3`,
            [vendorId, limit, offset]
        );
        return result;
    }

    static async duplicateCheck(subcategoryName, vendorId) {
        const { rows } = await pool.query(`
            SELECT * FROM subcategories
            WHERE subcategory_name = $1 AND vendor_id = $2 AND deleted_at IS NULL
            LIMIT 1`,
            [subcategoryName, vendorId]
        );
        return rows[0] ?? null;
    }

    static async fetchById(subcategoryId, vendorId) {
        const { rows } = await pool.query(`
            SELECT * FROM subcategories
            WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL
            LIMIT 1`,
            [subcategoryId, vendorId]
        );
        return rows[0] ?? null;
    }

    static async delete(subcategoryId, vendorId) {
        const { rows } = await pool.query(`
            UPDATE subcategories
            SET deleted_at = NOW()
            WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL
            RETURNING id`,
            [subcategoryId, vendorId]
        );
        return rows[0] ?? null; // null = not found or already deleted
    }
}

export default Subcategory;