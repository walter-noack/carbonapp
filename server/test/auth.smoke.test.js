const test = require('node:test')
const assert = require('node:assert/strict')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.JWT_SECRET = 'test_secret_shared_with_hub'
process.env.CLIENT_URL = 'http://localhost:5173'

let mongod
let mongoose
let createApp
let User
let Organization
let request
let jwt

test.before(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()

  mongoose = require('mongoose')
  await mongoose.connect(process.env.MONGODB_URI)

  createApp = require('../src/app')
  User = require('../src/models/User')
  Organization = require('../src/models/Organization')
  request = require('supertest')
  jwt = require('jsonwebtoken')
})

test.after(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

function hubCookie({ email, apps }) {
  const token = jwt.sign({ userId: 'hub-user-id', email, role: 'user', apps }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  })
  return `ambient_token=${token}`
}

test('sin cookie -> 401', async () => {
  const app = createApp()
  const res = await request(app).get('/api/auth/me')
  assert.equal(res.status, 401)
});

test('cookie válida pero sin acceso a carbonapp -> 403', async () => {
  const app = createApp()
  const cookie = hubCookie({ email: 'nadie@test.cl', apps: ['valorizapp'] })
  const res = await request(app).get('/api/auth/me').set('Cookie', cookie)
  assert.equal(res.status, 403)
});

test('cookie válida + acceso, pero sin User local -> 404 onboarding_required', async () => {
  const app = createApp()
  const cookie = hubCookie({ email: 'nuevo@test.cl', apps: ['carbonapp'] })
  const res = await request(app).get('/api/auth/me').set('Cookie', cookie)
  assert.equal(res.status, 404)
  assert.equal(res.body.message, 'onboarding_required')
});

test('onboarding crea Organization + User, y luego /api/auth/me funciona', async () => {
  const app = createApp()
  const cookie = hubCookie({ email: 'empresa@test.cl', apps: ['carbonapp'] })

  const onboardingRes = await request(app)
    .post('/api/auth/onboarding')
    .set('Cookie', cookie)
    .send({ name: 'Ana Pérez', orgName: 'Empresa Test SpA', taxId: '76.000.000-0' })

  assert.equal(onboardingRes.status, 201)
  assert.equal(onboardingRes.body.user.email, 'empresa@test.cl')
  assert.equal(onboardingRes.body.user.role, 'consultant')
  assert.equal(onboardingRes.body.organization.name, 'Empresa Test SpA')

  const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie)
  assert.equal(meRes.status, 200)
  assert.equal(meRes.body.email, 'empresa@test.cl')

  // Onboarding repetido para el mismo email debe rechazarse.
  const dupRes = await request(app)
    .post('/api/auth/onboarding')
    .set('Cookie', cookie)
    .send({ name: 'Ana Pérez', orgName: 'Otra' })
  assert.equal(dupRes.status, 409)
});

test('JWT inválido limpia la cookie y responde 401', async () => {
  const app = createApp()
  const res = await request(app).get('/api/auth/me').set('Cookie', 'ambient_token=esto-no-es-un-jwt-valido')
  assert.equal(res.status, 401)
  assert.match(res.headers['set-cookie']?.[0] || '', /ambient_token=;/)
});

test('requireRole sigue funcionando sobre req.user local (admin vs consultant)', async () => {
  const app = createApp()

  await Organization.create({ name: 'Org Admin Test' })
  const adminUser = await User.create({ name: 'Admin', email: 'admin@test.cl', role: 'admin' })
  const consultantUser = await User.create({ name: 'Consultant', email: 'consultant@test.cl', role: 'consultant' })

  const adminCookie = hubCookie({ email: adminUser.email, apps: ['carbonapp'] })
  const consultantCookie = hubCookie({ email: consultantUser.email, apps: ['carbonapp'] })

  // /api/organizations está montado detrás de authenticate + requireRole('admin') (ver routes/organizations.js)
  const asAdmin = await request(app).get('/api/organizations').set('Cookie', adminCookie)
  const asConsultant = await request(app).get('/api/organizations').set('Cookie', consultantCookie)

  assert.notEqual(asAdmin.status, 403)
  assert.equal(asConsultant.status, 403)
});
