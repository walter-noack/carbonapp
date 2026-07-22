const router = require('express').Router()
const { me, onboarding, logout, updateProfile } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

router.get('/me', authenticate, me)
router.post('/onboarding', onboarding)
router.post('/logout', authenticate, logout)
router.patch('/me', authenticate, updateProfile)

module.exports = router
