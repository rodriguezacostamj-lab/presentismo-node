const express = require('express')
const fileUpload = require('express-fileupload')
const path = require('path')
const presentismoRoutes = require('./interfaces/routes/presentismo.routes')

const app = express()

// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.resolve('uploads/')
}))

// Rutas
app.use('/api/presentismo', presentismoRoutes)

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