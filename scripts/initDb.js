const { Client } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL no está definido en el archivo .env");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

const createTables = async () => {
  try {
    await client.connect();
    console.log("Conectado con éxito a la base de datos Neon.");

    // Drop tables if they exist (clean setup)
    console.log("Creando tablas si no existen...");
    
    // Create users table for auth
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255),
        reset_token_expiry BIGINT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabla 'users' verificada.");

    // Create templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_days INT,
        companion_name VARCHAR(255),
        companion_avatar VARCHAR(255),
        companion_greeting TEXT,
        category VARCHAR(255),
        steps JSONB NOT NULL
      );
    `);
    console.log("Tabla 'templates' verificada.");

    // Create instances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS instances (
        id VARCHAR(255) PRIMARY KEY,
        template_id VARCHAR(255) REFERENCES templates(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        instance_name VARCHAR(255) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        companion_name VARCHAR(255),
        companion_avatar VARCHAR(255),
        companion_greeting TEXT,
        category VARCHAR(255),
        steps JSONB NOT NULL
      );
    `);
    console.log("Tabla 'instances' verificada.");

    // Create notification_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id VARCHAR(255) PRIMARY KEY,
        instance_id VARCHAR(255) REFERENCES instances(id) ON DELETE CASCADE,
        step_id VARCHAR(255) NOT NULL,
        logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        instance_name VARCHAR(255) NOT NULL,
        step_title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL
      );
    `);
    console.log("Tabla 'notification_logs' verificada.");

    // Create team_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        assigned_processes JSONB NOT NULL DEFAULT '[]'::jsonb,
        department VARCHAR(255),
        manager_id VARCHAR(255) REFERENCES team_members(id) ON DELETE SET NULL,
        gemini_api_key VARCHAR(255)
      );
    `);
    console.log("Tabla 'team_members' verificada.");

    // Seed Initial Team Members
    const checkTeam = await client.query("SELECT COUNT(*) FROM team_members");
    if (parseInt(checkTeam.rows[0].count) === 0) {
      console.log("Poblando base de datos con miembros del equipo iniciales...");
      const seedTeam = [
        {
          id: "m1",
          name: "Sofía Vergara",
          role: "Directora de Operaciones",
          email: "sofia.vergara@konsul.com",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
          assigned_processes: ["p1"],
          department: "Operaciones",
          manager_id: null
        },
        {
          id: "m2",
          name: "Juan Pérez",
          role: "Ingeniero de Software Senior",
          email: "juan.perez@konsul.com",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
          assigned_processes: ["p1", "p2"],
          department: "Tecnología",
          manager_id: "m1"
        },
        {
          id: "m3",
          name: "Lucía Gómez",
          role: "Especialista en Cultura y HR",
          email: "lucia.gomez@konsul.com",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
          assigned_processes: ["p2"],
          department: "Recursos Humanos",
          manager_id: "m1"
        }
      ];
      for (const member of seedTeam) {
        await client.query(
          `INSERT INTO team_members (id, name, role, email, avatar, assigned_processes, department, manager_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [member.id, member.name, member.role, member.email, member.avatar, JSON.stringify(member.assigned_processes), member.department, member.manager_id]
        );
      }
      console.log("Miembros de equipo iniciales insertados con éxito.");
    }

    // Seed Initial Templates
    const checkTemplates = await client.query("SELECT COUNT(*) FROM templates");
    if (parseInt(checkTemplates.rows[0].count) === 0) {
      console.log("Poblando base de datos con plantillas iniciales...");
      
      const seedTemplates = [
        {
          id: "p1",
          title: "Onboarding de Cliente Premium",
          description: "Diseñado para brindar una bienvenida espectacular a nuestros socios estratégicos, asegurando que todos los requisitos técnicos y legales se cumplan con calidez y agilidad.",
          duration_days: 5,
          companion_name: "Lumi",
          companion_avatar: "✨",
          companion_greeting: "¡Hola! Soy Lumi, tu guía en este proceso. ¡Hagamos sentir en casa a nuestro nuevo cliente! Recuerda que un buen comienzo define el camino.",
          category: "Clientes",
          steps: [
            {
              title: "Reunión de Kickoff y Alineación",
              description: "Realizar la videollamada inicial de bienvenida. Define expectativas, hitos principales y presenta al equipo.",
              type: "manual",
              relativeOffsetDays: 1,
              durationLabel: "Día 1",
              motivation: "¡Excelente! La primera impresión es la que cuenta. El cliente se sintió escuchado y entusiasmado."
            },
            {
              title: "Subir Contrato Firmado",
              description: "Sube el documento del contrato legal firmado por ambas partes para formalizar nuestra alianza.",
              type: "digital",
              acceptedFormats: [".pdf", ".docx"],
              relativeOffsetDays: 2,
              durationLabel: "Día 1-2",
              motivation: "¡Hito alcanzado! El contrato está seguro y respaldado. ¡Paso legal superado con éxito!"
            },
            {
              title: "Subir Requerimientos Técnicos y de Integración",
              description: "Sube el documento de arquitectura o requerimientos detallados del cliente.",
              type: "digital",
              acceptedFormats: [".pdf", ".xlsx", ".docx"],
              relativeOffsetDays: 3,
              durationLabel: "Día 3",
              motivation: "Este documento nos dará el mapa de ruta técnico. ¡Tu equipo de ingeniería lo agradecerá!"
            },
            {
              title: "Configurar Entornos de Trabajo y Accesos",
              description: "Crear las cuentas de Slack, Jira y entornos de prueba para el equipo del cliente.",
              type: "manual",
              relativeOffsetDays: 4,
              durationLabel: "Día 4",
              motivation: "Tener todo listo para cuando empiecen les demostrará nuestra ultra-organización. ¡Hazlo con cariño!"
            },
            {
              title: "Sesión de Entrega y Capacitación Inicial",
              description: "Reunión final de onboarding para guiar al cliente por sus nuevos accesos y primeros pasos operativos.",
              type: "manual",
              relativeOffsetDays: 5,
              durationLabel: "Día 5",
              motivation: "¡La gran final! Cerremos el onboarding con broche de oro y una gran sonrisa."
            }
          ]
        },
        {
          id: "p2",
          title: "Bienvenida de Nuevo Talento (Onboarding Interno)",
          description: "Acompaña a tus nuevos miembros de equipo en sus primeros días. Diseñado para reducir la ansiedad del primer día y acelerar la pertenencia.",
          duration_days: 3,
          companion_name: "Kofi",
          companion_avatar: "☕",
          companion_greeting: "¡Hola, soy Kofi! Qué alegría recibir a un nuevo miembro en el equipo. Vamos a guiarlo paso a paso sin prisas ni estrés.",
          category: "Recursos Humanos",
          steps: [
            {
              title: "Subir Identificación y Documentos de Contratación",
              description: "Sube copia digitalizada de identificación oficial, RFC y comprobante de domicilio.",
              type: "digital",
              acceptedFormats: [".pdf", ".jpg", ".png"],
              relativeOffsetDays: 1,
              durationLabel: "Día 1",
              motivation: "Con estos documentos listos, la administración fluirá como el agua. ¡Hagámoslo fácil!"
            },
            {
              title: "Firma de Código de Conducta y Cultura",
              description: "Leer y firmar el manual de cultura, valores corporativos y expectativas mutuas.",
              type: "manual",
              relativeOffsetDays: 2,
              durationLabel: "Día 1-2",
              motivation: "Nuestros valores son el corazón de la empresa. ¡Qué gran momento para compartirlos!"
            },
            {
              title: "Charla de Café de Bienvenida",
              description: "Una videollamada informal de 15 minutos con un compañero asignado de otro departamento.",
              type: "manual",
              relativeOffsetDays: 3,
              durationLabel: "Día 3",
              motivation: "Romper el hielo es vital. Una buena charla recarga energías y genera lazos hermosos."
            }
          ]
        }
      ];

      for (const temp of seedTemplates) {
        await client.query(
          `INSERT INTO templates (id, title, description, duration_days, companion_name, companion_avatar, companion_greeting, category, steps)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [temp.id, temp.title, temp.description, temp.duration_days, temp.companion_name, temp.companion_avatar, temp.companion_greeting, temp.category, JSON.stringify(temp.steps)]
        );
      }
      console.log("Plantillas iniciales insertadas con éxito.");
    }

    console.log("Inicialización de la base de datos completada.");
  } catch (err) {
    console.error("Error al inicializar la base de datos:", err);
  } finally {
    await client.end();
  }
};

createTables();
