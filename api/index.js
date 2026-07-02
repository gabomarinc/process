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

// Run auto-migration for user columns
pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_name VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_avatar VARCHAR(50);
  
  CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log('Migración de base de datos completada: columnas "role", "companion_name", "companion_avatar" y tabla "clients" aseguradas.');
}).catch(err => {
  console.error('Error al migrar base de datos:', err);
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

const JWT_SECRET = process.env.JWT_SECRET || 'secret_konsul_token_2026';

// --- EMAIL SERVICES (RESEND API INTEGRATION) ---
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n======================================================`);
    console.log(`⚠️ SIMULACIÓN DE CORREO (RESEND_API_KEY no configurado)`);
    console.log(`   Destinatario: ${to}`);
    console.log(`   Asunto: ${subject}`);
    console.log(`   Contenido HTML:`);
    console.log(html);
    console.log(`======================================================\n`);
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Kônsul Process <onboarding@resend.dev>',
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de Resend API al enviar email:', errText);
    } else {
      console.log(`Email enviado con éxito vía Resend a: ${to}`);
    }
  } catch (err) {
    console.error('Error de red al conectar con Resend:', err);
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, companyName } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'El usuario ya existe' });
    
    // Create Organization first
    const orgRes = await pool.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
      [companyName]
    );
    const orgId = orgRes.rows[0].id;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = await pool.query(
      'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, organization_id, name, email, role',
      [orgId, name, email, passwordHash, 'admin']
    );
    
    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, organizationId: user.organization_id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, organizationId: user.organization_id, role: user.role } });
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
    // Fallback default role 'admin' if not defined
    const userRole = user.role || 'admin';
    const token = jwt.sign({ id: user.id, organizationId: user.organization_id, role: userRole, email: user.email }, JWT_SECRET, { expiresIn });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, organizationId: user.organization_id, role: userRole } });
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

    const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';
    const finalResetLink = `${origin}/?resetToken=${resetToken}`;

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style="height: 45px; object-fit: contain;" />
        </div>
        <h2 style="color: #111827; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700; text-align: center;">Recuperación de Contraseña</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; text-align: center; margin-bottom: 1.5rem;">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Kônsul Process.
        </p>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; text-align: center; margin-bottom: 2rem;">
          Presiona el botón de abajo para elegir una nueva contraseña. Este enlace es válido por 1 hora.
        </p>
        <div style="text-align: center; margin-bottom: 2rem;">
          <a href="${finalResetLink}" style="background-color: #27bea7; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="color: #9ca3af; font-size: 0.85rem; line-height: 1.5; text-align: center; margin-top: 2rem;">
          Si no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña permanecerá intacta.
        </p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #9ca3af; font-size: 0.8rem; text-align: center; margin: 0;">
          Kônsul Process &copy; 2026. Todos los derechos reservados.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Recupera tu contraseña - Kônsul Process',
      html: htmlContent
    });

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

// --- SECURED CRUD ROUTES ---

// 1. Get all templates
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE organization_id = $1', [req.user.organizationId]);
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
app.post('/api/templates', authenticateToken, async (req, res) => {
  const { id, title, description, durationDays, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  try {
    await pool.query(
      `INSERT INTO templates (id, organization_id, title, description, duration_days, companion_name, companion_avatar, companion_greeting, category, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, req.user.organizationId, title, description, durationDays, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps)]
    );
    res.status(201).json({ message: 'Plantilla creada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la plantilla en la base de datos' });
  }
});

// 2b. Update a template
app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, durationDays, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  try {
    await pool.query(
      `UPDATE templates 
       SET title = $1, description = $2, duration_days = $3, companion_name = $4, companion_avatar = $5, companion_greeting = $6, category = $7, steps = $8 
       WHERE id = $9 AND organization_id = $10`,
      [title, description, durationDays, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps), id, req.user.organizationId]
    );
    res.json({ message: 'Plantilla actualizada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la plantilla en la base de datos' });
  }
});

// 2c. Delete a template
app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM templates WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    res.json({ message: 'Plantilla eliminada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la plantilla' });
  }
});

// 3. Get all instances
app.get('/api/instances', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM instances WHERE organization_id = $1 ORDER BY started_at DESC', [req.user.organizationId]);
    let rows = result.rows;

    if (req.user.role === 'guest') {
      const memberRes = await pool.query('SELECT id FROM team_members WHERE email = $1 AND organization_id = $2', [req.user.email, req.user.organizationId]);
      const memberId = memberRes.rows[0]?.id;
      
      rows = rows.filter(row => {
        try {
          const steps = row.steps || [];
          return steps.some(step => step.assignedTo === memberId || step.assignedTo === req.user.email);
        } catch (e) {
          return false;
        }
      });
    }

    const mapped = rows.map(row => ({
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

// --- CLIENTS ROUTES ---

app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE organization_id = $1 ORDER BY name ASC', [req.user.organizationId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar clientes' });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
  try {
    // Ensure table exists (Safe for Vercel Serverless cold starts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const result = await pool.query(
      'INSERT INTO clients (organization_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.organizationId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el cliente' });
  }
});

// 4. Create a new instance
app.post('/api/instances', authenticateToken, async (req, res) => {
  const { id, templateId, title, instanceName, startedAt, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  try {
    await pool.query(
      `INSERT INTO instances (id, organization_id, template_id, title, instance_name, started_at, companion_name, companion_avatar, companion_greeting, category, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, req.user.organizationId, templateId, title, instanceName, startedAt, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps)]
    );
    res.status(201).json({ message: 'Ejecución iniciada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la ejecución en la base de datos' });
  }
});

// 5. Update an instance (steps changes)
app.put('/api/instances/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { steps } = req.body;
  try {
    await pool.query(
      `UPDATE instances SET steps = $1 WHERE id = $2 AND organization_id = $3`,
      [JSON.stringify(steps), id, req.user.organizationId]
    );
    res.json({ message: 'Ejecución actualizada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la ejecución' });
  }
});

// 6. Delete an instance
app.delete('/api/instances/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM instances WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    res.json({ message: 'Ejecución eliminada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la ejecución' });
  }
});

// 7. Get notification logs
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_logs WHERE organization_id = $1 ORDER BY logged_at DESC', [req.user.organizationId]);
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
app.post('/api/notifications', authenticateToken, async (req, res) => {
  const { id, instanceId, stepId, instanceName, stepTitle, message } = req.body;
  try {
    await pool.query(
      `INSERT INTO notification_logs (id, organization_id, instance_id, step_id, instance_name, step_title, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.user.organizationId, instanceId, stepId, instanceName, stepTitle, message]
    );

    // Look up assignee details in the database to send alert email
    const instRes = await pool.query('SELECT steps FROM instances WHERE id = $1', [instanceId]);
    if (instRes.rows.length > 0) {
      const steps = instRes.rows[0].steps || [];
      const step = steps.find(s => s.id === stepId || s.title === stepTitle);
      
      if (step && step.assignedTo) {
        const memberRes = await pool.query(
          'SELECT name, email FROM team_members WHERE id = $1 AND organization_id = $2',
          [step.assignedTo, req.user.organizationId]
        );
        
        if (memberRes.rows.length > 0) {
          const { name: memberName, email: memberEmail } = memberRes.rows[0];
          const isOverdue = !id.startsWith('active-');
          const subject = isOverdue 
            ? `⚠️ Alerta de retraso: Tarea vencida en "${instanceName}"` 
            : `📋 Nueva tarea asignada: "${stepTitle}" en "${instanceName}"`;

          const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';

          const htmlContent = `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
              <div style="text-align: center; margin-bottom: 2rem;">
                <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style="height: 45px; object-fit: contain;" />
              </div>
              <h2 style="color: ${isOverdue ? '#D32F2F' : '#111827'}; margin-bottom: 1rem; font-size: 1.4rem; font-weight: 700;">
                ${isOverdue ? '⚠️ Alerta de Retraso de Tarea' : '📋 Tarea Asignada y Activa'}
              </h2>
              <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
                Hola <strong>${memberName}</strong>,
              </p>
              <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
                ${message}
              </p>
              <div style="background-color: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 2rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1rem;">Detalles del Proceso:</h4>
                <p style="margin: 0.25rem 0; color: #4b5563;"><strong>Caso/Ejecución:</strong> ${instanceName}</p>
                <p style="margin: 0.25rem 0; color: #4b5563;"><strong>Paso:</strong> ${stepTitle}</p>
                ${step.description ? `<p style="margin: 0.25rem 0; color: #4b5563;"><strong>Instrucciones:</strong> ${step.description}</p>` : ''}
              </div>
              <div style="text-align: center; margin-bottom: 2rem;">
                <a href="${origin}" style="background-color: #27bea7; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem; display: inline-block;">Acceder a la Plataforma</a>
              </div>
              <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
              <p style="color: #9ca3af; font-size: 0.8rem; text-align: center; margin: 0;">
                Kônsul Process &copy; 2026. Todos los derechos reservados.
              </p>
            </div>
          `;

          await sendEmail({
            to: memberEmail,
            subject,
            html: htmlContent
          });
        }
      }
    }

    res.status(201).json({ message: 'Log de notificación registrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar notificación' });
  }
});

// 9. Get all team members
app.get('/api/team', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM team_members WHERE organization_id = $1 ORDER BY name ASC', [req.user.organizationId]);
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
app.post('/api/team', authenticateToken, async (req, res) => {
  const { id, name, role, email, avatar, assignedProcesses, department, managerId, geminiApiKey } = req.body;
  try {
    await pool.query(
      `INSERT INTO team_members (id, organization_id, name, role, email, avatar, assigned_processes, department, manager_id, gemini_api_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id, 
        req.user.organizationId,
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
app.put('/api/team/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, role, email, avatar, assignedProcesses, department, managerId, geminiApiKey } = req.body;
  try {
    await pool.query(
      `UPDATE team_members 
       SET name = $1, role = $2, email = $3, avatar = $4, assigned_processes = $5, department = $6, manager_id = $7, gemini_api_key = $8
       WHERE id = $9 AND organization_id = $10`,
      [
        name, 
        role, 
        email, 
        avatar, 
        JSON.stringify(assignedProcesses || []), 
        department || '', 
        managerId || null, 
        geminiApiKey || null,
        id,
        req.user.organizationId
      ]
    );
    res.json({ message: 'Miembro del equipo actualizado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar miembro del equipo' });
  }
});

// --- USER MANAGEMENT & PROFILE ROUTES (RBAC & CONFIGURATION) ---

// Get all users of the organization
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE organization_id = $1 ORDER BY name ASC',
      [req.user.organizationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar usuarios.' });
  }
});

// Create/Invite a new user inside the organization
app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (nombre, email, contraseña, rol).' });
  }

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
    }

    // If role is guest, enforce limit of 10
    if (role === 'guest') {
      const countRes = await pool.query(
        'SELECT COUNT(*) FROM users WHERE organization_id = $1 AND role = $2',
        [req.user.organizationId, 'guest']
      );
      const count = parseInt(countRes.rows[0].count, 10);
      if (count >= 10) {
        return res.status(400).json({ error: 'Límite excedido: Cada empresa tiene la capacidad de invitar hasta 10 miembros con rol de invitado.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate token for password creation/activation
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpiry = Date.now() + (24 * 3600000); // 24 hours

    const newUser = await pool.query(
      'INSERT INTO users (organization_id, name, email, password_hash, role, reset_token, reset_token_expiry) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role',
      [req.user.organizationId, name, email, passwordHash, role, activationToken, activationExpiry]
    );

    const user = newUser.rows[0];
    const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';
    
    // Get organization name to include in welcome email
    const orgRes = await pool.query('SELECT name FROM organizations WHERE id = $1', [req.user.organizationId]);
    const orgName = orgRes.rows[0]?.name || 'Tu organización';

    const finishAccountLink = `${origin}/?resetToken=${activationToken}`;

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style="height: 45px; object-fit: contain;" />
        </div>
        <h2 style="color: #111827; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700; text-align: center;">¡Te damos la bienvenida a Kônsul Process!</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
          Hola <strong>${name}</strong>,
        </p>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
          Has sido invitado por el administrador de <strong>${orgName}</strong> para formar parte del equipo con el rol de <strong>${role === 'agent' ? 'Agente' : 'Invitado'}</strong>.
        </p>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
          Para activar tu cuenta y establecer tu contraseña segura, por favor presiona el botón de abajo:
        </p>
        <div style="text-align: center; margin-bottom: 2rem;">
          <a href="${finishAccountLink}" style="background-color: #27bea7; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem; display: inline-block;">Activar Cuenta y Elegir Contraseña</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #9ca3af; font-size: 0.8rem; text-align: center; margin: 0;">
          Kônsul Process &copy; 2026. Todos los derechos reservados.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Invitación de acceso - Kônsul Process (${orgName})`,
      html: htmlContent
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario.', details: err.message });
  }
});

// Delete a user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { id } = req.params;
  
  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario de la cuenta.' });
  }

  try {
    await pool.query('DELETE FROM users WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    res.json({ message: 'Usuario eliminado con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

// Update self profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, email, password, companionName, companionAvatar } = req.body;
  try {
    if (email) {
      const existing = await pool.query('SELECT * FROM users WHERE email = $1 AND id <> $2', [email, req.user.id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Este correo electrónico ya está en uso por otro usuario.' });
      }
    }

    let query = 'UPDATE users SET name = $1, email = $2, companion_name = $4, companion_avatar = $5';
    let params = [name, email, req.user.id, companionName || null, companionAvatar || null];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      query += ', password_hash = $6 WHERE id = $3 RETURNING id, organization_id, name, email, role, companion_name, companion_avatar';
      params.push(passwordHash);
    } else {
      query += ' WHERE id = $3 RETURNING id, organization_id, name, email, role, companion_name, companion_avatar';
    }

    const result = await pool.query(query, params);
    const user = result.rows[0];

    const token = jwt.sign(
      { 
        id: user.id, 
        organizationId: user.organization_id, 
        role: user.role, 
        email: user.email,
        companionName: user.companion_name,
        companionAvatar: user.companion_avatar
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        organizationId: user.organization_id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        companionName: user.companion_name,
        companionAvatar: user.companion_avatar
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el perfil.' });
  }
});

// Get organization details
app.get('/api/organization', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.user.organizationId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organización no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar organización.' });
  }
});

// Update organization name
app.put('/api/organization', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
  }
  try {
    await pool.query(
      'UPDATE organizations SET name = $1 WHERE id = $2',
      [name, req.user.organizationId]
    );
    res.json({ message: 'Nombre de la empresa actualizado con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la empresa.' });
  }
});


// ==========================================
// NOTIFICATIONS API ROUTES
// ==========================================

// Get notifications for a user
app.get('/api/notifications/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // Basic security: only fetch own notifications (unless admin, but for now just own)
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Server error updating notification' });
  }
});

// Delete a notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error deleting notification' });
  }
});

export default app;
