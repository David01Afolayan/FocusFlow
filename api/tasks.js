import { sql } from '@vercel/postgres'

const allowedPriorities = new Set(['High', 'Medium', 'Low'])

function getUserId(request) {
  const userId = request.headers['x-focusflow-user']
  return typeof userId === 'string' && userId.trim() ? userId.trim() : null
}

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
  return getUserId(request)
}

function sendJson(response, status, body) {
  response.status(status).json(body)
}

export default async function handler(request, response) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return sendJson(response, 401, { error: 'Authentication required.' })
  }

  try {
    if (request.method === 'GET') {
      const result = await sql`
        SELECT id, title, category, priority, completed, minutes, due_date, created_at, updated_at
        FROM tasks
        WHERE user_id = ${userId}
        ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC
      `
      return sendJson(response, 200, { tasks: result.rows })
    }

    if (request.method === 'POST') {
      const { title, category = 'Work', priority = 'Medium', minutes = 30, dueDate = null } = request.body || {}
      if (typeof title !== 'string' || !title.trim()) {
        return sendJson(response, 400, { error: 'A non-empty title is required.' })
      }
      if (!allowedPriorities.has(priority) || !Number.isInteger(minutes) || minutes <= 0) {
        return sendJson(response, 400, { error: 'Invalid priority or duration.' })
      }

      const result = await sql`
        INSERT INTO tasks (user_id, title, category, priority, minutes, due_date)
        VALUES (${userId}, ${title.trim()}, ${category}, ${priority}, ${minutes}, ${dueDate})
        RETURNING id, title, category, priority, completed, minutes, due_date, created_at, updated_at
      `
      return sendJson(response, 201, { task: result.rows[0] })
    }

    if (request.method === 'PATCH') {
      const { id, title, category, priority, completed, minutes, dueDate } = request.body || {}
      if (!Number.isInteger(Number(id))) {
        return sendJson(response, 400, { error: 'A numeric task id is required.' })
      }
      if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        return sendJson(response, 400, { error: 'Title must be a non-empty string.' })
      }
      if (priority !== undefined && !allowedPriorities.has(priority)) {
        return sendJson(response, 400, { error: 'Invalid priority.' })
      }
      if (completed !== undefined && typeof completed !== 'boolean') {
        return sendJson(response, 400, { error: 'Completed must be a boolean.' })
      }
      if (minutes !== undefined && (!Number.isInteger(minutes) || minutes <= 0)) {
        return sendJson(response, 400, { error: 'Minutes must be a positive integer.' })
      }

      const result = await sql`
        UPDATE tasks
        SET
          title = COALESCE(${title?.trim() ?? null}, title),
          category = COALESCE(${category ?? null}, category),
          priority = COALESCE(${priority ?? null}, priority),
          completed = COALESCE(${completed ?? null}, completed),
          minutes = COALESCE(${minutes ?? null}, minutes),
          due_date = COALESCE(${dueDate ?? null}, due_date),
          updated_at = NOW()
        WHERE id = ${Number(id)} AND user_id = ${userId}
        RETURNING id, title, category, priority, completed, minutes, due_date, created_at, updated_at
      `
      if (!result.rows[0]) {
        return sendJson(response, 404, { error: 'Task not found.' })
      }
      return sendJson(response, 200, { task: result.rows[0] })
    }

    if (request.method === 'DELETE') {
      const id = Number(request.query.id)
      if (!Number.isInteger(id)) {
        return sendJson(response, 400, { error: 'A numeric task id is required.' })
      }
      const result = await sql`
        DELETE FROM tasks
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `
      if (!result.rows[0]) {
        return sendJson(response, 404, { error: 'Task not found.' })
      }
      return sendJson(response, 200, { deletedId: result.rows[0].id })
    }

    response.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return sendJson(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    console.error('Tasks API error:', error)
    return sendJson(response, 500, { error: 'Unable to process the task request.' })
  }
}
