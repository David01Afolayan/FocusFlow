import { useEffect, useMemo, useState } from 'react'
import './App.css'

const storageKey = 'focusflow-tasks'

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

const filterOptions = ['All', 'High', 'Medium', 'Low', 'Completed']

function App() {
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

  const [selectedFilter, setSelectedFilter] = useState('All')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [isFocusSessionActive, setIsFocusSessionActive] = useState(false)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(25 * 60)
  const [reportMessage, setReportMessage] = useState('')
  const [newTask, setNewTask] = useState({ title: '', category: 'Work', priority: 'Medium' })
  const [editingTask, setEditingTask] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks))
  }, [tasks])

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
    if (selectedFilter === 'All') return tasks
    if (selectedFilter === 'Completed') return tasks.filter((task) => task.completed)
    return tasks.filter((task) => task.priority === selectedFilter)
  }, [selectedFilter, tasks])

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
  }

  const handleAddTask = (event) => {
    event.preventDefault()
    if (!newTask.title.trim()) return

    setTasks((previous) => [
      {
        id: Date.now(),
        title: newTask.title.trim(),
        category: newTask.category,
        priority: newTask.priority,
        completed: false,
        minutes: 30,
      },
      ...previous,
    ])

    setNewTask({ title: '', category: 'Work', priority: 'Medium' })
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
          ? { ...task, title: editingTask.title.trim(), category: editingTask.category, priority: editingTask.priority }
          : task,
      ),
    )
    setEditingTask(null)
    setReportMessage('Task updated successfully.')
  }

  const handleDeleteTask = (id) => {
    setTasks((previous) => previous.filter((task) => task.id !== id))
    if (editingTask?.id === id) {
      setEditingTask(null)
    }
    setReportMessage('Task deleted.')
  }

  const handleNavClick = (label) => {
    setIsSidebarOpen(true)
    setActiveNav(label)
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
    setActiveNav('Reports')
    setSelectedFilter('Completed')
    setReportMessage('Reviewing your goal progress.')
  }

  const sessionMinutes = Math.floor(sessionSecondsLeft / 60)
  const sessionSeconds = sessionSecondsLeft % 60
  const pageTitles = {
    Dashboard: 'Plan your best workday',
    Planner: 'Plan your priorities',
    Habits: 'Build better habits',
    Reports: 'Review your progress',
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-mark">F</div>
          <div className="brand-copy">
            <p className="eyebrow">Productivity</p>
            <h2>FocusFlow</h2>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-toggle"
          aria-label={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen((previous) => !previous)}
        >
          <span aria-hidden="true">{isSidebarOpen ? '←' : '→'}</span>
          <span className="sidebar-toggle-label">{isSidebarOpen ? 'Collapse menu' : 'Open menu'}</span>
        </button>

        <nav className="nav-panel">
          {['Dashboard', 'Planner', 'Habits', 'Reports'].map((item) => (
            <button
              key={item}
              type="button"
              aria-label={item}
              title={isSidebarOpen ? undefined : item}
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
            <p className="eyebrow muted">Good evening</p>
            <h1>{pageTitles[activeNav]}</h1>
          </div>

          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={handleExportSummary}>Export summary</button>
            <button type="button" className="primary-button" onClick={handleFocusSession}>
              {isFocusSessionActive ? 'End focus session' : 'Start focus session'}
            </button>
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
                    <button type="submit" className="primary-button small-btn">Add task</button>
                  </form>
                  <ul className="simple-task-list">
                    {tasks.filter((task) => !task.completed).map((task) => (
                      <li key={task.id}>
                        <span>{task.title}</span>
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="panel page-card">
                  <p className="eyebrow muted">Planning summary</p>
                  <h3>{stats.total - stats.completed} open tasks</h3>
                  <p className="page-card-copy">Keep your high-impact work moving with a clear next step.</p>
                  <button type="button" className="primary-button" onClick={() => setActiveNav('Dashboard')}>View dashboard</button>
                </article>
              </div>
            )}

            {activeNav === 'Habits' && (
              <div className="section-page-grid">
                {focusGoals.map((goal) => (
                  <article className="panel page-card" key={goal.label}>
                    <span className="goal-dot" style={{ background: goal.color }} />
                    <p className="eyebrow muted">{goal.label}</p>
                    <h3>{goal.value}</h3>
                    <button type="button" className="ghost-button" onClick={() => setReportMessage(`${goal.label} check-in recorded.`)}>Check in</button>
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

              <button type="submit" className="primary-button small-btn">Add</button>
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
