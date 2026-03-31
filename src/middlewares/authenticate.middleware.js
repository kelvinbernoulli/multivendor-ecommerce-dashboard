
export const authenticate = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
    }
    next();
};

export const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.session.user.role)) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        });
    }
    next();
};