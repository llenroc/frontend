const test = require('ava')

var request = require('supertest')
var mocks = require('./fixtures')

var app = require('../index').makeApp()

mocks.initMocks()

test('Home page returns 200 and has correct content', async t => {
  const res = await request(app)
    .get('/')
    .expect(200)
  t.is(res.statusCode, 200)
  t.true(res.text.includes('DataHub'))
})

test('Dashboard page renders when jwt in cookies setup', async t => {
  const res = await request(app)
    .get('/dashboard')
    .set('Cookie', ['jwt=123456'])
  t.is(res.statusCode, 200)
  t.true(res.text.includes('Your Dashboard'))
})

test('Login with GitHub redirects to correct path', async t => {
  const res = await request(app)
    .get('/login/github')
  t.is(res.header.location, 'https://github.com/login/')
})

test('Login with GOOGLE redirects to correct path', async t => {
  const res = await request(app)
    .get('/login/google')
  t.is(res.header.location, 'https://accounts.google.com/o/oauth2/auth')
})

test('When redirected to /success it gets user info and writes into cookies then redirects to /', async t => {
  const res = await request(app)
    .get('/success?jwt=1a2b3c')
  t.is(res.statusCode, 302)
  t.true(res.header.location.includes('/dashboard'))
  t.true(res.text.includes('Redirecting to /dashboard'))
})

test('When user logs out, it clears jwt from cookie and redirects to /', async t => {
  const res = await request(app)
    .get('/logout')
  t.is(res.header.location, '/?logout=true')
})

test('When user logs out, it renders home page with alert message', async t => {
  const res = await request(app)
    .get('/?logout=true')
  t.true(res.text.includes('You have been successfully logged out.'))
})

test('Showcase page returns 200 and has correct content', async t => {
  const res = await request(app)
    .get('/admin/demo-package')
    .expect(200)
  t.is(res.statusCode, 200)
  t.true(res.text.includes('DataHub'))
})

test('Showcase page has readme, title and publisher in content', async t => {
  const res = await request(app)
    .get('/admin/demo-package')
    .expect(200)
  t.is(res.statusCode, 200)
  t.true(res.text.includes('Read me'))
  t.true(res.text.includes('DEMO - CBOE Volatility Index'))
})

test('Showcase page displays message if 404 (pkgstore) and pipeline status exists', async t => {
  const res = await request(app)
    .get('/admin/running-package')
    .expect(200)
  t.true(res.text.includes('Your data is safely stored and is getting processed - it will be here soon!'))
})

// Need to think through edge case, e.g., should it be only owner who sees the logs
test.skip('Showcase page displays logs if 404 and pipeline status is failed', async t => {
  const res = await request(app)
    .get('/admin/failed-package')
    .expect(200)
  t.is(res.text, 'log1\nlog2')
})

test('Showcase page displays 404 if package not found in neither pkg-store or status api', async t => {
  const res = await request(app)
    .get('/bad-user/bad-package')
    .expect(404)
  t.is(res.text, 'Sorry, this page was not found.')
})

test('Pipeline page displays logs for a dataset', async t => {
  const notExist = await request(app)
    .get('/bad-user/bad-package/pipelines')
  t.is(notExist.status, 404)

  const res = await request(app)
    .get('/admin/running-package/pipelines')
  t.is(res.status, 200)
  t.true(res.text.includes('admin/running-package - Pipelines'))
  t.true(res.text.includes('log1\nlog2'))
})

test('Publisher page returns 200 and has correct content', async t => {
  const res = await request(app)
    .get('/publisher')
    .expect(200)
  t.is(res.statusCode, 200)
  t.true(res.text.includes('<h2 class="owner">publisher</h2>'))
  t.true(res.text.includes('<h2>Datasets <span class="badge" title="1 published datasets">1</span></h2>'))
})

test('Search page returns 200 and has correct content', async t => {
  const res = await request(app)
    .get('/search?q=test')
    .expect(200)
  t.is(res.statusCode, 200)
  t.true(res.text.includes('Discover Data'))
  t.true(res.text.includes('<input id="search-page-search"'))
  t.true(res.text.includes('1 package(s) found for <b>"test"</b>'))
})

test('Pricing page returns 200 and has correct content', async t => {
  const res = await request(app)
    .get('/pricing')
    .expect(200)
  t.is(res.statusCode, 200)
  t.true(res.text.includes('Metering'))
  t.true(res.text.includes('PRIVACY'))
})

test('Downloading a resource by name or index works for csv and json', async t => {
  let res = await request(app)
    .get('/admin/demo-package/r/demo-resource.csv')
  t.is(res.statusCode, 302)
  t.true(res.header.location.includes('/latest/data/csv/data/demo-resource.csv'))
  res = await request(app)
    .get('/admin/demo-package/r/demo-resource.json')
  t.is(res.statusCode, 302)
  t.true(res.header.location.includes('/latest/data/json/data/demo-resource.json'))
  res = await request(app)
    .get('/admin/demo-package/r/0.csv')
  t.is(res.statusCode, 302)
  t.true(res.header.location.includes('/latest/data/csv/data/demo-resource.csv'))
  res = await request(app)
    .get('/admin/demo-package/r/0.json')
  t.is(res.statusCode, 302)
  t.true(res.header.location.includes('/latest/data/json/data/demo-resource.json'))
})

test('Redirects to old.datahub.io', async t => {
  const old  = 'https://old.datahub.io'
  const urls = [
    '/organization',
    '/organization/abc',
    '/api',
    '/api/xyz',
    '/api/rest/v2/datasets',
    '/dataset',
    '/dataset/iso-3166-1-alpha2-country-codes',
    '/dataset/iso-3166-1-alpha2-country-codes/resource/xyz',
    '/user',
    '/user/rufuspollock',
    '/tag',
    '/tag/abc'
  ]
  for(let url of urls) {
    const expected = old + url
    let res = await request(app).get(url)
    t.is(res.statusCode, 302)
    t.is(res.header.location, expected)
  }
})
