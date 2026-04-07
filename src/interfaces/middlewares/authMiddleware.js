function requireAuth(req, res, next) {
    if (!req.session?.usuario) {
        return res.status(401).json({ error: 'No autorizado. Iniciá sesión primero.' })
    }
    next()
}

module.exports = requireAuth