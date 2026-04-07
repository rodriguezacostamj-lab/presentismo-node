const express = require('express')
const router = express.Router()
const AuthController = require('../controllers/AuthController')

const controller = new AuthController()

router.post('/login', (req, res) => controller.login(req, res))

router.post('/logout', (req, res) => controller.logout(req, res))

module.exports = router