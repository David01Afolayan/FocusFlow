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
  const [newTask, setNewTask] = useState({ title: '', category: 'Work', priority: 'Medium' })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks))
  }, [tasks])

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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-mark">F</div>
          <div>
            <p className="eyebrow">Productivity</p>
            <h2>FocusFlow</h2>
          </div>
        </div>

        <nav className="nav-panel">
          <button type="button" className="nav-item active">Dashboard</button>
          <button type="button" className="nav-item">Planner</button>
          <button type="button" className="nav-item">Habits</button>
          <button type="button" className="nav-item">Reports</button>
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
            <h1>Plan your best workday</h1>
          </div>

          <div className="topbar-actions">
            <button type="button" className="ghost-button">Export summary</button>
            <button type="button" className="primary-button">Start focus session</button>
          </div>
        </header>

        <section className="hero-panel">
          <div className="hero-copy">
            <span className="badge">Weekly overview</span>
            <h2>Momentum is building.</h2>
            <p>
              You completed <strong>{stats.completed}</strong> of <strong>{stats.total}</strong> high-impact tasks this week and kept your focus blocks consistent.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary-button">Review goals</button>
              <button type="button" className="ghost-button">View report</button>
            </div>
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
                  </div>
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
      </main>
    </div>
  )
}

export default App
