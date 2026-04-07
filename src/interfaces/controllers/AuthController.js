const bcrypt = require('bcrypt')
const SQLiteConnection = require('../../infrastructure/persistence/SQLiteConnection')
const path = require('path')

class AuthController {

    async login(req, res) {
        try {
            const { usuario, password } = req.body

            if (!usuario || !password) {
                return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' })
            }

            const db = new SQLiteConnection(path.resolve('data/presentismo.db'))
            const user = db.obtenerUsuarioPorNombre(usuario)
            db.cerrar()

            if (!user) {
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
            }

            const hashCompatible = user.password.replace('$2y$', '$2b$')
            const passwordValido = await bcrypt.compare(password, hashCompatible)

            if (!passwordValido) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
            }

           // Guardar en sesión
           req.session.usuario = {
           id:     user.id,
           nombre: user.nombre,
           rol:    user.rol
           }

           return res.json({
             mensaje: 'Login exitoso.',
             usuario: req.session.usuario
           })

           } catch (error) {
           return res.status(500).json({ error: error.message })
           }
        }
    logout(req, res) {
    req.session.destroy()
    return res.json({ mensaje: 'Sesión cerrada correctamente.' })
}    

}

module.exports = AuthController