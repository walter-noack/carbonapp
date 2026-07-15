const router = require('express').Router()
const { getInternalPdf, getHuellaChilePdf, getHuellaChileXlsx } = require('../controllers/reportController')
const { authenticate } = require('../middleware/auth')
const { checkTrial } = require('../middleware/trial')

router.use(authenticate)

// Generar/exportar reportes requiere plan vigente (bloqueado en modo lectura de trial vencido)
router.get('/:inventoryPeriodId/pdf', checkTrial, getInternalPdf)
router.get('/:inventoryPeriodId/huellachile/pdf', checkTrial, getHuellaChilePdf)
router.get('/:inventoryPeriodId/huellachile/xlsx', checkTrial, getHuellaChileXlsx)

module.exports = router
