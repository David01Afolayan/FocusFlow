import { useEffect, useMemo, useState } from 'react'
import './App.css'

const storageKey = 'focusflow-tasks'
const habitsStorageKey = 'focusflow-habits'

const initialTasks = [
  { id: 1, title: 'Design landing page mockup', category: 'Product', priority: 'High', completed: true, minutes: 45 },
  { id: 2, title: 'Review customer feedback', category: 'Research', priority: 'Medium', completed: false, minutes: 25 },
  { id: 3, title: 'Prepare sprint summary', category: 'Work', priority: 'High', completed: false, minutes: 35 },
  { id: 4, title: 'Workout and recovery', category: 'Wellness', priority: 'Low', completed: true, minutes: 30 },
]

const weeklyProgress = [72, 84, 66, 91, 88, 95, 76]

const focusGoals = [
  { label: 'Deep work blocks', value: '4 / 5', color: '#8b5cf6' },
  { label: 'Reading time', value: '27 min', color: '#22c55e' },
  { label: 'Health check-ins', value: '6 / 7', color: '#f59e0b' },
]
const initialHabits = focusGoals.map((goal, index) => ({
  id: `default-${index}`,
  name: goal.label,
  frequency: 'daily',
  streak: Number.parseInt(goal.value, 10) || 0,
  completedToday: false,
  color: goal.color,
}))

const filterOptions = ['All', 'High', 'Medium', 'Low', 'Completed']
const formatDueDate = (dueDate) => dueDate
  ? new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  : null
const pageRoutes = {
  Dashboard: '/dashboard',
  Planner: '/planner',
  Habits: '/habits',
  Reports: '/reports',
}

const routePages = Object.entries(pageRoutes).reduce((pages, [label, route]) => {
  pages[route] = label
  return pages
}, {})

function App() {
  const [authState, setAuthState] = useState('checking')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return initialTasks

    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : initialTasks
    } catch {
      return initialTasks
    }
  })
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem(habitsStorageKey)
    if (!saved) return initialHabits

    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : initialHabits
    } catch {
      return initialHabits
    }
  })

  const [selectedFilter, setSelectedFilter] = useState('All')
  const [taskSearch, setTaskSearch] = useState('')
  const [activeNav, setActiveNav] = useState(() => routePages[window.location.pathname] || 'Dashboard')
  const [isFocusSessionActive, setIsFocusSessionActive] = useState(false)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(25 * 60)
  const [reportMessage, setReportMessage] = useState('')
  const [newTask, setNewTask] = useState({ title: '', category: 'Work', priority: 'Medium', dueDate: '' })
  const [editingTask, setEditingTask] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState('local')

  useEffect(() => {
    let isMounted = true
    fetch('/api/auth')
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json()
          if (isMounted) {
            setUser(data.user)
            setAuthState('authenticated')
          }
        } else if (isMounted) {
          setAuthState('unauthenticated')
        }
      })
      .catch(() => {
        if (isMounted) setAuthState('unauthenticated')
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveNav(routePages[window.location.pathname] || 'Dashboard')
      setIsSidebarOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!routePages[window.location.pathname]) {
      window.history.replaceState({}, '', pageRoutes.Dashboard)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem(habitsStorageKey, JSON.stringify(habits))
  }, [habits])

  useEffect(() => {
    if (authState !== 'authenticated') return undefined

    let isMounted = true

    const loadCloudTasks = async () => {
      try {
        const response = await fetch('/api/tasks', { credentials: 'include' })
        if (!response.ok) return

        const data = await response.json()
        if (isMounted && Array.isArray(data.tasks)) {
          setTasks(data.tasks.map((task) => ({
            ...task,
            id: Number(task.id),
            minutes: Number(task.minutes),
          })))
          setSyncStatus('synced')
        }
      } catch {
        if (isMounted) setSyncStatus('local')
      }
    }

    loadCloudTasks()
    return () => {
      isMounted = false
    }
  }, [authState, user?.id])

  const syncTask = async (method, body, id) => {
    if (authState !== 'authenticated') return null

    try {
      const response = await fetch(id ? `/api/tasks?id=${id}` : '/api/tasks', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!response.ok) throw new Error(`Task sync failed with status ${response.status}`)
      setSyncStatus('synced')
      return await response.json()
    } catch {
      setSyncStatus('local')
      return null
    }

  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          email: authForm.email,
          password: authForm.password,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to authenticate.')
      setUser(data.user)
      setAuthState('authenticated')
      setAuthForm({ email: '', password: '' })
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    setUser(null)
    setAuthState('unauthenticated')
  }

  useEffect(() => {
    if (!isFocusSessionActive) return undefined

    const timer = window.setInterval(() => {
      setSessionSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer)
          setIsFocusSessionActive(false)
          setReportMessage('Focus session complete. Nice work!')
          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isFocusSessionActive])

  const visibleTasks = useMemo(() => {
    const normalizedSearch = taskSearch.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesFilter = selectedFilter === 'All'
        || (selectedFilter === 'Completed' ? task.completed : task.priority === selectedFilter)
      const searchableText = [task.title, task.category, task.due_date].filter(Boolean).join(' ').toLowerCase()
      return matchesFilter && (!normalizedSearch || searchableText.includes(normalizedSearch))
    })
  }, [selectedFilter, taskSearch, tasks])

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length
    const total = tasks.length
    const focusMinutes = tasks.reduce((sum, task) => sum + (task.completed ? task.minutes : 0), 0)
    const streak = 8
    const completionRate = total ? Math.round((completed / total) * 100) : 0

    return { completed, total, focusMinutes, streak, completionRate }
  }, [tasks])

  const handleToggleTask = (id) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    )
    const task = tasks.find((item) => item.id === id)
    if (task) syncTask('PATCH', { id, completed: !task.completed })
  }

  const handleAddTask = async (event) => {
    event.preventDefault()
    if (!newTask.title.trim()) return

    const task = {
        id: Date.now(),
        title: newTask.title.trim(),
        category: newTask.category,
        priority: newTask.priority,
        completed: false,
        minutes: 30,
        dueDate: newTask.dueDate || null,
    }
    setTasks((previous) => [task, ...previous])
    const data = await syncTask('POST', task)
    if (data?.task) {
      setTasks((previous) => previous.map((item) => (
        item.id === task.id
          ? { ...data.task, id: Number(data.task.id), minutes: Number(data.task.minutes) }
          : item
      )))
    }

    setNewTask({ title: '', category: 'Work', priority: 'Medium', dueDate: '' })
  }

  const handleStartEditing = (task) => {
    setEditingTask({ ...task })
    setReportMessage('')
  }

  const handleCancelEditing = () => {
    setEditingTask(null)
  }

  const handleSaveTask = (event) => {
    event.preventDefault()
    if (!editingTask?.title.trim()) {
      setReportMessage('A task title is required.')
      return
    }

    setTasks((previous) =>
      previous.map((task) =>
        task.id === editingTask.id
          ? {
            ...task,
            title: editingTask.title.trim(),
            category: editingTask.category,
            priority: editingTask.priority,
            dueDate: editingTask.dueDate || null,
          }
          : task,
      ),
    )
    syncTask('PATCH', {
      id: editingTask.id,
      title: editingTask.title.trim(),
      category: editingTask.category,
      priority: editingTask.priority,
      dueDate: editingTask.dueDate || null,
    })
    setEditingTask(null)
    setReportMessage('Task updated successfully.')
  }

  const handleDeleteTask = (id) => {
    setTasks((previous) => previous.filter((task) => task.id !== id))
    syncTask('DELETE', null, id)
    if (editingTask?.id === id) {
      setEditingTask(null)
    }

    setReportMessage('Task deleted.')
  }

  const handleAddHabit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    if (!name) return

    setHabits((previous) => [{
      id: `habit-${Date.now()}`,
      name,
      frequency: String(form.get('frequency') || 'daily'),
      streak: 0,
      completedToday: false,
      color: '#8b5cf6',
    }, ...previous])
    event.currentTarget.reset()
    setReportMessage(`${name} habit added.`)
  }

  const handleHabitCheckIn = (id) => {
    setHabits((previous) => previous.map((habit) => {
      if (habit.id !== id) return habit
      const completedToday = !habit.completedToday
      return {
        ...habit,
        completedToday,
        streak: completedToday ? habit.streak + 1 : Math.max(0, habit.streak - 1),
      }
    }))
    setReportMessage('Habit progress updated.')
  }

  const handleNavClick = (label) => {
    setIsSidebarOpen(false)
    setActiveNav(label)
    window.history.pushState({}, '', pageRoutes[label])
    if (label === 'Dashboard') {
      setSelectedFilter('All')
      setReportMessage('Dashboard refreshed.')
    } else if (label === 'Planner') {
      setSelectedFilter('All')
      setReportMessage('Planner selected. Add and organize your priorities below.')
    } else if (label === 'Habits') {
      setSelectedFilter('Completed')
      setReportMessage('Habits selected. Showing completed activities.')
    } else if (label === 'Reports') {
      setSelectedFilter('Completed')
      setReportMessage('Report refreshed for completed work.')
    }
  }

  const handleExportSummary = () => {
    const summary = {
      exportedAt: new Date().toISOString(),
      completedTasks: stats.completed,
      totalTasks: stats.total,
      focusMinutes: stats.focusMinutes,
      streak: stats.streak,
      completionRate: stats.completionRate,
    }

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'focusflow-summary.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setReportMessage('Summary exported successfully.')
  }

  const handleFocusSession = () => {
    setIsFocusSessionActive((previous) => {
      const nextValue = !previous
      setReportMessage(nextValue ? 'Focus session started.' : 'Focus session paused.')
      if (!nextValue) {
        setSessionSecondsLeft(25 * 60)
      }
      return nextValue
    })
  }

  const handleGoalReview = () => {
    handleNavClick('Reports')
    setSelectedFilter('Completed')
    setReportMessage('Reviewing your goal progress.')
  }

  const sessionMinutes = Math.floor(sessionSecondsLeft / 60)
  const sessionSeconds = sessionSecondsLeft % 60
  const formattedSessionTime = `${String(sessionMinutes).padStart(2, '0')}:${String(sessionSeconds).padStart(2, '0')}`
  const pageTitles = {
    Dashboard: 'Plan your best workday',
    Planner: 'Plan your priorities',
    Habits: 'Build better habits',
    Reports: 'Review your progress',
  }

  if (authState === 'checking') {
    return <div className="auth-loading">Loading FocusFlow...</div>
  }

  if (authState === 'unauthenticated') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="brand-mark">F</div>
            <div>
              <p className="eyebrow muted">Productivity workspace</p>
              <h1>FocusFlow</h1>
            </div>
          </div>
          <p className="eyebrow muted">{authMode === 'login' ? 'Welcome back' : 'Create your workspace'}</p>
          <h2>{authMode === 'login' ? 'Keep your momentum.' : 'Start your focus journey.'}</h2>
          <p className="auth-copy">Your tasks, habits, and focus insights in one calm workspace.</p>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((previous) => ({ ...previous, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((previous) => ({ ...previous, password: event.target.value }))}
                placeholder="At least 8 characters"
                minLength="8"
                required
              />
            </label>
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit" className="primary-button auth-submit" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button type="button" className="auth-switch" onClick={() => {
            setAuthMode((previous) => previous === 'login' ? 'register' : 'login')
            setAuthError('')
          }}>
            {authMode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-mark">F</div>
          <div className="brand-copy">
            <p className="eyebrow">Productivity</p>
            <h2>FocusFlow</h2>
          </div>
        </div>

        <nav className="nav-panel">
          {['Dashboard', 'Planner', 'Habits', 'Reports'].map((item) => (
            <button
              key={item}
              type="button"
              aria-label={item}
              className={`nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <span className="nav-icon" aria-hidden="true">{item.slice(0, 1)}</span>
              <span className="nav-label">{item}</span>
            </button>
          ))}
        </nav>

        <div className="mini-card">
          <p>Current streak</p>
          <h3>{stats.streak} days</h3>
          <div className="mini-progress">
            <span style={{ width: `${stats.completionRate}%` }} />
          </div>
          <small>{stats.completionRate}% weekly target</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            {!isSidebarOpen && (
              <button
                type="button"
                className="menu-trigger"
                aria-label="Open navigation"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span aria-hidden="true">☰</span>
              </button>
            )}
            <p className="eyebrow muted">Good evening · {syncStatus === 'synced' ? 'Cloud synced' : 'Local mode'}</p>
            <h1>{pageTitles[activeNav]}</h1>
          </div>

          <div className="topbar-actions">
            {user && <span className="user-pill">{user.email}</span>}
            <button type="button" className="ghost-button" onClick={handleExportSummary}>Export summary</button>
            <button type="button" className="primary-button" onClick={handleFocusSession}>
              {isFocusSessionActive ? 'End focus session' : 'Start focus session'}
            </button>
            {user && <button type="button" className="ghost-button" onClick={handleLogout}>Log out</button>}
          </div>
        </header>

        {activeNav === 'Dashboard' && (
          <>
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="badge">Weekly overview</span>
            <h2>Momentum is building.</h2>
            <p>
              You completed <strong>{stats.completed}</strong> of <strong>{stats.total}</strong> high-impact tasks this week and kept your focus blocks consistent.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary-button" onClick={handleGoalReview}>Review goals</button>
              <button type="button" className="ghost-button" onClick={() => handleNavClick('Reports')}>View report</button>
            </div>
            <div className={`focus-session-status ${isFocusSessionActive ? 'active' : ''}`} aria-live="polite">
              <span className="focus-session-dot" aria-hidden="true" />
              <span>{isFocusSessionActive ? 'Focus session in progress' : 'Ready for a focused block'}</span>
              <strong>{formattedSessionTime}</strong>
            </div>
            {reportMessage && <p className="inline-status">{reportMessage}</p>}
          </div>

          <div className="hero-metric">
            <p>Focus score</p>
            <h3>92%</h3>
            <div className="ring-wrap">
              <div className="ring-chart">
                <span>92</span>
              </div>
            </div>
          </div>
        </section>
          </>
        )}

        {activeNav !== 'Dashboard' && (
          <section className="section-page">
            <div className="section-page-header">
              <div>
                <p className="eyebrow muted">{activeNav} workspace</p>
                <h2>{pageTitles[activeNav]}</h2>
              </div>
              {reportMessage && <p className="inline-status">{reportMessage}</p>}
            </div>

            {activeNav === 'Planner' && (
              <div className="section-page-grid">
                <article className="panel page-card page-card-wide">
                  <p className="eyebrow muted">Today</p>
                  <h3>Task planner</h3>
                  <p className="page-card-copy">Organize your priorities and keep your next actions visible.</p>
                  <form className="task-form" onSubmit={handleAddTask}>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(event) => setNewTask((previous) => ({ ...previous, title: event.target.value }))}
                      placeholder="Add a planned task"
                      aria-label="Add a planned task"
                    />
                    <select value={newTask.priority} onChange={(event) => setNewTask((previous) => ({ ...previous, priority: event.target.value }))} aria-label="Planned task priority">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(event) => setNewTask((previous) => ({ ...previous, dueDate: event.target.value }))}
                      aria-label="Planned task due date"
                    />
                    <button type="submit" className="primary-button small-btn">Add task</button>
                  </form>
                  <ul className="simple-task-list">
                    {tasks.filter((task) => !task.completed).map((task) => (
                      <li key={task.id}>
                        <span>
                          {task.title}
                          {task.due_date && <small className="task-due-date">Due {formatDueDate(task.due_date)}</small>}
                        </span>
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="panel page-card">
                  <p className="eyebrow muted">Planning summary</p>
                  <h3>{stats.total - stats.completed} open tasks</h3>
                  <p className="page-card-copy">Keep your high-impact work moving with a clear next step.</p>
                  <button type="button" className="primary-button" onClick={() => handleNavClick('Dashboard')}>View dashboard</button>
                </article>
              </div>
            )}

            {activeNav === 'Habits' && (
              <div className="section-page-grid">
                <article className="panel page-card page-card-wide">
                  <p className="eyebrow muted">Build your routine</p>
                  <h3>Create a habit</h3>
                  <p className="page-card-copy">Add a small repeatable action and check it off each day.</p>
                  <form className="habit-form" onSubmit={handleAddHabit}>
                    <input name="name" type="text" placeholder="e.g. Read for 20 minutes" aria-label="New habit name" required />
                    <select name="frequency" aria-label="Habit frequency" defaultValue="daily">
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                      <option value="monthly">Every month</option>
                    </select>
                    <button type="submit" className="primary-button small-btn">Add habit</button>
                  </form>
                </article>
                {habits.map((habit) => (
                  <article className={`panel page-card habit-card ${habit.completedToday ? 'habit-complete' : ''}`} key={habit.id}>
                    <span className="goal-dot" style={{ background: habit.color }} />
                    <p className="eyebrow muted">{habit.frequency} habit</p>
                    <h3>{habit.name}</h3>
                    <p className="habit-streak">{habit.streak} day streak</p>
                    <button type="button" className={habit.completedToday ? 'ghost-button' : 'primary-button'} onClick={() => handleHabitCheckIn(habit.id)}>
                      {habit.completedToday ? 'Completed today' : 'Check in today'}
                    </button>
                  </article>
                ))}
              </div>
            )}

            {activeNav === 'Reports' && (
              <div className="section-page-grid">
                <article className="panel page-card page-card-wide">
                  <p className="eyebrow muted">Completion report</p>
                  <h3>{stats.completionRate}% completion rate</h3>
                  <div className="bar-chart compact-chart" aria-label="Weekly completion report">
                    {weeklyProgress.map((value, index) => (
                      <div key={index} className="bar-column">
                        <span className="bar" style={{ height: `${value}%` }} />
                        <small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="panel page-card">
                  <p className="eyebrow muted">Focus time</p>
                  <h3>{stats.focusMinutes} minutes</h3>
                  <p className="page-card-copy">{stats.completed} completed tasks contributed to your current total.</p>
                  <button type="button" className="primary-button" onClick={handleExportSummary}>Export report</button>
                </article>
              </div>
            )}
          </section>
        )}

        {activeNav === 'Dashboard' && (
          <>
        <section className="stats-grid">
          <article className="stat-card">
            <p>Tasks finished</p>
            <div className="stat-row">
              <h3>{stats.completed}</h3>
              <span className="chip positive">+18%</span>
            </div>
          </article>

          <article className="stat-card">
            <p>Focus minutes</p>
            <div className="stat-row">
              <h3>{stats.focusMinutes}</h3>
              <span className="chip neutral">+5h</span>
            </div>
          </article>

          <article className="stat-card">
            <p>Goal reach</p>
            <div className="stat-row">
              <h3>{stats.completionRate}%</h3>
              <span className="chip positive">On track</span>
            </div>
          </article>

          <article className="stat-card">
            <p>Open tasks</p>
            <div className="stat-row">
              <h3>{stats.total - stats.completed}</h3>
              <span className="chip warning">2 urgent</span>
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel tasks-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow muted">Task board</p>
                <h3>Today’s priorities</h3>
              </div>

              <div className="task-board-controls">
                <input
                  className="task-search"
                  type="search"
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Search tasks"
                  aria-label="Search tasks"
                />
                <div className="filter-row">
                  {filterOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`filter-chip ${selectedFilter === option ? 'active' : ''}`}
                      onClick={() => setSelectedFilter(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form className="task-form" onSubmit={handleAddTask}>
              <input
                type="text"
                value={newTask.title}
                onChange={(event) => setNewTask((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="Add a new task"
                aria-label="Add a new task"
              />

              <select
                value={newTask.category}
                onChange={(event) => setNewTask((previous) => ({ ...previous, category: event.target.value }))}
                aria-label="Task category"
              >
                <option value="Work">Work</option>
                <option value="Product">Product</option>
                <option value="Research">Research</option>
                <option value="Wellness">Wellness</option>
              </select>

              <select
                value={newTask.priority}
                onChange={(event) => setNewTask((previous) => ({ ...previous, priority: event.target.value }))}
                aria-label="Task priority"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <input
                type="date"
                value={newTask.dueDate}
                onChange={(event) => setNewTask((previous) => ({ ...previous, dueDate: event.target.value }))}
                aria-label="Task due date"
              />

              <button  type="submit" className="primary-button small-btn">Add</button>
            </form>

            <ul className="task-list">
              {visibleTasks.map((task) => (
                <li key={task.id} className={`task-item ${task.completed ? 'done' : ''}`}>
                  {editingTask?.id === task.id ? (
                    <form className="task-edit-form" onSubmit={handleSaveTask}>
                      <input
                        type="text"
                        value={editingTask.title}
                        onChange={(event) => setEditingTask((previous) => ({ ...previous, title: event.target.value }))}
                        aria-label="Edit task title"
                        autoFocus
                      />
                      <select
                        value={editingTask.category}
                        onChange={(event) => setEditingTask((previous) => ({ ...previous, category: event.target.value }))}
                        aria-label="Edit task category"
                      >
                        <option value="Work">Work</option>
                        <option value="Product">Product</option>
                        <option value="Research">Research</option>
                        <option value="Wellness">Wellness</option>
                      </select>
                      <select
                        value={editingTask.priority}
                        onChange={(event) => setEditingTask((previous) => ({ ...previous, priority: event.target.value }))}
                        aria-label="Edit task priority"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      <input
                        type="date"
                        value={editingTask.dueDate || ''}
                        onChange={(event) => setEditingTask((previous) => ({ ...previous, dueDate: event.target.value }))}
                        aria-label="Edit task due date"
                      />
                      <div className="task-actions">
                        <button type="submit" className="primary-button small-btn">Save</button>
                        <button type="button" className="ghost-button small-btn" onClick={handleCancelEditing}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <label className="task-main">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id)}
                        />
                        <span>{task.title}</span>
                      </label>

                      <div className="task-meta">
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        <small>{task.category}</small>
                        {task.due_date && <small className="task-due-date">Due {formatDueDate(task.due_date)}</small>}
                        <div className="task-actions">
                          <button type="button" className="task-action-button" onClick={() => handleStartEditing(task)}>Edit</button>
                          <button type="button" className="task-action-button delete" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </article>

          <article className="panel focus-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow muted">Weekly pulse</p>
                <h3>Focus rhythm</h3>
              </div>
            </div>

            <div className="bar-chart" aria-label="Weekly focus chart">
              {weeklyProgress.map((value, index) => (
                <div key={index} className="bar-column">
                  <span className="bar" style={{ height: `${value}%` }} />
                  <small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small>
                </div>
              ))}
            </div>

            <div className="goal-list">
              {focusGoals.map((goal) => (
                <div key={goal.label} className="goal-item">
                  <div className="goal-detail">
                    <span className="goal-dot" style={{ background: goal.color }} />
                    <span>{goal.label}</span>
                  </div>
                  <strong>{goal.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
