const express = require('express')
const router = express.Router()
const PresentismoController = require('../controllers/PresentismoController')

const controller = new PresentismoController()

router.post('/calcular', (req, res) => controller.calcular(req, res))

module.exports = router