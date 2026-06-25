import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

// Neon Pool Config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// Log database connection check on start
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar a la base de datos Neon en el servidor:', err.stack);
  } else {
    console.log('Servidor Express conectado a la base de datos Neon.');
    release();
  }
});

// --- API ROUTES ---

// 1. Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates');
    // Map database snake_case keys back to camelCase for the frontend
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
      managerId: row.manager_id || ''
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar miembros del equipo' });
  }
});

// 10. Create a team member
app.post('/api/team', async (req, res) => {
  const { id, name, role, email, avatar, assignedProcesses, department, managerId } = req.body;
  try {
    await pool.query(
      `INSERT INTO team_members (id, name, role, email, avatar, assigned_processes, department, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id, 
        name, 
        role, 
        email, 
        avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', 
        JSON.stringify(assignedProcesses || []),
        department || '',
        managerId || null
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
  const { name, role, email, avatar, assignedProcesses, department, managerId } = req.body;
  try {
    await pool.query(
      `UPDATE team_members 
       SET name = $1, role = $2, email = $3, avatar = $4, assigned_processes = $5, department = $6, manager_id = $7
       WHERE id = $8`,
      [
        name, 
        role, 
        email, 
        avatar, 
        JSON.stringify(assignedProcesses || []), 
        department || '', 
        managerId || null, 
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

app.listen(PORT, () => {
  console.log(`Servidor de API corriendo en puerto ${PORT}`);
});
