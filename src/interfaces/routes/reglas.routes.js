const express = require('express')
const router = express.Router()
const ReglasController = require('../controllers/ReglasController')

const controller = new ReglasController()

router.get('/parametros', (req, res) => controller.obtenerParametros(req, res))
router.patch('/parametros', (req, res) => controller.actualizarParametro(req, res))
router.get('/', (req, res) => controller.obtenerReglas(req, res))
router.patch('/:codigo', (req, res) => controller.actualizarRegla(req, res))
router.post('/', (req, res) => controller.crearRegla(req, res))
router.delete('/:codigo', (req, res) => controller.eliminarRegla(req, res))

module.exports = router