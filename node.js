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

// In-memory user database
const users = {
  "hobbyist": { password: "password123", name: "Hobbyist" }
};

// User-specific project databases
const userProjects = {
  "hobbyist": [
    { id: 1, name: "Boyz Squad", faction: "Orks", quantity: 10, points: 85, status: "Painted" },
    { id: 2, name: "Intercessor Squad", faction: "Imperial Fists", quantity: 5, points: 80, status: "In Progress" },
    { id: 3, name: "Battlewagon", faction: "Orks", quantity: 1, points: 185, status: "Unassembled" }
  ]
};

app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware for API routes
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

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

// Session status check
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

// Get all projects for logged-in user
app.get('/api/projects', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const projects = userProjects[username] || [];
  res.json(projects);
});

// Add a new project
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

// Delete a project
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const projectId = parseInt(req.params.id, 10);

  if (userProjects[username]) {
    userProjects[username] = userProjects[username].filter(p => p.id !== projectId);
  }
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Hobby Tracker server running at http://localhost:3000');
});