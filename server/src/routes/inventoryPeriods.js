const router = require('express').Router()
const {
  getInventoryPeriods,
  createInventoryPeriod,
  getInventoryPeriodById,
  updateInventoryPeriod
} = require('../controllers/inventoryPeriodController')
const {
  getEmissionSources,
  createEmissionSource,
  updateEmissionSource,
  deleteEmissionSource
} = require('../controllers/emissionSourceController')
const { previewImport, importFromValorizapp } = require('../controllers/valorizappController')
const { authenticate } = require('../middleware/auth')
const { checkTrial } = require('../middleware/trial')

router.use(authenticate)

router.get('/', getInventoryPeriods)
router.post('/', checkTrial, createInventoryPeriod)
router.get('/:id', getInventoryPeriodById)
router.patch('/:id', checkTrial, updateInventoryPeriod)

// Fuentes de emisión anidadas bajo un período
router.get('/:id/emission-sources', getEmissionSources)
router.post('/:id/emission-sources', checkTrial, createEmissionSource)
router.patch('/:id/emission-sources/:sourceId', checkTrial, updateEmissionSource)
router.delete('/:id/emission-sources/:sourceId', checkTrial, deleteEmissionSource)

// Integración Valorizapp — residuos auto-importados como Scope 3 Cat. 5
router.get('/:id/valorizapp-preview', previewImport)
router.post('/:id/import-valorizapp', checkTrial, importFromValorizapp)

module.exports = router
