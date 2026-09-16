import { sql } from '@vercel/postgres'

const allowedFrequencies = new Set(['daily', 'weekly', 'monthly'])

async function getAuthenticatedUserId(request) {
  const token = (request.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('focusflow_session='))
  if (token) {
    const sessionToken = decodeURIComponent(token.slice('focusflow_session='.length))
    const result = await sql`
      SELECT user_id FROM sessions
      WHERE token = ${sessionToken} AND expires_at > NOW()
    `
    if (result.rows[0]) return result.rows[0].user_id
  }
  return null
}

function sendJson(response, status, body) {
  response.status(status).json(body)
}

export default async function handler(request, response) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) return sendJson(response, 401, { error: 'Authentication required.' })

    if (request.method === 'GET') {
      const result = await sql`
        SELECT id, name, frequency, target, streak, completed_today, created_at, updated_at
        FROM habits
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `
      return sendJson(response, 200, { habits: result.rows })
    }

    if (request.method === 'POST') {
      const { name, frequency = 'daily', target = 1 } = request.body || {}
      if (typeof name !== 'string' || !name.trim() || !allowedFrequencies.has(frequency) || !Number.isInteger(target) || target <= 0) {
        return sendJson(response, 400, { error: 'Invalid habit details.' })
      }
      const result = await sql`
        INSERT INTO habits (user_id, name, frequency, target)
        VALUES (${userId}, ${name.trim()}, ${frequency}, ${target})
        RETURNING id, name, frequency, target, streak, completed_today, created_at, updated_at
      `
      return sendJson(response, 201, { habit: result.rows[0] })
    }

    if (request.method === 'PATCH') {
      const { id, name, frequency, target, streak, completedToday } = request.body || {}
      if (!Number.isInteger(Number(id))) return sendJson(response, 400, { error: 'A numeric habit id is required.' })
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) return sendJson(response, 400, { error: 'Name must be non-empty.' })
      if (frequency !== undefined && !allowedFrequencies.has(frequency)) return sendJson(response, 400, { error: 'Invalid frequency.' })
      if (target !== undefined && (!Number.isInteger(target) || target <= 0)) return sendJson(response, 400, { error: 'Target must be positive.' })
      if (streak !== undefined && (!Number.isInteger(streak) || streak < 0)) return sendJson(response, 400, { error: 'Streak must be non-negative.' })
      if (completedToday !== undefined && typeof completedToday !== 'boolean') return sendJson(response, 400, { error: 'Completion must be boolean.' })

      const result = await sql`
        UPDATE habits
        SET
          name = COALESCE(${name?.trim() ?? null}, name),
          frequency = COALESCE(${frequency ?? null}, frequency),
          target = COALESCE(${target ?? null}, target),
          streak = COALESCE(${streak ?? null}, streak),
          completed_today = COALESCE(${completedToday ?? null}, completed_today),
          updated_at = NOW()
        WHERE id = ${Number(id)} AND user_id = ${userId}
        RETURNING id, name, frequency, target, streak, completed_today, created_at, updated_at
      `
      if (!result.rows[0]) return sendJson(response, 404, { error: 'Habit not found.' })
      return sendJson(response, 200, { habit: result.rows[0] })
    }

    if (request.method === 'DELETE') {
      const id = Number(request.query.id)
      if (!Number.isInteger(id)) return sendJson(response, 400, { error: 'A numeric habit id is required.' })
      const result = await sql`DELETE FROM habits WHERE id = ${id} AND user_id = ${userId} RETURNING id`
      if (!result.rows[0]) return sendJson(response, 404, { error: 'Habit not found.' })
      return sendJson(response, 200, { deletedId: result.rows[0].id })
    }

    response.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return sendJson(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    console.error('Habits API error:', error)
    return sendJson(response, 500, { error: 'Unable to process the habit request.' })
  }
}
