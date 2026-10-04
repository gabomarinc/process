export const DEFAULT_CHECKLIST_ITEMS = [
  { id: 'item_carrusel', name: 'Carrusel', type: 'counter', checked: false, current: 0, target: 4 },
  { id: 'item_post', name: 'Post', type: 'counter', checked: false, current: 0, target: 12 },
  { id: 'item_video', name: 'Video', type: 'counter', checked: false, current: 0, target: 6 },
  { id: 'item_factura', name: 'Factura Paga', type: 'boolean', checked: false },
  { id: 'item_ads', name: 'Ads Según Cliente', type: 'rating', rating: 'Excelente' }
];

export function normalizeChecklistItems(checklist) {
  if (!checklist) return DEFAULT_CHECKLIST_ITEMS;
  
  if (Array.isArray(checklist.items)) {
    return checklist.items;
  }
  
  if (Array.isArray(checklist)) {
    return checklist;
  }

  // Convert old object structure if present
  const items = [];
  if (checklist.carrusel) {
    items.push({
      id: 'item_carrusel',
      name: 'Carrusel',
      type: 'counter',
      checked: !!checklist.carrusel.checked,
      current: checklist.carrusel.current || 0,
      target: checklist.carrusel.target || 4
    });
  }
  if (checklist.post) {
    items.push({
      id: 'item_post',
      name: 'Post',
      type: 'counter',
      checked: !!checklist.post.checked,
      current: checklist.post.current || 0,
      target: checklist.post.target || 12
    });
  }
  if (checklist.video) {
    items.push({
      id: 'item_video',
      name: 'Video',
      type: 'counter',
      checked: !!checklist.video.checked,
      current: checklist.video.current || 0,
      target: checklist.video.target || 6
    });
  }
  if (checklist.facturaPaga) {
    items.push({
      id: 'item_factura',
      name: 'Factura Paga',
      type: 'boolean',
      checked: !!checklist.facturaPaga.checked
    });
  }
  if (checklist.adsRating !== undefined) {
    items.push({
      id: 'item_ads',
      name: 'Ads Según Cliente',
      type: 'rating',
      rating: checklist.adsRating || 'Excelente'
    });
  }

  return items.length > 0 ? items : DEFAULT_CHECKLIST_ITEMS;
}

export function isChecklistItemDone(item) {
  if (!item) return false;
  if (item.type === 'counter') {
    const target = Number(item.target) || 1;
    const current = Number(item.current) || 0;
    return !!item.checked || (target > 0 && current >= target);
  }
  if (item.type === 'rating') {
    const r = item.rating || 'Excelente';
    return r === 'Excelente' || r === 'Bueno';
  }
  return !!item.checked;
}

export function getBlockingChecklistItemsForInstance(instance, clients) {
  if (!instance || !clients || !clients.length) return [];
  
  // Find client
  const instNameLower = (instance.instanceName || '').toLowerCase();
  const client = clients.find(c => {
    if (instance.clientId && String(c.id) === String(instance.clientId)) return true;
    if (!c.name) return false;
    const cNameLower = c.name.toLowerCase();
    return instNameLower.includes(cNameLower) || cNameLower.includes(instNameLower);
  });

  if (!client || !client.checklist) return [];

  const items = normalizeChecklistItems(client.checklist);
  return items.filter(item => {
    if (!item.isGate) return false;
    const gateType = item.gateType || 'blocks_execution';
    if (gateType !== 'blocks_execution') return false;
    
    // Check association: either specifically for this instance or general for the client
    const matchesInstance = !item.associatedInstanceId || String(item.associatedInstanceId) === String(instance.id);
    if (!matchesInstance) return false;

    // Must be uncompleted to block
    return !isChecklistItemDone(item);
  });
}

export function isChecklistItemBlockedByExecution(item, instances) {
  if (!item || !item.isGate || item.gateType !== 'blocked_by_execution') {
    return { isBlocked: false, instance: null, remainingSteps: 0 };
  }

  if (!item.associatedInstanceId) {
    return { isBlocked: false, instance: null, remainingSteps: 0 };
  }

  const inst = (instances || []).find(i => String(i.id) === String(item.associatedInstanceId));
  if (!inst) {
    return { isBlocked: false, instance: null, remainingSteps: 0 };
  }

  const steps = inst.steps || [];
  const remainingSteps = steps.filter(s => !s.isCompleted).length;
  const isComplete = steps.length > 0 && remainingSteps === 0;

  return {
    isBlocked: !isComplete,
    instance: inst,
    remainingSteps
  };
}

export function getClientTrafficLightStatus(checklist) {
  const items = normalizeChecklistItems(checklist);
  
  if (!items || items.length === 0) {
    return {
      items: [],
      percentage: 0,
      completedCount: 0,
      totalCount: 0,
      statusKey: 'red',
      statusLabel: 'Sin Requerimientos',
      color: '#94A3B8',
      bg: '#F1F5F9',
      badgeBorder: '#CBD5E1'
    };
  }

  let totalActive = 0;
  let totalDone = 0;
  let allRatingsAreExcelenteOrNA = true;

  const analyzedItems = items.map(item => {
    let isDone = false;

    if (item.type === 'rating') {
      const r = item.rating || 'Excelente';
      if (r !== 'No incluido') {
        totalActive += 1;
        if (r === 'Excelente' || r === 'Bueno') {
          isDone = true;
          totalDone += 1;
        }
        if (r !== 'Excelente') {
          allRatingsAreExcelenteOrNA = false;
        }
      }
    } else {
      isDone = isChecklistItemDone(item);
      totalActive += 1;
      if (isDone) totalDone += 1;
    }

    return {
      ...item,
      isDone
    };
  });

  const percentage = totalActive > 0 ? Math.round((totalDone / totalActive) * 100) : 100;
  const allChecksDone = totalActive > 0 ? totalDone === totalActive : true;

  let statusKey = 'red';
  let statusLabel = 'Mal';
  let color = '#DC2626'; // Red
  let bg = '#FEE2E2';
  let badgeBorder = '#FCA5A5';

  if (allChecksDone && allRatingsAreExcelenteOrNA) {
    statusKey = 'blue';
    statusLabel = 'Excelencia';
    color = '#2563EB'; // Royal Blue
    bg = '#DBEAFE';
    badgeBorder = '#93C5FD';
  } else if (percentage >= 80) {
    statusKey = 'green';
    statusLabel = 'Bien';
    color = '#059669'; // Green
    bg = '#D1FAE5';
    badgeBorder = '#6EE7B7';
  } else if (percentage >= 70) {
    statusKey = 'yellow';
    statusLabel = 'Alerta';
    color = '#D97706'; // Amber/Yellow
    bg = '#FEF3C7';
    badgeBorder = '#FDE68A';
  } else {
    statusKey = 'red';
    statusLabel = 'Mal';
    color = '#DC2626'; // Red
    bg = '#FEE2E2';
    badgeBorder = '#FCA5A5';
  }

  return {
    items: analyzedItems,
    percentage,
    completedCount: totalDone,
    totalCount: totalActive,
    statusKey,
    statusLabel,
    color,
    bg,
    badgeBorder
  };
}
