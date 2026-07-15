import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import net from 'net';
import tls from 'tls';
import cookieSession from 'cookie-session';
import { KindeClient, GrantType } from "@kinde-oss/kinde-nodejs-sdk";

dotenv.config();

const { Pool } = pg;
const app = express();

// Neon Pool Config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  max: 6,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000
});

// Run auto-migration for user columns
pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_name VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_avatar VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry BIGINT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255);
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clickup_token VARCHAR(255);
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clickup_workspace_id VARCHAR(100);
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reactivaleads_api_key VARCHAR(255);

  CREATE TABLE IF NOT EXISTS reactivaleads_rules (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    konsul_template_id VARCHAR(100) NOT NULL,
    reactivaleads_template_id VARCHAR(100) NOT NULL,
    mapping JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(255) PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clickup_rules (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    clickup_list_id VARCHAR(100) NOT NULL,
    clickup_list_name VARCHAR(255) NOT NULL,
    clickup_status VARCHAR(100) NOT NULL,
    template_id VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_tokens (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS notification_logs (
    id VARCHAR(255) PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    instance_id VARCHAR(100),
    step_id VARCHAR(100),
    instance_name VARCHAR(255),
    step_title VARCHAR(255),
    message TEXT,
    logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'message',
    message TEXT NOT NULL,
    instance_id VARCHAR(100),
    step_id VARCHAR(100),
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS step_id VARCHAR(100);

  ALTER TABLE templates ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';
  ALTER TABLE clickup_rules ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';
  ALTER TABLE clickup_rules ADD COLUMN IF NOT EXISTS title_pattern VARCHAR(255) DEFAULT '{template_title} - {task_name}';

  INSERT INTO team_members (id, organization_id, name, role, email, avatar, department)
  SELECT 
    'admin_' || id, organization_id, name, 'Fundador/Admin', email, companion_avatar, 'Administración'
  FROM users 
  WHERE role = 'admin' AND email NOT IN (SELECT email FROM team_members);
`).then(() => {
  console.log('Migración de base de datos completada: columnas y tablas (incluyendo "api_tokens") aseguradas.');
}).catch(err => {
  console.error('Error al migrar base de datos:', err);
});

app.use(cors());
app.use(express.json());

app.use(cookieSession({
  name: 'kinde_session',
  secret: process.env.JWT_SECRET || 'secret_konsul_token_2026',
  maxAge: 24 * 60 * 60 * 1000,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}));

// Kinde setup variables removed as we use manual OAuth2 calls


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
        from: 'Kônsul Process <somos@konsul.digital>',
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

const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ') && req.headers['authorization'].split(' ')[1]);

  if (!apiKey) {
    return res.status(401).json({ error: 'Acceso denegado. API key no proporcionada.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM api_tokens WHERE token = $1',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'API key inválida o revocada.' });
    }

    const apiToken = result.rows[0];

    // Update last used timestamp
    pool.query('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiToken.id]).catch(console.error);

    req.user = {
      id: null,
      organizationId: apiToken.organization_id,
      role: 'admin',
      email: 'api-caller@konsul.digital'
    };

    next();
  } catch (err) {
    console.error('Error al autenticar API key:', err);
    res.status(500).json({ error: 'Error del servidor al autenticar API key.' });
  }
};

// --- AUTH ROUTES (KINDE SSO) ---

app.get('/api/auth/login', async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.kindeState = state;
    
    let authUrl = `${process.env.KINDE_ISSUER_URL}/oauth2/auth?` + new URLSearchParams({
      client_id: process.env.KINDE_CLIENT_ID,
      response_type: 'code',
      redirect_uri: (process.env.KINDE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '') + '/api/auth/kinde_callback',
      scope: 'openid profile email',
      state: state
    }).toString();
    
    // Support prompt=none via query params for seamless SSO
    if (req.query.prompt === 'none') {
      authUrl += '&prompt=none';
    }
    
    res.redirect(authUrl);
  } catch (err) {
    console.error('Error al generar URL de login Kinde:', err);
    res.status(500).json({ error: 'Error al iniciar sesión con Kinde' });
  }
});

app.get('/api/auth/register', async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.kindeState = state;
    
    let authUrl = `${process.env.KINDE_ISSUER_URL}/oauth2/auth?` + new URLSearchParams({
      client_id: process.env.KINDE_CLIENT_ID,
      response_type: 'code',
      redirect_uri: (process.env.KINDE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '') + '/api/auth/kinde_callback',
      scope: 'openid profile email',
      state: state,
      prompt: 'create'
    }).toString();
    
    res.redirect(authUrl);
  } catch (err) {
    console.error('Error al generar URL de registro Kinde:', err);
    res.status(500).json({ error: 'Error al registrar con Kinde' });
  }
});

app.get('/api/auth/kinde_callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) {
      console.error("Kinde returned error:", error, error_description);
      throw new Error(error_description || error);
    }
    
    // Exchange code for token
    const tokenResponse = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KINDE_CLIENT_ID,
        client_secret: process.env.KINDE_CLIENT_SECRET,
        code,
        redirect_uri: (process.env.KINDE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '') + '/api/auth/kinde_callback'
      }).toString()
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Error in token exchange:', tokenData);
      throw new Error('Error intercambiando el token de acceso');
    }
    
    // Fetch user profile using access_token
    const profileResponse = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/v2/user_profile`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    let profile = await profileResponse.json();
    
    if (!profile || !profile.email) {
      if (tokenData.id_token) {
        const decodedIdToken = jwt.decode(tokenData.id_token);
        if (decodedIdToken) {
          profile = {
            email: decodedIdToken.email || profile.email,
            given_name: decodedIdToken.given_name || profile.given_name,
            family_name: decodedIdToken.family_name || profile.family_name
          };
        }
      }
      
      if (!profile.email) {
        throw new Error('Perfil de usuario incompleto desde Kinde');
      }
    }
    
    // Check if user exists in DB
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [profile.email]);
    let user;
    
    if (userResult.rows.length === 0) {
      // Create Organization
      const orgName = `Organización de ${profile.given_name || 'Usuario'}`;
      const orgRes = await pool.query(
        'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
        [orgName]
      );
      const orgId = orgRes.rows[0].id;

      // Generar hash dummy porque la clave real la maneja Kinde
      const dummyHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      const fullName = profile.given_name ? `${profile.given_name} ${profile.family_name || ''}`.trim() : profile.email.split('@')[0];
      
      const newUser = await pool.query(
        'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [orgId, fullName, profile.email, dummyHash, 'admin']
      );
      user = newUser.rows[0];

      // Insert into team_members
      await pool.query(
        `INSERT INTO team_members (id, organization_id, name, role, email, avatar, department)
         VALUES ($1, $2, $3, $4, $5, null, 'Administración')`,
        ['admin_' + user.id, orgId, fullName, 'Fundador/Admin', profile.email]
      );
    } else {
      user = userResult.rows[0];
    }
    
    const userRole = user.role || 'admin';
    const token = jwt.sign({ id: user.id, organizationId: user.organization_id, role: userRole, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    
    // Redirect to frontend dashboard with token in URL param
    const frontendUrl = (process.env.KINDE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    res.redirect(`${frontendUrl}/?token=${encodeURIComponent(token)}`);
    
  } catch (err) {
    console.error('Error en el callback de Kinde:', err);
    const frontendUrl = (process.env.KINDE_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    res.redirect(`${frontendUrl}/?error=kinde_auth_failed`);
  }
});

app.get('/api/auth/logout', async (req, res) => {
  try {
    req.session = null;
    
    const logoutUrl = new URL(`${process.env.KINDE_ISSUER_URL}/logout`);
    const redirectUrl = process.env.KINDE_POST_LOGOUT_REDIRECT_URL || 'http://localhost:3000';
    logoutUrl.searchParams.append('redirect', redirectUrl);
    
    res.json({ logoutUrl: logoutUrl.toString() });
  } catch (err) {
    console.error('Error al generar logout:', err);
    res.status(500).json({ error: 'Error al cerrar sesión' });
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

app.get('/api/bootstrap', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const isGuest = req.user.role === 'guest';
    const isAdmin = req.user.role === 'admin';
    const isGerente = req.user.role === 'gerente';

    // 1. Templates query
    let templatesQuery = 'SELECT * FROM templates WHERE organization_id = $1';
    if (!isAdmin && !isGerente) {
      templatesQuery += " AND status = 'approved'";
    }
    const templatesPromise = pool.query(templatesQuery, [orgId]);

    // 2. Instances query
    const instancesPromise = pool.query('SELECT * FROM instances WHERE organization_id = $1 ORDER BY started_at DESC', [orgId]);

    // 3. Clients query
    const clientsPromise = pool.query('SELECT * FROM clients WHERE organization_id = $1 ORDER BY name ASC', [orgId]);

    // 4. Notifications query (logs)
    const logsPromise = pool.query('SELECT * FROM notification_logs WHERE organization_id = $1 ORDER BY logged_at DESC', [orgId]);

    // 5. Team members & users for team
    const teamPromise = pool.query(`
      SELECT t.*, u.password_hash 
      FROM team_members t 
      LEFT JOIN users u ON t.email = u.email AND t.organization_id = u.organization_id
      WHERE t.organization_id = $1 
      ORDER BY t.name ASC
    `, [orgId]);

    const adminsPromise = pool.query("SELECT id, name, email, role, companion_avatar as avatar FROM users WHERE organization_id = $1 AND role = 'admin'", [orgId]);

    // 6. Organization details
    const orgPromise = pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);

    // 7. ClickUp rules query
    const clickupRulesPromise = pool.query(
      'SELECT id, rule_name as "ruleName", clickup_list_id as "clickupListId", clickup_list_name as "clickupListName", clickup_status as "clickupStatus", template_id as "templateId", active, status, title_pattern as "titlePattern" FROM clickup_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [orgId]
    );

    // 8. Admin only: users & api tokens
    const usersPromise = isAdmin 
      ? pool.query('SELECT id, name, email, role, created_at FROM users WHERE organization_id = $1 ORDER BY name ASC', [orgId])
      : Promise.resolve({ rows: [] });

    const developerTokensPromise = isAdmin
      ? pool.query('SELECT id, name, token, created_at, last_used_at FROM api_tokens WHERE organization_id = $1 ORDER BY created_at DESC', [orgId])
      : Promise.resolve({ rows: [] });

    // Execute queries in parallel
    const [
      templatesRes,
      instancesRes,
      clientsRes,
      logsRes,
      teamRes,
      adminsRes,
      orgRes,
      clickupRulesRes,
      usersRes,
      devTokensRes
    ] = await Promise.all([
      templatesPromise,
      instancesPromise,
      clientsPromise,
      logsPromise,
      teamPromise,
      adminsPromise,
      orgPromise,
      clickupRulesPromise,
      usersPromise,
      developerTokensPromise
    ]);

    // Map Templates
    const templatesMapped = templatesRes.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      durationDays: row.duration_days,
      companionName: row.companion_name,
      companionAvatar: row.companion_avatar,
      companionGreeting: row.companion_greeting,
      category: row.category,
      steps: row.steps,
      status: row.status || 'approved'
    }));

    // Map Instances
    let instancesRows = instancesRes.rows;
    if (isGuest) {
      const memberRes = await pool.query('SELECT id FROM team_members WHERE email = $1 AND organization_id = $2', [req.user.email, orgId]);
      const memberId = memberRes.rows[0]?.id;
      instancesRows = instancesRows.filter(row => {
        try {
          const steps = row.steps || [];
          return steps.some(step => step.assignedTo === memberId || step.assignedTo === req.user.email);
        } catch (e) {
          return false;
        }
      });
    }
    const instancesMapped = instancesRows.map(row => ({
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

    // Map logs
    const logsMapped = logsRes.rows.map(row => ({
      id: row.id,
      instanceId: row.instance_id,
      stepId: row.step_id,
      time: row.logged_at,
      instanceName: row.instance_name,
      stepTitle: row.step_title,
      message: row.message
    }));

    // Map team
    const teamMapped = teamRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: row.avatar,
      assignedProcesses: row.assigned_processes || [],
      department: row.department || '',
      managerId: row.manager_id || '',
      geminiApiKey: row.gemini_api_key || '',
      status: row.password_hash === 'INVITED_PENDING' ? 'pending' : 'active',
      isSystem: false
    }));
    const adminUsers = adminsRes.rows
      .filter(row => !teamMapped.some(m => m.email?.toLowerCase() === row.email?.toLowerCase()))
      .map(row => ({
        id: 'admin_' + row.id,
        name: row.name + " (" + row.role + ")",
        role: row.role,
        email: row.email,
        avatar: row.avatar,
        assignedProcesses: [],
        department: 'Administración',
        managerId: '',
        geminiApiKey: '',
        status: 'active',
        isSystem: true
      }));
    const fullTeam = [...adminUsers, ...teamMapped];

    const orgRow = orgRes.rows[0] || {};

    res.json({
      templates: templatesMapped,
      instances: instancesMapped,
      clients: clientsRes.rows,
      notifications: logsMapped,
      team: fullTeam,
      organization: {
        id: orgRow.id,
        name: orgRow.name || '',
        description: orgRow.description || '',
        departments: orgRow.departments || [],
        gemini_api_key: orgRow.gemini_api_key || ''
      },
      clickup: {
        clickupToken: orgRow.clickup_token || '',
        clickupWorkspaceId: orgRow.clickup_workspace_id || ''
      },
      clickupRules: clickupRulesRes.rows,
      users: usersRes.rows,
      apiTokens: devTokensRes.rows
    });

  } catch (err) {
    console.error("Error bootstrapping dashboard:", err);
    res.status(500).json({ error: 'Error al iniciar panel de control' });
  }
});

// 1. Get all templates
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM templates WHERE organization_id = $1';
    const params = [req.user.organizationId];
    if (req.user.role !== 'admin' && req.user.role !== 'gerente') {
      query += " AND status = 'approved'";
    }
    const result = await pool.query(query, params);
    const mapped = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      durationDays: row.duration_days,
      companionName: row.companion_name,
      companionAvatar: row.companion_avatar,
      companionGreeting: row.companion_greeting,
      category: row.category,
      steps: row.steps,
      status: row.status || 'approved'
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
  const status = req.user.role === 'gerente' ? 'pending_approval' : 'approved';
  try {
    await pool.query(
      `INSERT INTO templates (id, organization_id, title, description, duration_days, companion_name, companion_avatar, companion_greeting, category, steps, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, req.user.organizationId, title, description, durationDays, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps), status]
    );
    res.status(201).json({ message: 'Plantilla creada con éxito', status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la plantilla en la base de datos' });
  }
});

// 2b. Update a template
app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, durationDays, companionName, companionAvatar, companionGreeting, category, steps } = req.body;
  const status = req.user.role === 'gerente' ? 'pending_approval' : 'approved';
  try {
    await pool.query(
      `UPDATE templates 
       SET title = $1, description = $2, duration_days = $3, companion_name = $4, companion_avatar = $5, companion_greeting = $6, category = $7, steps = $8, status = $9
       WHERE id = $10 AND organization_id = $11`,
      [title, description, durationDays, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps), status, id, req.user.organizationId]
    );
    res.json({ message: 'Plantilla actualizada con éxito', status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la plantilla en la base de datos' });
  }
});

// Approve/Reject Template
app.put('/api/templates/:id/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden cambiar el estado de aprobación.' });
  }
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'
  if (!['approved', 'rejected', 'pending_approval'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  try {
    const result = await pool.query(
      'UPDATE templates SET status = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
      [status, id, req.user.organizationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json({ message: `Plantilla actualizada a ${status}`, template: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar estado de la plantilla' });
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
        id VARCHAR(255) PRIMARY KEY,
        organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const clientId = 'cli_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now();
    const result = await pool.query(
      'INSERT INTO clients (id, organization_id, name) VALUES ($1, $2, $3) RETURNING *',
      [clientId, req.user.organizationId, name]
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
    
    // Trigger ReactivaLeads if all steps are completed
    if (steps && Array.isArray(steps)) {
      const allCompleted = steps.every(s => s.isCompleted);
      if (allCompleted) {
        // Find instance to get template_id
        const instRes = await pool.query('SELECT template_id FROM instances WHERE id = $1', [id]);
        if (instRes.rows.length > 0) {
          const tId = instRes.rows[0].template_id;
          // Check for active rules
          const rulesRes = await pool.query('SELECT * FROM reactivaleads_rules WHERE konsul_template_id = $1 AND organization_id = $2 AND active = TRUE', [tId, req.user.organizationId]);
          if (rulesRes.rows.length > 0) {
            const orgRes = await pool.query('SELECT reactivaleads_api_key FROM organizations WHERE id = $1', [req.user.organizationId]);
            const rlToken = orgRes.rows[0]?.reactivaleads_api_key;
            
            if (rlToken) {
              // Get the last uploaded file from steps as the prospects file
              let filename = null;
              for (let i = steps.length - 1; i >= 0; i--) {
                if (steps[i].uploadedFileName) {
                  filename = steps[i].uploadedFileName;
                  break;
                }
              }

              for (const rule of rulesRes.rows) {
                try {
                  // Fake a call to ReactivaLeads since we don't parse the Excel in backend here yet
                  // In a real scenario, we'd read the Excel, map rows to JSON prospects, and POST.
                  // For the scope of this frontend-heavy integration, we just call the endpoint.
                  const payload = {
                    filename: filename || "prospectos.xlsx",
                    sheet_name: "Prospectos",
                    mapping: rule.mapping || {},
                    prospects: [] // Kônsul would parse the file here and populate this
                  };
                  
                  await fetch('https://reactivaleads.com/api/v1/executions', {
                    method: 'POST',
                    headers: { 
                      'x-api-key': rlToken,
                      'Authorization': `Bearer ${rlToken}`,
                      'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(payload)
                  });
                  
                  // Log the notification
                  const logId = `rl-auto-${Date.now()}`;
                  await pool.query(
                    `INSERT INTO notification_logs (id, organization_id, instance_id, step_id, instance_name, step_title, message)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [logId, req.user.organizationId, id, 'reactivaleads', tId, 'Automatización RL', `Campaña iniciada en ReactivaLeads (Regla: ${rule.rule_name})`]
                  );
                } catch(e) {
                  console.error("Error triggering ReactivaLeads", e);
                }
              }
            }
          }
        }
      }
    }

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
  const { id, instanceId, stepId, instanceName, stepTitle, message, type = 'message' } = req.body;
  
  let finalMessage = message;
  if (type === 'help') {
    finalMessage = `🤝 [PEDIDO DE AYUDA] ${req.user.name} necesita una mano en el paso "${stepTitle}" del proceso "${instanceName}".`;
  }
  
  try {
    // 1. Insert into notification_logs table (on conflict do nothing)
    await pool.query(
      `INSERT INTO notification_logs (id, organization_id, instance_id, step_id, instance_name, step_title, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [id, req.user.organizationId, instanceId, stepId, instanceName, stepTitle, finalMessage]
    );

    // 2. Determine recipients
    const recipients = new Set();

    if (type === 'help') {
      // Get sender's team member details (department, manager_id)
      const senderRes = await pool.query(
        "SELECT department, manager_id FROM team_members WHERE email = $1 AND organization_id = $2",
        [req.user.email, req.user.organizationId]
      );
      if (senderRes.rows.length > 0) {
        const { department, manager_id } = senderRes.rows[0];
        
        // Add manager
        if (manager_id) {
          const managerUser = await pool.query(
            "SELECT u.id FROM users u JOIN team_members t ON u.email = t.email WHERE t.id = $1 AND u.organization_id = $2",
            [manager_id, req.user.organizationId]
          );
          if (managerUser.rows.length > 0) {
            recipients.add(managerUser.rows[0].id);
          }
        }
        
        // Add department colleagues (excluding sender)
        if (department) {
          const deptUsers = await pool.query(
            "SELECT u.id FROM users u JOIN team_members t ON u.email = t.email WHERE t.department = $1 AND u.organization_id = $2 AND u.id <> $3",
            [department, req.user.organizationId, req.user.id]
          );
          deptUsers.rows.forEach(row => recipients.add(row.id));
        }
      }
    } else {
      // 2.a. Admins of the organization receive all notifications
      const adminsRes = await pool.query(
        "SELECT id FROM users WHERE organization_id = $1 AND role = 'admin'",
        [req.user.organizationId]
      );
      adminsRes.rows.forEach(row => recipients.add(row.id));

      // 2.b. Check the instance steps for assignee and involved members
      const instRes = await pool.query('SELECT steps FROM instances WHERE id = $1', [instanceId]);
      if (instRes.rows.length > 0) {
        const steps = instRes.rows[0].steps || [];
        const assignedMemberIds = new Set();
        steps.forEach(s => {
          if (s.assignedTo) {
            assignedMemberIds.add(s.assignedTo);
          }
        });

        const step = steps.find(s => s.id === stepId || s.title === stepTitle);
        
        // Send email alert to direct assignee (if exists)
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

        // Convert all assigned team member IDs to matching user IDs
        if (assignedMemberIds.size > 0) {
          const memberIdsArr = Array.from(assignedMemberIds);
          const placeholders = memberIdsArr.map((_, idx) => `$${idx + 2}`).join(', ');
          
          const membersEmailsRes = await pool.query(
            `SELECT email FROM team_members WHERE id IN (${placeholders}) AND organization_id = $1`,
            [req.user.organizationId, ...memberIdsArr]
          );
          
          if (membersEmailsRes.rows.length > 0) {
            const emails = membersEmailsRes.rows.map(m => m.email);
            const emailPlaceholders = emails.map((_, idx) => `$${idx + 2}`).join(', ');
            
            const usersRes = await pool.query(
              `SELECT id FROM users WHERE email IN (${emailPlaceholders}) AND organization_id = $1`,
              [req.user.organizationId, ...emails]
            );
            
            usersRes.rows.forEach(row => recipients.add(row.id));
          }
        }
      }
    }

    // 3. Insert notification records for all identified recipients
    for (const userId of recipients) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, instance_id, step_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, finalMessage, instanceId, stepId]
      );
    }

    res.status(201).json({ message: 'Log de notificación registrado y notificaciones despachadas' });
  } catch (err) {
    console.error("Error al registrar notificaciones:", err);
    res.status(500).json({ error: 'Error al registrar la notificación' });
  }
});

// 9. Get all team members
app.get('/api/team', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.password_hash 
      FROM team_members t 
      LEFT JOIN users u ON t.email = u.email AND t.organization_id = u.organization_id
      WHERE t.organization_id = $1 
      ORDER BY t.name ASC
    `, [req.user.organizationId]);
    
    const usersResult = await pool.query("SELECT id, name, email, role, companion_avatar as avatar FROM users WHERE organization_id = $1 AND role = 'admin'", [req.user.organizationId]);
    
    const mapped = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: row.avatar,
      assignedProcesses: row.assigned_processes || [],
      department: row.department || '',
      managerId: row.manager_id || '',
      geminiApiKey: row.gemini_api_key || '',
      status: row.password_hash === 'INVITED_PENDING' ? 'pending' : 'active',
      isSystem: false
    }));

    const adminUsers = usersResult.rows
      .filter(row => !mapped.some(m => m.email?.toLowerCase() === row.email?.toLowerCase()))
      .map(row => ({
      id: 'admin_' + row.id,
      name: row.name + " (" + row.role + ")",
      role: row.role,
      email: row.email,
      avatar: row.avatar,
      assignedProcesses: [],
      department: 'Administración',
      managerId: '',
      geminiApiKey: '',
      status: 'active',
      isSystem: true
    }));

    res.json([...adminUsers, ...mapped]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar miembros del equipo' });
  }
});

// 10. Create a team member
app.post('/api/team', authenticateToken, async (req, res) => {
  const { id, name, role, email, avatar, assignedProcesses, department, managerId, geminiApiKey } = req.body;
  try {
    // 1. Create team member
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

    // 2. Also register a user account with role 'guest' so they can log in
    const userExist = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rows.length === 0) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 24 * 3600000; // 24 hours

      await pool.query(
        `INSERT INTO users (organization_id, name, email, password_hash, role, reset_token, reset_token_expiry)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.organizationId,
          name,
          email,
          'INVITED_PENDING',
          'guest',
          resetToken,
          resetTokenExpiry
        ]
      );

      // Send activation email
      const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';
      const inviteLink = `${origin}/?resetToken=${resetToken}`;
      
      const htmlContent = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="text-align: center; margin-bottom: 2rem;">
            <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style="height: 45px; object-fit: contain;" />
          </div>
          <h2 style="color: #111827; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700; text-align: center;">Te han invitado a Kônsul Process</h2>
          <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; text-align: center; margin-bottom: 1.5rem;">
            Hola <strong>${name}</strong>, has sido invitado a unirte al equipo en Kônsul Process.
          </p>
          <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; text-align: center; margin-bottom: 2rem;">
            Presiona el botón de abajo para activar tu cuenta, definir tu contraseña y empezar a colaborar.
          </p>
          <div style="text-align: center; margin-bottom: 2rem;">
            <a href="${inviteLink}" style="background-color: #27bea7; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem; display: inline-block;">Activar mi Cuenta</a>
          </div>
          <p style="color: #9ca3af; font-size: 0.85rem; line-height: 1.5; text-align: center; margin-top: 2rem;">
            Este enlace expira en 24 horas.
          </p>
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
          <p style="color: #9ca3af; font-size: 0.8rem; text-align: center; margin: 0;">
            Kônsul Process &copy; 2026. Todos los derechos reservados.
          </p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: 'Invitación a unirte a Kônsul Process',
        html: htmlContent
      });
    }

    res.status(201).json({ message: 'Miembro del equipo creado con éxito e invitación enviada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear miembro del equipo' });
  }
});

// 11. Update a team member

app.post('/api/team/:id/resend-invite', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const memberRes = await pool.query('SELECT name, email FROM team_members WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    if (memberRes.rows.length === 0) return res.status(404).json({ error: 'Miembro no encontrado' });
    
    const { name, email } = memberRes.rows[0];
    const userExist = await pool.query("SELECT id FROM users WHERE email = $1 AND password_hash = 'INVITED_PENDING'", [email]);
    
    if (userExist.rows.length === 0) {
      return res.status(400).json({ error: 'El usuario ya está activo o no existe.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 24 * 3600000; // 24 hours

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
      [resetToken, resetTokenExpiry, email]
    );

    const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';
    const inviteLink = `${origin}/?resetToken=${resetToken}`;
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <img src="https://konsul.digital/images/Konsul%20logo%20general.png" alt="Kônsul Logo" style="height: 45px; object-fit: contain;" />
        </div>
        <h2 style="color: #111827; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 700; text-align: center;">Te han invitado a Kônsul Process (Recordatorio)</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; text-align: center; margin-bottom: 1.5rem;">
          Hola <strong>${name}</strong>, te recordamos que tienes una invitación pendiente para unirte al equipo en Kônsul Process.
        </p>
        <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; text-align: center; margin-bottom: 2rem;">
          Presiona el botón de abajo para activar tu cuenta, definir tu contraseña y empezar a colaborar.
        </p>
        <div style="text-align: center; margin-bottom: 2rem;">
          <a href="${inviteLink}" style="background-color: #27bea7; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1rem; display: inline-block;">Activar mi Cuenta</a>
        </div>
        <p style="color: #9ca3af; font-size: 0.85rem; line-height: 1.5; text-align: center; margin-top: 2rem;">
          Este enlace expira en 24 horas.
        </p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #9ca3af; font-size: 0.8rem; text-align: center; margin: 0;">
          Kônsul Process &copy; 2026. Todos los derechos reservados.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Recordatorio: Invitación a unirte a Kônsul Process',
      html: htmlContent
    });

    res.json({ message: 'Invitación reenviada con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reenviar invitación' });
  }
});

app.put('/api/team/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, role, email, avatar, assignedProcesses, department, managerId, geminiApiKey } = req.body;
  try {
    // Also update in users table if they exist (sync email/name changes)
    const oldMemberRes = await pool.query('SELECT email FROM team_members WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    if (oldMemberRes.rows.length > 0) {
      const oldEmail = oldMemberRes.rows[0].email;
      await pool.query('UPDATE users SET email = $1, name = $2 WHERE email = $3 AND organization_id = $4', [email, name, oldEmail, req.user.organizationId]);
    }

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

// 12. Delete a team member
app.delete('/api/team/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { id } = req.params;
  try {
    const memberRes = await pool.query('SELECT email FROM team_members WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    if (memberRes.rows.length > 0) {
      const email = memberRes.rows[0].email;
      await pool.query('DELETE FROM users WHERE email = $1 AND organization_id = $2', [email, req.user.organizationId]);
    }
    
    await pool.query('DELETE FROM team_members WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    res.json({ message: 'Miembro del equipo eliminado con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar miembro del equipo.' });
  }
});

// --- USER MANAGEMENT & PROFILE ROUTES (RBAC & CONFIGURATION) ---

// Get all users of the organization
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  try {
    // Self-healing: Ensure all team members have a corresponding user account
    const teamMembersRes = await pool.query(
      'SELECT name, email FROM team_members WHERE organization_id = $1',
      [req.user.organizationId]
    );
    for (const member of teamMembersRes.rows) {
      const uExist = await pool.query('SELECT id FROM users WHERE email = $1', [member.email]);
      if (uExist.rows.length === 0) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 24 * 3600000;
        await pool.query(
          `INSERT INTO users (organization_id, name, email, password_hash, role, reset_token, reset_token_expiry)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [req.user.organizationId, member.name, member.email, 'INVITED_PENDING', 'guest', resetToken, resetTokenExpiry]
        );
      }
    }

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

// Update user role
app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'gerente', 'agent', 'guest'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido.' });
  }

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 AND organization_id = $3 RETURNING id, name, email, role',
      [role, id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Rol de usuario actualizado con éxito.', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el rol del usuario.' });
  }
});

// Update self profile

app.put('/api/auth/email-settings', authenticateToken, async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, imap_secure } = req.body;
  try {
    const query = `
      UPDATE users 
      SET smtp_host = $1, smtp_port = $2, smtp_user = $3, smtp_pass = $4, imap_host = $5, imap_port = $6, imap_secure = $7
      WHERE id = $8
      RETURNING id, name, email, organization_id, role, companion_name, companion_avatar,
                smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, imap_secure
    `;
    const result = await pool.query(query, [smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, imap_secure, req.user.id]);
    
    const user = result.rows[0];
    res.json({ 
      user: { 
        id: user.id, name: user.name, email: user.email, organizationId: user.organization_id, role: user.role,
        companionName: user.companion_name, companionAvatar: user.companion_avatar,
        smtp_host: user.smtp_host, smtp_port: user.smtp_port, smtp_user: user.smtp_user, smtp_pass: user.smtp_pass,
        imap_host: user.imap_host, imap_port: user.imap_port, imap_secure: user.imap_secure
      } 
    });
  } catch (err) {
    console.error('Error al actualizar config de correo:', err);
    res.status(500).json({ error: 'Error al actualizar configuración de correo', details: err.message });
  }
});

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
    // Ensure column exists
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255)');
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.user.organizationId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organización no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar organización.' });
  }
});

// Update organization details
app.put('/api/organization', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { name, gemini_api_key, description, departments } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
  }
  try {
    // Ensure column exists
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255)');
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT');
    await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]'::jsonb");
    
    await pool.query(
      'UPDATE organizations SET name = $1, gemini_api_key = $2, description = $3, departments = $4 WHERE id = $5',
      [
        name, 
        gemini_api_key !== undefined ? gemini_api_key : null, 
        description || null, 
        departments ? JSON.stringify(departments) : '[]', 
        req.user.organizationId
      ]
    );
    res.json({ message: 'Organización actualizada con éxito.' });
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

// Test SMTP and IMAP/POP connection settings (Stateless, zero server-resource storage)
app.post('/api/email/test-connection', authenticateToken, async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, imapHost, imapPort, imapSecure } = req.body;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios de SMTP.' });
  }

  try {
    // 1. Test SMTP Connection
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectTimeout: 5000
    });

    await transporter.verify();

    // 2. Test IMAP Connection (if provided) using light TCP/TLS socket
    let imapOk = true;
    let imapError = null;
    if (imapHost && imapPort) {
      try {
        await new Promise((resolve, reject) => {
          const isSecure = imapSecure === true || parseInt(imapPort) === 993;
          const socket = (isSecure ? tls : net).connect({
            host: imapHost,
            port: parseInt(imapPort),
            timeout: 5000,
            rejectUnauthorized: false
          }, () => {
            socket.end();
            resolve();
          });
          socket.on('error', reject);
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Tiempo de espera agotado'));
          });
        });
      } catch (err) {
        imapOk = false;
        imapError = err.message;
      }
    }

    if (!imapOk) {
      return res.status(400).json({ 
        success: false, 
        error: `Conexión SMTP exitosa, pero falló la conexión IMAP: ${imapError}` 
      });
    }

    res.json({ success: true, message: 'Conexiones SMTP e IMAP verificadas correctamente.' });
  } catch (err) {
    console.error('Error al probar conexión de email:', err);
    res.status(500).json({ success: false, error: `Error de conexión: ${err.message}` });
  }
});

// Send email using user-provided SMTP credentials (stateless relay)
app.post('/api/email/send-email', authenticateToken, async (req, res) => {
  const { smtpSettings, to, subject, html, text } = req.body;

  if (!smtpSettings || !to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios para enviar el correo.' });
  }

  const { smtpHost, smtpPort, smtpUser, smtpPass } = smtpSettings;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Configuración SMTP incompleta.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: `"${req.user.name || 'Kônsul User'}" <${smtpUser}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Error al enviar correo vía SMTP del usuario:', err);
    res.status(500).json({ error: `Fallo al enviar correo: ${err.message}` });
  }
});

// CLICKUP INTEGRATION ENDPOINTS
// ==========================================

// Get ClickUp Settings
app.get('/api/organization/clickup', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT clickup_token, clickup_workspace_id FROM organizations WHERE id = $1',
      [req.user.organizationId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organización no encontrada' });
    res.json({
      clickupToken: result.rows[0].clickup_token || '',
      clickupWorkspaceId: result.rows[0].clickup_workspace_id || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar configuración de ClickUp' });
  }
});

// Update ClickUp Settings
app.put('/api/organization/clickup', authenticateToken, async (req, res) => {
  const { clickupToken, clickupWorkspaceId } = req.body;
  try {
    await pool.query(
      'UPDATE organizations SET clickup_token = $1, clickup_workspace_id = $2 WHERE id = $3',
      [clickupToken || null, clickupWorkspaceId || null, req.user.organizationId]
    );
    res.json({ message: 'Configuración de ClickUp guardada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar configuración de ClickUp' });
  }
});

// Submit On Demand Integration Request
app.post('/api/ondemand-request', authenticateToken, async (req, res) => {
  const { toolName, useCase } = req.body;
  
  if (!toolName || !useCase) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    const userEmail = req.user.email;
    
    // Optional: fetch user name from db
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userName = userRes.rows.length > 0 ? userRes.rows[0].name : 'Usuario';
    
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #27bea7;">Nueva Solicitud de Integración On Demand</h2>
        <p><strong>Usuario:</strong> ${userName} (${userEmail})</p>
        <p><strong>Herramienta a conectar:</strong> ${toolName}</p>
        <p><strong>Caso de uso:</strong> ${useCase}</p>
      </div>
    `;

    await sendEmail({
      to: 'somos@konsul.digital',
      subject: 'Solicitud de Integración On Demand - Kônsul',
      html: htmlContent
    });

    res.json({ message: 'Solicitud enviada con éxito. Nos pondremos en contacto pronto.' });
  } catch (err) {
    console.error('Error al enviar solicitud on demand:', err);
    res.status(500).json({ error: 'Error al enviar la solicitud.' });
  }
});

// Get ClickUp Workspaces/Teams
app.get('/api/integrations/clickup/teams', authenticateToken, async (req, res) => {
  try {
    const orgRes = await pool.query("SELECT clickup_token FROM organizations WHERE id = $1", [req.user.organizationId]);
    const token = orgRes.rows[0]?.clickup_token;
    if (!token) return res.status(400).json({ error: 'ClickUp no está conectado (falta token)' });

    const response = await fetch('https://api.clickup.com/api/v2/team', {
      headers: { 'Authorization': token }
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `ClickUp API Error: ${errText}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener equipos de ClickUp' });
  }
});

// Get ClickUp Spaces for a Team/Workspace
app.get('/api/integrations/clickup/spaces', authenticateToken, async (req, res) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id es requerido' });
  try {
    const orgRes = await pool.query("SELECT clickup_token FROM organizations WHERE id = $1", [req.user.organizationId]);
    const token = orgRes.rows[0]?.clickup_token;
    if (!token) return res.status(400).json({ error: 'ClickUp no está conectado' });

    const response = await fetch(`https://api.clickup.com/api/v2/team/${team_id}/space`, {
      headers: { 'Authorization': token }
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `ClickUp API Error: ${errText}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener espacios de ClickUp' });
  }
});

// Get ClickUp Folders & Folderless Lists for a Space
app.get('/api/integrations/clickup/folders-and-lists', authenticateToken, async (req, res) => {
  const { space_id } = req.query;
  if (!space_id) return res.status(400).json({ error: 'space_id es requerido' });
  try {
    const orgRes = await pool.query("SELECT clickup_token FROM organizations WHERE id = $1", [req.user.organizationId]);
    const token = orgRes.rows[0]?.clickup_token;
    if (!token) return res.status(400).json({ error: 'ClickUp no está conectado' });

    // Fetch folders
    const foldersRes = await fetch(`https://api.clickup.com/api/v2/space/${space_id}/folder`, {
      headers: { 'Authorization': token }
    });
    let folders = [];
    if (foldersRes.ok) {
      const foldersData = await foldersRes.json();
      folders = foldersData.folders || [];
    }

    // Fetch folderless lists
    const listsRes = await fetch(`https://api.clickup.com/api/v2/space/${space_id}/list`, {
      headers: { 'Authorization': token }
    });
    let folderlessLists = [];
    if (listsRes.ok) {
      const listsData = await listsRes.json();
      folderlessLists = listsData.lists || [];
    }

    res.json({ folders, folderlessLists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener carpetas y listas de ClickUp' });
  }
});

// Get ClickUp Lists in a Folder
app.get('/api/integrations/clickup/lists', authenticateToken, async (req, res) => {
  const { folder_id } = req.query;
  if (!folder_id) return res.status(400).json({ error: 'folder_id es requerido' });
  try {
    const orgRes = await pool.query("SELECT clickup_token FROM organizations WHERE id = $1", [req.user.organizationId]);
    const token = orgRes.rows[0]?.clickup_token;
    if (!token) return res.status(400).json({ error: 'ClickUp no está conectado' });

    const response = await fetch(`https://api.clickup.com/api/v2/folder/${folder_id}/list`, {
      headers: { 'Authorization': token }
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `ClickUp API Error: ${errText}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener listas de ClickUp' });
  }
});

// Get ClickUp List details (including statuses)
app.get('/api/integrations/clickup/list-details', authenticateToken, async (req, res) => {
  const { list_id } = req.query;
  if (!list_id) return res.status(400).json({ error: 'list_id es requerido' });
  try {
    const orgRes = await pool.query("SELECT clickup_token FROM organizations WHERE id = $1", [req.user.organizationId]);
    const token = orgRes.rows[0]?.clickup_token;
    if (!token) return res.status(400).json({ error: 'ClickUp no está conectado' });

    const response = await fetch(`https://api.clickup.com/api/v2/list/${list_id}`, {
      headers: { 'Authorization': token }
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `ClickUp API Error: ${errText}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalles de la lista de ClickUp' });
  }
});

// Get Rules
app.get('/api/integrations/clickup/rules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, rule_name as "ruleName", clickup_list_id as "clickupListId", clickup_list_name as "clickupListName", clickup_status as "clickupStatus", template_id as "templateId", active, status, title_pattern as "titlePattern" FROM clickup_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.organizationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al recuperar reglas de ClickUp' });
  }
});

// Create Rule
app.post('/api/integrations/clickup/rules', authenticateToken, async (req, res) => {
  const { ruleName, clickupListId, clickupListName, clickupStatus, templateId } = req.body;
  const status = req.user.role === 'gerente' ? 'pending_approval' : 'approved';
  try {
    const result = await pool.query(
      `INSERT INTO clickup_rules (organization_id, rule_name, clickup_list_id, clickup_list_name, clickup_status, template_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, rule_name as "ruleName", clickup_list_id as "clickupListId", clickup_list_name as "clickupListName", clickup_status as "clickupStatus", template_id as "templateId", active, status, title_pattern as "titlePattern"`,
      [req.user.organizationId, ruleName, clickupListId, clickupListName, clickupStatus, templateId, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar regla de ClickUp' });
  }
});

// Update Rule Configuration (e.g. titlePattern)
app.put('/api/integrations/clickup/rules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { titlePattern } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clickup_rules 
       SET title_pattern = $1 
       WHERE id = $2 AND organization_id = $3
       RETURNING id, rule_name as "ruleName", clickup_list_id as "clickupListId", clickup_list_name as "clickupListName", clickup_status as "clickupStatus", template_id as "templateId", active, status, title_pattern as "titlePattern"`,
      [titlePattern, id, req.user.organizationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar configuración de la regla' });
  }
});

// Approve/Reject Clickup Rule
app.put('/api/integrations/clickup/rules/:id/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden cambiar el estado de aprobación.' });
  }
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending_approval'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  try {
    const result = await pool.query(
      'UPDATE clickup_rules SET status = $1 WHERE id = $2 AND organization_id = $3 RETURNING id, rule_name as "ruleName", clickup_list_id as "clickupListId", clickup_list_name as "clickupListName", clickup_status as "clickupStatus", template_id as "templateId", active, status',
      [status, id, req.user.organizationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }
    res.json({ message: `Regla de ClickUp actualizada a ${status}`, rule: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar estado de la regla' });
  }
});

// Delete Rule
app.delete('/api/integrations/clickup/rules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'DELETE FROM clickup_rules WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );
    res.json({ message: 'Regla eliminada con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar regla de ClickUp' });
  }
});

// Webhook Receiver (ClickUp calls this)
app.post('/api/webhooks/clickup', async (req, res) => {
  const { event, task_id } = req.body;
  
  if (event !== 'taskStatusUpdated' || !task_id) {
    return res.status(200).json({ message: 'Evento no procesado o sin id de tarea' });
  }

  try {
    // 1. Find organizations that have a ClickUp Token and active rules
    const activeOrgsRes = await pool.query(
      `SELECT DISTINCT o.id, o.clickup_token 
       FROM organizations o
       JOIN clickup_rules r ON o.id = r.organization_id
       WHERE o.clickup_token IS NOT NULL AND r.active = TRUE AND (r.status = 'approved' OR r.status IS NULL)`
    );

    if (activeOrgsRes.rows.length === 0) {
      return res.status(200).json({ message: 'No hay reglas activas configuradas' });
    }

    // Try to fetch task details from ClickUp using one of the tokens
    let taskData = null;
    
    for (const org of activeOrgsRes.rows) {
      try {
        const clickupRes = await fetch(`https://api.clickup.com/api/v2/task/${task_id}`, {
          headers: { 'Authorization': org.clickup_token }
        });
        if (clickupRes.ok) {
          taskData = await clickupRes.json();
          break; // Found it!
        }
      } catch (err) {
        console.error(`Error querying task with token for org ${org.id}:`, err);
      }
    }

    if (!taskData || !taskData.list?.id) {
      return res.status(200).json({ message: 'No se pudo obtener detalles de la tarea desde ClickUp' });
    }

    const listId = taskData.list.id;
    const taskStatus = taskData.status?.status;
    const taskName = taskData.name;

    // Find rules for this specific listId and status
    const rulesRes = await pool.query(
      `SELECT * FROM clickup_rules 
       WHERE clickup_list_id = $1 AND LOWER(clickup_status) = LOWER($2) AND active = TRUE AND (status = 'approved' OR status IS NULL)`,
      [listId, taskStatus]
    );

    if (rulesRes.rows.length === 0) {
      return res.status(200).json({ message: 'Ninguna regla coincide con el estado o la lista de la tarea' });
    }

    for (const rule of rulesRes.rows) {
      // Create a process execution based on the rule's template
      const templateRes = await pool.query(
        "SELECT * FROM templates WHERE id = $1 AND organization_id = $2 AND (status = 'approved' OR status IS NULL)",
        [rule.template_id, rule.organization_id]
      );

      if (templateRes.rows.length > 0) {
        const template = templateRes.rows[0];
        const startedAt = new Date().toISOString();
        const instanceId = `inst_clickup_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        
        // Calculate offset steps
        const steps = (template.steps || []).map((step, idx) => {
          const dueDate = new Date(startedAt);
          dueDate.setDate(dueDate.getDate() + (step.relativeOffsetDays || 0));
          return {
            ...step,
            id: `step_run_${idx}_${Date.now()}`,
            dueDate,
            isCompleted: false,
            completedAt: null,
            uploadedFileName: null
          };
        });

        // Construct instance name using title_pattern
        let instanceName = rule.title_pattern || '{template_title} - {task_name}';
        instanceName = instanceName
          .replace(/{task_name}/g, taskName || '')
          .replace(/{template_title}/g, template.title || '')
          .replace(/{list_name}/g, rule.clickup_list_name || '')
          .replace(/{task_id}/g, task_id || '');

        // Insert new instance
        await pool.query(
          `INSERT INTO instances (id, organization_id, template_id, title, instance_name, started_at, companion_name, companion_avatar, companion_greeting, category, steps)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            instanceId,
            rule.organization_id,
            template.id,
            template.title,
            instanceName,
            startedAt,
            template.companion_name || 'Lumi',
            template.companion_avatar || '✨',
            template.companion_greeting || 'Hola!',
            template.category,
            JSON.stringify(steps)
          ]
        );

        // Notify Admins
        const message = `Ejecución automática de proceso "${template.title} - ${taskName}" iniciada con éxito desde ClickUp.`;
        
        // Find Admins of this org
        const adminsRes = await pool.query(
          "SELECT id FROM users WHERE organization_id = $1 AND role = 'admin'",
          [rule.organization_id]
        );

        // Insert notification log
        const logId = `clickup-auto-${instanceId}`;
        await pool.query(
          `INSERT INTO notification_logs (id, organization_id, instance_id, step_id, instance_name, step_title, message)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [logId, rule.organization_id, instanceId, 'clickup', `${template.title} - ${taskName}`, 'ClickUp Webhook', message]
        );

        // Send notification to each admin
        for (const admin of adminsRes.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, message, instance_id)
             VALUES ($1, $2, $3, $4)`,
            [admin.id, 'message', message, instanceId]
          );
        }
      }
    }

    res.status(200).json({ message: 'Automatización completada con éxito' });
  } catch (err) {
    console.error('Error in ClickUp webhook processing:', err);
    res.status(500).json({ error: 'Server error processing webhook' });
  }
});

// Test ClickUp Connection
app.post('/api/integrations/clickup/test', authenticateToken, async (req, res) => {
  const { token } = req.body;
  try {
    const clickupRes = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { 'Authorization': token }
    });
    if (clickupRes.ok) {
      const data = await clickupRes.json();
      res.json({ success: true, username: data.user?.username });
    } else {
      res.status(400).json({ error: 'Token de ClickUp inválido o expirado.' });
    }
  } catch (err) {
    console.error('Error testing ClickUp connection:', err);
    res.status(500).json({ error: 'Error de red al conectar con ClickUp' });
  }
});


// ==========================================
// REACTIVALEADS INTEGRATION
// ==========================================

app.post('/api/integrations/reactivaleads/test', authenticateToken, async (req, res) => {
  const { token } = req.body;
  try {
    const rlRes = await fetch('https://reactivaleads.com/api/v1/templates', {
      headers: { 
        'x-api-key': token,
        'Authorization': `Bearer ${token}`
      }
    });
    if (rlRes.ok) {
      res.json({ success: true });
    } else {
      const errText = await rlRes.text();
      console.error('ReactivaLeads test failed:', rlRes.status, errText);
      res.status(400).json({ error: `ReactivaLeads API respondió con estado ${rlRes.status}: ${errText.substring(0, 100)}` });
    }
  } catch (err) {
    console.error('Error testing ReactivaLeads connection:', err);
    res.status(500).json({ error: `Error de red al conectar con ReactivaLeads: ${err.message}` });
  }
});

app.post('/api/integrations/reactivaleads/token', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
  const { token } = req.body;
  try {
    await pool.query(
      'UPDATE organizations SET reactivaleads_api_key = $1 WHERE id = $2',
      [token || null, req.user.organizationId]
    );
    res.json({ message: 'Token de ReactivaLeads guardado con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el token.' });
  }
});

app.get('/api/integrations/reactivaleads/templates', authenticateToken, async (req, res) => {
  try {
    const orgRes = await pool.query('SELECT reactivaleads_api_key FROM organizations WHERE id = $1', [req.user.organizationId]);
    const token = orgRes.rows[0]?.reactivaleads_api_key;
    if (!token) return res.status(400).json({ error: 'No hay token configurado' });

    const rlRes = await fetch('https://reactivaleads.com/api/v1/templates', {
      headers: { 
        'x-api-key': token,
        'Authorization': `Bearer ${token}`
      }
    });
    if (rlRes.ok) {
      const data = await rlRes.json();
      res.json(data);
    } else {
      const errText = await rlRes.text();
      console.error('ReactivaLeads templates fetch failed:', rlRes.status, errText);
      res.status(400).json({ error: `Error de ReactivaLeads (estado ${rlRes.status}): ${errText.substring(0, 100)}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Error interno al obtener plantillas: ${err.message}` });
  }
});

app.get('/api/integrations/reactivaleads/rules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reactivaleads_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.organizationId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reglas' });
  }
});

app.post('/api/integrations/reactivaleads/rules', authenticateToken, async (req, res) => {
  const { ruleName, konsulTemplateId, reactivaleadsTemplateId, mapping } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO reactivaleads_rules (organization_id, rule_name, konsul_template_id, reactivaleads_template_id, mapping) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.organizationId, ruleName, konsulTemplateId, reactivaleadsTemplateId, JSON.stringify(mapping)]
    );
    res.json({ message: 'Regla creada', rule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear regla' });
  }
});

app.delete('/api/integrations/reactivaleads/rules/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM reactivaleads_rules WHERE id = $1 AND organization_id = $2', [req.params.id, req.user.organizationId]);
    res.json({ message: 'Regla eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar regla' });
  }
});


// Developer Token Management API
app.get('/api/developer/tokens', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden gestionar llaves de API.' });
  try {
    const result = await pool.query(
      'SELECT id, name, token, created_at, last_used_at FROM api_tokens WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.organizationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener llaves de API.' });
  }
});

app.post('/api/developer/tokens', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden gestionar llaves de API.' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre de la llave es requerido.' });
  
  try {
    const key = 'kp_' + crypto.randomBytes(24).toString('hex');
    
    const result = await pool.query(
      'INSERT INTO api_tokens (organization_id, name, token) VALUES ($1, $2, $3) RETURNING id, name, token, created_at',
      [req.user.organizationId, name, key]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear llave de API.' });
  }
});

app.delete('/api/developer/tokens/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden gestionar llaves de API.' });
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM api_tokens WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, req.user.organizationId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Llave de API no encontrada.' });
    res.json({ message: 'Llave de API revocada con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al revocar llave de API.' });
  }
});

// --- PUBLIC DEVELOPER API V1 ---

// Get all templates for the organization
app.get('/api/v1/templates', authenticateApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM templates WHERE organization_id = $1 AND status = 'approved'",
      [req.user.organizationId]
    );
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

// Create/trigger a new process execution (instance)
app.post('/api/v1/executions', authenticateApiKey, async (req, res) => {
  const { templateId, instanceName } = req.body;
  if (!templateId || !instanceName) {
    return res.status(400).json({ error: 'El templateId e instanceName son requeridos.' });
  }

  try {
    const templateRes = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND organization_id = $2',
      [templateId, req.user.organizationId]
    );

    if (templateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada o no pertenece a tu organización.' });
    }

    const template = templateRes.rows[0];
    const instId = 'inst_' + crypto.randomBytes(12).toString('hex');
    const startedAt = new Date().toISOString();
    
    // Map dates to template steps
    const stepsWithDates = template.steps.map((step, idx) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (step.durationDays || 1));
      return {
        id: step.id || `step_${idx + 1}`,
        label: step.label,
        type: step.type || 'text',
        assignedTo: step.assignedTo || 'Unassigned',
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        dueDate: dueDate.toISOString(),
        options: step.options || []
      };
    });

    await pool.query(
      `INSERT INTO instances (id, organization_id, template_id, title, instance_name, started_at, companion_name, companion_avatar, companion_greeting, category, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        instId,
        req.user.organizationId,
        templateId,
        template.title,
        instanceName,
        startedAt,
        template.companion_name,
        template.companion_avatar,
        template.companion_greeting,
        template.category,
        JSON.stringify(stepsWithDates)
      ]
    );

    res.status(201).json({
      message: 'Ejecución iniciada con éxito programáticamente',
      id: instId,
      title: template.title,
      instanceName,
      startedAt,
      steps: stepsWithDates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar la ejecución programáticamente' });
  }
});

// Get execution status/details
app.get('/api/v1/executions/:id', authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM instances WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ejecución no encontrada.' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      templateId: row.template_id,
      title: row.title,
      instanceName: row.instance_name,
      startedAt: row.started_at,
      companionName: row.companion_name,
      category: row.category,
      steps: row.steps
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalles del proceso' });
  }
});

export default app;
