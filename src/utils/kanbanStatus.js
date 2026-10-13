/**
 * Resolves column names dynamically from user/org configured kanbanColumns
 */
export const resolveKanbanColumnName = (kanbanColumns, type) => {
  const cols = Array.isArray(kanbanColumns) && kanbanColumns.length > 0 
    ? kanbanColumns 
    : ["Por hacer", "En curso", "Terminado"];

  if (type === 'in_progress') {
    const match = cols.find(c => /curso|proceso|progreso|haciendo|doing|in progress|activo/i.test(c));
    return match || cols[1] || 'En curso';
  }
  if (type === 'done') {
    const match = cols.find(c => /terminado|finalizado|completado|listo|done|cerrado/i.test(c));
    return match || cols[cols.length - 1] || 'Terminado';
  }
  if (type === 'todo') {
    const match = cols.find(c => /hacer|backlog|pendiente|to do|todo|inicio/i.test(c));
    return match || cols[0] || 'Por hacer';
  }
  return cols[0] || 'Por hacer';
};

/**
 * Calculates whether an execution has started progress, is finished, or not started.
 * Automatically advances "Por hacer" -> "En curso" when steps or checklist items are completed,
 * and advances to "Terminado" when all steps are completed.
 */
export const calculateAutoStatus = (currentStatus, steps, kanbanColumns = ["Por hacer", "En curso", "Terminado"]) => {
  const todoCol = resolveKanbanColumnName(kanbanColumns, 'todo');
  const inProgressCol = resolveKanbanColumnName(kanbanColumns, 'in_progress');
  const doneCol = resolveKanbanColumnName(kanbanColumns, 'done');

  const stepList = Array.isArray(steps) ? steps : [];
  const totalSteps = stepList.length;
  const completedSteps = stepList.filter(s => s.isCompleted).length;

  let completedChecklistItems = 0;
  stepList.forEach(s => {
    if (Array.isArray(s.checklist)) {
      completedChecklistItems += s.checklist.filter(c => c && c.isCompleted).length;
    }
  });

  const hasAnyProgress = completedSteps > 0 || completedChecklistItems > 0;
  const isAllStepsCompleted = totalSteps > 0 && completedSteps === totalSteps;

  const curr = (currentStatus || todoCol).trim().toLowerCase();
  const todoLower = todoCol.toLowerCase();
  const inProgressLower = inProgressCol.toLowerCase();
  const doneLower = doneCol.toLowerCase();

  // 1. If all steps are completed -> move to Done
  if (isAllStepsCompleted) {
    if (curr !== doneLower) {
      return doneCol;
    }
    return currentStatus || doneCol;
  }

  // 2. If it was in Done, but not all steps are completed anymore
  if (curr === doneLower && !isAllStepsCompleted) {
    return hasAnyProgress ? inProgressCol : todoCol;
  }

  // 3. If it was in Todo / Por hacer, and progress has been made (any step or checklist item checked) -> move to In Progress
  if (curr === todoLower && hasAnyProgress) {
    return inProgressCol;
  }

  // 4. If it was in In Progress, and all progress was completely undone -> move back to Todo
  if (curr === inProgressLower && !hasAnyProgress) {
    return todoCol;
  }

  // Otherwise preserve current status (respects custom stages like "En revisión")
  return currentStatus || todoCol;
};

/**
 * Returns effective status for display / grouping in Kanban
 */
export const getEffectiveInstanceStatus = (inst, kanbanColumns = ["Por hacer", "En curso", "Terminado"]) => {
  if (!inst) return 'Por hacer';
  return calculateAutoStatus(inst.status, inst.steps, kanbanColumns);
};
