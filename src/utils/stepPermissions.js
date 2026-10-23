/**
 * Step Permissions and Access Control Utility
 * 
 * Rules:
 * 1. Completed steps can be reviewed by anyone in the organization.
 * 2. Current active step (the first uncompleted step) can be worked on by its assignees/team/admin.
 * 3. Posterior steps (steps placed after the current active step):
 *    - Allowed to be worked on ONLY by the designated encargado of that specific step.
 *    - Other users (who have not completed earlier steps) cannot advance to or work on that posterior step.
 */

export const getUserIdentifiers = (user, teamMembers = []) => {
  if (!user) return new Set();
  const set = new Set();

  if (user.id !== undefined && user.id !== null) {
    const rawId = String(user.id).trim().toLowerCase();
    set.add(rawId);
    set.add(`admin_${rawId}`);
  }

  if (user.email) {
    set.add(user.email.trim().toLowerCase());
  }

  const userEmail = (user.email || '').trim().toLowerCase();
  const matchedMember = teamMembers.find(m => {
    const tmEmail = (m.email || '').trim().toLowerCase();
    const tmId = String(m.id || '').trim().toLowerCase();
    return (userEmail && tmEmail === userEmail) ||
      (user.id && tmId === String(user.id).toLowerCase()) ||
      (user.id && tmId === `admin_${String(user.id).toLowerCase()}`);
  });

  if (matchedMember) {
    set.add(String(matchedMember.id).trim().toLowerCase());
    if (matchedMember.email) set.add(matchedMember.email.trim().toLowerCase());
  }

  return set;
};

/**
 * Checks if the given user is the designated encargado (lead) or assigned to the step.
 */
export const isUserStepEncargado = (step, user, teamMembers = []) => {
  if (!step || !user) return false;
  const userIds = getUserIdentifiers(user, teamMembers);

  // 1. Check step.leadId (Encargado Principal)
  if (step.leadId && step.leadId !== 'Unassigned') {
    const leadStr = String(step.leadId).trim().toLowerCase();
    if (userIds.has(leadStr)) return true;
  }

  // 2. Check step.assignedTo (Asignados)
  const assignees = Array.isArray(step.assignedTo)
    ? step.assignedTo
    : (step.assignedTo && step.assignedTo !== 'Unassigned' ? [step.assignedTo] : []);

  for (const rawId of assignees) {
    const idStr = String(rawId).trim().toLowerCase();
    if (userIds.has(idStr)) return true;
  }

  return false;
};

/**
 * Resolves the name of the encargado of the step for UI labels.
 */
export const getStepLeadName = (step, teamMembers = []) => {
  if (!step) return 'Sin asignar';
  const leadId = step.leadId && step.leadId !== 'Unassigned' ? String(step.leadId).trim().toLowerCase() : null;
  if (leadId) {
    const found = teamMembers.find(m =>
      String(m.id).toLowerCase() === leadId ||
      `admin_${m.id}`.toLowerCase() === leadId ||
      (m.email && m.email.trim().toLowerCase() === leadId)
    );
    if (found) return found.name;
  }

  const assignees = Array.isArray(step.assignedTo)
    ? step.assignedTo
    : (step.assignedTo && step.assignedTo !== 'Unassigned' ? [step.assignedTo] : []);

  if (assignees.length > 0) {
    const found = teamMembers.find(m =>
      assignees.some(a => String(a).toLowerCase() === String(m.id).toLowerCase() || String(a).toLowerCase() === (m.email || '').toLowerCase())
    );
    if (found) return found.name;
  }

  return 'Sin asignar';
};

/**
 * Determines access rights for a specific step in an execution instance.
 */
export const getStepAccess = (instance, stepIndex, user, teamMembers = []) => {
  if (!instance || !Array.isArray(instance.steps) || stepIndex < 0 || stepIndex >= instance.steps.length) {
    return {
      canWork: false,
      canView: false,
      isPosterior: false,
      isEncargado: false,
      isCurrentActive: false,
      isCompleted: false,
      reason: 'Paso inexistente'
    };
  }

  const steps = instance.steps;
  const step = steps[stepIndex];
  const currentActiveIdx = steps.findIndex(s => !s.isCompleted);
  const isCompleted = !!step.isCompleted;
  const isCurrentActive = currentActiveIdx === stepIndex;
  const isPosterior = currentActiveIdx !== -1 && stepIndex > currentActiveIdx;
  const isEncargado = isUserStepEncargado(step, user, teamMembers);
  const leadName = getStepLeadName(step, teamMembers);

  // 1. Completed steps can be reviewed by everyone
  if (isCompleted) {
    return {
      canWork: true,
      canView: true,
      isPosterior: false,
      isEncargado,
      isCurrentActive: false,
      isCompleted: true,
      leadName,
      reason: 'Paso completado'
    };
  }

  // 2. Current active step can be worked on
  if (isCurrentActive) {
    return {
      canWork: true,
      canView: true,
      isPosterior: false,
      isEncargado,
      isCurrentActive: true,
      isCompleted: false,
      leadName,
      reason: 'Paso activo actual'
    };
  }

  // 3. Posterior steps (stepIndex > currentActiveIdx)
  if (isPosterior) {
    if (isEncargado) {
      return {
        canWork: true,
        canView: true,
        isPosterior: true,
        isEncargado: true,
        isCurrentActive: false,
        isCompleted: false,
        leadName,
        reason: 'Adelanto habilitado: Eres el encargado de este paso'
      };
    } else {
      return {
        canWork: false,
        canView: false,
        isPosterior: true,
        isEncargado: false,
        isCurrentActive: false,
        isCompleted: false,
        leadName,
        reason: `Paso posterior bloqueado: Solo su encargado (${leadName}) puede adelantarlo. Debes completar tus pasos previos.`
      };
    }
  }

  return {
    canWork: true,
    canView: true,
    isPosterior: false,
    isEncargado,
    isCurrentActive: false,
    isCompleted: false,
    leadName,
    reason: ''
  };
};
