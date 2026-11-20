const express = require('express')
const router = express.Router()
const CierresController = require('../controllers/CierresController')

const controller = new CierresController()

router.post('/',                              (req, res) => controller.cerrar(req, res))
router.get('/',                               (req, res) => controller.historial(req, res))
router.get('/buscar',                         (req, res) => controller.buscarEmpleado(req, res))
router.get('/:id',                            (req, res) => controller.detalle(req, res))
router.delete('/:id',                         (req, res) => controller.eliminar(req, res))
router.patch('/:id/resultados/:resultadoId',  (req, res) => controller.actualizarResultado(req, res))
router.post('/:id/retros/calcular',  (req, res) => controller.calcularRetro(req, res))
router.post('/:id/retros/confirmar', (req, res) => controller.confirmarRetros(req, res))
router.get('/:id/retros',            (req, res) => controller.listarRetros(req, res))

module.exports = router
