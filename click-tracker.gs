/**
 * Battery Simulator Click Tracker + URL Shortener
 * ------------------------------------------------
 * Two jobs:
 *   1. URL shortener — saves encoded state, returns 6-char ID; resolves IDs back to state.
 *   2. Click tracker — logs visits to shared links and emails Godfrey on open.
 *
 * UPDATE (existing deployment):
 *   1. Open the Rivertown Master Lead Database → Extensions → Apps Script
 *   2. Open the ClickTracker.gs file
 *   3. Replace the ENTIRE file contents with this code
 *   4. Save (💾)
 *   5. Click Deploy → Manage deployments
 *   6. Click the pencil (edit) icon on "Battery sim click tracker v1"
 *   7. Version dropdown: select "New version"
 *   8. Click Deploy
 *
 * The Web app URL stays the same — no need to update index.html again.
 */

const NOTIFY_EMAIL = 'godfrey@rivertownsolar.com';
const LOG_SHEET_NAME = 'Click Log';
const LINKS_SHEET_NAME = 'Share Links';

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;
  if (action === 'save')    return handleSave(params);
  if (action === 'resolve') return handleResolve(params);
  return handleTrackingPing(params);
}

// ---------- URL Shortener: save encoded state, return short ID ----------
function handleSave(params) {
  const state = (params.state || '').slice(0, 30000);
  if (!state) return jsonOut({ error: 'missing state' });
  const id = generateShortId();
  try {
    const sheet = getOrCreateSheet(LINKS_SHEET_NAME, ['ID', 'State', 'Created', 'Hits']);
    sheet.appendRow([id, state, new Date(), 0]);
    return jsonOut({ id: id });
  } catch (err) {
    return jsonOut({ error: 'save failed: ' + err.message });
  }
}

// ---------- URL Shortener: resolve short ID back to state ----------
function handleResolve(params) {
  const id = (params.id || '').slice(0, 20);
  if (!id) return jsonOut({ error: 'missing id' });
  try {
    const sheet = getOrCreateSheet(LINKS_SHEET_NAME, ['ID', 'State', 'Created', 'Hits']);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        try { sheet.getRange(i + 1, 4).setValue((data[i][3] || 0) + 1); } catch (e) {}
        return jsonOut({ state: data[i][1] });
      }
    }
    return jsonOut({ error: 'not found' });
  } catch (err) {
    return jsonOut({ error: 'resolve failed: ' + err.message });
  }
}

// ---------- Click Tracker: log visit + email Godfrey ----------
function handleTrackingPing(params) {
  const client = (params.client || 'unknown').slice(0, 80);
  const ua     = (params.ua     || '').slice(0, 300);
  const ref    = (params.ref    || 'direct').slice(0, 300);
  const w      = (params.w      || '').slice(0, 10);
  const h      = (params.h      || '').slice(0, 10);
  const tz     = (params.tz     || '').slice(0, 60);
  const ts     = new Date();

  let device = 'Other';
  if (/iphone/i.test(ua))                   device = 'iPhone';
  else if (/ipad/i.test(ua))                device = 'iPad';
  else if (/android/i.test(ua))             device = 'Android';
  else if (/macintosh|mac os x/i.test(ua))  device = 'Mac';
  else if (/windows/i.test(ua))             device = 'Windows';

  try {
    const sheet = getOrCreateSheet(LOG_SHEET_NAME, ['Timestamp', 'Client', 'Device', 'Timezone', 'Viewport', 'Referrer', 'User Agent']);
    sheet.appendRow([ts, client, device, tz, `${w}×${h}`, ref, ua]);
  } catch (err) {
    console.error('Sheet log failed:', err);
  }

  try {
    const formattedTime = Utilities.formatDate(ts, 'America/New_York', 'EEE MMM d · h:mm a z');
    const displayName = client.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: `🔔 ${displayName} just opened their battery analysis`,
      htmlBody: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;background:#0B1220;color:#fff;padding:24px;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:40px;height:40px;background:#FBBF24;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;">⚡</div>
            <div>
              <div style="font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Battery Analysis Opened</div>
              <div style="font-size:13px;color:#6B7280;">Rivertown Solar · myarbitragetool.com</div>
            </div>
          </div>
          <div style="background:#1a1f2e;padding:18px;border-radius:8px;border-left:3px solid #FBBF24;">
            <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:6px;">${displayName}</div>
            <div style="font-size:13px;color:#9CA3AF;margin-bottom:14px;">${formattedTime}</div>
            <table style="font-size:13px;color:#D1D5DB;width:100%;">
              <tr><td style="padding:3px 12px 3px 0;color:#6B7280;width:90px;">Device</td><td>${device}</td></tr>
              <tr><td style="padding:3px 12px 3px 0;color:#6B7280;">Timezone</td><td>${tz || '—'}</td></tr>
              <tr><td style="padding:3px 12px 3px 0;color:#6B7280;">From</td><td>${ref}</td></tr>
            </table>
          </div>
          <p style="font-size:14px;color:#D1D5DB;margin-top:18px;line-height:1.5;">
            They're <strong style="color:#FBBF24;">actively viewing the analysis right now</strong>.
            Consider following up within the next 30 minutes while attention is fresh.
          </p>
          <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;">
          <p style="font-size:11px;color:#6B7280;">Click logged to "${LOG_SHEET_NAME}" sheet in the Master Lead Database.</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Email failed:', err);
  }

  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

// ---------- Helpers ----------
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#FBBF24');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 6-char base62-ish ID, excludes lookalike chars (0/O, 1/l/I). 54^6 = 24.7B combos.
function generateShortId() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Manual tests for the Apps Script editor.
function testTracking() {
  doGet({ parameter: {
    client: 'test-checchi',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari',
    ref: 'manual-test',
    w: '390', h: '844',
    tz: 'America/New_York'
  }});
}
function testSave() {
  const r = doGet({ parameter: { action: 'save', state: 'TESTSTATE12345' }});
  Logger.log(r.getContent());
}
