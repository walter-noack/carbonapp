const router = require('express').Router()
const { getCalculations, createCalculation, getCalculationById, updateCalculation } = require('../controllers/calculationController')
const { getEntries, createEntry, updateEntry, deleteEntry } = require('../controllers/emissionEntryController')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

router.get('/', getCalculations)
router.post('/', createCalculation)
router.get('/:id', getCalculationById)
router.patch('/:id', updateCalculation)

// Entradas anidadas bajo un cálculo
router.get('/:id/entries', getEntries)
router.post('/:id/entries', createEntry)
router.patch('/:id/entries/:entryId', updateEntry)
router.delete('/:id/entries/:entryId', deleteEntry)

module.exports = router
