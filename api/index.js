import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;
const app = express();

// Neon Pool Config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false
});

app.use(cors());
app.use(express.json());

// Log database connection check on start (only locally)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error al conectar a la base de datos Neon en el servidor:', err.stack);
    } else {
      console.log('Servidor Express conectado a la base de datos Neon.');
      release();
    }
  });
}

// --- API ROUTES ---

// --- AUTH ROUTES ---
const JWT_SECRET = process.env.JWT_SECRET || 'secret_konsul_token_2026';

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'El usuario ya existe' });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    
    const token = jwt.sign({ id: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Credenciales inválidas' });
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Credenciales inválidas' });
    
    const expiresIn = rememberMe ? '30d' : '1h';
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión', details: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.json({ message: 'Si el correo existe en nuestro sistema, te hemos enviado un enlace para restablecer tu contraseña.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
      [resetToken, resetTokenExpiry, email]
    );

    const resetLink = `http://localhost:5173/?resetToken=${resetToken}`;
    
    console.log('\n======================================================');
    console.log('🔗 ENLACE DE RECUPERACIÓN DE CONTRASEÑA SOLICITADO');
    console.log(`   Para: ${email}`);
    console.log(`   Enlace: ${resetLink}`);
    console.log('======================================================\n');

    res.json({ message: 'Si el correo existe en nuestro sistema, te hemos enviado un enlace para restablecer tu contraseña.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al solicitar restablecimiento de contraseña' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > $2', [token, Date.now()]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado.' });
    }

    const user = userResult.rows[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ message: 'Tu contraseña ha sido restablecida exitosamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

// 1. Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates');
    const mapped = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      durationDays: row.duration_days,
      companionName: row.companion_name,
      companionAvatar: row.companion_avatar,
      companionGreeting: row.companion_greeting,
      category: row.category,
      steps: row.steps
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar plantillas de la base de datos' });
  }
});

// 2. Create a new template
app.post('/api/templates', async (req, res) => {
  const { id, title, description, durationDays, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  try {
    await pool.query(
      `INSERT INTO templates (id, title, description, duration_days, companion_name, companion_avatar, companion_greeting, category, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, title, description, durationDays, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps)]
    );
    res.status(201).json({ message: 'Plantilla creada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la plantilla en la base de datos' });
  }
});

// 2b. Update a template
app.put('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, durationDays, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  try {
    await pool.query(
      `UPDATE templates 
       SET title = $1, description = $2, duration_days = $3, companion_name = $4, companion_avatar = $5, companion_greeting = $6, category = $7, steps = $8 
       WHERE id = $9`,
      [title, description, durationDays, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps), id]
    );
    res.json({ message: 'Plantilla actualizada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la plantilla en la base de datos' });
  }
});

// 2c. Delete a template
app.delete('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM templates WHERE id = $1', [id]);
    res.json({ message: 'Plantilla eliminada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la plantilla' });
  }
});

// 3. Get all instances
app.get('/api/instances', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM instances ORDER BY started_at DESC');
    const mapped = result.rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      title: row.title,
      instanceName: row.instance_name,
      startedAt: row.started_at,
      companionName: row.companion_name,
      companionAvatar: row.companion_avatar,
      companionGreeting: row.companion_greeting,
      category: row.category,
      steps: row.steps
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar ejecuciones activas' });
  }
});

// 4. Create a new instance
app.post('/api/instances', async (req, res) => {
  const { id, templateId, title, instanceName, startedAt, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  try {
    await pool.query(
      `INSERT INTO instances (id, template_id, title, instance_name, started_at, companion_name, companion_avatar, companion_greeting, category, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, templateId, title, instanceName, startedAt, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps)]
    );
    res.status(201).json({ message: 'Ejecución iniciada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la ejecución en la base de datos' });
  }
});

// 5. Update an instance (steps changes)
app.put('/api/instances/:id', async (req, res) => {
  const { id } = req.params;
  const { steps } = req.body;
  try {
    await pool.query(
      `UPDATE instances SET steps = $1 WHERE id = $2`,
      [JSON.stringify(steps), id]
    );
    res.json({ message: 'Ejecución actualizada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la ejecución' });
  }
});

// 6. Delete an instance
app.delete('/api/instances/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM instances WHERE id = $1', [id]);
    res.json({ message: 'Ejecución eliminada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la ejecución' });
  }
});

// 7. Get notification logs
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_logs ORDER BY logged_at DESC');
    const mapped = result.rows.map(row => ({
      id: row.id,
      instanceId: row.instance_id,
      stepId: row.step_id,
      time: row.logged_at,
      instanceName: row.instance_name,
      stepTitle: row.step_title,
      message: row.message
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar logs de notificación' });
  }
});

// 8. Add a notification log
app.post('/api/notifications', async (req, res) => {
  const { id, instanceId, stepId, instanceName, stepTitle, message } = req.body;
  try {
    await pool.query(
      `INSERT INTO notification_logs (id, instance_id, step_id, instance_name, step_title, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, instanceId, stepId, instanceName, stepTitle, message]
    );
    res.status(201).json({ message: 'Log de notificación registrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar notificación' });
  }
});

// 9. Get all team members
app.get('/api/team', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM team_members ORDER BY name ASC');
    const mapped = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: row.avatar,
      assignedProcesses: row.assigned_processes || [],
      department: row.department || '',
      managerId: row.manager_id || '',
      geminiApiKey: row.gemini_api_key || ''
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar miembros del equipo' });
  }
});

// 10. Create a team member
app.post('/api/team', async (req, res) => {
  const { id, name, role, email, avatar, assignedProcesses, department, managerId, geminiApiKey } = req.body;
  try {
    await pool.query(
      `INSERT INTO team_members (id, name, role, email, avatar, assigned_processes, department, manager_id, gemini_api_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, 
        name, 
        role, 
        email, 
        avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', 
        JSON.stringify(assignedProcesses || []),
        department || '',
        managerId || null,
        geminiApiKey || null
      ]
    );
    res.status(201).json({ message: 'Miembro del equipo creado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear miembro del equipo' });
  }
});

// 11. Update a team member
app.put('/api/team/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, email, avatar, assignedProcesses, department, managerId, geminiApiKey } = req.body;
  try {
    await pool.query(
      `UPDATE team_members 
       SET name = $1, role = $2, email = $3, avatar = $4, assigned_processes = $5, department = $6, manager_id = $7, gemini_api_key = $8
       WHERE id = $9`,
      [
        name, 
        role, 
        email, 
        avatar, 
        JSON.stringify(assignedProcesses || []), 
        department || '', 
        managerId || null, 
        geminiApiKey || null,
        id
      ]
    );
    res.json({ message: 'Miembro del equipo actualizado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar miembro del equipo' });
  }
});

// 12. Delete a team member
app.delete('/api/team/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM team_members WHERE id = $1', [id]);
    res.json({ message: 'Miembro del equipo eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar miembro del equipo' });
  }
});

export default app;
