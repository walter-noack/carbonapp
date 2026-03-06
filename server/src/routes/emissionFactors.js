const router = require('express').Router()
const { getEmissionFactors } = require('../controllers/emissionFactorController')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)
router.get('/', getEmissionFactors)

module.exports = router
