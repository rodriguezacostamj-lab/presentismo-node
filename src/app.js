const express = require('express')
const fileUpload = require('express-fileupload')
const path = require('path')
const presentismoRoutes = require('./interfaces/routes/presentismo.routes')
const reglaRoutes = require('./interfaces/routes/reglas.routes')
const authRoutes = require('./interfaces/routes/auth.routes')
const requireAuth = require('./interfaces/middlewares/authMiddleware')

const app = express()
const session = require('express-session')

// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.resolve('uploads/')
}))

app.use(express.static(path.resolve('public')))

app.use(session({
    secret: 'presentismo_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas
}))


// Rutas públicas
app.use('/api/auth', authRoutes)

// Rutas protegidas
app.use('/api/presentismo', requireAuth, presentismoRoutes)
app.use('/api/reglas',      requireAuth, reglaRoutes)


// Ruta raíz
app.get('/', (req, res) => {
    res.json({ mensaje: 'API Presentismo funcionando' })
})

// Puerto
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
})


module.exports = app