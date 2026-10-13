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
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 2000
});

// Run auto-migration for user columns
(async () => {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_name VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS companion_avatar VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry BIGINT`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255)`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clickup_token VARCHAR(255)`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clickup_workspace_id VARCHAR(100)`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reactivaleads_api_key VARCHAR(255)`,
    
    `CREATE TABLE IF NOT EXISTS reactivaleads_rules (
      id SERIAL PRIMARY KEY,
      organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
      rule_name VARCHAR(255) NOT NULL,
      konsul_template_id VARCHAR(100) NOT NULL,
      reactivaleads_template_id VARCHAR(100) NOT NULL,
      mapping JSONB,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR(255) PRIMARY KEY,
      organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(100)`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS stage VARCHAR(100) DEFAULT 'Nuevo'`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb`,

    `CREATE TABLE IF NOT EXISTS clickup_rules (
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
    )`,

    `CREATE TABLE IF NOT EXISTS api_tokens (
      id SERIAL PRIMARY KEY,
      organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMPTZ
    )`,

    `CREATE TABLE IF NOT EXISTS notification_logs (
      id VARCHAR(255) PRIMARY KEY,
      organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
      instance_id VARCHAR(100),
      step_id VARCHAR(100),
      instance_name VARCHAR(255),
      step_title VARCHAR(255),
      message TEXT,
      logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) DEFAULT 'message',
      message TEXT NOT NULL,
      instance_id VARCHAR(255),
      step_id VARCHAR(100),
      read BOOLEAN DEFAULT FALSE,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,

    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS step_id VARCHAR(100)`,
    `ALTER TABLE notifications ALTER COLUMN instance_id TYPE VARCHAR(255) USING instance_id::varchar`,
    `ALTER TABLE templates ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved'`,
    `ALTER TABLE templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE clickup_rules ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved'`,
    `ALTER TABLE clickup_rules ADD COLUMN IF NOT EXISTS title_pattern VARCHAR(255) DEFAULT '{template_title} - {task_name}'`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kanban_columns JSONB DEFAULT '["Por hacer", "En curso", "Terminado"]'::jsonb`,
    `ALTER TABLE instances ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'Por hacer'`,
    `ALTER TABLE instances ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Media'`,
    `ALTER TABLE instances ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE instances ADD COLUMN IF NOT EXISTS client_id VARCHAR(255)`,
    `ALTER TABLE instances ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255)`,
    `ALTER TABLE instances ADD COLUMN IF NOT EXISTS drive_folder_url TEXT`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255)`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_folder_url TEXT`,
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS google_drive_config JSONB DEFAULT '{}'::jsonb`,
    `CREATE TABLE IF NOT EXISTS google_drive_rules (
      id SERIAL PRIMARY KEY,
      organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
      rule_name VARCHAR(255) NOT NULL,
      drive_folder_id VARCHAR(255) NOT NULL,
      drive_folder_name VARCHAR(255) NOT NULL,
      file_type_filter VARCHAR(100) DEFAULT 'any',
      template_id VARCHAR(100) NOT NULL,
      title_pattern VARCHAR(255) DEFAULT '{template_title} - {file_name}',
      active BOOLEAN DEFAULT TRUE,
      status VARCHAR(50) DEFAULT 'approved',
      last_checked_at TIMESTAMPTZ,
      processed_file_ids JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS kinde_id VARCHAR(255)`,
    `CREATE INDEX IF NOT EXISTS idx_instances_org ON instances(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_instances_client ON instances(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_domain_unique ON organizations (LOWER(TRIM(domain))) WHERE domain IS NOT NULL AND TRIM(domain) <> ''`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique ON users (LOWER(TRIM(email)))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email_lower_unique ON team_members (LOWER(TRIM(email))) WHERE email IS NOT NULL AND TRIM(email) <> ''`,
    
    `INSERT INTO team_members (id, organization_id, name, role, email, avatar, department)
     SELECT 'admin_' || id, organization_id, name, 'Fundador/Admin', email, companion_avatar, 'Administración'
     FROM users 
     WHERE role = 'admin' AND LOWER(TRIM(email)) NOT IN (SELECT LOWER(TRIM(email)) FROM team_members WHERE email IS NOT NULL)`
  ];

  for (const q of migrations) {
    try {
      await pool.query(q);
    } catch (err) {
      console.warn('Migration step failed:', q.substring(0, 80) + '...', err.message);
    }
  }
  console.log('Migración de base de datos completada: columnas y tablas aseguradas.');
})();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// --- EMAIL SERVICES (KÔNSUL MAILING AWS SES + RESEND FALLBACK) ---
const sendEmail = async ({ to, subject, html, senderName }) => {
  if (!to) return false;
  const mailingUrl = process.env.MAILING_URL || process.env.NEXT_PUBLIC_MAILING_URL || 'https://mailing.konsul.digital';
  const internalKey = process.env.INTERNAL_API_KEY || process.env.KONSUL_ECOSYSTEM_SECRET_KEY || 'konsul_ecosystem_secret_key';
  const resolvedSenderName = senderName || 'Kônsul Process';

  // 1. Primary: Kônsul Mailing Transactional API (AWS SES with verified konsul.digital domain)
  try {
    const mailingRes = await fetch(`${mailingUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': internalKey
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        senderEmail: process.env.SES_SENDER_EMAIL || 'notificaciones@konsul.digital',
        senderName: resolvedSenderName
      })
    });

    if (mailingRes.ok) {
      console.log(`[Email] Correo enviado con éxito vía Kônsul Mailing (AWS SES) a: ${to}`);
      return true;
    } else {
      const errBody = await mailingRes.text();
      console.warn(`[Email] Kônsul Mailing respondió ${mailingRes.status}: ${errBody}`);
    }
  } catch (mailingErr) {
    console.warn(`[Email] Error conectando con Kônsul Mailing (${mailingErr.message}), intentando Resend...`);
  }

  // 2. Fallback: Resend API
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n======================================================`);
    console.log(`⚠️ SIMULACIÓN DE CORREO (Sin proveedor activo)`);
    console.log(`   Destinatario: ${to}`);
    console.log(`   Asunto: ${subject}`);
    console.log(`======================================================\n`);
    return false;
  }

  try {
    let response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${resolvedSenderName} <somos@konsul.digital>`,
        to,
        subject,
        html
      })
    });

    if (!response.ok && response.status === 403) {
      // Fallback sender if konsul.digital is not verified on this Resend key
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${resolvedSenderName} <onboarding@resend.dev>`,
          to,
          subject,
          html
        })
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de Resend API al enviar email:', errText);
      return false;
    } else {
      console.log(`Email enviado con éxito vía Resend a: ${to}`);
      return true;
    }
  } catch (err) {
    console.error('Error de red al conectar con Resend:', err);
    return false;
  }
};

// Helper to notify Suite Automations engine across any SaaS workspace/user
const triggerProcessAutomation = async (triggerName, user, data = {}) => {
  try {
    const suiteUrl = process.env.SUITE_URL || 'https://suite.konsul.digital';
    let userEmail = (user?.email && user.email !== 'api-caller@konsul.digital') ? user.email : '';
    let kindeId = user?.kinde_id || '';

    if (user?.organizationId) {
      const uRes = await pool.query(
        `SELECT email, kinde_id FROM users
         WHERE organization_id = $1
         ORDER BY
           CASE WHEN LOWER(TRIM(email)) = LOWER(TRIM($2)) THEN 0 ELSE 1 END,
           CASE WHEN kinde_id IS NOT NULL AND kinde_id <> '' THEN 0 ELSE 1 END,
           role = 'admin' DESC,
           id ASC
         LIMIT 1`,
        [user.organizationId, userEmail]
      );
      if (uRes.rows.length > 0) {
        if (!userEmail) userEmail = uRes.rows[0].email || '';
        if (!kindeId) kindeId = uRes.rows[0].kinde_id || '';
      }
    }

    const userIdentifier = kindeId || userEmail || user?.id;
    if (!userIdentifier) return;

    fetch(`${suiteUrl}/api/v1/automations/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userEmail ? { 'x-user-email': userEmail } : {}),
        ...(kindeId ? { 'x-user-id': kindeId } : {})
      },
      body: JSON.stringify({
        appCode: 'process',
        triggerName,
        userId: userIdentifier,
        userEmail: userEmail || undefined,
        organizationId: user?.organizationId || undefined,
        data
      })
    }).catch(err => console.error(`Error triggering Suite automation (${triggerName}):`, err.message));
  } catch (err) {
    console.error(`Error in triggerProcessAutomation:`, err);
  }
};

const isInstanceAssignedToUser = (instance, user, teamMemberId) => {
  if (!instance) return false;
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userIdStr = String(user?.id || '');
  const adminIdStr = `admin_${userIdStr}`;
  const memberIdStr = teamMemberId ? String(teamMemberId) : null;

  const matchesAnyId = (val) => {
    if (!val) return false;
    const v = String(val).toLowerCase().trim();
    if (userEmail && v === userEmail) return true;
    if (userIdStr && v === userIdStr) return true;
    if (adminIdStr && v === adminIdStr) return true;
    if (memberIdStr && v === memberIdStr.toLowerCase()) return true;
    return false;
  };

  // 1. Instance-level assigned_to
  const instAssigned = instance.assigned_to || instance.assignedTo;
  if (instAssigned) {
    const list = Array.isArray(instAssigned) ? instAssigned : [instAssigned];
    if (list.some(matchesAnyId)) return true;
  }

  // 2. Step-level leadId and assignedTo
  const steps = instance.steps || [];
  return steps.some(step => {
    if (!step) return false;
    const list = getStepAssigneeIds(step);
    return list.some(matchesAnyId);
  });
};

const getStepLeadId = (step) => {
  if (!step) return '';
  if (step.leadId && step.leadId !== 'Unassigned') return String(step.leadId);
  return '';
};

const getStepAssigneeIds = (step) => {
  if (!step) return [];
  const set = new Set();
  if (step.leadId && step.leadId !== 'Unassigned') set.add(String(step.leadId));
  if (Array.isArray(step.assignedTo)) {
    step.assignedTo.forEach(id => {
      if (id && id !== 'Unassigned') set.add(String(id));
    });
  } else if (typeof step.assignedTo === 'string' && step.assignedTo && step.assignedTo !== 'Unassigned') {
    set.add(String(step.assignedTo));
  }
  return Array.from(set);
};

// Automatically email AND send in-app notifications to all team members (Encargados & Asignados) involved in a newly launched execution
const notifyTeamOnExecutionLaunch = async (orgId, instanceData, reqOrigin = 'https://process-opal.vercel.app') => {
  try {
    if (!orgId || !instanceData) return;
    const steps = Array.isArray(instanceData.steps) ? instanceData.steps : [];
    if (steps.length === 0) return;

    const [orgRes, teamRes, usersRes] = await Promise.all([
      pool.query('SELECT name FROM organizations WHERE id = $1 LIMIT 1', [orgId]),
      pool.query('SELECT id, name, email, role FROM team_members WHERE organization_id = $1', [orgId]),
      pool.query('SELECT id, name, email, role FROM users WHERE organization_id = $1', [orgId])
    ]);

    const orgName = orgRes.rows[0]?.name || '';
    const senderName = orgName ? `${orgName} (Kônsul Process)` : 'Kônsul Process';
    const teamRows = teamRes.rows || [];
    const userRows = usersRes.rows || [];

    // Build unified directory of all members + users in the organization
    const directory = [];
    const byEmail = new Map();

    teamRows.forEach(tm => {
      const cleanEmail = (tm.email || '').trim().toLowerCase();
      const matchingUser = cleanEmail ? userRows.find(u => (u.email || '').trim().toLowerCase() === cleanEmail) : null;
      const entry = {
        key: cleanEmail || `tm_${tm.id}`,
        memberId: String(tm.id),
        userId: matchingUser ? matchingUser.id : null,
        adminAliasId: matchingUser ? `admin_${matchingUser.id}` : null,
        name: tm.name || matchingUser?.name || 'Colaborador',
        email: tm.email || matchingUser?.email || '',
        role: tm.role || matchingUser?.role || 'Equipo'
      };
      directory.push(entry);
      if (cleanEmail) byEmail.set(cleanEmail, entry);
    });

    userRows.forEach(u => {
      const cleanEmail = (u.email || '').trim().toLowerCase();
      if (cleanEmail && byEmail.has(cleanEmail)) {
        const existing = byEmail.get(cleanEmail);
        if (!existing.userId) existing.userId = u.id;
        if (!existing.adminAliasId) existing.adminAliasId = `admin_${u.id}`;
        return;
      }
      const entry = {
        key: cleanEmail || `user_${u.id}`,
        memberId: `admin_${u.id}`,
        userId: u.id,
        adminAliasId: `admin_${u.id}`,
        name: u.name || 'Administrador',
        email: u.email || '',
        role: u.role || 'admin'
      };
      directory.push(entry);
      if (cleanEmail) byEmail.set(cleanEmail, entry);
    });

    const resolvePerson = (rawId) => {
      if (!rawId || rawId === 'Unassigned') return null;
      const target = String(rawId).trim().toLowerCase();
      return directory.find(p =>
        (p.memberId && p.memberId.toLowerCase() === target) ||
        (p.adminAliasId && p.adminAliasId.toLowerCase() === target) ||
        (p.userId && String(p.userId).toLowerCase() === target) ||
        (p.email && p.email.trim().toLowerCase() === target)
      ) || null;
    };

    const memberStepsMap = new Map();

    steps.forEach((step, idx) => {
      const leadId = getStepLeadId(step);
      const leadPerson = resolvePerson(leadId);
      const assigneeIds = getStepAssigneeIds(step);

      assigneeIds.forEach(rawId => {
        const person = resolvePerson(rawId);
        if (!person) return;

        if (!memberStepsMap.has(person.key)) {
          memberStepsMap.set(person.key, {
            person,
            assignedSteps: []
          });
        }

        const existingSteps = memberStepsMap.get(person.key).assignedSteps;
        if (existingSteps.some(s => s.stepNumber === idx + 1)) return;

        const isLead = leadPerson && leadPerson.key === person.key;
        existingSteps.push({
          stepId: step.id || `step_${idx + 1}`,
          stepNumber: idx + 1,
          title: step.title || `Paso ${idx + 1}`,
          description: step.description || '',
          dueDate: step.dueDate || null,
          isLead: !!isLead,
          isFirstActive: idx === 0
        });
      });
    });

    const instanceId = String(instanceData.id || '');
    const instanceTitle = instanceData.instanceName || instanceData.instance_name || instanceData.title || 'Nueva Ejecución';
    const templateTitle = instanceData.title || 'Proceso Operativo';
    const notifiedUserIds = new Set();

    // 1. Insert general launch log in notification_logs
    if (instanceId) {
      const assignedNamesSummary = Array.from(memberStepsMap.values())
        .map(({ person, assignedSteps }) => `${person.name} (${assignedSteps.map(s => `P${s.stepNumber}`).join(', ')})`)
        .join('; ');
      const logMessage = assignedNamesSummary
        ? `🚀 Nueva ejecución "${instanceTitle}" (${templateTitle}). Asignados: ${assignedNamesSummary}.`
        : `🚀 Se inició la ejecución "${instanceTitle}" basada en la plantilla "${templateTitle}".`;

      await pool.query(
        `INSERT INTO notification_logs (id, organization_id, instance_id, step_id, instance_name, step_title, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [`launch-${instanceId}`, orgId, instanceId, 'launch', instanceTitle, 'Inicio de Ejecución', logMessage]
      );
    }

    // 2. For each assigned member: send Email + create Personalized In-App Notification with their respective steps
    for (const [, { person, assignedSteps }] of memberStepsMap.entries()) {
      const hasLeadRole = assignedSteps.some(s => s.isLead);
      const hasFirstStep = assignedSteps.some(s => s.isFirstActive);
      const firstActiveStep = assignedSteps.find(s => s.isFirstActive);

      // 2a. Create in-app notification in `notifications` table for this user (auto-provision user row if needed)
      let targetUserId = person.userId;
      if (!targetUserId && person.email) {
        const uLookup = await pool.query(
          'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
          [person.email]
        );
        if (uLookup.rows.length > 0) {
          targetUserId = uLookup.rows[0].id;
        } else {
          try {
            const jitUser = await pool.query(
              `INSERT INTO users (organization_id, name, email, password_hash, role)
               VALUES ($1, $2, $3, 'INVITED_PENDING', 'guest')
               RETURNING id`,
              [orgId, person.name || person.email.split('@')[0], person.email.trim()]
            );
            if (jitUser.rows.length > 0) targetUserId = jitUser.rows[0].id;
          } catch (jitErr) {
            console.warn('JIT user creation skipped in notifyTeamOnExecutionLaunch:', jitErr.message);
          }
        }
      }

      if (targetUserId && instanceId) {
        notifiedUserIds.add(targetUserId);
        const stepsSummaryText = assignedSteps
          .map(s => `Paso ${s.stepNumber}: "${s.title}" (${s.isLead ? '👑 Encargado Principal' : '👥 Asignado'}${s.isFirstActive ? ' • ⚡ Activo ahora' : ''})`)
          .join(' | ');
        const inAppMsg = `🚀 Nueva ejecución "${instanceTitle}" (${templateTitle}) — Tus pasos (${assignedSteps.length}): ${stepsSummaryText}`;

        await pool.query(
          `INSERT INTO notifications (user_id, type, message, instance_id, step_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            targetUserId,
            hasFirstStep ? 'alert' : 'message',
            inAppMsg,
            instanceId,
            firstActiveStep ? String(firstActiveStep.stepId) : null
          ]
        );
      }

      // 2b. Send email notification to the member
      if (person.email) {
        const subject = hasFirstStep
          ? `🚀 [Tu turno] Nueva ejecución iniciada: "${instanceTitle}"`
          : `📋 Nueva ejecución asignada: "${instanceTitle}" (${templateTitle})`;

        const stepsRowsHtml = assignedSteps.map(s => {
          const roleBadge = s.isLead
            ? `<span style="background-color: #FEF3C7; color: #B45309; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">👑 Encargado Principal</span>`
            : `<span style="background-color: #E0F2FE; color: #0369A1; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;">👥 Colaborador Asignado</span>`;
          const activeBadge = s.isFirstActive
            ? `<span style="background-color: #D1FAE5; color: #047857; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-left: 4px;">⚡ Activo ahora</span>`
            : '';
          const dueStr = s.dueDate ? new Date(s.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Según flujo';

          return `
            <div style="padding: 12px; border-bottom: 1px solid #E5E7EB; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                <strong style="color: #111827; font-size: 14px;">Paso ${s.stepNumber}: ${s.title}</strong>
                <div>${roleBadge}${activeBadge}</div>
              </div>
              ${s.description ? `<p style="margin: 4px 0 0 0; color: #6B7280; font-size: 13px;">${s.description}</p>` : ''}
              <span style="font-size: 12px; color: #9CA3AF;">📅 Fecha estimada: ${dueStr}</span>
            </div>
          `;
        }).join('');

        const htmlContent = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" style="height: 40px; object-fit: contain;" />
            </div>
            <h2 style="color: #111827; margin-bottom: 0.75rem; font-size: 1.35rem; font-weight: 700;">
              🚀 Nueva Ejecución en Marcha${orgName ? ` • ${orgName}` : ''}
            </h2>
            <p style="color: #4b5563; line-height: 1.6; font-size: 0.95rem; margin-bottom: 1rem;">
              Hola <strong>${person.name}</strong>, se ha iniciado una nueva ejecución del proceso <strong>"${templateTitle}"</strong> para <strong>"${instanceTitle}"</strong> en la que participas como ${hasLeadRole ? '<strong>Encargado Principal de paso</strong>' : '<strong>Colaborador asignado</strong>'}.
            </p>
            <div style="background-color: #f9fafb; border-radius: 10px; border: 1px solid #f3f4f6; margin-bottom: 1.5rem; overflow: hidden;">
              <div style="background-color: #F3F4F6; padding: 10px 14px; font-weight: 700; color: #374151; font-size: 13px;">
                Tus Pasos Asignados (${assignedSteps.length}):
              </div>
              ${stepsRowsHtml}
            </div>
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <a href="${reqOrigin}" style="background-color: #27bea7; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem; display: inline-block;">Ir a la Ejecución en Kônsul Process</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 1.5rem 0;" />
            <p style="color: #9ca3af; font-size: 0.8rem; text-align: center; margin: 0;">
              ${senderName} &copy; 2026 • Gestión Operativa Inteligente
            </p>
          </div>
        `;

        await sendEmail({
          to: person.email,
          subject,
          html: htmlContent,
          senderName
        });
      }
    }

    // 3. Also notify workspace admins in-app if they weren't already notified as step assignees
    if (instanceId) {
      const adminsToNotify = userRows.filter(u => u.role === 'admin' && !notifiedUserIds.has(u.id));
      const summaryForAdmin = memberStepsMap.size > 0
        ? `🚀 Ejecución "${instanceTitle}" (${templateTitle}) iniciada. Equipo notificado: ${Array.from(memberStepsMap.values()).map(({ person, assignedSteps }) => `${person.name} (${assignedSteps.map(s => `Paso ${s.stepNumber}`).join(', ')})`).join(' • ')}.`
        : `🚀 Se inició la ejecución "${instanceTitle}" (${templateTitle}).`;

      for (const adminUser of adminsToNotify) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, instance_id, step_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [adminUser.id, 'message', summaryForAdmin, instanceId, null]
        );
      }
    }
  } catch (err) {
    console.error('Error enviando correos y notificaciones de lanzamiento de ejecución:', err);
  }
};

// ==========================================
// GOOGLE DRIVE MULTI-TENANT HELPERS
// ==========================================
const extractDriveIdFromInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return '';
};

let cachedPlatformServiceToken = { token: null, expiry: 0 };

const getValidGoogleDriveAccessToken = async (orgId, existingConfig = null) => {
  try {
    let config = existingConfig;
    if (!config) {
      const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [orgId]);
      config = orgRes.rows[0]?.google_drive_config || {};
    }
    if (!config || typeof config !== 'object') config = {};

    if (config.accessToken) {
      const now = Date.now();
      if (!config.tokenExpiry || config.tokenExpiry > now + 60000) {
        return config.accessToken;
      }
    }

    const effectiveRefreshToken = config.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
    if (effectiveRefreshToken) {
      const clientId = config.clientId || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = config.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
      if (clientId && clientSecret) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: effectiveRefreshToken,
            grant_type: 'refresh_token'
          })
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (config.refreshToken && orgId) {
            const updatedConfig = {
              ...config,
              accessToken: tokenData.access_token,
              tokenExpiry: Date.now() + ((tokenData.expires_in || 3600) * 1000)
            };
            await pool.query(
              'UPDATE organizations SET google_drive_config = $1 WHERE id = $2',
              [JSON.stringify(updatedConfig), orgId]
            );
          }
          return tokenData.access_token;
        }
      }
    }

    // Fallback: Platform or Workspace Google Service Account (Zero-click bot mode for Camino 1 shared folders)
    const saRaw = config.serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    let saKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
    if (saRaw) {
      try {
        const parsedSa = typeof saRaw === 'string' ? JSON.parse(saRaw) : saRaw;
        saEmail = parsedSa.client_email || saEmail;
        saKey = parsedSa.private_key ? parsedSa.private_key.replace(/\\n/g, '\n') : saKey;
      } catch (_) {}
    }

    if (saEmail && saKey) {
      if (cachedPlatformServiceToken.token && cachedPlatformServiceToken.expiry > Date.now() + 60000) {
        return cachedPlatformServiceToken.token;
      }
      const nowSec = Math.floor(Date.now() / 1000);
      const assertion = jwt.sign(
        {
          iss: saEmail,
          scope: 'https://www.googleapis.com/auth/drive',
          aud: 'https://oauth2.googleapis.com/token',
          iat: nowSec,
          exp: nowSec + 3600
        },
        saKey,
        { algorithm: 'RS256' }
      );
      const saRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion
        })
      });
      if (saRes.ok) {
        const saData = await saRes.json();
        cachedPlatformServiceToken = {
          token: saData.access_token,
          expiry: Date.now() + ((saData.expires_in || 3600) * 1000)
        };
        return saData.access_token;
      }
    }

    return config.accessToken || null;
  } catch (err) {
    console.warn('Error resolving Google Drive access token:', err.message);
    return null;
  }
};

const normalizeDriveName = (str) => String(str || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const listChildFoldersInDrive = async (accessToken, parentFolderId) => {
  if (!accessToken || !parentFolderId) return [];
  try {
    const q = `mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=150&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`
    }));
  } catch (_) {
    return [];
  }
};

// Searches for an existing client folder (case-insensitive) directly inside rootFolderId OR 1 level deeper (e.g., Carpeta Madre > Área > CLIENTE A)
const findExistingClientFolderInTree = async (accessToken, clientName, rootFolderId) => {
  if (!accessToken || !clientName || !rootFolderId) return null;
  const targetNorm = normalizeDriveName(clientName);
  if (!targetNorm) return null;

  const level1Folders = await listChildFoldersInDrive(accessToken, rootFolderId);
  // 1. Check direct match at level 1
  const directMatch = level1Folders.find(f => normalizeDriveName(f.name) === targetNorm);
  if (directMatch) {
    return { ...directMatch, parentName: '' };
  }

  // 2. Check level 2 (inside category/area folders)
  for (const catFolder of level1Folders.slice(0, 25)) {
    const level2Folders = await listChildFoldersInDrive(accessToken, catFolder.id);
    const subMatch = level2Folders.find(f => normalizeDriveName(f.name) === targetNorm);
    if (subMatch) {
      return { ...subMatch, parentName: catFolder.name, parentId: catFolder.id };
    }
  }

  return null;
};

const findOrCreateDriveFolder = async (accessToken, folderName, parentFolderId = null, options = {}) => {
  if (!accessToken || !folderName) return null;
  const { allowCreate = true } = options;
  const targetNorm = normalizeDriveName(folderName);

  try {
    // Case-insensitive search inside parentFolderId first so "Cliente A" matches "CLIENTE A"
    if (parentFolderId) {
      const children = await listChildFoldersInDrive(accessToken, parentFolderId);
      const existing = children.find(f => normalizeDriveName(f.name) === targetNorm);
      if (existing) return existing;
    } else {
      const safeName = folderName.replace(/'/g, "\\'").trim();
      const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const f = searchData.files[0];
          return {
            id: f.id,
            name: f.name,
            webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`
          };
        }
      }
    }

    if (!allowCreate) return null;

    const body = {
      name: folderName.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId ? { parents: [parentFolderId] } : {})
    };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return {
        id: created.id,
        name: created.name,
        webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`
      };
    }
  } catch (err) {
    console.warn('Error in findOrCreateDriveFolder:', err.message);
  }
  return null;
};

const DEFAULT_DRIVE_FOLDER_PATH = '{cliente}';
const DRIVE_MONTHS_ES = ['01 - Enero', '02 - Febrero', '03 - Marzo', '04 - Abril', '05 - Mayo', '06 - Junio', '07 - Julio', '08 - Agosto', '09 - Septiembre', '10 - Octubre', '11 - Noviembre', '12 - Diciembre'];

const sanitizeDriveFolderName = (name) => String(name || '')
  .replace(/[\\/]+/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .substring(0, 120);

const normalizeFolderPathTemplate = (rawTemplate) => {
  const cleaned = String(rawTemplate || DEFAULT_DRIVE_FOLDER_PATH)
    .trim()
    .replace(/^\{categoria\}\/?/i, '')
    .trim();
  return cleaned || DEFAULT_DRIVE_FOLDER_PATH;
};

// Turns "{cliente}/{año}/{proceso}" into ["Cliente A", "2026", "Onboarding"]
const resolveDriveFolderPath = (pathTemplate, vars = {}) => {
  const template = normalizeFolderPathTemplate(pathTemplate);
  return template
    .split('/')
    .map(segment => segment.replace(/\{([^}]+)\}/g, (_, key) => {
      const k = key.trim().toLowerCase();
      if (k === 'categoria') return '';
      const value = vars[k] ?? vars[k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
      return sanitizeDriveFolderName(value);
    }))
    .map(sanitizeDriveFolderName)
    .filter(Boolean);
};

// Finds or creates each folder of the path, starting at parentId. Returns the deepest folder.
const ensureDriveFolderPath = async (accessToken, segments, parentId = null, options = {}) => {
  let current = parentId ? { id: parentId, webViewLink: `https://drive.google.com/drive/folders/${parentId}` } : null;
  for (const segment of segments) {
    const next = await findOrCreateDriveFolder(accessToken, segment, current?.id || null, options);
    if (!next) break;
    current = next;
  }
  return current;
};

const ensureExecutionDriveFolder = async (orgId, instanceData, clientName = '') => {
  try {
    if (!orgId || !instanceData?.id) return null;
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [orgId]);
    const config = orgRes.rows[0]?.google_drive_config || {};
    if (!config.connected || config.autoCreateFolders === false) return null;

    const accessToken = await getValidGoogleDriveAccessToken(orgId, config);
    const instanceName = (instanceData.instanceName || instanceData.instance_name || instanceData.title || 'Ejecución').trim();
    const templateTitle = instanceData.title || 'Proceso';

    // Resolve real client name and any client-specific Drive subfolder
    let effectiveClientName = (clientName || '').trim();
    let instRow = null;
    try {
      const r = await pool.query(
        `SELECT i.client_id, i.category, i.started_at, c.name AS client_name, c.drive_folder_id AS client_drive_folder_id, c.drive_folder_url AS client_drive_folder_url
         FROM instances i LEFT JOIN clients c ON c.id = i.client_id AND c.organization_id = i.organization_id
         WHERE i.id = $1 AND i.organization_id = $2`,
        [instanceData.id, orgId]
      );
      instRow = r.rows[0] || null;
      if (instRow?.client_name) effectiveClientName = instRow.client_name;
    } catch (_) {}
    if (!effectiveClientName) effectiveClientName = instanceName;

    // The target folder name is the execution/client name directly
    const primaryFolderName = sanitizeDriveFolderName(instanceName || effectiveClientName);

    if (accessToken) {
      let rootId = config.rootFolderId || null;
      if (!rootId) {
        const rootFolder = await findOrCreateDriveFolder(accessToken, 'Kônsul Process');
        if (rootFolder) {
          rootId = rootFolder.id;
          config.rootFolderId = rootFolder.id;
          config.rootFolderUrl = rootFolder.webViewLink;
          config.rootFolderName = rootFolder.name;
          await pool.query('UPDATE organizations SET google_drive_config = $1 WHERE id = $2', [JSON.stringify(config), orgId]);
        }
      }

      // 1. Check if the Client or Execution ALREADY has an existing folder inside the Root Folder tree
      let matchedClientFolder = null;
      if (instRow?.client_drive_folder_id) {
        matchedClientFolder = {
          id: instRow.client_drive_folder_id,
          name: effectiveClientName,
          webViewLink: instRow.client_drive_folder_url || `https://drive.google.com/drive/folders/${instRow.client_drive_folder_id}`
        };
      } else if (config.matchExistingFolders !== false && rootId) {
        matchedClientFolder = await findExistingClientFolderInTree(accessToken, primaryFolderName, rootId);
        if (!matchedClientFolder && effectiveClientName && normalizeDriveName(effectiveClientName) !== normalizeDriveName(primaryFolderName)) {
          matchedClientFolder = await findExistingClientFolderInTree(accessToken, effectiveClientName, rootId);
        }
        if (matchedClientFolder?.id) {
          await pool.query(
            'UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2 WHERE organization_id = $3 AND (LOWER(name) = LOWER($4) OR LOWER(name) = LOWER($5))',
            [matchedClientFolder.id, matchedClientFolder.webViewLink, orgId, effectiveClientName, primaryFolderName]
          ).catch(() => {});
        }
      }

      const allowCreateNewFolders = !config.onlyUseExistingFolders;
      const startedAt = instRow?.started_at ? new Date(instRow.started_at) : new Date();
      const vars = {
        cliente: primaryFolderName,
        proceso: templateTitle,
        ejecucion: primaryFolderName,
        ano: String(startedAt.getFullYear()),
        año: String(startedAt.getFullYear()),
        mes: DRIVE_MONTHS_ES[startedAt.getMonth()],
        fecha: startedAt.toISOString().slice(0, 10)
      };

      const normalizedTpl = normalizeFolderPathTemplate(config.folderPathTemplate);

      // If we found the Client/Execution's existing folder in Drive:
      if (matchedClientFolder?.id) {
        const afterClientPart = normalizedTpl.includes('{cliente}/') ? normalizedTpl.split('{cliente}/')[1] : '';
        let targetFolder = matchedClientFolder;
        if (afterClientPart && allowCreateNewFolders) {
          const subSegments = resolveDriveFolderPath(afterClientPart, vars);
          if (subSegments.length > 0) {
            const subCreated = await ensureDriveFolderPath(accessToken, subSegments, matchedClientFolder.id, { allowCreate: allowCreateNewFolders });
            if (subCreated?.id) targetFolder = subCreated;
          }
        }
        await pool.query(
          'UPDATE instances SET drive_folder_id = $1, drive_folder_url = $2 WHERE id = $3 AND organization_id = $4',
          [targetFolder.id, targetFolder.webViewLink, instanceData.id, orgId]
        );
        return { folderId: targetFolder.id, folderUrl: targetFolder.webViewLink, folderName: targetFolder.name };
      }

      // Otherwise, create the folder directly in rootId with the execution/client name (no category wrapper)
      const segments = resolveDriveFolderPath(normalizedTpl, vars);
      if (segments.length === 0) segments.push(primaryFolderName);

      const execFolder = await ensureDriveFolderPath(accessToken, segments, rootId, { allowCreate: allowCreateNewFolders });
      if (execFolder?.id && execFolder.id !== rootId) {
        await pool.query(
          'UPDATE instances SET drive_folder_id = $1, drive_folder_url = $2 WHERE id = $3 AND organization_id = $4',
          [execFolder.id, execFolder.webViewLink, instanceData.id, orgId]
        );
        // Also link client row if it matches the top-level created folder
        if (segments.length === 1) {
          await pool.query(
            'UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2 WHERE organization_id = $3 AND (LOWER(name) = LOWER($4) OR LOWER(name) = LOWER($5)) AND (drive_folder_id IS NULL OR drive_folder_id = \'\')',
            [execFolder.id, execFolder.webViewLink, orgId, effectiveClientName, primaryFolderName]
          ).catch(() => {});
        }
        return { folderId: execFolder.id, folderUrl: execFolder.webViewLink, folderName: execFolder.name || segments[segments.length - 1] };
      }
    }

    // Fallback: Use client's dedicated subfolder if set, otherwise workspace root folder
    const fallbackFolderId = instRow?.client_drive_folder_id || config.rootFolderId;
    if (fallbackFolderId) {
      const folderUrl = instRow?.client_drive_folder_url || (fallbackFolderId === config.rootFolderId ? config.rootFolderUrl : '') || `https://drive.google.com/drive/folders/${fallbackFolderId}`;
      await pool.query(
        'UPDATE instances SET drive_folder_id = $1, drive_folder_url = $2 WHERE id = $3 AND organization_id = $4',
        [fallbackFolderId, folderUrl, instanceData.id, orgId]
      );
      return { folderId: fallbackFolderId, folderUrl, folderName: instRow?.client_drive_folder_id ? `Carpeta ${effectiveClientName}` : (config.rootFolderName || 'Carpeta Drive') };
    }
  } catch (err) {
    console.warn('Error in ensureExecutionDriveFolder:', err.message);
  }
  return null;
};

const uploadBase64FileToDrive = async (orgId, { fileName, mimeType, base64Data, parentFolderId }) => {
  const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [orgId]);
  const config = orgRes.rows[0]?.google_drive_config || {};
  const accessToken = await getValidGoogleDriveAccessToken(orgId, config);

  const targetFolderId = parentFolderId || config.rootFolderId || null;
  if (!accessToken) {
    if (targetFolderId) {
      return {
        uploadedToDrive: false,
        fallbackFolderUrl: config.rootFolderUrl || `https://drive.google.com/drive/folders/${targetFolderId}`,
        reason: 'Modo Carpeta por Link activo (conecta OAuth 2.0 para subida directa automática vía API).'
      };
    }
    return { uploadedToDrive: false, reason: 'Google Drive no conectado.' };
  }

  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const fileBuffer = Buffer.from(cleanBase64, 'base64');
  const metadata = {
    name: fileName || `Entregable_${Date.now()}`,
    ...(targetFolderId ? { parents: [targetFolderId] } : {})
  };

  const boundary = '-------KonsulDriveBoundary' + Date.now();
  const delimiter = Buffer.from(`\r\n--${boundary}\r\n`, 'utf8');
  const closeDelimiter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');

  const partHeader1 = Buffer.from(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n',
    'utf8'
  );

  const partHeader2 = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`,
    'utf8'
  );

  const multipartBuffer = Buffer.concat([
    partHeader1,
    partHeader2,
    fileBuffer,
    closeDelimiter
  ]);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBuffer.length)
    },
    body: multipartBuffer
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('Google Drive Upload API error:', uploadRes.status, errText);
    throw new Error(`Error subiendo a Google Drive (${uploadRes.status}): ${errText.substring(0, 150)}`);
  }

  const fileData = await uploadRes.json();
  return {
    uploadedToDrive: true,
    fileId: fileData.id,
    fileName: fileData.name,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`
  };
};

const fetchDriveFileTextContent = async (orgId, fileIdOrUrl) => {
  const fileId = extractDriveIdFromInput(fileIdOrUrl);
  if (!fileId) {
    throw new Error('No se pudo identificar un ID o enlace válido de Google Drive.');
  }

  const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [orgId]);
  const config = orgRes.rows[0]?.google_drive_config || {};
  const accessToken = await getValidGoogleDriveAccessToken(orgId, config);

  // 1. Try via Google Drive API v3 if OAuth token is available
  if (accessToken) {
    try {
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        let textRes;
        if (meta.mimeType === 'application/vnd.google-apps.document') {
          textRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } else if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
          textRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } else {
          textRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        }
        if (textRes && textRes.ok) {
          const content = await textRes.text();
          return {
            fileId: meta.id,
            name: meta.name,
            mimeType: meta.mimeType,
            webViewLink: meta.webViewLink,
            content: content.substring(0, 40000)
          };
        }
      }
    } catch (apiErr) {
      console.warn('Drive API read fallback:', apiErr.message);
    }
  }

  // 2. Fallback: Public / Shared Google Docs or Sheets export endpoints (works without OAuth!)
  const isSheet = String(fileIdOrUrl).includes('spreadsheets');
  const exportUrl = isSheet
    ? `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`
    : `https://docs.google.com/document/d/${fileId}/export?format=txt`;

  const pubRes = await fetch(exportUrl);
  if (pubRes.ok) {
    const content = await pubRes.text();
    return {
      fileId,
      name: isSheet ? `Google Sheet (${fileId.substring(0, 8)})` : `Google Doc (${fileId.substring(0, 8)})`,
      mimeType: isSheet ? 'text/csv' : 'text/plain',
      webViewLink: String(fileIdOrUrl).startsWith('http') ? fileIdOrUrl : `https://drive.google.com/file/d/${fileId}/view`,
      content: content.substring(0, 40000)
    };
  }

  throw new Error('No se pudo leer el documento de Google Drive. Verifica que el archivo tenga acceso compartido ("Cualquier persona con el enlace") o conecta Google Drive con OAuth 2.0 en Integraciones.');
};

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me', 'msn.com'
]);

const extractCorporateDomain = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return null;
  const domain = email.split('@')[1].toLowerCase().trim();
  if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
};

const formatCompanyNameFromDomain = (domain, fallbackName) => {
  if (!domain) return fallbackName || 'Organización de Usuario';
  const base = domain.split('.')[0] || domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
};

// Resuelve o crea la organización garantizando 1 solo Workspace por dominio empresarial
const resolveOrCreateOrganizationByEmail = async (email, fallbackOrgName) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const corporateDomain = extractCorporateDomain(cleanEmail);

  // 1. Si el usuario ya existe en users o team_members, retornar su organización actual
  if (cleanEmail) {
    const uRes = await pool.query('SELECT organization_id FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [cleanEmail]);
    if (uRes.rows.length > 0 && uRes.rows[0].organization_id) {
      return uRes.rows[0].organization_id;
    }
    const tmRes = await pool.query('SELECT organization_id FROM team_members WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [cleanEmail]);
    if (tmRes.rows.length > 0 && tmRes.rows[0].organization_id) {
      return tmRes.rows[0].organization_id;
    }
  }

  // 2. Si tiene dominio empresarial, buscar si ya existe un Workspace para ese dominio
  if (corporateDomain) {
    const domainOrgRes = await pool.query(
      'SELECT id FROM organizations WHERE LOWER(TRIM(domain)) = $1 LIMIT 1',
      [corporateDomain]
    );
    if (domainOrgRes.rows.length > 0) {
      return domainOrgRes.rows[0].id;
    }

    // Buscar si algún otro usuario o miembro de equipo ya tiene ese mismo dominio empresarial
    const existingPeerRes = await pool.query(
      `SELECT organization_id FROM (
         SELECT organization_id, email FROM users
         UNION ALL
         SELECT organization_id, email FROM team_members
       ) peers
       WHERE LOWER(SPLIT_PART(TRIM(email), '@', 2)) = $1
       LIMIT 1`,
      [corporateDomain]
    );
    if (existingPeerRes.rows.length > 0 && existingPeerRes.rows[0].organization_id) {
      const existingOrgId = existingPeerRes.rows[0].organization_id;
      await pool.query(
        'UPDATE organizations SET domain = COALESCE(domain, $1) WHERE id = $2',
        [corporateDomain, existingOrgId]
      ).catch(() => {});
      return existingOrgId;
    }
  }

  // 3. No existe Workspace para este dominio empresarial: crear uno nuevo y registrar el dominio
  const orgName = formatCompanyNameFromDomain(corporateDomain, fallbackOrgName);
  const newOrgRes = await pool.query(
    'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING id',
    [orgName, corporateDomain]
  );
  return newOrgRes.rows[0].id;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
    req.user = user;
    try {
      if (user && (user.id || user.email)) {
        const dbUser = await pool.query(
          'SELECT id, organization_id, name, email, role FROM users WHERE id = $1 OR ($2 <> \'\' AND LOWER(TRIM(email)) = LOWER(TRIM($2))) LIMIT 1',
          [user.id || 0, user.email || '']
        );
        if (dbUser.rows.length > 0) {
          req.user.id = dbUser.rows[0].id;
          req.user.role = dbUser.rows[0].role || user.role;
          req.user.organizationId = dbUser.rows[0].organization_id || user.organizationId;
          req.user.name = dbUser.rows[0].name || user.name;
          req.user.email = dbUser.rows[0].email || user.email;
        }
      }
    } catch (dbErr) {
      console.warn('Error refreshing user from DB in authenticateToken:', dbErr.message);
    }
    next();
  });
};

const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ') && req.headers['authorization'].split(' ')[1]);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acceso denegado. API key no proporcionada.'
      }
    });
  }

  // 1. Soporte para SSO Unificado Kônsul y Clave Interna del Ecosistema
  const internalKey = process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key';
  if (apiKey === internalKey || apiKey.startsWith('konsul_sso_') || apiKey.startsWith('kp_live_sso_') || apiKey.startsWith('konsul_ecosystem_')) {
    let orgId = 3;
    const kindeUserEmail = (req.headers['x-user-email'] || req.query.user_email || '').trim();
    const kindeUserId = (req.headers['x-user-id'] || req.query.user_id || '').trim();

    if (kindeUserEmail || kindeUserId) {
      try {
        const uRes = await pool.query(
          "SELECT id, organization_id, email, kinde_id FROM users WHERE ($1 <> '' AND LOWER(TRIM(email)) = LOWER($1)) OR ($2 <> '' AND kinde_id = $2) LIMIT 1",
          [kindeUserEmail, kindeUserId]
        );
        if (uRes.rows.length > 0) {
          orgId = uRes.rows[0].organization_id;
          if (kindeUserId && !uRes.rows[0].kinde_id) {
            await pool.query('UPDATE users SET kinde_id = $1 WHERE id = $2', [kindeUserId, uRes.rows[0].id]).catch(() => {});
          }
        } else if (kindeUserEmail) {
          // Unificar por dominio empresarial o miembro existente
          orgId = await resolveOrCreateOrganizationByEmail(
            kindeUserEmail,
            `Organización de ${kindeUserEmail.split('@')[0]}`
          );
          await pool.query(
            `INSERT INTO users (organization_id, name, email, kinde_id, password_hash, role)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (LOWER(TRIM(email))) DO UPDATE SET kinde_id = COALESCE(EXCLUDED.kinde_id, users.kinde_id)`,
            [orgId, kindeUserEmail.split('@')[0], kindeUserEmail, kindeUserId || null, 'sso_kinde_managed', 'admin']
          ).catch(async () => {
            // Fallback si el conflicto es en constraint normal
            const checkU = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER($1)', [kindeUserEmail]);
            if (checkU.rows.length === 0) {
              await pool.query(
                'INSERT INTO users (organization_id, name, email, kinde_id, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
                [orgId, kindeUserEmail.split('@')[0], kindeUserEmail, kindeUserId || null, 'sso_kinde_managed', 'admin']
              );
            }
          });
        }
      } catch (jitErr) {
        console.error('Error en JIT Provisioning de usuario/org en Process:', jitErr);
      }
    }

    req.user = {
      id: null,
      organizationId: orgId,
      role: 'admin',
      email: kindeUserEmail || 'api-caller@konsul.digital'
    };
    return next();
  }

  try {
    const result = await pool.query(
      'SELECT * FROM api_tokens WHERE token = $1',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key inválida o revocada.'
        }
      });
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
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Error del servidor al autenticar API key.'
      }
    });
  }
};

// --- AUTH ROUTES (KINDE SSO) ---

app.get('/api/auth/login', async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.kindeState = state;
    
    const issuerUrl = (process.env.KINDE_ISSUER_URL || '').replace(/\/$/, '');
    let authUrl = `${issuerUrl}/oauth2/auth?` + new URLSearchParams({
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
    
    const issuerUrl = (process.env.KINDE_ISSUER_URL || '').replace(/\/$/, '');
    let authUrl = `${issuerUrl}/oauth2/auth?` + new URLSearchParams({
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
    
    const issuerUrl = (process.env.KINDE_ISSUER_URL || '').replace(/\/$/, '');
    // Exchange code for token
    const tokenResponse = await fetch(`${issuerUrl}/oauth2/token`, {
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
    
    const tokenRawText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenRawText);
    } catch (e) {
      console.error('Non-JSON response from token endpoint:', tokenRawText);
      throw new Error(`Error en el servidor de autenticación (Status ${tokenResponse.status}): La respuesta no fue JSON.`);
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Error in token exchange:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || `Error intercambiando el token (Status ${tokenResponse.status})`);
    }
    
    // Fetch user profile using access_token
    const profileResponse = await fetch(`${issuerUrl}/oauth2/v2/user_profile`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    const profileRawText = await profileResponse.text();
    let profile;
    try {
      profile = JSON.parse(profileRawText);
    } catch (e) {
      console.error('Non-JSON response from profile endpoint:', profileRawText);
      throw new Error(`Error obteniendo perfil (Status ${profileResponse.status}): La respuesta no fue JSON.`);
    }
    
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
    
    const cleanEmail = profile.email.trim().toLowerCase();
    // Check if user exists in DB
    let userResult = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    let user;
    
    if (userResult.rows.length === 0) {
      // Unificar por dominio empresarial: si ya existe un Workspace con este dominio (@empresa.com), unirlo a ese Workspace
      const fallbackOrgName = `Organización de ${profile.given_name || 'Usuario'}`;
      const orgId = await resolveOrCreateOrganizationByEmail(cleanEmail, fallbackOrgName);

      // Generar hash dummy porque la clave real la maneja Kinde
      const dummyHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      const fullName = profile.given_name ? `${profile.given_name} ${profile.family_name || ''}`.trim() : cleanEmail.split('@')[0];
      
      const newUser = await pool.query(
        'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [orgId, fullName, cleanEmail, dummyHash, 'admin']
      );
      user = newUser.rows[0];

      // Insert into team_members if not already present
      const tmCheck = await pool.query('SELECT id FROM team_members WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
      if (tmCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO team_members (id, organization_id, name, role, email, avatar, department)
           VALUES ($1, $2, $3, $4, $5, null, 'Administración')`,
          ['admin_' + user.id, orgId, fullName, 'Fundador/Admin', cleanEmail]
        );
      }
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
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent(err.message || 'kinde_auth_failed')}`);
  }
});

app.get('/api/auth/logout', async (req, res) => {
  try {
    req.session = null;
    
    const issuerUrl = (process.env.KINDE_ISSUER_URL || '').replace(/\/$/, '');
    const logoutUrl = new URL(`${issuerUrl}/logout`);
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

    // 7. ClickUp & Google Drive rules query
    const clickupRulesPromise = pool.query(
      'SELECT id, rule_name as "ruleName", clickup_list_id as "clickupListId", clickup_list_name as "clickupListName", clickup_status as "clickupStatus", template_id as "templateId", active, status, title_pattern as "titlePattern" FROM clickup_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [orgId]
    );
    const driveRulesPromise = pool.query(
      'SELECT id, rule_name as "ruleName", drive_folder_id as "driveFolderId", drive_folder_name as "driveFolderName", file_type_filter as "fileTypeFilter", template_id as "templateId", active, status, title_pattern as "titlePattern", last_checked_at as "lastCheckedAt" FROM google_drive_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [orgId]
    ).catch(() => ({ rows: [] }));

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
      driveRulesRes,
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
      driveRulesPromise,
      usersPromise,
      developerTokensPromise
    ]);

    const orgRow = orgRes.rows[0] || {};
    const rawDriveConfig = orgRow.google_drive_config || {};

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
      const memberRes = await pool.query('SELECT id FROM team_members WHERE LOWER(email) = LOWER($1) AND organization_id = $2', [req.user.email, orgId]);
      const memberId = memberRes.rows[0]?.id;
      instancesRows = instancesRows.filter(row => isInstanceAssignedToUser(row, req.user, memberId));
    }
    const instancesMapped = instancesRows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      title: row.title,
      instanceName: row.instance_name,
      clientId: row.client_id || null,
      driveFolderId: row.drive_folder_id || null,
      driveFolderUrl: row.drive_folder_url || null,
      startedAt: row.started_at,
      companionName: row.companion_name,
      companionAvatar: row.companion_avatar,
      companionGreeting: row.companion_greeting,
      category: row.category,
      steps: row.steps,
      status: row.status || 'Por hacer',
      priority: row.priority || 'Media',
      attachments: row.attachments || []
    }));

    // Map logs
    const logsMapped = logsRes.rows.map(row => ({
      id: row.id,
      instanceId: row.instance_id,
      stepId: row.step_id,
      loggedAt: row.logged_at,
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
      geminiApiKey: orgRow.gemini_api_key || row.gemini_api_key || '',
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
        geminiApiKey: orgRow.gemini_api_key || '',
        status: 'active',
        isSystem: true
      }));
    const fullTeam = [...adminUsers, ...teamMapped];

    res.json({
      templates: templatesMapped,
      instances: instancesMapped,
      clients: clientsRes.rows,
      notifications: logsMapped,
      team: fullTeam,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organizationId: req.user.organizationId
      },
      organization: {
        id: orgRow.id,
        name: orgRow.name || '',
        description: orgRow.description || '',
        departments: orgRow.departments || [],
        gemini_api_key: orgRow.gemini_api_key || '',
        kanban_columns: orgRow.kanban_columns || ["Por hacer", "En curso", "Terminado"]
      },
      clickup: {
        clickupToken: orgRow.clickup_token || '',
        clickupWorkspaceId: orgRow.clickup_workspace_id || ''
      },
      clickupRules: clickupRulesRes.rows,
      googleDrive: {
        connected: !!rawDriveConfig.connected,
        mode: rawDriveConfig.mode || 'both',
        rootFolderId: rawDriveConfig.rootFolderId || '',
        rootFolderUrl: rawDriveConfig.rootFolderUrl || '',
        rootFolderName: rawDriveConfig.rootFolderName || '',
        folderPathTemplate: rawDriveConfig.folderPathTemplate || DEFAULT_DRIVE_FOLDER_PATH,
        stepSubfolders: !!rawDriveConfig.stepSubfolders,
        matchExistingFolders: rawDriveConfig.matchExistingFolders !== false,
        onlyUseExistingFolders: !!rawDriveConfig.onlyUseExistingFolders,
        autoCreateFolders: rawDriveConfig.autoCreateFolders !== false,
        autoCreateClientFolders: rawDriveConfig.autoCreateFolders !== false,
        autoUploadStepFiles: rawDriveConfig.autoUploadStepFiles !== false,
        hasOAuthToken: !!(rawDriveConfig.accessToken || rawDriveConfig.refreshToken),
        connectedEmail: rawDriveConfig.connectedEmail || '',
        email: rawDriveConfig.connectedEmail || '',
        clientId: rawDriveConfig.clientId || '',
        hasClientSecret: !!rawDriveConfig.clientSecret,
        hasPlatformOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      googleDriveRules: driveRulesRes.rows,
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

    const isGuest = req.user.role === 'guest' || req.user.role === 'agent';
    if (isGuest) {
      const memberRes = await pool.query('SELECT id FROM team_members WHERE LOWER(email) = LOWER($1) AND organization_id = $2', [req.user.email, req.user.organizationId]);
      const memberId = memberRes.rows[0]?.id;
      rows = rows.filter(row => isInstanceAssignedToUser(row, req.user, memberId));
    }

    const mapped = rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      title: row.title,
      instanceName: row.instance_name,
      clientId: row.client_id,
      driveFolderId: row.drive_folder_id || null,
      driveFolderUrl: row.drive_folder_url || null,
      startedAt: row.started_at,
      companionName: row.companion_name,
      companionAvatar: row.companion_avatar,
      companionGreeting: row.companion_greeting,
      category: row.category,
      steps: row.steps,
      status: row.status || 'Por hacer',
      priority: row.priority || 'Media',
      attachments: row.attachments || []
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
  const { name, email } = req.body;
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
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    
    const clientId = 'cli_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now();
    const result = await pool.query(
      'INSERT INTO clients (id, organization_id, name, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [clientId, req.user.organizationId, name, email || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el cliente' });
  }
});

app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, checklist, driveFolderInput, driveFolderUrl, driveFolderId } = req.body;
  try {
    const updates = [];
    const params = [];
    let pIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${pIdx++}`);
      params.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${pIdx++}`);
      params.push(email || null);
    }
    if (req.body.phone !== undefined) {
      updates.push(`phone = $${pIdx++}`);
      params.push(req.body.phone || null);
    }
    if (req.body.stage !== undefined) {
      updates.push(`stage = $${pIdx++}`);
      params.push(req.body.stage || 'Nuevo');
    }
    if (req.body.notes !== undefined) {
      updates.push(`notes = $${pIdx++}`);
      params.push(req.body.notes || null);
    }
    if (checklist !== undefined) {
      updates.push(`checklist = $${pIdx++}`);
      params.push(JSON.stringify(checklist));
    }
    const rawFolder = driveFolderInput !== undefined ? driveFolderInput : (driveFolderUrl !== undefined ? driveFolderUrl : driveFolderId);
    if (rawFolder !== undefined) {
      const fid = extractDriveIdFromInput(rawFolder);
      const furl = fid ? (String(rawFolder).trim().startsWith('http') ? String(rawFolder).trim() : `https://drive.google.com/drive/folders/${fid}`) : null;
      updates.push(`drive_folder_id = $${pIdx++}`);
      params.push(fid || null);
      updates.push(`drive_folder_url = $${pIdx++}`);
      params.push(furl || null);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });

    params.push(id, req.user.organizationId);
    const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = $${pIdx++} AND organization_id = $${pIdx++} RETURNING *`;
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

app.put('/api/clients/:id/checklist', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { checklist } = req.body;
  if (!checklist) return res.status(400).json({ error: 'El checklist es obligatorio.' });
  try {
    const result = await pool.query(
      'UPDATE clients SET checklist = $1 WHERE id = $2 AND organization_id = $3 RETURNING *',
      [JSON.stringify(checklist), id, req.user.organizationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar checklist del cliente:', err);
    res.status(500).json({ error: 'Error al actualizar checklist.' });
  }
});

// Delete a client
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const clientCheck = await pool.query(
      'SELECT id, name FROM clients WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    // Decouple client from instances
    await pool.query(
      'UPDATE instances SET client_id = NULL WHERE client_id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    // Delete client
    await pool.query(
      'DELETE FROM clients WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    res.json({ message: 'Cliente eliminado con éxito.', id });
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    res.status(500).json({ error: 'Error al eliminar el cliente.' });
  }
});

// 4. Create a new instance
app.post('/api/instances', authenticateToken, async (req, res) => {
    const { id, templateId, title, instanceName, clientId, clientName, clientEmail, startedAt, companionName, companionAvatar, companionGreeting, category, steps, status, priority } = req.body;
  try {
    let resolvedClientId = clientId || null;
    const targetClientName = (clientName || instanceName || '').trim();
    const targetClientEmail = (clientEmail || '').trim();

    // Auto-create client if not existing in the database for this organization
    if (targetClientName) {
      if (!resolvedClientId) {
        const clientSearch = await pool.query(
          'SELECT id, email FROM clients WHERE organization_id = $1 AND LOWER(TRIM(name)) = LOWER($2) LIMIT 1',
          [req.user.organizationId, targetClientName]
        );
        if (clientSearch.rows.length > 0) {
          resolvedClientId = clientSearch.rows[0].id;
          if (targetClientEmail && (!clientSearch.rows[0].email || clientSearch.rows[0].email.trim() === '')) {
            await pool.query(
              'UPDATE clients SET email = $1 WHERE id = $2 AND organization_id = $3',
              [targetClientEmail, resolvedClientId, req.user.organizationId]
            ).catch(() => {});
          }
        } else {
          const newClientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const newClientRes = await pool.query(
            `INSERT INTO clients (id, organization_id, name, email, checklist)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [newClientId, req.user.organizationId, targetClientName, targetClientEmail || null, JSON.stringify([])]
          );
          resolvedClientId = newClientRes.rows[0]?.id || newClientId;
        }
      }
    }

    await pool.query(
      `INSERT INTO instances (id, organization_id, template_id, title, instance_name, client_id, started_at, companion_name, companion_avatar, companion_greeting, category, steps, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, req.user.organizationId, templateId, title, instanceName, resolvedClientId, startedAt, companionName, companionAvatar, companionGreeting, category, JSON.stringify(steps), status || 'Por hacer', priority || 'Media']
    );

    const driveInfo = await ensureExecutionDriveFolder(req.user.organizationId, { id, title, instanceName }, targetClientName || instanceName);

    // If a drive folder was created or found, also link it directly to the client if the client doesn't have one yet
    if (driveInfo?.folderId && resolvedClientId) {
      await pool.query(
        `UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2
         WHERE id = $3 AND organization_id = $4 AND (drive_folder_id IS NULL OR drive_folder_id = '')`,
        [driveInfo.folderId, driveInfo.folderUrl, resolvedClientId, req.user.organizationId]
      ).catch(() => {});
    }

    const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';
    await notifyTeamOnExecutionLaunch(req.user.organizationId, { id, title, instanceName, steps }, origin);

    triggerProcessAutomation('Nueva Tarea / Tarjeta', req.user, {
      'Título de Tarea': title || instanceName || 'Nueva Tarea',
      'Descripción': `Iniciada en categoría ${category || 'General'}`,
      'Miembro Asignado': req.user?.email || 'Admin',
      'ID de Ejecución': id,
      'Cliente': targetClientName || instanceName
    });

    res.status(201).json({
      message: 'Ejecución iniciada con éxito',
      clientId: resolvedClientId,
      clientName: targetClientName,
      driveFolderId: driveInfo?.folderId || null,
      driveFolderUrl: driveInfo?.folderUrl || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la ejecución en la base de datos' });
  }
});

// 5. Update an instance (steps, status, priority, or attachments changes)
app.put('/api/instances/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { steps, status, priority, attachments, clientId } = req.body;
  try {
    // Read previous instance state for automation diffing
    const prevInstRes = await pool.query('SELECT instance_name, title, category, client_id, steps FROM instances WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    const prevInst = prevInstRes.rows[0] || {};
    const prevSteps = typeof prevInst.steps === 'string' ? JSON.parse(prevInst.steps) : (prevInst.steps || []);

    let query = 'UPDATE instances SET ';
    const params = [];
    let paramIdx = 1;
    const updates = [];

    if (steps !== undefined) {
      updates.push(`steps = $${paramIdx++}`);
      params.push(JSON.stringify(steps));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIdx++}`);
      params.push(priority);
    }
    if (attachments !== undefined) {
      updates.push(`attachments = $${paramIdx++}`);
      params.push(JSON.stringify(attachments));
    }
    if (clientId !== undefined) {
      updates.push(`client_id = $${paramIdx++}`);
      params.push(clientId || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar.' });
    }

    query += updates.join(', ') + ` WHERE id = $${paramIdx++} AND organization_id = $${paramIdx++}`;
    params.push(id, req.user.organizationId);

    await pool.query(query, params);

    if (status !== undefined) {
      triggerProcessAutomation('Estado de Tarea Cambiado', req.user, {
        'Título de Tarea': req.body.title || prevInst.instance_name || `Ejecución #${id}`,
        'Columna Actual': status
      });
    }
    
    // Trigger Suite & ReactivaLeads if steps are updated
    if (steps && Array.isArray(steps)) {
      const allCompleted = steps.every(s => s.isCompleted);
      const newlyCompletedSteps = steps.filter(s => s.isCompleted && !prevSteps.some(ps => ps.id === s.id && ps.isCompleted));
      
      // Notify Suite & Client Email for each completed step
      for (const newlyCompleted of newlyCompletedSteps) {
        triggerProcessAutomation('Paso de Tarea Completado', req.user, {
          'ID de Ejecución': id,
          'ID del Paso': newlyCompleted.id,
          'Título del Paso': newlyCompleted.title || newlyCompleted.label || 'Paso',
          'Título de Ejecución': prevInst.instance_name || prevInst.title || `Ejecución #${id}`
        });

        // Check if this step is configured to email the client automatically
        if (newlyCompleted.notifyClientEmail) {
          (async () => {
            try {
              let clientEmail = null;
              let clientName = prevInst.instance_name || 'Estimado Cliente';

              if (prevInst.client_id) {
                const cliRes = await pool.query('SELECT name, email FROM clients WHERE id = $1 AND organization_id = $2', [prevInst.client_id, req.user.organizationId]);
                if (cliRes.rows.length > 0) {
                  clientEmail = cliRes.rows[0].email;
                  clientName = cliRes.rows[0].name || clientName;
                }
              }

              // Fallback: search client by instance name
              if (!clientEmail && prevInst.instance_name) {
                const cliRes = await pool.query('SELECT name, email FROM clients WHERE organization_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1', [req.user.organizationId, prevInst.instance_name.trim()]);
                if (cliRes.rows.length > 0) {
                  clientEmail = cliRes.rows[0].email;
                  clientName = cliRes.rows[0].name || clientName;
                }
              }

              if (clientEmail) {
                const subject = newlyCompleted.clientEmailSubject || `Actualización de tu Proceso: ${newlyCompleted.title || 'Paso Completado'}`;
                const bodyText = newlyCompleted.clientEmailBody || `Hola ${clientName},\n\nTe informamos que se ha completado el paso "${newlyCompleted.title}" correspondiente al proceso "${prevInst.instance_name || prevInst.title}".\n\n${newlyCompleted.description ? 'Detalle: ' + newlyCompleted.description + '\n\n' : ''}Seguimos avanzando con la ejecución de tu servicio. Si tienes dudas, contáctanos.\n\nSaludos cordiales,\nEquipo de Operaciones`;

                const htmlContent = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div style="background-color: #27bea7; padding: 24px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Kônsul Process</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 13px;">Notificación Operativa de Avance</p>
                    </div>
                    <div style="padding: 28px; color: #1e293b;">
                      <h2 style="font-size: 17px; margin-top: 0; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
                        ${newlyCompleted.title || 'Hito Operativo'}
                      </h2>
                      <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin: 16px 0;">
                        ${bodyText.replace(/\n/g, '<br/>')}
                      </div>
                      <div style="background-color: #f8fafc; border-left: 4px solid #27bea7; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                        <span style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Estado del Proceso</span>
                        <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">${prevInst.instance_name || prevInst.title}</p>
                      </div>
                    </div>
                    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                      Enviado automáticamente por el motor de procesos de Kônsul.
                    </div>
                  </div>
                `;

                await sendEmail({
                  to: clientEmail,
                  subject,
                  html: htmlContent
                });
                console.log(`[Process] Correo automático enviado al cliente ${clientEmail} por paso "${newlyCompleted.title}".`);
              } else {
                console.log(`[Process] Paso configurado con notifyClientEmail pero el cliente no tiene email registrado.`);
              }
            } catch (mailErr) {
              console.error('[Process] Error al enviar email automático al cliente:', mailErr);
            }
          })();
        }
      }

      // Notify Suite for full process completion
      if (allCompleted && !prevSteps.every(ps => ps.isCompleted)) {
        triggerProcessAutomation('Proceso Completado', req.user, {
          'ID de Ejecución': id,
          'Título de Ejecución': prevInst.instance_name || prevInst.title || `Ejecución #${id}`,
          'Plantilla': prevInst.title || 'Proceso',
          'Categoría': prevInst.category || 'General',
          'Fecha de Finalización': new Date().toISOString()
        });
      }
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

// 6b. Bulk delete instances
app.post('/api/instances/bulk-delete', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Se requieren IDs válidos para eliminar' });
  }
  try {
    await pool.query('DELETE FROM instances WHERE id = ANY($1::text[]) AND organization_id = $2', [ids, req.user.organizationId]);
    res.json({ message: `${ids.length} ejecuciones eliminadas con éxito` });
  } catch (err) {
    console.error('Error al eliminar ejecuciones en bulk:', err);
    res.status(500).json({ error: 'Error al eliminar las ejecuciones en bulk' });
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
          getStepAssigneeIds(s).forEach(memberId => assignedMemberIds.add(String(memberId)));
        });

        const step = steps.find(s => s.id === stepId || s.title === stepTitle);
        const stepAssignees = getStepAssigneeIds(step);
        const stepLeadId = getStepLeadId(step);
        
        // Send email alert to all assignees of this step (Encargado + Colaboradores) only for active-step or overdue alerts
        const idStr = String(id || '');
        const shouldSendStepEmail = step && stepAssignees.length > 0 && !idStr.startsWith('launch-') && !idStr.startsWith('complete-') && type !== 'success';
        if (shouldSendStepEmail) {
          const [memberRes, adminUsersRes] = await Promise.all([
            pool.query('SELECT id, name, email FROM team_members WHERE organization_id = $1', [req.user.organizationId]),
            pool.query('SELECT id, name, email FROM users WHERE organization_id = $1', [req.user.organizationId])
          ]);
          const allOrgPeople = [
            ...(memberRes.rows || []).map(m => ({ id: String(m.id), name: m.name, email: m.email })),
            ...(adminUsersRes.rows || []).map(u => ({ id: `admin_${u.id}`, userId: String(u.id), name: u.name, email: u.email }))
          ];
          const matchedStepMembers = [];
          const seenEmails = new Set();
          stepAssignees.forEach(rawId => {
            const target = String(rawId).trim().toLowerCase();
            const found = allOrgPeople.find(p =>
              p.id.toLowerCase() === target ||
              (p.userId && p.userId.toLowerCase() === target) ||
              (p.email && p.email.trim().toLowerCase() === target)
            );
            if (found && found.email && !seenEmails.has(found.email.trim().toLowerCase())) {
              seenEmails.add(found.email.trim().toLowerCase());
              matchedStepMembers.push(found);
            }
          });
          
          if (matchedStepMembers.length > 0) {
            const leadRow = matchedStepMembers.find(m =>
              stepLeadId && (
                m.id.toLowerCase() === String(stepLeadId).toLowerCase() ||
                (m.userId && m.userId.toLowerCase() === String(stepLeadId).toLowerCase()) ||
                (m.email && m.email.trim().toLowerCase() === String(stepLeadId).toLowerCase())
              )
            ) || null;
            const isOverdue = !idStr.startsWith('active-');
            const origin = req.headers.origin || req.headers.referer || 'https://process-opal.vercel.app';

            for (const memberRow of matchedStepMembers) {
              const { name: memberName, email: memberEmail } = memberRow;
              if (!memberEmail) continue;

              const isLead = leadRow && leadRow.email === memberEmail;
              const subject = isOverdue 
                ? `⚠️ Alerta de retraso: Tarea vencida en "${instanceName}"` 
                : `📋 ${isLead ? '[Encargado Principal] ' : ''}Paso activo: "${stepTitle}" en "${instanceName}"`;

              const htmlContent = `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; border: 1px solid #eef0f2; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                  <div style="text-align: center; margin-bottom: 2rem;">
                    <img src="https://konsul.digital/images/Konsul-logo-general.png" alt="Kônsul Logo" style="height: 45px; object-fit: contain;" />
                  </div>
                  <h2 style="color: ${isOverdue ? '#D32F2F' : '#111827'}; margin-bottom: 1rem; font-size: 1.4rem; font-weight: 700;">
                    ${isOverdue ? '⚠️ Alerta de Retraso de Tarea' : '📋 Paso Asignado y Activo'}
                  </h2>
                  <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1rem;">
                    Hola <strong>${memberName}</strong> (${isLead ? '👑 Encargado Principal del Paso' : '👥 Colaborador Asignado'}),
                  </p>
                  <p style="color: #4b5563; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
                    ${message}
                  </p>
                  <div style="background-color: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1rem;">Detalles del Paso:</h4>
                    <p style="margin: 0.25rem 0; color: #4b5563;"><strong>Caso/Ejecución:</strong> ${instanceName}</p>
                    <p style="margin: 0.25rem 0; color: #4b5563;"><strong>Paso:</strong> ${stepTitle}</p>
                    ${leadRow ? `<p style="margin: 0.25rem 0; color: #4b5563;"><strong>👑 Encargado Principal:</strong> ${leadRow.name}</p>` : ''}
                    ${matchedStepMembers.length > 1 ? `<p style="margin: 0.25rem 0; color: #4b5563;"><strong>👥 Equipo asignado:</strong> ${matchedStepMembers.map(m => m.name).join(', ')}</p>` : ''}
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

        // Convert all assigned team member IDs to matching user IDs
        if (assignedMemberIds.size > 0) {
          const memberIdsArr = Array.from(assignedMemberIds);
          const [membersEmailsRes, orgUsersRes] = await Promise.all([
            pool.query(`SELECT id, email FROM team_members WHERE organization_id = $1`, [req.user.organizationId]),
            pool.query(`SELECT id, email FROM users WHERE organization_id = $1`, [req.user.organizationId])
          ]);
          const matchedEmails = new Set();
          memberIdsArr.forEach(rawId => {
            const target = String(rawId).trim().toLowerCase();
            if (target.startsWith('admin_')) {
              const uid = parseInt(target.replace('admin_', ''), 10);
              if (!isNaN(uid)) recipients.add(uid);
            }
            const tm = (membersEmailsRes.rows || []).find(m => String(m.id).toLowerCase() === target || (m.email && m.email.trim().toLowerCase() === target));
            if (tm && tm.email) matchedEmails.add(tm.email.trim().toLowerCase());
            if (target.includes('@')) matchedEmails.add(target);
          });
          (orgUsersRes.rows || []).forEach(u => {
            if (u.email && matchedEmails.has(u.email.trim().toLowerCase())) {
              recipients.add(u.id);
            }
          });
        }
      }
    }

    // 3. Insert notification records for all identified recipients (skip launch- because notifyTeamOnExecutionLaunch already creates per-user step notifications)
    if (!String(id || '').startsWith('launch-')) {
      for (const userId of recipients) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, instance_id, step_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, type, finalMessage, instanceId ? String(instanceId) : null, stepId ? String(stepId) : null]
        );
      }
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
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return res.status(400).json({ error: 'El correo electrónico del miembro es obligatorio.' });
  }
  try {
    // Validar que el correo no pertenezca ya a otro Workspace distinto
    const existingOtherOrg = await pool.query(
      `SELECT organization_id FROM (
         SELECT organization_id, email FROM users
         UNION ALL
         SELECT organization_id, email FROM team_members
       ) all_members
       WHERE LOWER(TRIM(email)) = $1 AND organization_id <> $2
       LIMIT 1`,
      [cleanEmail, req.user.organizationId]
    );
    if (existingOtherOrg.rows.length > 0) {
      return res.status(400).json({
        error: 'Este correo empresarial ya está registrado en otro Workspace. No se permite tener el mismo correo en más de un Workspace.'
      });
    }

    // Validar que si es un dominio corporativo que ya tiene su propio Workspace distinto, no se mezcle
    const memberDomain = extractCorporateDomain(cleanEmail);
    if (memberDomain) {
      const domainOrg = await pool.query(
        'SELECT id FROM organizations WHERE LOWER(TRIM(domain)) = $1 AND id <> $2 LIMIT 1',
        [memberDomain, req.user.organizationId]
      );
      if (domainOrg.rows.length > 0) {
        return res.status(400).json({
          error: `El dominio empresarial @${memberDomain} pertenece a otro Workspace exclusivo.`
        });
      }
    }

    // 1. Create or update team member in current organization
    await pool.query(
      `INSERT INTO team_members (id, organization_id, name, role, email, avatar, assigned_processes, department, manager_id, gemini_api_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (LOWER(TRIM(email))) WHERE email IS NOT NULL AND TRIM(email) <> ''
       DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department`,
      [
        id, 
        req.user.organizationId,
        name, 
        role, 
        cleanEmail, 
        avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80', 
        JSON.stringify(assignedProcesses || []),
        department || '',
        managerId || null,
        geminiApiKey || null
      ]
    );

    // 2. Also register a user account with role 'guest' so they can log in
    const userExist = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    if (userExist.rows.length === 0) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 24 * 3600000; // 24 hours

      await pool.query(
        `INSERT INTO users (organization_id, name, email, password_hash, role, reset_token, reset_token_expiry)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.organizationId,
          name,
          cleanEmail,
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
  try {
    // Ensure column exists
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255)');
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT');
    await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]'::jsonb");
    
    let orgName = name;
    if (!orgName) {
      const currentOrg = await pool.query('SELECT name FROM organizations WHERE id = $1', [req.user.organizationId]);
      orgName = currentOrg.rows[0]?.name || 'Organización';
    }

    await pool.query(
      'UPDATE organizations SET name = $1, gemini_api_key = COALESCE($2, gemini_api_key), description = COALESCE($3, description), departments = COALESCE($4, departments) WHERE id = $5',
      [
        orgName, 
        gemini_api_key !== undefined ? gemini_api_key : null, 
        description !== undefined ? description : null, 
        departments ? JSON.stringify(departments) : null, 
        req.user.organizationId
      ]
    );
    res.json({ message: 'Organización actualizada con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la empresa.' });
  }
});

// Dedicated endpoint to update/sync Gemini API key for the entire organization
app.put('/api/organization/gemini-api-key', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const rawKey = req.body.gemini_api_key !== undefined ? req.body.gemini_api_key : req.body.geminiApiKey;
  const gemini_api_key = (rawKey && typeof rawKey === 'string' && rawKey.trim()) ? rawKey.trim() : null;
  try {
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(255)');
    await pool.query(
      'UPDATE organizations SET gemini_api_key = $1 WHERE id = $2',
      [gemini_api_key, req.user.organizationId]
    );
    res.json({ success: true, message: 'API Key de Gemini actualizada para toda la organización.', gemini_api_key });
  } catch (err) {
    console.error('Error al actualizar Gemini API Key:', err);
    res.status(500).json({ error: 'Error al actualizar API Key de la organización' });
  }
});

// Update organization kanban columns
app.put('/api/organization/kanban-columns', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  const { columns } = req.body;
  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'Las columnas deben ser un arreglo.' });
  }
  try {
    await pool.query(
      'UPDATE organizations SET kanban_columns = $1 WHERE id = $2',
      [JSON.stringify(columns), req.user.organizationId]
    );
    res.json({ message: 'Columnas de Kanban actualizadas con éxito.', columns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar las columnas de Kanban.' });
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

// ==========================================
// GOOGLE DRIVE INTEGRATION (OAUTH 2.0 + FOLDER LINK + AUTOMATIONS)
// ==========================================

app.get('/api/organization/google-drive', authenticateToken, async (req, res) => {
  try {
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const rulesRes = await pool.query(
      'SELECT id, rule_name as "ruleName", drive_folder_id as "driveFolderId", drive_folder_name as "driveFolderName", file_type_filter as "fileTypeFilter", template_id as "templateId", active, status, title_pattern as "titlePattern", last_checked_at as "lastCheckedAt" FROM google_drive_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.organizationId]
    );
    res.json({
      googleDrive: {
        connected: !!cfg.connected,
        mode: cfg.mode || 'both',
        rootFolderId: cfg.rootFolderId || '',
        rootFolderUrl: cfg.rootFolderUrl || '',
        rootFolderName: cfg.rootFolderName || '',
        folderPathTemplate: normalizeFolderPathTemplate(cfg.folderPathTemplate),
        stepSubfolders: !!cfg.stepSubfolders,
        matchExistingFolders: cfg.matchExistingFolders !== false,
        onlyUseExistingFolders: !!cfg.onlyUseExistingFolders,
        autoCreateFolders: cfg.autoCreateFolders !== false,
        autoCreateClientFolders: cfg.autoCreateFolders !== false,
        autoUploadStepFiles: cfg.autoUploadStepFiles !== false,
        hasOAuthToken: !!(cfg.accessToken || cfg.refreshToken),
        connectedEmail: cfg.connectedEmail || '',
        email: cfg.connectedEmail || '',
        clientId: cfg.clientId || '',
        hasClientSecret: !!cfg.clientSecret,
        hasPlatformOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      rules: rulesRes.rows
    });
  } catch (err) {
    console.error('Error getting Google Drive config:', err);
    res.status(500).json({ error: 'Error al obtener configuración de Google Drive' });
  }
});

app.put('/api/organization/google-drive', authenticateToken, async (req, res) => {
  const {
    rootFolderInput,
    rootFolderUrl,
    rootFolderId,
    rootFolderName,
    folderPathTemplate,
    stepSubfolders,
    matchExistingFolders,
    onlyUseExistingFolders,
    autoCreateFolders,
    autoCreateClientFolders,
    autoUploadStepFiles,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
    disconnect
  } = req.body;

  try {
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const prev = orgRes.rows[0]?.google_drive_config || {};

    if (disconnect) {
      await pool.query('UPDATE organizations SET google_drive_config = $1 WHERE id = $2', [JSON.stringify({}), req.user.organizationId]);
      return res.json({ message: 'Google Drive desconectado.', googleDrive: { connected: false } });
    }

    const folderInputRaw = rootFolderInput !== undefined
      ? rootFolderInput
      : (rootFolderUrl !== undefined ? rootFolderUrl : rootFolderId);

    const extractedFolderId = folderInputRaw !== undefined
      ? extractDriveIdFromInput(folderInputRaw)
      : (prev.rootFolderId || '');

    const resolvedFolderUrl = extractedFolderId
      ? (String(folderInputRaw || '').startsWith('http') ? String(folderInputRaw).trim() : `https://drive.google.com/drive/folders/${extractedFolderId}`)
      : '';

    const resolvedAutoCreate = autoCreateFolders !== undefined
      ? !!autoCreateFolders
      : (autoCreateClientFolders !== undefined ? !!autoCreateClientFolders : (prev.autoCreateFolders !== false));

    const nextAccessToken = (accessToken && accessToken.trim()) ? accessToken.trim() : (prev.accessToken || null);
    const nextRefreshToken = (refreshToken && refreshToken.trim()) ? refreshToken.trim() : (prev.refreshToken || null);
    const nextClientId = clientId !== undefined ? (clientId.trim() || prev.clientId || null) : (prev.clientId || null);
    const nextClientSecret = (clientSecret && clientSecret.trim()) ? clientSecret.trim() : (prev.clientSecret || null);

    const isConnected = !!(extractedFolderId || nextAccessToken || nextRefreshToken);

    const updated = {
      ...prev,
      connected: isConnected,
      mode: (nextAccessToken || nextRefreshToken) && extractedFolderId ? 'both' : ((nextAccessToken || nextRefreshToken) ? 'oauth' : 'folder_link'),
      rootFolderId: extractedFolderId,
      rootFolderUrl: resolvedFolderUrl,
      rootFolderName: rootFolderName !== undefined ? rootFolderName : (prev.rootFolderName || 'Carpeta Raíz Kônsul Process'),
      folderPathTemplate: folderPathTemplate !== undefined ? normalizeFolderPathTemplate(folderPathTemplate) : normalizeFolderPathTemplate(prev.folderPathTemplate),
      stepSubfolders: stepSubfolders !== undefined ? !!stepSubfolders : !!prev.stepSubfolders,
      matchExistingFolders: matchExistingFolders !== undefined ? !!matchExistingFolders : (prev.matchExistingFolders !== false),
      onlyUseExistingFolders: onlyUseExistingFolders !== undefined ? !!onlyUseExistingFolders : !!prev.onlyUseExistingFolders,
      autoCreateFolders: resolvedAutoCreate,
      autoUploadStepFiles: autoUploadStepFiles !== undefined ? !!autoUploadStepFiles : (prev.autoUploadStepFiles !== false),
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      clientId: nextClientId,
      clientSecret: nextClientSecret
    };

    await pool.query(
      'UPDATE organizations SET google_drive_config = $1 WHERE id = $2',
      [JSON.stringify(updated), req.user.organizationId]
    );

    res.json({
      message: 'Configuración de Google Drive guardada con éxito.',
      googleDrive: {
        connected: updated.connected,
        mode: updated.mode,
        rootFolderId: updated.rootFolderId,
        rootFolderUrl: updated.rootFolderUrl,
        rootFolderName: updated.rootFolderName,
        folderPathTemplate: updated.folderPathTemplate,
        stepSubfolders: updated.stepSubfolders,
        matchExistingFolders: updated.matchExistingFolders,
        onlyUseExistingFolders: updated.onlyUseExistingFolders,
        autoCreateFolders: updated.autoCreateFolders,
        autoCreateClientFolders: updated.autoCreateFolders,
        autoUploadStepFiles: updated.autoUploadStepFiles,
        hasOAuthToken: !!(updated.accessToken || updated.refreshToken),
        connectedEmail: updated.connectedEmail || '',
        email: updated.connectedEmail || '',
        clientId: updated.clientId || '',
        hasClientSecret: !!updated.clientSecret,
        hasPlatformOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      }
    });
  } catch (err) {
    console.error('Error saving Google Drive config:', err);
    res.status(500).json({ error: 'Error al guardar configuración de Google Drive' });
  }
});

// Explore & Sync Workspace Root Folder Tree (discovers categories like REDES SOCIALES and client folders like VOLT FACTORY, RADAR, etc.)
app.post('/api/integrations/google-drive/sync-tree', authenticateToken, async (req, res) => {
  const { rootFolderInput, importMissingClients } = req.body;
  try {
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const accessToken = await getValidGoogleDriveAccessToken(req.user.organizationId, cfg);
    const rootId = extractDriveIdFromInput(rootFolderInput || cfg.rootFolderId || '');

    if (!accessToken) {
      return res.status(400).json({
        error: 'Primero conecta tu cuenta con Google OAuth 2.0 (Paso 1) para que Kônsul Process pueda leer las subcarpetas dentro de tu Carpeta Madre.'
      });
    }
    if (!rootId) {
      return res.status(400).json({
        error: 'Pega el enlace o ID de tu Carpeta Madre (ej. Recurrentes) para explorar sus subcarpetas.'
      });
    }

    const level1Folders = await listChildFoldersInDrive(accessToken, rootId);
    const tree = [];
    const discoveredFoldersFlat = [];

    for (const f1 of level1Folders.slice(0, 30)) {
      const children = await listChildFoldersInDrive(accessToken, f1.id);
      tree.push({
        id: f1.id,
        name: f1.name,
        webViewLink: f1.webViewLink,
        subfolders: children
      });
      discoveredFoldersFlat.push({ ...f1, parentName: '' });
      for (const f2 of children) {
        discoveredFoldersFlat.push({ ...f2, parentName: f1.name });
      }
    }

    const clientsRes = await pool.query('SELECT * FROM clients WHERE organization_id = $1', [req.user.organizationId]);
    const existingClients = clientsRes.rows;
    let linkedCount = 0;
    let importedCount = 0;

    // 1. Auto-link existing clients by case-insensitive name match
    for (const cli of existingClients) {
      const cliNorm = normalizeDriveName(cli.name);
      const match = discoveredFoldersFlat.find(df => normalizeDriveName(df.name) === cliNorm);
      if (match) {
        await pool.query(
          'UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2 WHERE id = $3 AND organization_id = $4',
          [match.id, match.webViewLink, cli.id, req.user.organizationId]
        );
        linkedCount++;
      }
    }

    // 2. Optionally import leaf folders as clients if requested
    if (importMissingClients) {
      const leafFolders = tree.some(t => t.subfolders.length > 0)
        ? tree.flatMap(t => t.subfolders.map(sf => ({ ...sf, parentName: t.name })))
        : level1Folders;

      for (const lf of leafFolders) {
        const lfNorm = normalizeDriveName(lf.name);
        const alreadyExists = existingClients.some(c => normalizeDriveName(c.name) === lfNorm);
        if (!alreadyExists && lf.name) {
          const newClientId = 'cli_' + lf.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 25) + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          await pool.query(
            'INSERT INTO clients (id, organization_id, name, drive_folder_id, drive_folder_url) VALUES ($1, $2, $3, $4, $5)',
            [newClientId, req.user.organizationId, lf.name.trim(), lf.id, lf.webViewLink]
          ).catch(() => {});
          importedCount++;
        }
      }
    }

    const updatedClientsRes = await pool.query('SELECT * FROM clients WHERE organization_id = $1 ORDER BY name ASC', [req.user.organizationId]);

    res.json({
      success: true,
      rootFolderId: rootId,
      tree,
      totalFoldersFound: discoveredFoldersFlat.length,
      linkedCount,
      importedCount,
      clients: updatedClientsRes.rows
    });
  } catch (err) {
    console.error('Error syncing Google Drive folder tree:', err);
    res.status(500).json({ error: 'Error al explorar las subcarpetas de Google Drive' });
  }
});

const resolveGoogleOAuthRedirectUri = (req, preferredOrigin = '') => {
  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }
  let baseOrigin = (preferredOrigin || req.query?.origin || req.headers.origin || '').trim().replace(/\/$/, '');
  if (!baseOrigin) {
    const forwardedProto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = (req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const proto = isLocal ? forwardedProto : 'https';
    baseOrigin = `${proto}://${host}`;
  }
  return `${baseOrigin}/api/integrations/google-drive/oauth/callback`;
};

// Generate OAuth 2.0 Authorization URL for 1-click Google Drive connection
app.get('/api/integrations/google-drive/oauth/url', authenticateToken, async (req, res) => {
  try {
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const clientId = (process.env.GOOGLE_CLIENT_ID || req.query.client_id || cfg.clientId || '').trim();

    if (!clientId) {
      return res.status(400).json({
        error: 'Faltan las variables de entorno GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor (Vercel).'
      });
    }

    const redirectUri = resolveGoogleOAuthRedirectUri(req, req.query.origin);
    const stateToken = jwt.sign(
      { orgId: req.user.organizationId, userId: req.user.id, redirectUri },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', stateToken);

    res.json({ url: authUrl.toString(), redirectUri });
  } catch (err) {
    console.error('Error generating Google Drive OAuth URL:', err);
    res.status(500).json({ error: 'Error al generar URL de autorización de Google Drive' });
  }
});

// Google OAuth 2.0 Callback
app.get('/api/integrations/google-drive/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state) {
    return res.redirect('/?drive_error=' + encodeURIComponent(error || 'missing_code'));
  }

  try {
    const decoded = jwt.verify(state, JWT_SECRET);
    const orgId = decoded.orgId;
    const redirectUri = decoded.redirectUri || resolveGoogleOAuthRedirectUri(req, decoded.redirectOrigin);

    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [orgId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const clientId = (process.env.GOOGLE_CLIENT_ID || cfg.clientId || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || cfg.clientSecret || '').trim();

    if (!clientId || !clientSecret) {
      return res.redirect('/?drive_error=missing_client_credentials');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const errTxt = await tokenRes.text();
      console.error('Google OAuth token exchange failed:', errTxt);
      return res.redirect('/?drive_error=token_exchange_failed');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || cfg.refreshToken || null;

    // Fetch Google user email
    let connectedEmail = cfg.connectedEmail || '';
    try {
      const uInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (uInfoRes.ok) {
        const uInfo = await uInfoRes.json();
        connectedEmail = uInfo.email || connectedEmail;
      }
    } catch (_) {}

    // Ensure root folder "Kônsul Process" if none is configured
    let rootFolderId = cfg.rootFolderId || '';
    let rootFolderUrl = cfg.rootFolderUrl || '';
    let rootFolderName = cfg.rootFolderName || 'Kônsul Process';

    if (!rootFolderId && accessToken) {
      const folder = await findOrCreateDriveFolder(accessToken, 'Kônsul Process');
      if (folder) {
        rootFolderId = folder.id;
        rootFolderUrl = folder.webViewLink;
        rootFolderName = folder.name;
      }
    }

    const updated = {
      ...cfg,
      connected: true,
      mode: 'both',
      accessToken,
      refreshToken,
      tokenExpiry: Date.now() + ((tokenData.expires_in || 3600) * 1000),
      connectedEmail,
      rootFolderId,
      rootFolderUrl,
      rootFolderName,
      autoCreateFolders: cfg.autoCreateFolders !== false,
      autoUploadStepFiles: cfg.autoUploadStepFiles !== false
    };

    await pool.query('UPDATE organizations SET google_drive_config = $1 WHERE id = $2', [JSON.stringify(updated), orgId]);
    res.redirect('/?drive_connected=1');
  } catch (err) {
    console.error('Error in Google Drive OAuth callback:', err);
    res.redirect('/?drive_error=callback_exception');
  }
});

// Test Google Drive Connection (OAuth token + Folder Link/ID)
app.post('/api/integrations/google-drive/test', authenticateToken, async (req, res) => {
  const { rootFolderInput, accessToken: bodyToken } = req.body;
  try {
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const token = bodyToken || await getValidGoogleDriveAccessToken(req.user.organizationId, cfg);
    const folderId = extractDriveIdFromInput(rootFolderInput || cfg.rootFolderId || '');

    if (token) {
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        return res.json({
          success: true,
          mode: 'oauth',
          message: `Conectado con éxito a Google Drive (${aboutData.user?.emailAddress || 'OAuth Activo'})`,
          folderId: folderId || cfg.rootFolderId || ''
        });
      }
    }

    if (folderId) {
      return res.json({
        success: true,
        mode: 'folder_link',
        message: `Carpeta raíz de Google Drive vinculada correctamente (ID: ${folderId}).`,
        folderId,
        folderUrl: `https://drive.google.com/drive/folders/${folderId}`
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Pega un enlace o ID de carpeta de Google Drive válido, o conecta mediante OAuth 2.0.'
    });
  } catch (err) {
    console.error('Error testing Google Drive:', err);
    res.status(500).json({ error: 'Error al verificar la conexión con Google Drive' });
  }
});

// List / Search files and folders in Google Drive
app.get('/api/integrations/google-drive/files', authenticateToken, async (req, res) => {
  const { folder_id, folderId, q, type, pageSize } = req.query;
  const rawFolder = folderId || folder_id;
  try {
    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const accessToken = await getValidGoogleDriveAccessToken(req.user.organizationId, cfg);

    if (!accessToken) {
      return res.json({
        success: true,
        oauthActive: false,
        rootFolderId: cfg.rootFolderId || '',
        rootFolderUrl: cfg.rootFolderUrl || '',
        files: [],
        message: 'Modo Carpeta por Link activo. Puedes pegar directamente el enlace de cualquier archivo o carpeta de Google Drive.'
      });
    }

    const conditions = ['trashed = false'];
    const targetParent = rawFolder ? extractDriveIdFromInput(String(rawFolder)) : '';
    if (targetParent) {
      conditions.push(`'${targetParent}' in parents`);
    }
    if (type === 'folders') {
      conditions.push(`mimeType = 'application/vnd.google-apps.folder'`);
    }
    if (q && String(q).trim()) {
      const safeQ = String(q).trim().replace(/'/g, "\\'");
      conditions.push(`name contains '${safeQ}'`);
    }

    const limit = Math.min(parseInt(pageSize, 10) || 60, 100);
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(conditions.join(' and '))}&fields=files(id,name,mimeType,webViewLink,iconLink,thumbnailLink,size,modifiedTime,owners(displayName,emailAddress))&orderBy=folder desc,name asc&pageSize=${limit}`;
    const driveRes = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      return res.status(driveRes.status).json({ error: `Google Drive API Error: ${errText.substring(0, 120)}` });
    }

    const data = await driveRes.json();
    res.json({
      success: true,
      oauthActive: true,
      files: data.files || []
    });
  } catch (err) {
    console.error('Error listing Google Drive files:', err);
    res.status(500).json({ error: 'Error al consultar archivos de Google Drive' });
  }
});

// Ensure or create Drive folder for an existing execution instance on demand
app.post('/api/integrations/google-drive/ensure-instance-folder', authenticateToken, async (req, res) => {
  const { instanceId } = req.body;
  if (!instanceId) return res.status(400).json({ error: 'instanceId es requerido' });
  try {
    const instRes = await pool.query('SELECT * FROM instances WHERE id = $1 AND organization_id = $2', [instanceId, req.user.organizationId]);
    if (instRes.rows.length === 0) return res.status(404).json({ error: 'Ejecución no encontrada' });
    const inst = instRes.rows[0];

    const folderInfo = await ensureExecutionDriveFolder(req.user.organizationId, {
      id: inst.id,
      title: inst.title,
      instanceName: inst.instance_name
    }, inst.instance_name);

    if (!folderInfo) {
      return res.status(400).json({ error: 'Google Drive no está conectado en este Workspace. Actívalo en Integraciones > Google Drive.' });
    }

    res.json({
      success: true,
      driveFolderId: folderInfo.folderId,
      driveFolderUrl: folderInfo.folderUrl,
      folderName: folderInfo.folderName
    });
  } catch (err) {
    console.error('Error ensuring instance Drive folder:', err);
    res.status(500).json({ error: 'Error al crear/vincular carpeta en Google Drive' });
  }
});

// Set or create a specific Drive subfolder for an execution (and optionally save for its Client)
app.post('/api/integrations/google-drive/set-instance-folder', authenticateToken, async (req, res) => {
  const { instanceId, folderInput, createSubfolderPath, saveForClient } = req.body;
  if (!instanceId) return res.status(400).json({ error: 'instanceId es requerido' });
  try {
    const instRes = await pool.query('SELECT * FROM instances WHERE id = $1 AND organization_id = $2', [instanceId, req.user.organizationId]);
    if (instRes.rows.length === 0) return res.status(404).json({ error: 'Ejecución no encontrada' });
    const inst = instRes.rows[0];

    const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
    const cfg = orgRes.rows[0]?.google_drive_config || {};
    const accessToken = await getValidGoogleDriveAccessToken(req.user.organizationId, cfg);

    let finalFolderId = '';
    let finalFolderUrl = '';
    let finalFolderName = '';

    if (createSubfolderPath && String(createSubfolderPath).trim() && accessToken) {
      const segments = String(createSubfolderPath).split('/').map(sanitizeDriveFolderName).filter(Boolean);
      const baseParentId = extractDriveIdFromInput(folderInput || '') || inst.drive_folder_id || cfg.rootFolderId || null;
      const created = await ensureDriveFolderPath(accessToken, segments, baseParentId);
      if (!created?.id) {
        return res.status(400).json({ error: 'No se pudo crear la subcarpeta en Google Drive.' });
      }
      finalFolderId = created.id;
      finalFolderUrl = created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`;
      finalFolderName = created.name || segments[segments.length - 1];
    } else if (folderInput && String(folderInput).trim()) {
      finalFolderId = extractDriveIdFromInput(folderInput);
      if (!finalFolderId) {
        return res.status(400).json({ error: 'Enlace o ID de subcarpeta de Google Drive inválido.' });
      }
      finalFolderUrl = String(folderInput).trim().startsWith('http')
        ? String(folderInput).trim()
        : `https://drive.google.com/drive/folders/${finalFolderId}`;
      finalFolderName = 'Subcarpeta vinculada';
    } else {
      return res.status(400).json({ error: 'Ingresa el enlace/ID de la subcarpeta o la ruta a crear.' });
    }

    await pool.query(
      'UPDATE instances SET drive_folder_id = $1, drive_folder_url = $2 WHERE id = $3 AND organization_id = $4',
      [finalFolderId, finalFolderUrl, instanceId, req.user.organizationId]
    );

    if (saveForClient && (inst.client_id || inst.instance_name)) {
      if (inst.client_id) {
        await pool.query(
          'UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2 WHERE id = $3 AND organization_id = $4',
          [finalFolderId, finalFolderUrl, inst.client_id, req.user.organizationId]
        ).catch(() => {});
      } else if (inst.instance_name) {
        await pool.query(
          'UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2 WHERE LOWER(name) = LOWER($3) AND organization_id = $4',
          [finalFolderId, finalFolderUrl, inst.instance_name, req.user.organizationId]
        ).catch(() => {});
      }
    }

    res.json({
      success: true,
      driveFolderId: finalFolderId,
      driveFolderUrl: finalFolderUrl,
      folderName: finalFolderName
    });
  } catch (err) {
    console.error('Error setting instance Drive folder:', err);
    res.status(500).json({ error: 'Error al asignar subcarpeta de Google Drive' });
  }
});

// Upload a step deliverable directly to the execution's Google Drive folder
app.post('/api/integrations/google-drive/upload-step-file', authenticateToken, async (req, res) => {
  const { instanceId, stepId, checklistItemId, fileName, mimeType, base64Data } = req.body;
  if (!fileName || !base64Data) {
    return res.status(400).json({ error: 'fileName y base64Data son requeridos' });
  }
  try {
    let parentFolderId = null;
    let stepData = null;
    if (instanceId) {
      const instRes = await pool.query('SELECT id, title, instance_name, drive_folder_id, steps FROM instances WHERE id = $1 AND organization_id = $2', [instanceId, req.user.organizationId]);
      if (instRes.rows.length > 0) {
        const inst = instRes.rows[0];
        parentFolderId = inst.drive_folder_id;
        const allSteps = typeof inst.steps === 'string' ? JSON.parse(inst.steps) : (inst.steps || []);
        stepData = stepId ? allSteps.find(s => String(s.id) === String(stepId)) : null;
        const rootCfgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
        const rootFolderIdCfg = rootCfgRes.rows[0]?.google_drive_config?.rootFolderId || null;
        if (!parentFolderId || parentFolderId === rootFolderIdCfg) {
          const ensured = await ensureExecutionDriveFolder(req.user.organizationId, {
            id: inst.id,
            title: inst.title,
            instanceName: inst.instance_name
          }, '');
          if (ensured?.folderId) parentFolderId = ensured.folderId;
        }
      }
    }

    // Optional subfolder for this step: explicit per-step value > workspace "one subfolder per step" setting
    if (parentFolderId && stepData) {
      const orgCfgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [req.user.organizationId]);
      const driveCfg = orgCfgRes.rows[0]?.google_drive_config || {};
      const subPath = (stepData.driveSubfolder && String(stepData.driveSubfolder).trim())
        || (driveCfg.stepSubfolders ? stepData.title : '');
      if (subPath && parentFolderId !== driveCfg.rootFolderId) {
        const token = await getValidGoogleDriveAccessToken(req.user.organizationId, driveCfg);
        if (token) {
          const segments = String(subPath).split('/').map(sanitizeDriveFolderName).filter(Boolean);
          const sub = await ensureDriveFolderPath(token, segments, parentFolderId);
          if (sub?.id) parentFolderId = sub.id;
        }
      }
    }

    const result = await uploadBase64FileToDrive(req.user.organizationId, {
      fileName,
      mimeType,
      base64Data,
      parentFolderId
    });

    // If uploaded to Drive and instanceId + stepId were provided, persist webViewLink on the checklist item (or step fallback)
    if (result.uploadedToDrive && instanceId && stepId) {
      const instRes = await pool.query('SELECT steps FROM instances WHERE id = $1 AND organization_id = $2', [instanceId, req.user.organizationId]);
      if (instRes.rows.length > 0) {
        const steps = typeof instRes.rows[0].steps === 'string' ? JSON.parse(instRes.rows[0].steps) : (instRes.rows[0].steps || []);
        const updatedSteps = steps.map(s => {
          if (String(s.id) === String(stepId)) {
            if (checklistItemId && Array.isArray(s.checklist)) {
              const updatedChecklist = s.checklist.map((c, idx) => {
                const isTarget = (c.id && String(c.id) === String(checklistItemId)) || String(idx) === String(checklistItemId);
                if (!isTarget) return c;
                return {
                  ...c,
                  isCompleted: true,
                  uploadedFileName: result.fileName || fileName,
                  uploadedFileUrl: result.webViewLink,
                  driveFileId: result.fileId
                };
              });
              return {
                ...s,
                checklist: updatedChecklist
              };
            }
            return {
              ...s,
              uploadedFileName: result.fileName || fileName,
              uploadedFileUrl: result.webViewLink,
              driveFileId: result.fileId
            };
          }
          return s;
        });
        await pool.query('UPDATE instances SET steps = $1 WHERE id = $2 AND organization_id = $3', [JSON.stringify(updatedSteps), instanceId, req.user.organizationId]);
      }
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error uploading step file to Google Drive:', err);
    res.status(500).json({ error: err.message || 'Error al subir archivo a Google Drive' });
  }
});

// Read text content of a Google Drive file / Google Doc / Google Sheet (for Copilot and UI)
app.post('/api/integrations/google-drive/read-file', authenticateToken, async (req, res) => {
  const { fileIdOrUrl } = req.body;
  if (!fileIdOrUrl) return res.status(400).json({ error: 'Enlace o ID de Google Drive requerido.' });
  try {
    const docData = await fetchDriveFileTextContent(req.user.organizationId, fileIdOrUrl);
    res.json({ success: true, ...docData });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Google Drive Automation Rules CRUD (Trigger execution when a file is uploaded to a Drive folder)
app.get('/api/integrations/google-drive/rules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, rule_name as "ruleName", drive_folder_id as "driveFolderId", drive_folder_name as "driveFolderName", file_type_filter as "fileTypeFilter", template_id as "templateId", active, status, title_pattern as "titlePattern", last_checked_at as "lastCheckedAt" FROM google_drive_rules WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.user.organizationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching Drive rules:', err);
    res.status(500).json({ error: 'Error al obtener reglas de Google Drive' });
  }
});

app.post('/api/integrations/google-drive/rules', authenticateToken, async (req, res) => {
  const { ruleName, driveFolderInput, driveFolderName, fileTypeFilter, templateId, titlePattern } = req.body;
  const folderId = extractDriveIdFromInput(driveFolderInput);
  if (!ruleName || !folderId || !templateId) {
    return res.status(400).json({ error: 'Nombre de regla, Carpeta de Drive y Plantilla son obligatorios.' });
  }
  const status = req.user.role === 'gerente' ? 'pending_approval' : 'approved';
  try {
    const result = await pool.query(
      `INSERT INTO google_drive_rules (organization_id, rule_name, drive_folder_id, drive_folder_name, file_type_filter, template_id, title_pattern, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, rule_name as "ruleName", drive_folder_id as "driveFolderId", drive_folder_name as "driveFolderName", file_type_filter as "fileTypeFilter", template_id as "templateId", active, status, title_pattern as "titlePattern"`,
      [
        req.user.organizationId,
        ruleName,
        folderId,
        driveFolderName || `Carpeta (${folderId.substring(0, 8)})`,
        fileTypeFilter || 'any',
        templateId,
        titlePattern || '{template_title} - {file_name}',
        status
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating Google Drive rule:', err);
    res.status(500).json({ error: 'Error al crear regla de Google Drive' });
  }
});

app.delete('/api/integrations/google-drive/rules/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM google_drive_rules WHERE id = $1 AND organization_id = $2', [req.params.id, req.user.organizationId]);
    res.json({ message: 'Regla de Google Drive eliminada con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar regla de Google Drive' });
  }
});

// Helper to launch an execution from a Google Drive file event
const launchExecutionFromDriveFile = async (rule, fileInfo, reqOrigin = 'https://process-opal.vercel.app') => {
  const templateRes = await pool.query(
    "SELECT * FROM templates WHERE id = $1 AND organization_id = $2 AND (status = 'approved' OR status IS NULL)",
    [rule.template_id, rule.organization_id]
  );
  if (templateRes.rows.length === 0) return null;

  const template = templateRes.rows[0];
  const startedAt = new Date().toISOString();
  const instanceId = `inst_drive_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const fileName = fileInfo.name || 'Archivo_Drive';
  const fileUrl = fileInfo.webViewLink || (fileInfo.id ? `https://drive.google.com/file/d/${fileInfo.id}/view` : null);

  const rawSteps = Array.isArray(template.steps) ? template.steps : (typeof template.steps === 'string' ? JSON.parse(template.steps) : []);
  const steps = rawSteps.map((step, idx) => {
    const dueDate = new Date(startedAt);
    dueDate.setDate(dueDate.getDate() + (step.durationDays || step.relativeOffsetDays || 1));
    const attachToFirst = idx === 0 && fileUrl;
    return {
      ...step,
      id: step.id || `step_run_${idx}_${Date.now()}`,
      dueDate: dueDate.toISOString(),
      isCompleted: false,
      completedAt: null,
      uploadedFileName: attachToFirst ? fileName : (step.uploadedFileName || null),
      uploadedFileUrl: attachToFirst ? fileUrl : (step.uploadedFileUrl || null),
      driveFileId: attachToFirst ? (fileInfo.id || null) : null
    };
  });

  let instanceName = rule.title_pattern || '{template_title} - {file_name}';
  instanceName = instanceName
    .replace(/{file_name}/g, fileName.replace(/\.[^/.]+$/, ''))
    .replace(/{template_title}/g, template.title || '')
    .replace(/{folder_name}/g, rule.drive_folder_name || '');

  const folderUrl = `https://drive.google.com/drive/folders/${rule.drive_folder_id}`;

  await pool.query(
    `INSERT INTO instances (id, organization_id, template_id, title, instance_name, started_at, companion_name, companion_avatar, companion_greeting, category, steps, status, priority, drive_folder_id, drive_folder_url, attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Por hacer', 'Media', $12, $13, $14)`,
    [
      instanceId,
      rule.organization_id,
      template.id,
      template.title,
      instanceName,
      startedAt,
      template.companion_name || 'Lumi',
      template.companion_avatar || '✨',
      template.companion_greeting || '¡Nuevo archivo detectado en Google Drive!',
      template.category || 'General',
      JSON.stringify(steps),
      rule.drive_folder_id,
      folderUrl,
      JSON.stringify(fileUrl ? [{ id: `att_${Date.now()}`, name: fileName, url: fileUrl, source: 'google_drive' }] : [])
    ]
  );

  await notifyTeamOnExecutionLaunch(rule.organization_id, {
    id: instanceId,
    title: template.title,
    instanceName,
    steps
  }, reqOrigin);

  return { instanceId, instanceName, templateTitle: template.title };
};

// Poll / Sync active Google Drive rules to detect newly uploaded files in watched folders
app.post('/api/integrations/google-drive/sync-rules', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const accessToken = await getValidGoogleDriveAccessToken(orgId);
    if (!accessToken) {
      return res.status(400).json({ error: 'Se requiere conexión OAuth 2.0 activa para escanear carpetas automáticamente, o usa el Webhook de Google Drive.' });
    }

    const rulesRes = await pool.query(
      "SELECT * FROM google_drive_rules WHERE organization_id = $1 AND active = TRUE AND (status = 'approved' OR status IS NULL)",
      [orgId]
    );

    const launched = [];
    const reqOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

    for (const rule of rulesRes.rows) {
      const processedIds = Array.isArray(rule.processed_file_ids) ? rule.processed_file_ids : [];
      const q = `'${rule.drive_folder_id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
      const filesRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!filesRes.ok) continue;

      const filesData = await filesRes.json();
      const files = filesData.files || [];

      // On first sync, if processed_file_ids is empty, only trigger on the newest file created in the last 24h and mark older ones as seen
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      let updatedProcessed = [...processedIds];

      for (const f of files) {
        if (updatedProcessed.includes(f.id)) continue;
        const createdMs = f.createdTime ? new Date(f.createdTime).getTime() : Date.now();
        if (processedIds.length === 0 && createdMs < cutoff) {
          updatedProcessed.push(f.id);
          continue;
        }

        const execInfo = await launchExecutionFromDriveFile(rule, f, reqOrigin);
        if (execInfo) {
          launched.push({ file: f.name, ...execInfo });
          updatedProcessed.push(f.id);
        }
      }

      await pool.query(
        'UPDATE google_drive_rules SET processed_file_ids = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(updatedProcessed.slice(-200)), rule.id]
      );
    }

    res.json({
      success: true,
      launchedCount: launched.length,
      launched
    });
  } catch (err) {
    console.error('Error syncing Google Drive rules:', err);
    res.status(500).json({ error: 'Error al sincronizar reglas de Google Drive' });
  }
});

// Webhook receiver for Google Drive file uploads (compatible with Google Apps Script, Make, Zapier, Suite, or Drive Push)
app.post('/api/webhooks/google-drive', async (req, res) => {
  const { folderId, folder_id, fileId, file_id, fileName, file_name, fileUrl, file_url, mimeType } = req.body;
  const resolvedFolderId = extractDriveIdFromInput(folderId || folder_id || '');
  if (!resolvedFolderId) {
    return res.status(200).json({ message: 'Sin folderId para procesar.' });
  }

  try {
    const rulesRes = await pool.query(
      "SELECT * FROM google_drive_rules WHERE drive_folder_id = $1 AND active = TRUE AND (status = 'approved' OR status IS NULL)",
      [resolvedFolderId]
    );
    if (rulesRes.rows.length === 0) {
      return res.status(200).json({ message: 'No hay reglas activas para esta carpeta de Google Drive.' });
    }

    const launched = [];
    const reqOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const fileInfo = {
      id: fileId || file_id || `drv_${Date.now()}`,
      name: fileName || file_name || 'Documento_Drive',
      webViewLink: fileUrl || file_url || null,
      mimeType: mimeType || 'application/octet-stream'
    };

    for (const rule of rulesRes.rows) {
      const processedIds = Array.isArray(rule.processed_file_ids) ? rule.processed_file_ids : [];
      if (fileInfo.id && processedIds.includes(fileInfo.id)) continue;

      const execInfo = await launchExecutionFromDriveFile(rule, fileInfo, reqOrigin);
      if (execInfo) {
        launched.push(execInfo);
        if (fileInfo.id) {
          await pool.query(
            'UPDATE google_drive_rules SET processed_file_ids = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify([...processedIds, fileInfo.id].slice(-200)), rule.id]
          );
        }
      }
    }

    res.status(200).json({ success: true, launchedCount: launched.length, launched });
  } catch (err) {
    console.error('Error processing Google Drive webhook:', err);
    res.status(500).json({ error: 'Error procesando webhook de Google Drive' });
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
    const key = 'kp_live_' + crypto.randomBytes(24).toString('hex');
    
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

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: "ok",
    app: "konsulprocess"
  });
});

// Helpers for template variables extraction and injection
function extractVariables(template) {
  const vars = new Set();
  const regex = /\{([a-zA-Z0-9_-]+)\}/g;
  
  const searchString = JSON.stringify({
    title: template.title,
    description: template.description,
    steps: template.steps
  });
  
  let match;
  while ((match = regex.exec(searchString)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

function replaceVariables(text, variables) {
  if (!text) return '';
  let result = typeof text === 'object' ? JSON.stringify(text) : String(text);
  for (const [key, value] of Object.entries(variables || {})) {
    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), valStr);
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), valStr);
  }
  return typeof text === 'object' ? JSON.parse(result) : result;
}

// Get all templates for the organization (including multi-workspace memberships by email)
app.get('/api/v1/templates', authenticateApiKey, async (req, res) => {
  try {
    const userEmail = (req.headers['x-user-email'] || req.user?.email || '').trim();
    const result = await pool.query(
      `SELECT * FROM templates
       WHERE status = 'approved'
         AND (
           organization_id = $1
           OR ($2 <> '' AND organization_id IN (
             SELECT organization_id FROM users WHERE LOWER(TRIM(email)) = LOWER($2)
             UNION
             SELECT organization_id FROM team_members WHERE LOWER(TRIM(email)) = LOWER($2)
           ))
         )
       ORDER BY created_at DESC`,
      [req.user.organizationId, userEmail]
    );
    const mapped = result.rows.map(row => {
      const templateVars = extractVariables(row);
      
      // Inject default execution variables
      if (!templateVars.includes('Cliente / Nombre de la Ejecución')) {
        templateVars.push('Cliente / Nombre de la Ejecución');
      }
      if (!templateVars.includes('Fecha de Inicio')) {
        templateVars.push('Fecha de Inicio');
      }
      if (!templateVars.includes('Documento Adjunto (URL)')) {
        templateVars.push('Documento Adjunto (URL)');
      }
      if (!templateVars.includes('Notas / Resumen')) {
        templateVars.push('Notas / Resumen');
      }

      return {
        id: row.id,
        name: row.title,
        description: row.description,
        variables: templateVars
      };
    });
    res.json({
      success: true,
      data: mapped
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error al recuperar plantillas de la base de datos"
      }
    });
  }
});

// Execute a template programmatically
app.post('/api/v1/templates/execute', authenticateApiKey, async (req, res) => {
  const { template_id, variables } = req.body;
  if (!template_id) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "El template_id es requerido."
      }
    });
  }

  try {
    const userEmail = (req.headers['x-user-email'] || req.user?.email || '').trim();
    const templateRes = await pool.query(
      `SELECT * FROM templates
       WHERE id = $1
         AND (
           organization_id = $2
           OR ($3 <> '' AND organization_id IN (
             SELECT organization_id FROM users WHERE LOWER(TRIM(email)) = LOWER($3)
             UNION
             SELECT organization_id FROM team_members WHERE LOWER(TRIM(email)) = LOWER($3)
           ))
         )`,
      [template_id, req.user.organizationId, userEmail]
    );

    if (templateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Plantilla no encontrada o no pertenece a tu organización."
        }
      });
    }

    const template = templateRes.rows[0];
    req.user.organizationId = template.organization_id;
    const instId = 'inst_' + crypto.randomBytes(12).toString('hex');

    // Resolve custom start date from variables
    const customStartDate = variables?.['Fecha de Inicio'] || variables?.['fecha_inicio'];
    const startedAt = customStartDate ? new Date(customStartDate).toISOString() : new Date().toISOString();

    // Resolve custom instance name from variables
    const customInstanceName = variables?.['Nombre de la Ejecución / Proceso'] 
      || variables?.['Nombre de la Ejecución'] 
      || variables?.['execution_name']
      || variables?.['process_name']
      || variables?.['Cliente / Nombre de la Ejecución'] 
      || variables?.['cliente'];
    
    // Resolve client name
    const rawClientName = req.body.client_name 
      || req.body.client 
      || req.body.customer_name 
      || variables?.['Cliente Asociado'] 
      || variables?.['client_name'] 
      || variables?.['client'] 
      || variables?.['customer_name'] 
      || variables?.['Nombre del Cliente'] 
      || variables?.['Nombre de Empresa'] 
      || '';
    const targetClientName = String(rawClientName || '').trim();

    const instanceName = customInstanceName || (targetClientName ? targetClientName : (replaceVariables(template.title, variables) || template.title));

    // Resolve client email
    const rawClientEmail = req.body.customer_email
      || req.body.client_email
      || req.body.email
      || variables?.['Email del Cliente / Lead']
      || variables?.['Email del Cliente']
      || variables?.['Email del Lead']
      || variables?.['customer_email']
      || variables?.['client_email']
      || variables?.['contact_email']
      || variables?.['email']
      || '';
    const targetClientEmail = String(rawClientEmail || '').trim();

    // Auto-create or link client in organization
    let resolvedClientId = req.body.clientId || req.body.client_id || variables?.['clientId'] || null;
    if (targetClientName && !resolvedClientId) {
      const clientSearch = await pool.query(
        'SELECT id, email FROM clients WHERE organization_id = $1 AND LOWER(TRIM(name)) = LOWER($2) LIMIT 1',
        [req.user.organizationId, targetClientName]
      );
      if (clientSearch.rows.length > 0) {
        resolvedClientId = clientSearch.rows[0].id;
        // Si el cliente ya existía pero no tenía email registrado y ahora sí viene, actualizar su email
        if (targetClientEmail && (!clientSearch.rows[0].email || clientSearch.rows[0].email.trim() === '')) {
          await pool.query(
            'UPDATE clients SET email = $1 WHERE id = $2 AND organization_id = $3',
            [targetClientEmail, resolvedClientId, req.user.organizationId]
          ).catch(() => {});
        }
      } else {
        const newClientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const defaultChecklist = [
          { id: 'chk_1', text: 'Onboarding y Bienvenida completado', isCompleted: false },
          { id: 'chk_2', text: 'Documentación y accesos recibidos', isCompleted: false },
          { id: 'chk_3', text: 'Carpeta de Google Drive vinculada', isCompleted: false },
          { id: 'chk_4', text: 'Reunión inicial realizada', isCompleted: false }
        ];
        const newClientRes = await pool.query(
          `INSERT INTO clients (id, organization_id, name, email, checklist)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [newClientId, req.user.organizationId, targetClientName, targetClientEmail || null, JSON.stringify(defaultChecklist)]
        );
        resolvedClientId = newClientRes.rows[0]?.id || newClientId;
      }
    }

    // Resolve target member email from variables
    let targetEmail = variables?.['Miembro Involucrado (Email)'] || variables?.['miembro_email'] || variables?.['email_miembro'];

    if (!targetEmail) {
      // Find the first admin or user in the organization to assign as default
      const userRes = await pool.query(
        "SELECT email FROM users WHERE organization_id = $1 ORDER BY role = 'admin' DESC, id ASC LIMIT 1",
        [req.user.organizationId]
      );
      if (userRes.rows.length > 0) {
        targetEmail = userRes.rows[0].email;
      }
    }

    // Resolve attached document from variables
    const attachedDocUrl = variables?.['Documento Adjunto (URL)'] 
      || variables?.['Documento Adjunto (URL / PDF)']
      || variables?.['Documento Adjunto'] 
      || variables?.['documento_url']
      || variables?.['receipt_url']
      || variables?.['archivo_url'];

    const attachedDocName = variables?.['Nombre del Documento'] 
      || (variables?.['ID de Factura / Documento'] ? `Factura_${variables['ID de Factura / Documento']}.pdf` : null)
      || (attachedDocUrl ? 'Documento_Factura.pdf' : null);

    const stepsWithDates = (template.steps || []).map((step, idx) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (step.relativeOffsetDays || 1));
      
      const shouldAttach = (step.requiresAttachment || idx === 0) && !!attachedDocUrl;

      return {
        ...step,
        id: step.id || `step_run_${idx}_${Date.now()}`,
        title: replaceVariables(step.title, variables) || '',
        description: replaceVariables(step.description, variables) || '',
        motivation: replaceVariables(step.motivation, variables) || '',
        assignedTo: (step.assignedTo && step.assignedTo !== 'Unassigned') ? step.assignedTo : (targetEmail || 'Unassigned'),
        isCompleted: shouldAttach ? true : false,
        completedAt: shouldAttach ? new Date().toISOString() : null,
        completedBy: shouldAttach ? 'Kônsul Automations' : null,
        dueDate: dueDate.toISOString(),
        uploadedFileName: shouldAttach ? (attachedDocName || 'Documento_Factura.pdf') : (step.uploadedFileName || null),
        uploadedFileUrl: shouldAttach ? attachedDocUrl : (step.uploadedFileUrl || null)
      };
    });

    await pool.query(
      `INSERT INTO instances (id, organization_id, template_id, title, instance_name, client_id, started_at, companion_name, companion_avatar, companion_greeting, category, steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        instId,
        req.user.organizationId,
        template_id,
        template.title,
        instanceName,
        resolvedClientId || null,
        startedAt,
        template.companion_name,
        template.companion_avatar,
        template.companion_greeting,
        template.category,
        JSON.stringify(stepsWithDates)
      ]
    );

    const driveInfo = await ensureExecutionDriveFolder(
      req.user.organizationId, 
      { id: instId, title: template.title, instanceName }, 
      targetClientName || instanceName
    ).catch(() => null);

    if (driveInfo?.folderId && resolvedClientId) {
      await pool.query(
        `UPDATE clients SET drive_folder_id = $1, drive_folder_url = $2
         WHERE id = $3 AND organization_id = $4 AND (drive_folder_id IS NULL OR drive_folder_id = '')`,
        [driveInfo.folderId, driveInfo.folderUrl, resolvedClientId, req.user.organizationId]
      ).catch(() => {});
    }

    const reqOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    await notifyTeamOnExecutionLaunch(req.user.organizationId, {
      id: instId,
      title: template.title,
      instanceName,
      steps: stepsWithDates
    }, reqOrigin);

    triggerProcessAutomation('Nueva Tarea / Tarjeta', req.user, {
      'Título de Tarea': instanceName,
      'Cliente Asociado': targetClientName || instanceName,
      'Descripción': `Plantilla ${template.title} ejecutada vía API`,
      'Miembro Asignado': targetEmail || 'Admin'
    });

    res.status(201).json({
      success: true,
      message: "Instancia de proceso iniciada con éxito.",
      execution_id: instId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error al iniciar la ejecución del proceso"
      }
    });
  }
});

// Get team members of the organization
app.get('/api/v1/team-members', authenticateApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email FROM team_members WHERE organization_id = $1',
      [req.user.organizationId]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener miembros del equipo:', err);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error al recuperar miembros del equipo de la base de datos."
      }
    });
  }
});

// Helper for computing client traffic light status
function computeClientTrafficLight(checklist) {
  if (!checklist) return { statusKey: 'red', percentage: 0, completedCount: 0, totalCount: 0, items: [] };
  let items = [];
  if (Array.isArray(checklist.items)) items = checklist.items;
  else if (Array.isArray(checklist)) items = checklist;
  else if (typeof checklist === 'object') {
    if (checklist.carrusel) items.push({ ...checklist.carrusel, name: 'Carrusel', type: 'counter' });
    if (checklist.post) items.push({ ...checklist.post, name: 'Post', type: 'counter' });
    if (checklist.video) items.push({ ...checklist.video, name: 'Video', type: 'counter' });
    if (checklist.facturaPaga) items.push({ checked: !!checklist.facturaPaga.checked, name: 'Factura Paga', type: 'boolean' });
    if (checklist.adsRating !== undefined) items.push({ rating: checklist.adsRating, name: 'Ads Según Cliente', type: 'rating' });
  }

  if (items.length === 0) return { statusKey: 'red', percentage: 0, completedCount: 0, totalCount: 0, items: [] };

  let completed = 0;
  for (const it of items) {
    if (it.type === 'counter') {
      const tgt = Number(it.target) || 1;
      const curr = Number(it.current) || 0;
      if (it.checked || (tgt > 0 && curr >= tgt)) completed++;
    } else if (it.type === 'rating') {
      if (it.rating === 'Excelente' || it.rating === 'Bueno') completed++;
    } else {
      if (it.checked) completed++;
    }
  }

  const pct = Math.round((completed / items.length) * 100);
  const statusKey = pct >= 80 ? 'green' : pct >= 40 ? 'yellow' : 'red';
  return { statusKey, percentage: pct, completedCount: completed, totalCount: items.length, items };
}

// ----------------------------------------------------------------------------
// EXECUTIONS API V1
// ----------------------------------------------------------------------------

// List all process executions (instances) with optional filtering
app.get('/api/v1/executions', authenticateApiKey, async (req, res) => {
  const { client_id, status, limit = 50, offset = 0 } = req.query;
  try {
    let query = 'SELECT * FROM instances WHERE organization_id = $1';
    const params = [req.user.organizationId];
    let pIdx = 2;

    if (client_id) {
      query += ` AND client_id = $${pIdx++}`;
      params.push(client_id);
    }
    if (status) {
      query += ` AND status = $${pIdx++}`;
      params.push(status);
    }

    query += ` ORDER BY started_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(query, params);
    const data = result.rows.map(row => {
      const steps = typeof row.steps === 'string' ? JSON.parse(row.steps) : (row.steps || []);
      const completedSteps = steps.filter(s => s.isCompleted).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      return {
        id: row.id,
        templateId: row.template_id,
        title: row.title,
        instanceName: row.instance_name,
        clientId: row.client_id,
        status: row.status || 'Por hacer',
        priority: row.priority || 'Media',
        startedAt: row.started_at,
        totalSteps,
        completedSteps,
        progressPercentage: progress
      };
    });

    res.json({
      success: true,
      data,
      meta: {
        app: "konsulprocess",
        version: "1",
        count: data.length
      }
    });
  } catch (err) {
    console.error('API v1 List Executions error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error al listar ejecuciones' }
    });
  }
});

// Create/trigger a new process execution (instance)
app.post('/api/v1/executions', authenticateApiKey, async (req, res) => {
  const { templateId, instanceName, clientId, clientName, category, priority, variables, assignedTo } = req.body;
  if (!templateId || !instanceName) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "El templateId e instanceName son requeridos."
      }
    });
  }

  try {
    const userEmail = (req.headers['x-user-email'] || req.user?.email || '').trim();
    const templateRes = await pool.query(
      `SELECT * FROM templates
       WHERE id = $1
         AND (
           organization_id = $2
           OR ($3 <> '' AND organization_id IN (
             SELECT organization_id FROM users WHERE LOWER(TRIM(email)) = LOWER($3)
             UNION
             SELECT organization_id FROM team_members WHERE LOWER(TRIM(email)) = LOWER($3)
           ))
         )`,
      [templateId, req.user.organizationId, userEmail]
    );

    if (templateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Plantilla no encontrada o no pertenece a tu organización."
        }
      });
    }

    const template = templateRes.rows[0];
    req.user.organizationId = template.organization_id;
    const instId = 'inst_' + crypto.randomBytes(12).toString('hex');
    const startedAt = new Date().toISOString();

    // Resolve or auto-register client
    let resolvedClientId = clientId || null;
    let resolvedClientName = clientName || instanceName;
    if (!resolvedClientId && resolvedClientName) {
      const findCli = await pool.query('SELECT id, name FROM clients WHERE organization_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1', [req.user.organizationId, resolvedClientName.trim()]);
      if (findCli.rows.length > 0) {
        resolvedClientId = findCli.rows[0].id;
        resolvedClientName = findCli.rows[0].name;
      } else {
        resolvedClientId = 'cli_' + resolvedClientName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now();
        await pool.query(
          `INSERT INTO clients (id, organization_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
          [resolvedClientId, req.user.organizationId, resolvedClientName.trim()]
        );
      }
    }
    
    // Map dates and checklists to template steps
    const rawTemplateSteps = typeof template.steps === 'string' ? JSON.parse(template.steps) : (template.steps || []);
    const stepsWithDates = rawTemplateSteps.map((step, idx) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (step.durationDays || step.relativeOffsetDays || 1));
      
      const rawChecklist = Array.isArray(step.checklist) ? step.checklist : [];
      const checklist = rawChecklist.map((c, cIdx) => ({
        id: c.id || `chk_${idx + 1}_${cIdx + 1}_${Date.now()}`,
        text: typeof c === 'string' ? c : (c.text || c.title || String(c)),
        isCompleted: false
      }));

      return {
        id: step.id || `step_${idx + 1}_${Date.now()}`,
        title: replaceVariables(step.title || step.label || `Paso ${idx + 1}`, variables),
        description: replaceVariables(step.description || '', variables),
        motivation: step.motivation || '',
        type: step.type || 'manual',
        leadId: step.leadId || '',
        assignedTo: step.assignedTo || assignedTo || 'Unassigned',
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        dueDate: dueDate.toISOString(),
        options: step.options || [],
        checklist: checklist
      };
    });

    await pool.query(
      `INSERT INTO instances (id, organization_id, template_id, title, instance_name, client_id, started_at, companion_name, companion_avatar, companion_greeting, category, steps, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        instId,
        req.user.organizationId,
        templateId,
        template.title,
        instanceName,
        resolvedClientId,
        startedAt,
        template.companion_name,
        template.companion_avatar,
        template.companion_greeting,
        category || template.category || 'General',
        JSON.stringify(stepsWithDates),
        'Por hacer',
        priority || 'Media'
      ]
    );

    // Notify team members (Encargados & Asignados) via Email
    const reqOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    await notifyTeamOnExecutionLaunch(req.user.organizationId, {
      id: instId,
      title: template.title,
      instanceName,
      priority: priority || 'Media',
      steps: stepsWithDates
    }, reqOrigin);

    // Notify Suite Automations engine
    triggerProcessAutomation('Nueva Tarea / Tarjeta', req.user, {
      'Título de Tarea': instanceName,
      'Descripción': `Plantilla "${template.title}" ejecutada vía API v1`,
      'Plantilla': template.title,
      'Cliente': resolvedClientName,
      'ID de Ejecución': instId
    });

    res.status(201).json({
      success: true,
      data: {
        id: instId,
        title: template.title,
        instanceName,
        clientId: resolvedClientId,
        startedAt,
        status: 'Por hacer',
        priority: priority || 'Media',
        totalSteps: stepsWithDates.length,
        steps: stepsWithDates
      },
      meta: {
        app: "konsulprocess",
        version: "1"
      }
    });
  } catch (err) {
    console.error('API v1 Create Execution error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error al iniciar la ejecución programáticamente"
      }
    });
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
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Ejecución no encontrada."
        }
      });
    }

    const row = result.rows[0];
    const steps = typeof row.steps === 'string' ? JSON.parse(row.steps) : (row.steps || []);
    const completedSteps = steps.filter(s => s.isCompleted).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const currentStep = steps.find(s => !s.isCompleted) || null;

    res.json({
      success: true,
      data: {
        id: row.id,
        templateId: row.template_id,
        title: row.title,
        instanceName: row.instance_name,
        clientId: row.client_id,
        startedAt: row.started_at,
        companionName: row.companion_name,
        category: row.category,
        status: row.status || 'Por hacer',
        priority: row.priority || 'Media',
        totalSteps,
        completedSteps,
        progressPercentage: progress,
        currentStep: currentStep ? { id: currentStep.id, title: currentStep.title || currentStep.label, dueDate: currentStep.dueDate } : null,
        steps: steps
      },
      meta: {
        app: "konsulprocess",
        version: "1"
      }
    });
  } catch (err) {
    console.error('API v1 Get Execution Details error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Error al obtener detalles del proceso"
      }
    });
  }
});

// Complete a step programmatically from LeadsHUB or Suite
app.post('/api/v1/executions/:id/steps/:stepId/complete', authenticateApiKey, async (req, res) => {
  const { id, stepId } = req.params;
  const { completedBy, notes, uploadedFileName, uploadedFileUrl } = req.body;
  try {
    const instRes = await pool.query('SELECT * FROM instances WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    if (instRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ejecución no encontrada' } });
    }

    const inst = instRes.rows[0];
    const steps = typeof inst.steps === 'string' ? JSON.parse(inst.steps) : (inst.steps || []);
    const stepIndex = steps.findIndex(s => String(s.id) === String(stepId));

    if (stepIndex === -1) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Paso no encontrado en esta ejecución' } });
    }

    steps[stepIndex].isCompleted = true;
    steps[stepIndex].completedAt = new Date().toISOString();
    steps[stepIndex].completedBy = completedBy || 'API / LeadsHUB';
    if (uploadedFileName) steps[stepIndex].uploadedFileName = uploadedFileName;
    if (uploadedFileUrl) steps[stepIndex].uploadedFileUrl = uploadedFileUrl;
    if (notes) {
      steps[stepIndex].comments = steps[stepIndex].comments || [];
      steps[stepIndex].comments.push({
        id: `c_${Date.now()}`,
        userName: completedBy || 'API',
        text: notes,
        timestamp: new Date().toISOString()
      });
    }

    // Auto-mark checklist items as completed if step is completed
    if (Array.isArray(steps[stepIndex].checklist)) {
      steps[stepIndex].checklist = steps[stepIndex].checklist.map(c => ({ ...c, isCompleted: true }));
    }

    const allCompleted = steps.every(s => s.isCompleted);
    let newStatus = inst.status || 'Por hacer';
    if (allCompleted && inst.status !== 'Terminado') {
      newStatus = 'Terminado';
    }

    await pool.query(
      'UPDATE instances SET steps = $1, status = $2 WHERE id = $3 AND organization_id = $4',
      [JSON.stringify(steps), newStatus, id, req.user.organizationId]
    );

    // Notify Suite
    triggerProcessAutomation('Paso de Tarea Completado', req.user, {
      'ID de Ejecución': id,
      'ID del Paso': stepId,
      'Título del Paso': steps[stepIndex].title || steps[stepIndex].label || 'Paso',
      'Título de Ejecución': inst.instance_name || inst.title,
      'Completado Por': completedBy || 'API'
    });

    if (allCompleted) {
      triggerProcessAutomation('Proceso Completado', req.user, {
        'ID de Ejecución': id,
        'Título de Ejecución': inst.instance_name || inst.title,
        'Plantilla': inst.title,
        'Fecha de Finalización': new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        stepId,
        isCompleted: true,
        completedAt: steps[stepIndex].completedAt,
        allCompleted,
        currentStatus: newStatus
      },
      meta: { app: 'konsulprocess', version: '1' }
    });
  } catch (err) {
    console.error('API Complete Step error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al completar el paso' } });
  }
});

// ----------------------------------------------------------------------------
// CLIENTS & SEMAFORO API V1
// ----------------------------------------------------------------------------

// List all clients with traffic light / health score
app.get('/api/v1/clients', authenticateApiKey, async (req, res) => {
  try {
    const clientsRes = await pool.query(
      'SELECT id, name, checklist, created_at FROM clients WHERE organization_id = $1 ORDER BY name ASC',
      [req.user.organizationId]
    );

    // Get execution counts per client
    const instCountsRes = await pool.query(
      `SELECT client_id, 
              COUNT(*) as total, 
              COUNT(*) FILTER (WHERE status = 'Terminado') as completed,
              COUNT(*) FILTER (WHERE status != 'Terminado') as active
       FROM instances 
       WHERE organization_id = $1 AND client_id IS NOT NULL 
       GROUP BY client_id`,
      [req.user.organizationId]
    );
    const countMap = {};
    instCountsRes.rows.forEach(r => {
      countMap[r.client_id] = {
        total: parseInt(r.total, 10),
        active: parseInt(r.active, 10),
        completed: parseInt(r.completed, 10)
      };
    });

    const clientsWithSemaforo = clientsRes.rows.map(c => {
      const semaforo = computeClientTrafficLight(c.checklist);
      const counts = countMap[c.id] || { total: 0, active: 0, completed: 0 };
      return {
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
        trafficLight: semaforo.statusKey,
        checklistPercentage: semaforo.percentage,
        checklistCompletedCount: semaforo.completedCount,
        checklistTotalCount: semaforo.totalCount,
        activeExecutions: counts.active,
        completedExecutions: counts.completed,
        totalExecutions: counts.total
      };
    });

    res.json({
      success: true,
      data: clientsWithSemaforo,
      meta: { app: 'konsulprocess', version: '1', count: clientsWithSemaforo.length }
    });
  } catch (err) {
    console.error('API v1 List Clients error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al listar clientes' } });
  }
});

// Create or update a client
app.post('/api/v1/clients', authenticateApiKey, async (req, res) => {
  const { id, name, checklist } = req.body;
  if (!name || !name.trim()) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'El nombre del cliente es requerido.' } });
  }
  try {
    const clientId = id || ('cli_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now());
    const defaultChecklist = checklist || [
      { id: 'item_carrusel', name: 'Carrusel', type: 'counter', checked: false, current: 0, target: 4 },
      { id: 'item_post', name: 'Post', type: 'counter', checked: false, current: 0, target: 12 },
      { id: 'item_video', name: 'Video', type: 'counter', checked: false, current: 0, target: 6 },
      { id: 'item_factura', name: 'Factura Paga', type: 'boolean', checked: false },
      { id: 'item_ads', name: 'Ads Según Cliente', type: 'rating', rating: 'Excelente' }
    ];

    const result = await pool.query(
      `INSERT INTO clients (id, organization_id, name, checklist)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name,
         checklist = COALESCE(EXCLUDED.checklist, clients.checklist)
       RETURNING *`,
      [clientId, req.user.organizationId, name.trim(), JSON.stringify(defaultChecklist)]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      meta: { app: 'konsulprocess', version: '1' }
    });
  } catch (err) {
    console.error('API v1 Create Client error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al crear cliente' } });
  }
});

// Get client by id
app.get('/api/v1/clients/:id', authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  try {
    const clientRes = await pool.query('SELECT * FROM clients WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' } });
    }
    const client = clientRes.rows[0];
    const semaforo = computeClientTrafficLight(client.checklist);
    res.json({
      success: true,
      data: {
        id: client.id,
        name: client.name,
        createdAt: client.created_at,
        checklist: client.checklist,
        trafficLight: semaforo.statusKey,
        percentage: semaforo.percentage,
        completedCount: semaforo.completedCount,
        totalCount: semaforo.totalCount
      },
      meta: { app: 'konsulprocess', version: '1' }
    });
  } catch (err) {
    console.error('API v1 Get Client error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener cliente' } });
  }
});

// Delete client by id
app.delete('/api/v1/clients/:id', authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  try {
    const clientRes = await pool.query('SELECT * FROM clients WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cliente no encontrado' } });
    }
    await pool.query('UPDATE instances SET client_id = NULL WHERE client_id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    await pool.query('DELETE FROM clients WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    res.json({ success: true, message: 'Cliente eliminado correctamente', meta: { app: 'konsulprocess', version: '1' } });
  } catch (err) {
    console.error('API v1 Delete Client error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al eliminar cliente' } });
  }
});

// Get all executions for a specific client
app.get('/api/v1/clients/:id/executions', authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  try {
    const clientRes = await pool.query('SELECT name FROM clients WHERE id = $1 AND organization_id = $2', [id, req.user.organizationId]);
    const clientName = clientRes.rows[0]?.name;

    let instRes;
    if (clientName) {
      instRes = await pool.query(
        `SELECT * FROM instances 
         WHERE organization_id = $1 AND (client_id = $2 OR LOWER(instance_name) ILIKE LOWER($3))
         ORDER BY started_at DESC`,
        [req.user.organizationId, id, `%${clientName}%`]
      );
    } else {
      instRes = await pool.query(
        'SELECT * FROM instances WHERE organization_id = $1 AND client_id = $2 ORDER BY started_at DESC',
        [req.user.organizationId, id]
      );
    }

    const data = instRes.rows.map(row => {
      const steps = typeof row.steps === 'string' ? JSON.parse(row.steps) : (row.steps || []);
      const completedSteps = steps.filter(s => s.isCompleted).length;
      const totalSteps = steps.length;
      return {
        id: row.id,
        templateId: row.template_id,
        title: row.title,
        instanceName: row.instance_name,
        status: row.status || 'Por hacer',
        priority: row.priority || 'Media',
        startedAt: row.started_at,
        totalSteps,
        completedSteps,
        progressPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        steps: steps.map(s => ({
          id: s.id,
          title: s.title || s.label,
          isCompleted: !!s.isCompleted,
          dueDate: s.dueDate
        }))
      };
    });

    res.json({
      success: true,
      data,
      meta: { app: 'konsulprocess', version: '1', count: data.length }
    });
  } catch (err) {
    console.error('API v1 Get Client Executions error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al obtener ejecuciones del cliente' } });
  }
});

// ----------------------------------------------------------------------------
// OPERATIONAL SUMMARY API V1
// ----------------------------------------------------------------------------

app.get('/api/v1/summary', authenticateApiKey, async (req, res) => {
  try {
    const [instRes, clientRes, tmplRes] = await Promise.all([
      pool.query('SELECT status, steps FROM instances WHERE organization_id = $1', [req.user.organizationId]),
      pool.query('SELECT checklist FROM clients WHERE organization_id = $1', [req.user.organizationId]),
      pool.query('SELECT COUNT(*) as count FROM templates WHERE organization_id = $1 AND status = $2', [req.user.organizationId, 'approved'])
    ]);

    const statusCounts = {};
    let totalCompletedSteps = 0;
    let totalSteps = 0;
    instRes.rows.forEach(r => {
      const st = r.status || 'Por hacer';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      const steps = typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || []);
      totalSteps += steps.length;
      totalCompletedSteps += steps.filter(s => s.isCompleted).length;
    });

    const trafficLights = { green: 0, yellow: 0, red: 0 };
    clientRes.rows.forEach(c => {
      const s = computeClientTrafficLight(c.checklist);
      trafficLights[s.statusKey] = (trafficLights[s.statusKey] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalInstances: instRes.rows.length,
        instancesByStatus: statusCounts,
        overallStepsProgress: totalSteps > 0 ? Math.round((totalCompletedSteps / totalSteps) * 100) : 0,
        totalTemplates: parseInt(tmplRes.rows[0]?.count || 0, 10),
        totalClients: clientRes.rows.length,
        clientsHealth: trafficLights
      },
      meta: { app: 'konsulprocess', version: '1' }
    });
  } catch (err) {
    console.error('API v1 Summary error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Error al generar resumen' } });
  }
});

// ----------------------------------------------------------------------------
// LEADSHUB WEBHOOK INTEGRATION
// ----------------------------------------------------------------------------

// Webhook for LeadsHUB CRM integration
app.post('/api/v1/leadshub', authenticateApiKey, async (req, res) => {
  try {
    const body = req.body || {};
    const event = body.event || body.type || 'lead.created';
    const data = body.data || body.payload || body;
    const orgId = req.user.organizationId;

    // CASE 1: Sync Lead / Customer into Process clients
    if (event.includes('lead') || event.includes('contact') || event.includes('customer')) {
      const clientName = data.name || data.clientName || data.contactName || 'Lead sin nombre';
      const clientId = data.id ? `leadshub_${data.id}` : `cli_${Date.now()}_${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      await pool.query(
        `INSERT INTO clients (id, organization_id, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [clientId, orgId, clientName]
      );

      return res.status(200).json({
        success: true,
        action: 'LEAD_SYNCED',
        message: `Lead "${clientName}" sincronizado correctamente en Kônsul Process`,
        data: { clientId, name: clientName }
      });
    }

    // CASE 2: Trigger process execution
    if (event.includes('process') || event.includes('execution') || event.includes('start') || event.includes('deal')) {
      const templateId = data.templateId || data.template_id;
      const instanceName = data.instanceName || data.name || data.clientName || 'Ejecución iniciada desde LeadsHUB';
      let resolvedClientId = data.clientId || data.client_id || (data.id ? `leadshub_${data.id}` : null);

      let templateRes;
      if (templateId) {
        templateRes = await pool.query('SELECT * FROM templates WHERE id = $1 AND organization_id = $2', [templateId, orgId]);
      } else {
        templateRes = await pool.query("SELECT * FROM templates WHERE organization_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 1", [orgId]);
      }

      if (templateRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No se encontró una plantilla de proceso aprobada en tu organización.'
          }
        });
      }

      // Auto-ensure client exists if clientName is provided
      if (!resolvedClientId && instanceName) {
        const findCli = await pool.query('SELECT id FROM clients WHERE organization_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1', [orgId, instanceName.trim()]);
        if (findCli.rows.length > 0) {
          resolvedClientId = findCli.rows[0].id;
        } else {
          resolvedClientId = 'cli_' + instanceName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now();
          await pool.query(
            `INSERT INTO clients (id, organization_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
            [resolvedClientId, orgId, instanceName.trim()]
          );
        }
      }

      const template = templateRes.rows[0];
      const instId = 'inst_' + crypto.randomBytes(12).toString('hex');
      const startedAt = new Date().toISOString();

      const rawTemplateSteps = typeof template.steps === 'string' ? JSON.parse(template.steps) : (template.steps || []);
      const stepsWithDates = rawTemplateSteps.map((step, idx) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (step.relativeOffsetDays || step.durationDays || 1));
        
        const rawChecklist = Array.isArray(step.checklist) ? step.checklist : [];
        const checklist = rawChecklist.map((c, cIdx) => ({
          id: c.id || `chk_${idx + 1}_${cIdx + 1}_${Date.now()}`,
          text: typeof c === 'string' ? c : (c.text || c.title || String(c)),
          isCompleted: false
        }));

        return {
          ...step,
          id: step.id || `step_${idx + 1}_${Date.now()}`,
          title: step.title || step.label || `Paso ${idx + 1}`,
          description: step.description || '',
          assignedTo: step.assignedTo || 'Unassigned',
          isCompleted: false,
          completedAt: null,
          completedBy: null,
          dueDate: dueDate.toISOString(),
          checklist: checklist
        };
      });

      await pool.query(
        `INSERT INTO instances (id, organization_id, template_id, title, instance_name, client_id, started_at, companion_name, companion_avatar, companion_greeting, category, steps, status, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          instId,
          orgId,
          template.id,
          template.title,
          instanceName,
          resolvedClientId,
          startedAt,
          template.companion_name,
          template.companion_avatar,
          template.companion_greeting,
          template.category || 'General',
          JSON.stringify(stepsWithDates),
          'Por hacer',
          'Media'
        ]
      );

      const reqOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      await notifyTeamOnExecutionLaunch(orgId, {
        id: instId,
        title: template.title,
        instanceName,
        steps: stepsWithDates
      }, reqOrigin);

      // Trigger Suite automation
      triggerProcessAutomation('Nueva Tarea / Tarjeta', req.user, {
        'Título de Tarea': instanceName,
        'Descripción': `Iniciado vía webhook LeadsHUB (${event})`,
        'Plantilla': template.title,
        'Cliente': instanceName,
        'ID de Ejecución': instId
      });

      return res.status(201).json({
        success: true,
        action: 'PROCESS_STARTED',
        message: `Proceso "${template.title}" iniciado para "${instanceName}" con éxito`,
        data: {
          id: instId,
          templateId: template.id,
          instanceName,
          clientId: resolvedClientId,
          startedAt,
          totalSteps: stepsWithDates.length,
          steps: stepsWithDates
        },
        meta: {
          app: "konsulprocess",
          version: "1"
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Webhook event received', event });
  } catch (err) {
    console.error('API LeadsHUB Webhook error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Error interno del servidor en webhook de LeadsHUB'
      }
    });
  }
});

// ============================================================================
// AGENTIC WORKFLOW & TOOL CALLING ENGINE (Pilar 1: Metadatos + Pilar 2: Tool Calling / MCP)
// ============================================================================

const AGENT_TOOLS_DECLARATIONS = [
  {
    name: 'get_workspace_summary',
    description: 'Obtiene un resumen en tiempo real del estado de la organización: total de plantillas, ejecuciones activas por columna Kanban, miembros del equipo y clientes registrados.'
  },
  {
    name: 'list_templates',
    description: 'Lista las plantillas de procesos disponibles en la organización con sus títulos, categorías y cantidad de pasos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', description: 'Filtrar opcionalmente por categoría o área' }
      }
    }
  },
  {
    name: 'get_template_details',
    description: 'Obtiene los detalles completos de una plantilla de proceso: su descripción general y todos sus pasos con instrucciones detalladas, entregables y motivación. Úsalo para resolver cualquier duda sobre cómo hacer un proceso o paso a paso.',
    parameters: {
      type: 'OBJECT',
      properties: {
        templateNameOrId: { type: 'STRING', description: 'ID o título aproximado de la plantilla' }
      },
      required: ['templateNameOrId']
    }
  },
  {
    name: 'get_instance_details',
    description: 'Obtiene el estado actual, cliente y avance de pasos completados/pendientes de una ejecución activa en el Kanban.',
    parameters: {
      type: 'OBJECT',
      properties: {
        instanceNameOrId: { type: 'STRING', description: 'ID o nombre de la ejecución activa' }
      },
      required: ['instanceNameOrId']
    }
  },
  {
    name: 'create_process_template',
    description: 'Crea una nueva plantilla de procesos de negocio (Arquitectura de metadatos) con sus pasos detallados, motivaciones y plazos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Nombre descriptivo del proceso' },
        category: { type: 'STRING', description: 'Área o categoría (ej. Operaciones, Ventas, Finanzas, Legal, RRHH)' },
        description: { type: 'STRING', description: 'Objetivo y descripción general del proceso' },
        durationDays: { type: 'NUMBER', description: 'Duración estimada total en días' },
        steps: {
          type: 'ARRAY',
          description: 'Lista ordenada de pasos o tareas que componen el proceso',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'Nombre claro de la acción o paso' },
              description: { type: 'STRING', description: 'Instrucciones precisas de ejecución' },
              motivation: { type: 'STRING', description: 'El por qué hacemos este paso (valor de negocio)' },
              durationDays: { type: 'NUMBER', description: 'Plazo en días estimado para este paso' },
              checklist: { 
                type: 'ARRAY', 
                description: 'Lista de ítems de checklist o sub-tareas que componen o validan este paso. Cada elemento puede definir si amerita subir un archivo adjunto (allowAttachment) y si ese adjunto es obligatorio (requireAttachment).',
                items: {
                  type: 'OBJECT',
                  properties: {
                    text: { type: 'STRING', description: 'Descripción de la sub-tarea o verificación del checklist' },
                    allowAttachment: { type: 'BOOLEAN', description: 'True si este elemento del checklist amerita adjuntar un documento, entregable, comprobante o captura' },
                    requireAttachment: { type: 'BOOLEAN', description: 'True si el archivo adjunto en este elemento del checklist debe ser obligatorio para marcarlo como completado' }
                  },
                  required: ['text']
                }
              }
            },
            required: ['title']
          }
        }
      },
      required: ['title', 'category', 'steps']
    }
  },
  {
    name: 'launch_process_execution',
    description: 'Inicia la ejecución activa de un proceso a partir de una plantilla para un cliente o proyecto específico.',
    parameters: {
      type: 'OBJECT',
      properties: {
        templateNameOrId: { type: 'STRING', description: 'ID o título aproximado de la plantilla base' },
        instanceName: { type: 'STRING', description: 'Nombre identificador del proceso (ej. "Onboarding - Acme Corp")' },
        priority: { type: 'STRING', description: 'Nivel de prioridad: "Baja", "Media", "Alta" o "Urgente"' },
        clientName: { type: 'STRING', description: 'Nombre del cliente vinculado (opcional)' }
      },
      required: ['templateNameOrId', 'instanceName']
    }
  },
  {
    name: 'update_kanban_columns',
    description: 'Actualiza o reordena la lista de columnas del tablero Kanban de la organización.',
    parameters: {
      type: 'OBJECT',
      properties: {
        columns: {
          type: 'ARRAY',
          description: 'Lista completa y ordenada de nombres de columnas (ej. ["Por hacer", "En curso", "En Revisión", "Terminado"])',
          items: { type: 'STRING' }
        }
      },
      required: ['columns']
    }
  },
  {
    name: 'move_execution_status',
    description: 'Mueve una ejecución activa a una nueva columna/estado en el tablero Kanban o modifica su prioridad.',
    parameters: {
      type: 'OBJECT',
      properties: {
        instanceNameOrId: { type: 'STRING', description: 'ID o nombre de la ejecución a actualizar' },
        newStatus: { type: 'STRING', description: 'Nombre exacto de la columna Kanban destino' },
        newPriority: { type: 'STRING', description: 'Nueva prioridad opcional ("Baja", "Media", "Alta", "Urgente")' }
      },
      required: ['instanceNameOrId', 'newStatus']
    }
  },
  {
    name: 'create_client',
    description: 'Registra un nuevo cliente o cuenta en el directorio de la organización.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Nombre o razón social del cliente' }
      },
      required: ['name']
    }
  },
  {
    name: 'add_team_member',
    description: 'Agrega un nuevo colaborador al equipo de la organización.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Nombre completo del miembro' },
        role: { type: 'STRING', description: 'Cargo o posición (ej. "Líder de Proyectos", "Analista")' },
        email: { type: 'STRING', description: 'Correo electrónico' },
        department: { type: 'STRING', description: 'Departamento o área' }
      },
      required: ['name', 'role', 'email']
    }
  },
  {
    name: 'read_google_drive_document',
    description: 'Lee el contenido de texto de un documento de Google Drive (Google Docs, Google Sheets, TXT, CSV o PDF) usando su enlace/URL, su ID de archivo de Drive o buscando por su nombre en el Google Drive conectado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fileIdOrUrlOrName: { type: 'STRING', description: 'Enlace completo de Google Drive / Google Docs / Sheets, ID del archivo en Drive, o nombre del documento a buscar' }
      },
      required: ['fileIdOrUrlOrName']
    }
  },
  {
    name: 'list_google_drive_files',
    description: 'Lista o busca archivos y carpetas dentro del Google Drive conectado de la organización o de un cliente/proceso.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Término opcional para buscar por nombre de archivo o carpeta en Google Drive' },
        folderId: { type: 'STRING', description: 'ID o URL opcional de la carpeta de Drive donde listar archivos' }
      }
    }
  }
];

// Execute a tool safely inside PostgreSQL with RBAC verification
async function executeAgentTool(toolName, args, user) {
  const orgId = user.organizationId;
  const userRole = user.role || 'guest';

  switch (toolName) {
    case 'get_workspace_summary': {
      const [tmplRes, instRes, teamRes, clientRes, orgRes] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM templates WHERE organization_id = $1', [orgId]),
        pool.query('SELECT status, COUNT(*) as count FROM instances WHERE organization_id = $1 GROUP BY status', [orgId]),
        pool.query('SELECT COUNT(*) as count FROM team_members WHERE organization_id = $1', [orgId]),
        pool.query('SELECT COUNT(*) as count FROM clients WHERE organization_id = $1', [orgId]),
        pool.query('SELECT name, kanban_columns FROM organizations WHERE id = $1', [orgId])
      ]);

      const kanbanBreakdown = {};
      instRes.rows.forEach(r => { kanbanBreakdown[r.status || 'Sin Estado'] = parseInt(r.count, 10); });

      return {
        success: true,
        organizationName: orgRes.rows[0]?.name || 'Organización',
        totalTemplates: parseInt(tmplRes.rows[0]?.count || 0, 10),
        totalTeamMembers: parseInt(teamRes.rows[0]?.count || 0, 10),
        totalClients: parseInt(clientRes.rows[0]?.count || 0, 10),
        kanbanColumns: orgRes.rows[0]?.kanban_columns || ["Por hacer", "En curso", "Terminado"],
        executionsByStatus: kanbanBreakdown
      };
    }

    case 'list_templates': {
      let query = 'SELECT id, title, category, status, duration_days, jsonb_array_length(steps) as steps_count FROM templates WHERE organization_id = $1';
      const params = [orgId];
      if (args.category) {
        query += ' AND LOWER(category) = LOWER($2)';
        params.push(args.category);
      }
      query += ' ORDER BY title ASC LIMIT 20';
      const res = await pool.query(query, params);
      return {
        success: true,
        count: res.rows.length,
        templates: res.rows
      };
    }

    case 'get_template_details': {
      const { templateNameOrId } = args;
      if (!templateNameOrId) return { success: false, error: 'Especifica el nombre o ID de la plantilla.' };

      let tmplRes;
      if (typeof templateNameOrId === 'string' && templateNameOrId.startsWith('tmpl_')) {
        tmplRes = await pool.query('SELECT * FROM templates WHERE id = $1 AND organization_id = $2', [templateNameOrId, orgId]);
      } else {
        tmplRes = await pool.query('SELECT * FROM templates WHERE organization_id = $1 AND title ILIKE $2 LIMIT 1', [orgId, `%${templateNameOrId}%`]);
      }

      if (tmplRes.rows.length === 0) {
        return { success: false, error: `No se encontró ninguna plantilla que coincida con "${templateNameOrId}".` };
      }

      const t = tmplRes.rows[0];
      const rawSteps = typeof t.steps === 'string' ? JSON.parse(t.steps) : (t.steps || []);
      return {
        success: true,
        templateId: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        estimatedDurationDays: t.duration_days,
        companionName: t.companion_name,
        companionGreeting: t.companion_greeting,
        totalSteps: rawSteps.length,
        steps: rawSteps.map((s, idx) => ({
          stepNumber: idx + 1,
          title: s.title,
          description: s.description,
          motivation: s.motivation,
          durationDays: s.durationDays
        }))
      };
    }

    case 'get_instance_details': {
      const { instanceNameOrId } = args;
      if (!instanceNameOrId) return { success: false, error: 'Especifica el nombre o ID de la ejecución.' };

      let instRes;
      if (typeof instanceNameOrId === 'string' && instanceNameOrId.startsWith('inst_')) {
        instRes = await pool.query('SELECT * FROM instances WHERE id = $1 AND organization_id = $2', [instanceNameOrId, orgId]);
      } else {
        instRes = await pool.query('SELECT * FROM instances WHERE organization_id = $1 AND name ILIKE $2 LIMIT 1', [orgId, `%${instanceNameOrId}%`]);
      }

      if (instRes.rows.length === 0) {
        return { success: false, error: `No se encontró ninguna ejecución activa que coincida con "${instanceNameOrId}".` };
      }

      const inst = instRes.rows[0];
      const rawSteps = typeof inst.steps === 'string' ? JSON.parse(inst.steps) : (inst.steps || []);
      return {
        success: true,
        instanceId: inst.id,
        name: inst.name,
        status: inst.status,
        priority: inst.priority,
        clientName: inst.client_name,
        driveFolderUrl: inst.drive_folder_url || null,
        totalSteps: rawSteps.length,
        completedSteps: rawSteps.filter(s => s.isCompleted).length,
        steps: rawSteps.map((s, idx) => ({
          stepNumber: idx + 1,
          title: s.title,
          isCompleted: !!s.isCompleted,
          description: s.description,
          uploadedFileName: s.uploadedFileName || null,
          uploadedFileUrl: s.uploadedFileUrl || null
        }))
      };
    }

    case 'create_process_template': {
      if (userRole === 'guest') {
        return { success: false, error: 'Permisos insuficientes: Tu rol de Invitado no puede crear plantillas.' };
      }

      const id = 'tmpl_' + Date.now();
      const status = userRole === 'gerente' ? 'pending_approval' : 'approved';
      const steps = (args.steps || []).map((s, idx) => {
        let stepChecklist = [];
        if (Array.isArray(s.checklist) && s.checklist.length > 0) {
          stepChecklist = s.checklist.map((c, cIdx) => {
            const isObj = c && typeof c === 'object';
            const textVal = isObj ? (c.text || c.title || String(c)) : String(c);
            const reqAtt = isObj ? !!c.requireAttachment : false;
            const allowAtt = isObj ? !!(c.allowAttachment || c.requireAttachment) : false;
            return {
              id: `chk_${idx + 1}_${cIdx + 1}_${Date.now()}`,
              text: textVal,
              isCompleted: false,
              allowAttachment: allowAtt,
              requireAttachment: reqAtt
            };
          });
        }
        return {
          id: `step_${idx + 1}_${Date.now()}`,
          title: s.title,
          description: s.description || '',
          motivation: s.motivation || '',
          durationDays: s.durationDays || 1,
          type: 'manual',
          isCompleted: false,
          comments: [],
          checklist: stepChecklist
        };
      });

      await pool.query(
        `INSERT INTO templates (id, organization_id, title, description, duration_days, companion_name, companion_avatar, companion_greeting, category, steps, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          orgId,
          args.title,
          args.description || `Plantilla generada por el Asistente Agéntico para ${args.title}`,
          args.durationDays || 5,
          'Process AI',
          '⚡',
          '¡Vamos a completar este proceso con éxito!',
          args.category || 'General',
          JSON.stringify(steps),
          status
        ]
      );

      return {
        success: true,
        templateId: id,
        title: args.title,
        category: args.category,
        stepsCount: steps.length,
        status,
        message: status === 'pending_approval' 
          ? 'Plantilla creada y enviada a revisión del Administrador' 
          : 'Plantilla creada y aprobada automáticamente en el catálogo'
      };
    }

    case 'launch_process_execution': {
      let tmplRes = await pool.query(
        'SELECT * FROM templates WHERE organization_id = $1 AND (id = $2 OR LOWER(title) ILIKE LOWER($3)) LIMIT 1',
        [orgId, args.templateNameOrId, `%${args.templateNameOrId}%`]
      );

      if (tmplRes.rows.length === 0) {
        return { success: false, error: `No se encontró ninguna plantilla que coincida con "${args.templateNameOrId}".` };
      }

      const template = tmplRes.rows[0];
      const instId = 'inst_' + Date.now();
      const startedAt = new Date().toISOString();
      let currentDate = Date.now();

      const rawSteps = Array.isArray(template.steps) ? template.steps : (typeof template.steps === 'string' ? JSON.parse(template.steps) : []);
      const stepsWithDates = rawSteps.map((step, idx) => {
        const stepDays = step.durationDays || 1;
        const dueDate = new Date(currentDate + (stepDays * 24 * 60 * 60 * 1000)).toISOString();
        currentDate += (stepDays * 24 * 60 * 60 * 1000);
        return {
          ...step,
          id: step.id || `step_${idx + 1}_${Date.now()}`,
          isCompleted: false,
          dueDate,
          comments: []
        };
      });

      // Optionally auto-register client if given
      if (args.clientName) {
        const checkClient = await pool.query('SELECT id FROM clients WHERE organization_id = $1 AND LOWER(name) = LOWER($2)', [orgId, args.clientName.trim()]);
        if (checkClient.rows.length === 0) {
          const cliId = 'cli_' + args.clientName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now();
          await pool.query('INSERT INTO clients (id, organization_id, name) VALUES ($1, $2, $3)', [cliId, orgId, args.clientName.trim()]);
        }
      }

      const priority = args.priority || 'Media';
      const initialStatus = 'Por hacer';

      await pool.query(
        `INSERT INTO instances (id, organization_id, template_id, title, instance_name, started_at, companion_name, companion_avatar, companion_greeting, category, steps, status, priority, attachments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          instId,
          orgId,
          template.id,
          template.title,
          args.instanceName,
          startedAt,
          template.companion_name || 'Process AI',
          template.companion_avatar || '⚡',
          template.companion_greeting || '¡A trabajar!',
          template.category || 'General',
          JSON.stringify(stepsWithDates),
          initialStatus,
          priority,
          JSON.stringify([])
        ]
      );

      const driveInfo = await ensureExecutionDriveFolder(orgId, {
        id: instId,
        title: template.title,
        instanceName: args.instanceName
      }, args.clientName || args.instanceName);

      // Notify team members (Encargados & Asignados) via Email
      await notifyTeamOnExecutionLaunch(orgId, {
        id: instId,
        title: template.title,
        instanceName: args.instanceName,
        priority,
        steps: stepsWithDates
      });

      return {
        success: true,
        instanceId: instId,
        instanceName: args.instanceName,
        templateTitle: template.title,
        status: initialStatus,
        priority,
        stepsCount: stepsWithDates.length,
        driveFolderUrl: driveInfo?.folderUrl || null
      };
    }

    case 'update_kanban_columns': {
      if (userRole !== 'admin') {
        return { success: false, error: 'Permisos insuficientes: Solo administradores pueden modificar las columnas del Kanban.' };
      }

      const columns = Array.isArray(args.columns) ? args.columns.map(c => String(c).trim()).filter(Boolean) : [];
      if (columns.length === 0) {
        return { success: false, error: 'Debe especificarse al menos una columna válida.' };
      }

      await pool.query(
        'UPDATE organizations SET kanban_columns = $1 WHERE id = $2',
        [JSON.stringify(columns), orgId]
      );

      return {
        success: true,
        columns,
        message: 'Columnas del tablero Kanban actualizadas exitosamente.'
      };
    }

    case 'move_execution_status': {
      const instQuery = await pool.query(
        'SELECT id, instance_name, status, priority FROM instances WHERE organization_id = $1 AND (id = $2 OR LOWER(instance_name) ILIKE LOWER($3)) LIMIT 1',
        [orgId, args.instanceNameOrId, `%${args.instanceNameOrId}%`]
      );

      if (instQuery.rows.length === 0) {
        return { success: false, error: `No se encontró ninguna ejecución activa con "${args.instanceNameOrId}".` };
      }

      const inst = instQuery.rows[0];
      const newStatus = args.newStatus;
      const newPriority = args.newPriority || inst.priority;

      await pool.query(
        'UPDATE instances SET status = $1, priority = $2 WHERE id = $3 AND organization_id = $4',
        [newStatus, newPriority, inst.id, orgId]
      );

      return {
        success: true,
        instanceId: inst.id,
        instanceName: inst.instance_name,
        previousStatus: inst.status,
        newStatus,
        priority: newPriority
      };
    }

    case 'create_client': {
      const name = String(args.name || '').trim();
      if (!name) return { success: false, error: 'Nombre de cliente inválido.' };

      const clientId = 'cli_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30) + '_' + Date.now();
      await pool.query(
        'INSERT INTO clients (id, organization_id, name) VALUES ($1, $2, $3)',
        [clientId, orgId, name]
      );

      return {
        success: true,
        clientId,
        name
      };
    }

    case 'add_team_member': {
      if (userRole === 'guest') {
        return { success: false, error: 'Permisos insuficientes: Tu rol no permite registrar miembros en el equipo.' };
      }

      const memberId = 'mem_' + Date.now();
      await pool.query(
        `INSERT INTO team_members (id, organization_id, name, role, email, avatar, assigned_processes, department)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          memberId,
          orgId,
          args.name,
          args.role,
          args.email,
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(args.name)}`,
          JSON.stringify([]),
          args.department || 'General'
        ]
      );

      return {
        success: true,
        memberId,
        name: args.name,
        role: args.role,
        email: args.email
      };
    }

    case 'read_google_drive_document': {
      const target = String(args.fileIdOrUrlOrName || '').trim();
      if (!target) return { success: false, error: 'Especifica el enlace, ID o nombre del documento de Google Drive.' };

      try {
        // First try directly if it looks like a URL or Drive ID
        if (target.startsWith('http') || /^[a-zA-Z0-9_-]{18,}$/.test(target)) {
          const doc = await fetchDriveFileTextContent(orgId, target);
          return {
            success: true,
            fileId: doc.fileId,
            fileName: doc.name,
            webViewLink: doc.webViewLink,
            content: doc.content
          };
        }

        // Otherwise search by name in connected Google Drive
        const accessToken = await getValidGoogleDriveAccessToken(orgId);
        if (accessToken) {
          const safeQ = target.replace(/'/g, "\\'");
          const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name contains '${safeQ}' and trashed = false`)}&fields=files(id,name,mimeType,webViewLink)&pageSize=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (searchRes.ok) {
            const sData = await searchRes.json();
            if (sData.files && sData.files.length > 0) {
              const doc = await fetchDriveFileTextContent(orgId, sData.files[0].id);
              return {
                success: true,
                fileId: doc.fileId,
                fileName: doc.name,
                webViewLink: doc.webViewLink,
                content: doc.content
              };
            }
          }
        }

        return {
          success: false,
          error: `No se encontró el archivo "${target}". Pega el enlace directo de Google Drive/Docs o conecta Google Drive con OAuth 2.0.`
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    case 'list_google_drive_files': {
      try {
        const orgRes = await pool.query('SELECT google_drive_config FROM organizations WHERE id = $1', [orgId]);
        const cfg = orgRes.rows[0]?.google_drive_config || {};
        const accessToken = await getValidGoogleDriveAccessToken(orgId, cfg);

        if (!accessToken) {
          return {
            success: true,
            oauthActive: false,
            rootFolderId: cfg.rootFolderId || '',
            rootFolderUrl: cfg.rootFolderUrl || '',
            message: cfg.rootFolderUrl
              ? `Carpeta raíz vinculada: ${cfg.rootFolderUrl}. Para listar archivos individuales automáticamente, activa OAuth 2.0 en Integraciones > Google Drive, o comparte el enlace directo del documento.`
              : 'Google Drive aún no tiene OAuth 2.0 activo para búsqueda automática, pero puedes enviarme cualquier enlace de Google Docs/Sheets y lo leeré.'
          };
        }

        const conditions = ['trashed = false'];
        const parentId = extractDriveIdFromInput(args.folderId || cfg.rootFolderId || '');
        if (parentId && !args.query) {
          conditions.push(`'${parentId}' in parents`);
        }
        if (args.query) {
          const safeQ = String(args.query).replace(/'/g, "\\'");
          conditions.push(`name contains '${safeQ}'`);
        }

        const driveRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(conditions.join(' and '))}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=folder,modifiedTime desc&pageSize=20`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!driveRes.ok) {
          return { success: false, error: 'Error consultando archivos en Google Drive API.' };
        }
        const data = await driveRes.json();
        return {
          success: true,
          count: (data.files || []).length,
          files: data.files || []
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    default:
      return { success: false, error: `Herramienta desconocida: ${toolName}` };
  }
}

// Suggest checklist for a step using AI (analiza si amerita checklist y sugiere ítems con propuesta inteligente de adjuntos)
app.post('/api/ai/suggest-step-checklist', authenticateToken, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'El título del paso es requerido.' });

  try {
    const orgRes = await pool.query('SELECT gemini_api_key FROM organizations WHERE id = $1', [req.user.organizationId]);
    const geminiKey = orgRes.rows[0]?.gemini_api_key || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(400).json({ error: 'Configura tu Gemini API Key en Kônsul para sugerir checklists con IA.' });
    }

    const prompt = `Analiza este paso de un proceso de negocio y genera un checklist inteligente de entre 2 y 4 sub-tareas, entregables o verificaciones clave necesarias para completarlo con éxito.
Título del paso: "${title}"
Descripción: "${description || ''}"

Para cada elemento del checklist, evalúa inteligentemente:
1. "allowAttachment" (boolean): true si este punto del checklist amerita o se beneficia de adjuntar un archivo, documento, comprobante, captura, diseño, contrato o entregable; false si es una acción o verificación puramente manual.
2. "requireAttachment" (boolean): true únicamente si el archivo adjunto en ese punto es indispensable/obligatorio para dar por válido el punto (ej. subir contrato firmado, comprobante de pago, entregable final); false si es opcional o no lleva adjunto.

Responde ÚNICAMENTE con un array JSON de objetos con esta estructura exacta:
[
  { "text": "Subir contrato firmado por el cliente", "allowAttachment": true, "requireAttachment": true },
  { "text": "Verificar datos fiscales y accesos", "allowAttachment": false, "requireAttachment": false }
]`;

    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(500).json({ error: 'Error al consultar Gemini API: ' + errText });
    }

    const data = await geminiRes.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const checklist = JSON.parse(text);
    res.json({ checklist: Array.isArray(checklist) ? checklist : [] });
  } catch (err) {
    console.error('Error in suggest-step-checklist:', err);
    res.status(500).json({ error: 'Error al generar sugerencias de checklist.' });
  }
});

// Agentic Chat Endpoint with Gemini Tool Calling & RBAC (Pilar 2)
app.post('/api/agent/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history, attachments } = req.body;
    const effectiveMessage = (message && typeof message === 'string' && message.trim()) 
      ? message.trim() 
      : (Array.isArray(attachments) && attachments.length > 0 
        ? 'Analiza el archivo o audio adjunto y asísteme con las acciones o consultas operativas necesarias.' 
        : '');

    if (!effectiveMessage) {
      return res.status(400).json({ success: false, error: 'El mensaje o un archivo/audio adjunto es obligatorio.' });
    }

    const orgId = req.user?.organizationId;
    let geminiKey = null;
    let orgName = 'Kônsul Workspace';
    let kanbanCols = ["Por hacer", "En curso", "Terminado"];

    if (orgId) {
      try {
        const orgRes = await pool.query('SELECT name, gemini_api_key, kanban_columns FROM organizations WHERE id = $1', [orgId]);
        if (orgRes.rows.length > 0) {
          if (orgRes.rows[0].gemini_api_key) geminiKey = orgRes.rows[0].gemini_api_key;
          if (orgRes.rows[0].name) orgName = orgRes.rows[0].name;
          if (orgRes.rows[0].kanban_columns) kanbanCols = orgRes.rows[0].kanban_columns;
        }
      } catch (dbErr) {
        console.warn('Could not read org settings for agent chat:', dbErr.message);
      }
    }

    if (!geminiKey && req.body.geminiApiKey) {
      geminiKey = req.body.geminiApiKey;
    }
    if (!geminiKey && process.env.GEMINI_API_KEY) {
      geminiKey = process.env.GEMINI_API_KEY;
    }

    if (!geminiKey) {
      return res.json({
        success: true,
        reply: "👋 Hola. Para poder ejecutar acciones y asistirte con inteligencia agéntica, necesitas configurar tu **Gemini API Key** en la barra superior o en los Ajustes de la Organización.",
        actions: [],
        refreshRequired: false
      });
    }

    const systemPrompt = `Eres el Asistente Experto y Copiloto Agéntico de Kônsul Process para la empresa "${orgName}".
Usuario interactuando: "${req.user?.name || req.user?.email || 'Colega'}" (Rol: ${req.user?.role || 'colaborador'}).
Filosofía de Kônsul: "La app trabaja para el usuario, no el usuario para la app".

TUS FUNCIONES PRINCIPALES:
1. GUÍA Y CONSULTOR DE PROCESOS (Asistente Kônsul):
   - Responde cualquier duda sobre los procesos de la empresa, qué se hace en cada paso, los entregables, objetivos y mejores prácticas.
   - Si el usuario pregunta dudas sobre un proceso (ej. "¿Cómo hago el paso 2 de Onboarding?", "¿Qué pasos tiene Ventas?"), invoca "get_template_details" o "list_templates" para consultar los pasos reales en la base de datos y guiarlo paso a paso de forma directa, concisa y profesional.
   
2. COPILOTO AGÉNTICO Y ACCIONES OPERATIVAS (Tool Calling):
   - Si el usuario te pide crear una plantilla, lanzar un proceso, agregar columnas al Kanban, mover tarjetas o registrar clientes/miembros, DEBES invocar la herramienta correspondiente del catálogo.
   - NUNCA inventes que creaste o modificaste algo sin haber ejecutado la herramienta.

3. ANÁLISIS DE ARCHIVOS ADJUNTOS Y AUDIOS:
   - Si el usuario adjunta documentos (PDF, DOCX, TXT, CSV), audios de voz o imágenes con flujos de trabajo, ANALÍZALOS a fondo.
   - Si el usuario o el audio pide estructurar una plantilla a partir del archivo o nota de voz, extrae los pasos lógicos, títulos claros, descripciones y duraciones recomendadas, e invoca "create_process_template".
   - Si falta información o deseas corroborar qué checklist requiere algún paso del documento, pregúntaselo amablemente al usuario.

4. ANÁLISIS Y CREACIÓN DE CHECKLISTS EN LOS PASOS DE LAS PLANTILLAS:
   - Al diseñar o crear plantillas con "create_process_template", analiza cada paso detenidamente.
   - Si un paso involucra varias sub-tareas, requisitos o puntos de control que ameritan un checklist, genera el array de sub-tareas en el campo "checklist" de ese paso.
   - Si no sabes o tienes dudas de qué cosas colocar en el checklist para un paso particular al interactuar en el chat con el usuario, PREGÚNTALE primero antes de invocar la herramienta.
   - En cambio, si la petición es una automatización o proceso desatendido, infiere y genera el checklist automáticamente sin preguntar para no pausar el flujo.

REGLAS DE COMUNICACIÓN:
- Responde en español con formato Markdown limpio y profesional.
- Sé claro, conciso y ve directo al grano.
- Columnas actuales del Kanban: ${JSON.stringify(kanbanCols)}.`;

    // Strictly format chat history for Gemini:
    // 1. Must alternate 'user' -> 'model' -> 'user'
    // 2. Must start with 'user'
    // 3. Must end with current 'user' message
    const rawTurns = [];
    if (Array.isArray(history)) {
      history.forEach(item => {
        if (item && item.text && typeof item.text === 'string' && (item.role === 'user' || item.role === 'model')) {
          rawTurns.push({ role: item.role, text: item.text.trim() });
        }
      });
    }
    rawTurns.push({ role: 'user', text: effectiveMessage });

    const sanitizedTurns = [];
    for (const turn of rawTurns) {
      if (sanitizedTurns.length === 0) {
        if (turn.role === 'user') {
          sanitizedTurns.push({ role: 'user', text: turn.text });
        }
      } else {
        const last = sanitizedTurns[sanitizedTurns.length - 1];
        if (last.role === turn.role) {
          last.text += '\n\n' + turn.text;
        } else {
          sanitizedTurns.push({ role: turn.role, text: turn.text });
        }
      }
    }

    if (sanitizedTurns.length === 0) {
      sanitizedTurns.push({ role: 'user', text: effectiveMessage });
    }

    // Prepare attachments parts for current turn:
    const attachmentParts = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.base64Data && att.mimeType) {
          attachmentParts.push({
            inline_data: {
              mime_type: att.mimeType,
              data: att.base64Data
            }
          });
        }
        if (att.textContent) {
          attachmentParts.push({
            text: `[DOCUMENTO ADJUNTO: "${att.name || 'archivo'}" (${att.type || 'documento'})]:\n${att.textContent.substring(0, 35000)}\n---`
          });
        }
      }
    }

    const contents = sanitizedTurns.map((t, idx) => {
      if (idx === sanitizedTurns.length - 1 && t.role === 'user' && attachmentParts.length > 0) {
        return {
          role: t.role,
          parts: [...attachmentParts, { text: t.text }]
        };
      }
      return {
        role: t.role,
        parts: [{ text: t.text }]
      };
    });

    // Multi-model endpoint fallback
    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash'
    ];

    let geminiResponse = null;
    let geminiData = null;
    let usedEndpoint = '';

    for (const model of candidateModels) {
      usedEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      try {
        const resCall = await fetch(usedEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ functionDeclarations: AGENT_TOOLS_DECLARATIONS }]
          })
        });

        if (resCall.ok) {
          geminiResponse = resCall;
          geminiData = await resCall.json();
          break;
        } else {
          const errBody = await resCall.text();
          console.warn(`Gemini model ${model} failed (${resCall.status}):`, errBody.substring(0, 150));
        }
      } catch (callErr) {
        console.warn(`Fetch error for Gemini model ${model}:`, callErr.message);
      }
    }

    if (!geminiData) {
      return res.json({
        success: false,
        reply: "⚠️ No se pudo comunicar con Gemini AI. Por favor verifica que tu API Key sea válida y cuente con cuota disponible.",
        actions: [],
        refreshRequired: false
      });
    }

    const candidate = geminiData.candidates?.[0];
    if (!candidate || !candidate.content) {
      return res.json({
        success: true,
        reply: "No pude procesar la respuesta en este momento. Por favor intenta reformular tu solicitud.",
        actions: [],
        refreshRequired: false
      });
    }

    const parts = candidate.content.parts || [];
    const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);

    // If Gemini just answered with text (no tool calls)
    if (functionCalls.length === 0) {
      const textReply = parts.map(p => p.text || '').join('\n').trim();
      return res.json({
        success: true,
        reply: textReply || "Entendido. ¿En qué más puedo ayudarte?",
        actions: [],
        refreshRequired: false
      });
    }

    // Step 2: Execute each tool call through RBAC Engine
    const actionsTaken = [];
    const toolResultsSummary = [];

    for (const call of functionCalls) {
      try {
        const toolResult = await executeAgentTool(call.name, call.args || {}, req.user);
        const isSuccess = toolResult.success !== false;
        actionsTaken.push({
          tool: call.name,
          args: call.args,
          result: toolResult,
          success: isSuccess
        });
        toolResultsSummary.push(`Herramienta: ${call.name}\nResultado: ${JSON.stringify(toolResult)}`);
      } catch (toolErr) {
        console.error(`Error al ejecutar herramienta ${call.name}:`, toolErr);
        actionsTaken.push({
          tool: call.name,
          args: call.args,
          result: { success: false, error: toolErr.message },
          success: false
        });
        toolResultsSummary.push(`Herramienta: ${call.name}\nFallo: ${toolErr.message}`);
      }
    }

    // Step 3: Ask Gemini for a natural explanation of the results
    let finalReply = '';
    try {
      const explanationContents = [
        ...contents,
        {
          role: 'model',
          parts: [{ text: parts.map(p => p.text || '').join('\n') || 'Ejecutando herramientas solicitadas...' }]
        },
        {
          role: 'user',
          parts: [{
            text: `Resultados de las herramientas ejecutadas en el sistema:\n${toolResultsSummary.join('\n\n')}\n\nPor favor, responde al usuario explicando de forma clara, amigable y concisa lo que hiciste o la información obtenida.`
          }]
        }
      ];

      const followUpRes = await fetch(usedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: explanationContents,
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });

      if (followUpRes.ok) {
        const followUpData = await followUpRes.json();
        const followUpParts = followUpData.candidates?.[0]?.content?.parts || [];
        finalReply = followUpParts.map(p => p.text || '').join('\n').trim();
      }
    } catch (fErr) {
      console.warn('Follow up explanation failed, fallback to summary:', fErr.message);
    }

    if (!finalReply) {
      finalReply = `He procesado tu solicitud y ejecutado ${actionsTaken.length} acción(es) en el sistema.`;
    }

    return res.json({
      success: true,
      reply: finalReply,
      actions: actionsTaken,
      refreshRequired: actionsTaken.some(a => a.success)
    });

  } catch (err) {
    console.error('Agent chat error:', err);
    res.json({
      success: false,
      reply: `⚠️ Ocurrió un inconveniente al procesar tu solicitud: ${err.message || 'Error interno'}. Por favor intenta de nuevo.`,
      actions: [],
      refreshRequired: false
    });
  }
});

export default app;
