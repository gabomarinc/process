export function getClientTrafficLightStatus(checklist) {
  const defaults = {
    carrusel: { checked: false, current: 0, target: 4 },
    post: { checked: false, current: 0, target: 12 },
    video: { checked: false, current: 0, target: 6 },
    facturaPaga: { checked: false },
    adsRating: "Excelente"
  };

  const cl = {
    carrusel: { ...defaults.carrusel, ...(checklist?.carrusel || {}) },
    post: { ...defaults.post, ...(checklist?.post || {}) },
    video: { ...defaults.video, ...(checklist?.video || {}) },
    facturaPaga: { ...defaults.facturaPaga, ...(checklist?.facturaPaga || {}) },
    adsRating: checklist?.adsRating || defaults.adsRating
  };

  // Determine item completion
  const isCarruselDone = !!cl.carrusel.checked || (cl.carrusel.target > 0 && cl.carrusel.current >= cl.carrusel.target);
  const isPostDone = !!cl.post.checked || (cl.post.target > 0 && cl.post.current >= cl.post.target);
  const isVideoDone = !!cl.video.checked || (cl.video.target > 0 && cl.video.current >= cl.video.target);
  const isFacturaDone = !!cl.facturaPaga.checked;

  const checks = [
    { name: 'Carrusel', done: isCarruselDone },
    { name: 'Post', done: isPostDone },
    { name: 'Video', done: isVideoDone },
    { name: 'Factura Paga', done: isFacturaDone }
  ];

  // Include Ads if not "No incluido"
  const adsRating = cl.adsRating;
  if (adsRating !== 'No incluido') {
    const isAdsDone = adsRating === 'Excelente' || adsRating === 'Bueno';
    checks.push({ name: 'Ads', done: isAdsDone });
  }

  const totalChecks = checks.length;
  const completedChecks = checks.filter(c => c.done).length;
  const percentage = Math.round((completedChecks / totalChecks) * 100);

  // Semáforo Rules:
  // Azul (Excelencia): Todos los checks cumplidos (100%) Y Ads Excelente (o No incluido)
  // Verde (Bien): >= 80%
  // Amarillo (Alerta): 70% - 79%
  // Rojo (Mal): < 70%
  let statusKey = 'red';
  let statusLabel = 'Mal (Alerta)';
  let color = '#EF4444'; // Red
  let bg = '#FEE2E2';
  let badgeBorder = '#FCA5A5';

  const allChecksDone = completedChecks === totalChecks;
  const isAdsExcelente = adsRating === 'Excelente' || adsRating === 'No incluido';

  if (allChecksDone && isAdsExcelente) {
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
    checklist: cl,
    percentage,
    completedCount: completedChecks,
    totalCount: totalChecks,
    statusKey,
    statusLabel,
    color,
    bg,
    badgeBorder,
    checks: {
      carrusel: isCarruselDone,
      post: isPostDone,
      video: isVideoDone,
      facturaPaga: isFacturaDone,
      ads: adsRating
    }
  };
}
