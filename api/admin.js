import { getEntries } from '../lib/store.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  // Check ADMIN_KEY from environment variable
  const providedKey = req.query.key;
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    console.error('ADMIN_KEY environment variable not set');
    return res.status(500).send('Server configuration error');
  }

  if (providedKey !== adminKey) {
    return res.status(401).send('Unauthorized');
  }

  // Get entries from Vercel KV (already sorted newest first)
  const sorted = await getEntries();

  // Generate HTML table
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin - User-Agent Logs</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #FFFFFF;
      color: #111;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; vertical-align: top; }
    th { font-weight: 600; color: #333; background: #fafafa; position: sticky; top: 0; }
    tr:hover td { background: #fafafa; }
    .timestamp { white-space: nowrap; font-family: monospace; font-size: 0.8rem; }
    .ua { font-family: monospace; font-size: 0.75rem; max-width: 300px; word-break: break-all; }
    .empty { color: #888; text-align: center; padding: 40px; }
    .count { color: #666; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Admin - User-Agent Logs</h1>
    <p class="count">${sorted.length} entries</p>
    ${sorted.length === 0 ? '<p class="empty">No entries yet</p>' : `
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>OS</th>
          <th>Device</th>
          <th>Model</th>
          <th>Browser</th>
          <th>Version</th>
          <th>Type</th>
          <th>Screen</th>
          <th>Language</th>
          <th>Raw UA</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(e => `
          <tr>
            <td class="timestamp">${new Date(e.timestamp).toLocaleString('id-ID')}</td>
            <td>${escapeHtml(e.os)}</td>
            <td>${escapeHtml(e.device)}</td>
            <td>${escapeHtml(e.model)}</td>
            <td>${escapeHtml(e.browser)}</td>
            <td>${escapeHtml(e.browserVersion)}</td>
            <td>${escapeHtml(e.deviceType)}</td>
            <td>${e.screenWidth}×${e.screenHeight}</td>
            <td>${escapeHtml(e.language)}</td>
            <td class="ua">${escapeHtml(e.rawUa)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>
</body>
</html>
  `.trim();

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}