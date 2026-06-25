export const mockProcesses = [
  {
    id: "p1",
    title: "Onboarding de Cliente Premium",
    description: "Diseñado para brindar una bienvenida espectacular a nuestros socios estratégicos, asegurando que todos los requisitos técnicos y legales se cumplan con calidez y agilidad.",
    durationDays: 5,
    startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // started 2 days ago
    companionName: "Lumi",
    companionAvatar: "✨",
    companionGreeting: "¡Hola! Soy Lumi, tu guía en este proceso. ¡Hagamos sentir en casa a nuestro nuevo cliente! Recuerda que un buen comienzo define el camino.",
    category: "Clientes",
    steps: [
      {
        id: "p1-s1",
        title: "Reunión de Kickoff y Alineación",
        description: "Realizar la videollamada inicial de bienvenida. Define expectativas, hitos principales y presenta al equipo.",
        type: "manual",
        isCompleted: true,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        durationLabel: "Día 1",
        motivation: "¡Excelente! La primera impresión es la que cuenta. El cliente se sintió escuchado y entusiasmado."
      },
      {
        id: "p1-s2",
        title: "Subir Contrato Firmado",
        description: "Sube el documento del contrato legal firmado por ambas partes para formalizar nuestra alianza.",
        type: "digital",
        acceptedFormats: [".pdf", ".docx"],
        isCompleted: true,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedFileName: "Contrato_Premium_Final.pdf",
        durationLabel: "Día 1-2",
        motivation: "¡Hito alcanzado! El contrato está seguro y respaldado. ¡Paso legal superado con éxito!"
      },
      {
        id: "p1-s3",
        title: "Subir Requerimientos Técnicos y de Integración",
        description: "Sube el documento de arquitectura o requerimientos detallados del cliente.",
        type: "digital",
        acceptedFormats: [".pdf", ".xlsx", ".docx"],
        isCompleted: false,
        durationLabel: "Día 3",
        motivation: "Este documento nos dará el mapa de ruta técnico. ¡Tu equipo de ingeniería lo agradecerá!"
      },
      {
        id: "p1-s4",
        title: "Configurar Entornos de Trabajo y Accesos",
        description: "Crear las cuentas de Slack, Jira y entornos de prueba para el equipo del cliente.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 4",
        motivation: "Tener todo listo para cuando empiecen les demostrará nuestra ultra-organización. ¡Hazlo con cariño!"
      },
      {
        id: "p1-s5",
        title: "Sesión de Entrega y Capacitación Inicial",
        description: "Reunión final de onboarding para guiar al cliente por sus nuevos accesos y primeros pasos operativos.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 5",
        motivation: "¡La gran final! Cerremos el onboarding con broche de oro y una gran sonrisa."
      }
    ]
  },
  {
    id: "p2",
    title: "Bienvenida de Nuevo Talento (Onboarding Interno)",
    description: "Acompaña a tus nuevos miembros de equipo en sus primeros días. Diseñado para reducir la ansiedad del primer día y acelerar la pertenencia.",
    durationDays: 3,
    startedAt: new Date().toISOString(), // started today
    companionName: "Kofi",
    companionAvatar: "☕",
    companionGreeting: "¡Hola, soy Kofi! Qué alegría recibir a un nuevo miembro en el equipo. Vamos a guiarlo paso a paso sin prisas ni estrés.",
    category: "Recursos Humanos",
    steps: [
      {
        id: "p2-s1",
        title: "Subir Identificación y Documentos de Contratación",
        description: "Sube copia digitalizada de identificación oficial, RFC y comprobante de domicilio.",
        type: "digital",
        acceptedFormats: [".pdf", ".jpg", ".png"],
        isCompleted: false,
        durationLabel: "Día 1",
        motivation: "Con estos documentos listos, la administración fluirá como el agua. ¡Hagámoslo fácil!"
      },
      {
        id: "p2-s2",
        title: "Firma de Código de Conducta y Cultura",
        description: "Leer y firmar el manual de cultura, valores corporativos y expectativas mutuas.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 1-2",
        motivation: "Nuestros valores son el corazón de la empresa. ¡Qué gran momento para compartirlos!"
      },
      {
        id: "p2-s3",
        title: "Charla de Café de Bienvenida",
        description: "Una videollamada informal de 15 minutos con un compañero asignado de otro departamento.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 3",
        motivation: "Romper el hielo es vital. Una buena charla recarga energías y genera lazos hermosos."
      }
    ]
  }
];
