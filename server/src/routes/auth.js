const router = require('express').Router()
const { login, refresh, logout, changePassword, updateProfile } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', authenticate, logout)
router.patch('/me', authenticate, updateProfile)
router.patch('/me/password', authenticate, changePassword)

module.exports = router
