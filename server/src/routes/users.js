const router = require('express').Router()
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController')
const { authenticate, requireRole } = require('../middleware/auth')

router.use(authenticate, requireRole('admin'))

router.get('/', getUsers)
router.post('/', createUser)
router.patch('/:id', updateUser)
router.delete('/:id', deleteUser)

module.exports = router
