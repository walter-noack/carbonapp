const router = require('express').Router()
const { login, refresh, logout } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', authenticate, logout)

module.exports = router
