import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const sessionDurationMs = 1000 * 60 * 60 * 24 * 30

function sendJson(response, status, body) {
  response.status(status).json(body)
}

function isSecureRequest(request) {
  const forwardedProto = request.headers['x-forwarded-proto']
  if (typeof forwardedProto === 'string') return forwardedProto.split(',')[0].trim() === 'https'
  const origin = request.headers.origin
  return typeof origin === 'string' && origin.startsWith('https://')
}

function setSessionCookie(response, token, request) {
  const secureFlag = isSecureRequest(request) ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `focusflow_session=${token}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${sessionDurationMs / 1000}`,
  )
}

function getCookie(request, name) {
  const cookies = request.headers.cookie || ''
  const match = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const token = getCookie(request, 'focusflow_session')
      if (!token) return sendJson(response, 401, { error: 'Not authenticated.' })

      const result = await sql`
        SELECT users.id, users.email
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ${token} AND sessions.expires_at > NOW()
      `
      if (!result.rows[0]) return sendJson(response, 401, { error: 'Session expired.' })
      return sendJson(response, 200, { user: result.rows[0] })
    }

    if (request.method === 'DELETE') {
      const token = getCookie(request, 'focusflow_session')
      if (token) await sql`DELETE FROM sessions WHERE token = ${token}`
      const secureFlag = isSecureRequest(request) ? '; Secure' : ''
      response.setHeader(`Set-Cookie`, `focusflow_session=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`)
      return sendJson(response, 200, { ok: true })
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST, DELETE')
      return sendJson(response, 405, { error: 'Method not allowed.' })
    }

    const { action = 'login', email, password } = request.body || {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!normalizedEmail || !normalizedEmail.includes('@') || typeof password !== 'string' || password.length < 8) {
      return sendJson(response, 400, { error: 'Enter a valid email and a password of at least 8 characters.' })
    }

    if (action === 'register') {
      const passwordHash = await bcrypt.hash(password, 12)
      const created = await sql`
        INSERT INTO users (email, password_hash)
        VALUES (${normalizedEmail}, ${passwordHash})
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email
      `
      if (!created.rows[0]) return sendJson(response, 409, { error: 'An account with this email already exists.' })
      const token = randomBytes(32).toString('hex')
      await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${created.rows[0].id}, NOW() + INTERVAL '30 days')`
      setSessionCookie(response, token, request)
      return sendJson(response, 201, { user: created.rows[0] })
    }

    const users = await sql`SELECT id, email, password_hash FROM users WHERE email = ${normalizedEmail}`
    if (!users.rows[0] || !(await bcrypt.compare(password, users.rows[0].password_hash))) {
      return sendJson(response, 401, { error: 'Invalid email or password.' })
    }
    const token = randomBytes(32).toString('hex')
    await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${users.rows[0].id}, NOW() + INTERVAL '30 days')`
    setSessionCookie(response, token, request)
    return sendJson(response, 200, { user: { id: users.rows[0].id, email: users.rows[0].email } })
  } catch (error) {
    console.error('Auth API error:', error)
    return sendJson(response, 500, { error: 'Authentication service is unavailable.' })
  }
}
