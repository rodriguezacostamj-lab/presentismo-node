const express = require('express')
const router = express.Router()
const ReglasController = require('../controllers/ReglasController')

const controller = new ReglasController()

router.get('/parametros', (req, res) => controller.obtenerParametros(req, res))
router.patch('/parametros', (req, res) => controller.actualizarParametro(req, res))

module.exports = router