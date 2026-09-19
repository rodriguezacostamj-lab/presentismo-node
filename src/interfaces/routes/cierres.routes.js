const express = require('express')
const router = express.Router()
const CierresController = require('../controllers/CierresController')

const controller = new CierresController()

router.post('/',                              (req, res) => controller.cerrar(req, res))
router.get('/',                               (req, res) => controller.historial(req, res))
router.get('/:id',                            (req, res) => controller.detalle(req, res))
router.patch('/:id/resultados/:resultadoId',  (req, res) => controller.actualizarResultado(req, res))

module.exports = router
