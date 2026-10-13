import React from 'react';
import { Sparkles, Coffee, BarChart3, CalendarCheck, Layers } from 'lucide-react';

export const mockProcesses = [
  {
    id: "p1",
    title: "Onboarding de Cliente Premium",
    description: "Diseñado para brindar una bienvenida espectacular a nuestros socios estratégicos, asegurando que todos los requisitos técnicos y legales se cumplan con calidez y agilidad.",
    durationDays: 5,
    startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // started 2 days ago
    companionName: "Lumi",
    companionAvatar: <Sparkles size={24} />,
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
        acceptedFormats: [".pdf", ".docx", ".png", ".jpg"],
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
        acceptedFormats: [".pdf", ".xlsx", ".docx", ".png", ".jpg"],
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
    companionAvatar: <Coffee size={24} />,
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
  },
  {
    id: "p3",
    title: "Flujo de Recopilación, Análisis y Entrega de Reportes",
    description: "Proceso estándar para la recolección periódica de métricas, análisis de rendimiento y entrega ejecutiva de informes con control de calidad y validación.",
    durationDays: 4,
    companionName: "Nova",
    companionAvatar: <BarChart3 size={24} />,
    companionGreeting: "¡Hola! Soy Nova. Te acompañaré en la consolidación analítica para asegurar reportes precisos, claros y con valor estratégico.",
    category: "Operaciones & Analítica",
    steps: [
      {
        id: "p3-s1",
        title: "Recopilación de Métricas y Fuentes de Datos",
        description: "Extracción y consolidación de datos de fuentes operativas, plataformas publicitarias o bases de datos del periodo.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 1",
        motivation: "La calidad de los datos es la base de un análisis sólido. ¡Asegúrate de cubrir todas las fuentes!"
      },
      {
        id: "p3-s2",
        title: "Análisis Comparativo y Detección de Insights",
        description: "Analizar desviaciones contra metas, calcular KPIs principales e identificar aprendizajes y recomendaciones.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 2",
        motivation: "Transformar números en decisiones es lo que genera impacto real. ¡Gran trabajo interpretando los datos!"
      },
      {
        id: "p3-s3",
        title: "Subir Informe Consolidado / Presentación Ejecutiva",
        description: "Adjunta el archivo del reporte en PDF, hoja de cálculo o presentación final para respaldo y revisión.",
        type: "digital",
        acceptedFormats: [".pdf", ".xlsx", ".pptx", ".docx", ".png"],
        isCompleted: false,
        durationLabel: "Día 3",
        motivation: "¡Excelente! El reporte está centralizado y listo para ser respaldado en Google Drive."
      },
      {
        id: "p3-s4",
        title: "Entrega Oficial y Feedback con el Cliente / Dirección",
        description: "Envío del reporte con resumen ejecutivo por correo y registro de observaciones o acuerdos de la reunión.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 4",
        motivation: "¡Ciclo completado con éxito! Comunicación transparente que fortalece la confianza del cliente."
      }
    ]
  },
  {
    id: "p4",
    title: "Flujo de Planificación y Aprobación de Entregables Periódicos",
    description: "Estructura estándar para organizar la matriz de entregables (mensual/semanal), coordinar revisiones internas y obtener aprobación del cliente.",
    durationDays: 5,
    companionName: "Atlas",
    companionAvatar: <CalendarCheck size={24} />,
    companionGreeting: "¡Hola! Soy Atlas. Mantendremos el cronograma sincronizado y aseguraremos que cada entregable cumpla los plazos sin fricciones.",
    category: "Planificación & Entregables",
    steps: [
      {
        id: "p4-s1",
        title: "Definición de Objetivos y Cronograma del Ciclo",
        description: "Alinear las metas operativas del periodo, fechas límite y prioridades de trabajo con los responsables.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 1",
        motivation: "Una buena planificación previa ahorra días de retrabajo. ¡Objetivos claros garantizan resultados!"
      },
      {
        id: "p4-s2",
        title: "Elaboración de la Matriz de Entregables",
        description: "Detallar cada entregable planificado: responsable, formato, fecha de entrega y compuertas de validación.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 2",
        motivation: "Estructurar la matriz da visibilidad total al equipo y al cliente sobre el plan de trabajo."
      },
      {
        id: "p4-s3",
        title: "Subir Matriz de Planificación / Calendario Aprobado",
        description: "Sube la matriz de entregables, cronograma o parrilla en formato PDF, hoja de cálculo o imagen.",
        type: "digital",
        acceptedFormats: [".pdf", ".xlsx", ".csv", ".png", ".jpg"],
        isCompleted: false,
        durationLabel: "Día 3",
        motivation: "¡Documento de planificación asegurado! El respaldo en Drive mantiene el histórico del cliente."
      },
      {
        id: "p4-s4",
        title: "Revisión Interna de Calidad y Capacidad",
        description: "Control de calidad interno por el líder de operaciones para verificar viabilidad antes de presentar.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 4",
        motivation: "Filtro de calidad superado. Cuidar los detalles eleva el estándar del servicio."
      },
      {
        id: "p4-s5",
        title: "Aprobación y Visto Bueno del Cliente",
        description: "Presentar la propuesta al cliente para confirmación o ajustes antes de iniciar la producción.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 5",
        motivation: "¡Plan aprobado y luz verde para la ejecución! Todo el equipo tiene claridad absoluta de sus metas."
      }
    ]
  },
  {
    id: "p5",
    title: "Flujo de Creación y Validación de Activos Documentales / Creativos",
    description: "Flujo de trabajo para redactar, diseñar o producir activos específicos (documentos técnicos, guiones, creativos) con rondas de feedback y control de versiones.",
    durationDays: 6,
    companionName: "Pixel",
    companionAvatar: <Layers size={24} />,
    companionGreeting: "¡Hola! Soy Pixel. Te ayudaré a canalizar los activos creativos y documentales desde el brief inicial hasta la entrega final aprobada.",
    category: "Producción & Creatividad",
    steps: [
      {
        id: "p5-s1",
        title: "Recepción y Validación del Brief / Requerimiento",
        description: "Revisión del requerimiento inicial, especificaciones técnicas, tono, audiencia y formatos solicitados.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 1",
        motivation: "Entender el requerimiento al 100% es el 80% del éxito de cualquier entregable."
      },
      {
        id: "p5-s2",
        title: "Desarrollo de Borrador o Contenido Inicial",
        description: "Redacción del guion/documento, conceptualización visual o ensamblado del primer borrador operativo.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 2-3",
        motivation: "¡Creatividad en marcha! La primera versión siempre sienta las bases sólidas."
      },
      {
        id: "p5-s3",
        title: "Subir Borrador para Revisión y Control de Cambios",
        description: "Cargar el archivo preliminar (documento, video borrador o arte conceptual) para revisión interna y del cliente.",
        type: "digital",
        acceptedFormats: [".pdf", ".docx", ".mp4", ".mov", ".png", ".jpg", ".zip"],
        isCompleted: false,
        durationLabel: "Día 4",
        motivation: "¡Borrador respaldado en Google Drive! Listo para ronda de observaciones."
      },
      {
        id: "p5-s4",
        title: "Aplicación de Feedback y Ajustes de Versión",
        description: "Incorporar observaciones de los revisores o del cliente para generar la versión definitiva.",
        type: "manual",
        isCompleted: false,
        durationLabel: "Día 5",
        motivation: "El feedback constructivo pule el resultado final. ¡Casi en la meta!"
      },
      {
        id: "p5-s5",
        title: "Subir Activo Final y Validación de Cierre",
        description: "Sube el archivo final en alta resolución o documento legal/técnico listo para publicación o entrega.",
        type: "digital",
        acceptedFormats: [".pdf", ".docx", ".mp4", ".mov", ".png", ".jpg", ".zip"],
        isCompleted: false,
        durationLabel: "Día 6",
        motivation: "¡Activo aprobado con la máxima calidad y archivado de forma segura en la carpeta del cliente!"
      }
    ]
  }
];

