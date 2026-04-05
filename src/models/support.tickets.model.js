import pool from "#services/pg_pool.js";

class SupportTicket {
    static async vendorCreate(vendorId, data) {
        const { subject, priority, message, attachment, ticketNumber, userId } = data;
        const result = await pool.query(`
            INSERT INTO vendor_support_tickets
                (subject, message, priority, attachments, status, vendor_id, ticket_number, user_id)
            VALUES ($1, $2, $3, $4, pending, $5, $6, $7)
            RETURNING *`,
            [subject, message, priority, attachment, vendorId, ticketNumber, userId]
        );
        return result;
    }

    static async generalCreate(data) {
        const { subject, priority, message, attachment, ticketNumber, userId } = data;
        const result = await pool.query(`
            INSERT INTO support_tickets
                (subject, message, priority, attachments, status, ticket_number, user_id)
            VALUES ($1, $2, $3, $4, pending, $5, $6)
            RETURNING *`,
            [subject, message, priority, attachment, ticketNumber, userId]
        );
        return result;
    }

    static async fetchVendorUserTickets(vendorId, filters = {}) {
        const queryText = `
            SELECT vendor_support_tickets.*, users.firstname, users.lastname, users.email 
            FROM vendor_support_tickets 
            JOIN users ON vendor_support_tickets.user_id = users.id 
            WHERE vendor_support_tickets.vendor_id = ${vendorId} 
            AND vendor_support_tickets.user_id = ${userId} 
            ORDER BY support_tickets.created_at DESC;
        `;
        const result = await pool.query(queryText);
        return result;
    }

    static async fetchGeneralUserTickets(filters) {
        const { offset = 0, limit = 20 } = filters;
        const queryText = `
            SELECT support_tickets.*, users.firstname, users.lastname, users.email 
            FROM support_tickets 
            JOIN users ON support_tickets.user_id = users.id
            ORDER BY support_tickets.created_at DESC;
        `;
        const result = await pool.query(queryText);
        return result;
    }

    static async fetchVendorTickets(vendorId, filters = {}) {
        const { offset = 0, limit = 20 } = filters;
        const queryText = `
            SELECT vendor_support_tickets.*, users.firstname, users.lastname, users.email 
            FROM vendor_support_tickets 
            JOIN users ON vendor_support_tickets.user_id = users.id 
            WHERE vendor_support_tickets.vendor_id = ${vendorId}
            OFFSET = ${offset} AND LIMIT = ${limit} 
            ORDER BY support_tickets.created_at DESC;
        `;
        const result = await pool.query(queryText);
        return result;
    }

    static async fetchTicketById(vendorId, ticketId) {
        const queryText = `
            SELECT vendor_support_tickets.*, users.firstname, users.lastname, users.email 
            FROM vendor_support_tickets 
            JOIN users ON vendor_support_tickets.user_id = users.id 
            WHERE vendor_support_tickets.vendor_id = ${vendorId} 
            AND vendor_support_tickets.id = ${ticketId};
        `;
        const result = await pool.query(queryText);
        return result;
    }

    static async fetchGeneralTicketById(ticketId) {
        const queryText = `
            SELECT support_tickets.*, users.firstname, users.lastname, users.email 
            FROM support_tickets 
            JOIN users ON support_tickets.user_id = users.id 
            AND support_tickets.id = ${ticketId};
        `;
        const result = await pool.query(queryText);
        return result;
    }

    static async deleteVendorTicket(vendorId, ticketId) {
        const { rows } = await pool.query(`
            UPDATE vendor_support_tickets
            SET deleted_at = NOW()
            WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL
            RETURNING id`,
            [ticketId, vendorId]
        );
        return rows[0] ?? null; // null = not found or already deleted
    }

    static async deleteGeneralTicket(ticketId) {
        const { rows } = await pool.query(`
            UPDATE support_tickets
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id`,
            [ticketId]
        );
        return rows[0] ?? null; // null = not found or already deleted
    }
}

export default SupportTicket;