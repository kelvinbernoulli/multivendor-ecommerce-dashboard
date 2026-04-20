import redisClient from "#config/redis.js";
import pool from "#services/pg_pool.js";
import ERROR_CODES from "#utils/error.codes.js";
import { ROLES } from "#utils/helpers.js";
import { respondWithError } from "#utils/response.js";

export const authenticated = (req, res, next) => {
    if (!req.session?.user) {
        return respondWithError(res, 401, 'Authentication required. Please log in to continue.', ERROR_CODES.UNAUTHORIZED);
    }
    req.session.user.id = parseInt(req.session.user.id, 10);
    next();
};

const checkPermission = (routeType, permissionType) => {
    return async (req, res, next) => {
        try {
            const user = req.session?.user;
            if (!user) {
                return respondWithError(res, 401, 'Authentication required. Please log in to continue.', ERROR_CODES.UNAUTHORIZED);
            }

            // Super Admin bypass
            if (user?.id === 1 || user?.role === ROLES.SUPER_ADMIN) {
                return next();
            }

            // Find the route's admin type
            const { rows: adminTypes } = await pool.query(`SELECT * FROM admin_types`);
            const adminType = adminTypes.find(type => type.admin_type === routeType);
            if (!adminType) {
                return respondWithError(res, 403, `Forbidden! Invalid route type: ${routeType}.`, ERROR_CODES.FORBIDDEN);
            }

            // Find admin record for the user
            const adminResult = await pool.query(`SELECT * FROM admins WHERE user_id = $1`, [user.id]);
            if (adminResult.rowCount === 0) {
                return respondWithError(res, 403, 'Not an Admin!', ERROR_CODES.FORBIDDEN);
            }
            const adminId = adminResult.rows[0].id;

            // Fetch permissions
            const permissions = await RolePermissions.getPermissionsByAdminId(adminId);
            const permission = permissions.find(p => p.admin_type_id === adminType.id);
            if (!permission) {
                return respondWithError(res, 403, `Forbidden! You do not have any permission for ${routeType}.`, ERROR_CODES.FORBIDDEN);
            }

            // Check sub_role match
            const roleMatch = await RolePermissions.getAdminByRole(user.id);
            if (!roleMatch.sub_role.includes(adminType.id)) {
                return respondWithError(res, 403, `Forbidden! Only ${routeType} Admins allowed.`, ERROR_CODES.FORBIDDEN);
            }

            // Permission type check
            if (!permission[permissionType]) {
                return respondWithError(res, 403, `Forbidden! You do not have ${permissionType} permission even as a ${routeType} Admin.`, ERROR_CODES.FORBIDDEN);
            }

            // Suspension check
            if (permission.status === 0) {
                return respondWithError(res, 403, `Sorry, your role as a ${routeType} Admin has been suspended; contact Super Admin for details!`, ERROR_CODES.FORBIDDEN);
            }

            return next();
        } catch (error) {
            console.error("Internal server error:", error);
            return respondWithError(res, 500, 'Internal server error: ' + error.message, ERROR_CODES.INTERNAL_SERVER_ERROR);
        }
    };
};

const checkRole = (expectedRoles) => async (req, res, next) => {
    try {
        const user = req.session?.user;
        if (!user) {
            return respondWithError(res, 401, 'Authentication required. Please log in to continue.', ERROR_CODES.UNAUTHORIZED);
        }

        if (!expectedRoles.includes(user.role)) {
            const roleMessages = expectedRoles.map(role => {
                switch (role) {
                    case ROLES.SUPER_ADMIN: return 'Super Admin';
                    case ROLES.ADMIN: return 'Admin';
                    case ROLES.VENDOR: return 'Vendor';
                    case ROLES.CUSTOMER: return 'Customer';
                    default: return 'Unknown';
                }
            });

            return respondWithError(res, 403, `Forbidden! You are not authorized. Expected roles: ${roleMessages.join(', ')}.`, ERROR_CODES.FORBIDDEN);
        }

        next();
    } catch (error) {
        return respondWithError(res, 500, error.message || 'Internal server error', ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
};

// Define specific permission checkers
export const canCreate = checkPermission('create');
export const canRead = checkPermission('read');
export const canUpdate = checkPermission('update');
export const canDelete = checkPermission('delete');

export const isSuperAdmin = checkRole([ROLES.SUPER_ADMIN]);
export const isAdmin = checkRole([ROLES.ADMIN]);
export const isVendor = checkRole([ROLES.VENDOR]);
export const isVendorAdmin = checkRole([ROLES.VENDOR_ADMIN]);
export const isAllAdmin = checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
export const isAllUsers = checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.VENDOR_ADMIN, ROLES.VENDOR, ROLES.CUSTOMER]);
export const isACustomer = checkRole([ROLES.CUSTOMER]);


export default {
    authenticated,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isSuperAdmin,
    isAdmin,
    isVendor,
    isVendorAdmin,
    isAllAdmin,
    isAllUsers,
    isACustomer
}