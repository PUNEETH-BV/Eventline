import { TimelineEvent } from '@/types';

export function shareTimelineAsImage(query: string, events: TimelineEvent[]): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle background glow
  const bgGrad = ctx.createRadialGradient(400, 500, 50, 400, 500, 600);
  bgGrad.addColorStop(0, 'rgba(59, 130, 246, 0.04)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // App Logo Header
  const logoGrad = ctx.createLinearGradient(50, 0, 250, 0);
  logoGrad.addColorStop(0, '#3b82f6');
  logoGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = logoGrad;
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('EventLine', 50, 90);

  // Subtitle / Search Topic
  ctx.fillStyle = '#9ca3af';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Complete timeline details for: "${query}"`, 50, 130);

  // Draw Vertical Timeline line
  const lineGrad = ctx.createLinearGradient(0, 170, 0, 900);
  lineGrad.addColorStop(0, '#3b82f6');
  lineGrad.addColorStop(1, '#8b5cf6');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 170);
  ctx.lineTo(80, 890);
  ctx.stroke();

  // Draw top 5 events
  const drawList = events.slice(0, 5);
  drawList.forEach((ev, idx) => {
    const y = 200 + idx * 135;

    // Timeline Dot indicator
    ctx.fillStyle = ev.status === 'past' ? '#4b5563' : ev.status === 'present' ? '#34d399' : '#3b82f6';
    ctx.strokeStyle = '#0f0f0f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(80, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Date
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 12px sans-serif';
    const dateText = new Date(ev.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    ctx.fillText(dateText, 110, y - 8);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(ev.title, 110, y + 12);

    // Description text wrapping
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    const words = ev.description.split(' ');
    let line = '';
    let lineIdx = 0;
    for (let w = 0; w < words.length; w++) {
      const testLine = line + words[w] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 620 && w > 0) {
        ctx.fillText(line, 110, y + 32 + lineIdx * 18);
        line = words[w] + ' ';
        lineIdx++;
        if (lineIdx >= 2) break;
      } else {
        line = testLine;
      }
    }
    if (lineIdx < 2) {
      ctx.fillText(line, 110, y + 32 + lineIdx * 18);
    }
  });

  // Footer Watermark
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Made with EventLine.app', 50, 950);

  // Trigger download
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `eventline_${query.replace(/\s+/g, '_').toLowerCase()}.png`;
  a.click();
}

export function shareSavedTimelineAsImage(bookmarks: TimelineEvent[]): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient (wrapped aesthetic)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
  bgGrad.addColorStop(0, '#100e17');
  bgGrad.addColorStop(1, '#070708');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dynamic aesthetic overlapping shapes
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
  ctx.beginPath();
  ctx.arc(80, 100, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
  ctx.beginPath();
  ctx.arc(520, 680, 250, 0, Math.PI * 2);
  ctx.fill();

  // App Logo Header
  const logoGrad = ctx.createLinearGradient(50, 0, 250, 0);
  logoGrad.addColorStop(0, '#3b82f6');
  logoGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = logoGrad;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('EventLine', 50, 100);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('MY TIMELINE WRAPPED', 50, 145);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.fillText('My top saved schedule milestones:', 50, 175);

  // Draw top 5 saved events as wrapped card blocks
  const drawList = bookmarks.slice(0, 5);
  drawList.forEach((ev, idx) => {
    const y = 210 + idx * 95;

    // Rounded rectangle card
    ctx.fillStyle = 'rgba(26, 26, 26, 0.65)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Draw rounded rect manually or using standard canvas roundRect
    if (ctx.roundRect) {
      ctx.roundRect(50, y, 500, 80, 12);
    } else {
      ctx.rect(50, y, 500, 80);
    }
    ctx.fill();
    ctx.stroke();

    // Event index indicator
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`#${idx + 1}`, 75, y + 46);

    // Event Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(ev.title.length > 40 ? ev.title.substring(0, 37) + '...' : ev.title, 130, y + 34);

    // Event Date
    ctx.fillStyle = '#3b82f6';
    ctx.font = '11px sans-serif';
    const dateText = new Date(ev.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    ctx.fillText(dateText, 130, y + 54);
  });

  // Footer Watermark
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('MADE WITH EVENTLINE.APP', 50, 745);

  // Download
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my_eventline_wrapped.png';
  a.click();
}
