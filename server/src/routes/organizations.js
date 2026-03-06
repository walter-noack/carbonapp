const router = require('express').Router()
const { getOrganizations, createOrganization, updateOrganization } = require('../controllers/organizationController')
const { authenticate, requireRole } = require('../middleware/auth')

router.use(authenticate, requireRole('admin'))

router.get('/', getOrganizations)
router.post('/', createOrganization)
router.patch('/:id', updateOrganization)

module.exports = router
