const InventoryPeriod = require('../models/InventoryPeriod')
const EmissionSource = require('../models/EmissionSource')
const Organization = require('../models/Organization')
const Report = require('../models/Report')
const { buildInternalReportHtml, buildHuellaChileHtml, renderPdf } = require('../services/reportService')
const { buildHuellaChileWorkbook } = require('../services/huellaChileXlsx')

// Carga período + org + fuentes con control de acceso, y valida que el
// período esté completado (los reportes se generan sobre datos cerrados).
const loadReportData = async (req) => {
  const period = await InventoryPeriod.findById(req.params.inventoryPeriodId)
  if (!period) return { error: { status: 404, message: 'Período no encontrado' } }

  if (req.user.role !== 'admin' && period.org.toString() !== req.user.org?.toString()) {
    return { error: { status: 403, message: 'Acceso denegado' } }
  }
  if (period.status !== 'completed') {
    return { error: { status: 400, message: 'El período debe estar completado para generar reportes' } }
  }

  const [org, sources] = await Promise.all([
    Organization.findById(period.org),
    EmissionSource.find({ inventoryPeriod: period._id }).sort({ scope: 1, category: 1 })
  ])

  return { period, org, sources, nonEvaluatedCategories: period.nonEvaluatedCategories || [] }
}

const getInternalPdf = async (req, res) => {
  try {
    const { error, period, org, sources, nonEvaluatedCategories } = await loadReportData(req)
    if (error) return res.status(error.status).json({ message: error.message })

    const html = buildInternalReportHtml({ org, period, sources, nonEvaluatedCategories })
    const pdfBuffer = await renderPdf(html)

    await Report.create({ inventoryPeriod: period._id, org: org._id, type: 'pdf', generatedBy: req.user._id })

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="reporte-${org.name}-${period.year}.pdf"` })
    res.send(pdfBuffer)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error generando el reporte' })
  }
}

const getHuellaChilePdf = async (req, res) => {
  try {
    const { error, period, org, sources, nonEvaluatedCategories } = await loadReportData(req)
    if (error) return res.status(error.status).json({ message: error.message })

    const html = buildHuellaChileHtml({ org, period, sources, nonEvaluatedCategories })
    const pdfBuffer = await renderPdf(html)

    await Report.create({ inventoryPeriod: period._id, org: org._id, type: 'huellachile', generatedBy: req.user._id })

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="huellachile-${org.name}-${period.year}.pdf"` })
    res.send(pdfBuffer)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error generando el expediente' })
  }
}

const getHuellaChileXlsx = async (req, res) => {
  try {
    const { error, period, org, sources, nonEvaluatedCategories } = await loadReportData(req)
    if (error) return res.status(error.status).json({ message: error.message })

    const buffer = buildHuellaChileWorkbook({ org, period, sources, nonEvaluatedCategories })

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="huellachile-${org.name}-${period.year}.xlsx"`
    })
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error generando el Excel' })
  }
}

module.exports = { getInternalPdf, getHuellaChilePdf, getHuellaChileXlsx }
