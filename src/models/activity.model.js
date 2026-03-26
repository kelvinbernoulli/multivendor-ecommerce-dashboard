import pool from "#services/pg_pool.js";

export class Activity {
    static async logActivity(userId, action, details = {}) {
        try {
            await pool.query(
                'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
                [userId, action, details]
            );
            console.log('Activity logged:', action);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    static async getAllActivities(req, res) {
        const { user, pagination } = req;
        const { offset, limit } = pagination;
        try {
            const result = await pool.query(
                'SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [user.id, limit, offset]
            );

            res.status(200).json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Error fetching activities:', error);
            res.status(500).json({ success: false, message: 'Error fetching activities' });
        }
    }

    static async searchActivities(req, res) {
        const { user, pagination } = req;
        const { offset, limit } = pagination;
        const { query } = req.query;

        try {
            const result = await pool.query(
                `SELECT * FROM activity_logs
             WHERE user_id = $1 AND action ILIKE $2
             ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
                [user.id, `%${query}%`, limit, offset]
            );
            res.status(200).json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Error searching activities:', error);
            res.status(500).json({ success: false, message: 'Error searching activities' });
        }
    }
}

export default Activity;