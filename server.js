const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'hobby-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 } // 24 hours
}));

// EMPTY STORES - No sample data or pre-existing accounts
const users = {};
const userProjects = {};

app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Register Route
app.post('/api/register', (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (users[username]) {
    return res.status(400).json({ success: false, message: 'Username already taken.' });
  }

  // Create new user and initialize empty project array
  users[username] = { password, name };
  userProjects[username] = [];

  // Automatically log user in upon registration
  req.session.user = { username, name };
  res.json({ success: true, redirect: '/dashboard.html' });
});

// Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (user && user.password === password) {
    req.session.user = { username, name: user.name };
    return res.json({ success: true, redirect: '/dashboard.html' });
  }

  res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// Session Status Check
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  res.status(401).json({ authenticated: false });
});

// Logout Route
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, redirect: '/login.html' });
  });
});

// --- PROTECTED HOBBY TRACKER API ROUTES ---

app.get('/api/projects', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const projects = userProjects[username] || [];
  res.json(projects);
});

app.post('/api/projects', requireAuth, (req, res) => {
  const username = req.session.user.username;
  if (!userProjects[username]) userProjects[username] = [];

  const { name, faction, quantity, points, status } = req.body;
  const newProject = {
    id: Date.now(),
    name,
    faction: faction || 'General',
    quantity: parseInt(quantity, 10) || 1,
    points: parseInt(points, 10) || 0,
    status: status || 'Unassembled'
  };

  userProjects[username].push(newProject);
  res.status(201).json(newProject);
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const projectId = parseInt(req.params.id, 10);

  if (userProjects[username]) {
    userProjects[username] = userProjects[username].filter(p => p.id !== projectId);
  }
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Hobby Tracker running at http://localhost:3000');
});