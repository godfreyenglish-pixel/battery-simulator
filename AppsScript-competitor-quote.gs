/**
 * COMPETITOR QUOTE ALERT  —  add to the SAME Apps Script project that already
 * serves myarbitragetool.com's click tracking and short-link resolution.
 *
 * INSTALL
 *  1. Open the existing script project (the one whose /exec URL is in
 *     index.html as TRACKING_ENDPOINT).
 *  2. Paste this file in as a new .gs file.
 *  3. If the project ALREADY has a doPost(e), merge instead: call
 *     handleCompetitorQuote_(e) from it when the payload's action is
 *     "competitor_quote", and keep your existing branches.
 *  4. Deploy > Manage deployments > edit the active Web app deployment >
 *     Version: New version > Deploy.  The /exec URL does not change.
 *     Execute as: Me.  Who has access: Anyone.
 *  5. Set CQ_ALERT_TO below.
 *
 * The tool POSTs with mode:'no-cors' and Content-Type text/plain, so nothing
 * is read back. Failures here are silent on the client by design.
 */

// EVERY .gs FILE IN AN APPS SCRIPT PROJECT SHARES ONE GLOBAL SCOPE.
// ClickTracker.gs already declares LOG_SHEET_NAME and NOTIFY_EMAIL. Re-declaring
// either one is a parse-time SyntaxError that stops the ENTIRE project running,
// including every time-driven trigger. Hence the CQ_ prefix on everything here.
// Do not remove it.
var CQ_ALERT_TO = 'godfrey@rivertownsolar.com';
var CQ_LOG_SHEET_NAME = 'Competitor Quotes';

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'competitor_quote') handleCompetitorQuote_(body);
  } catch (err) {
    console.error('doPost', err);
  }
  return ContentService.createTextOutput('ok');
}

// ---------------------------------------------------------------------------
// EMAIL BUILD
// Sent as HTML. The earlier plain-text version relied on space padding to line
// up, which only works in a monospace font. Gmail renders plain text
// proportionally, so every column drifted and the whole thing read as noise.
// Tables and inline styles here because email clients strip <style> blocks.
// ---------------------------------------------------------------------------

var CQ_C = {
  ink:   '#111827',
  body:  '#374151',
  muted: '#6B7280',
  line:  '#E5E7EB',
  wash:  '#F9FAFB',
  gold:  '#B45309',
  goldbg:'#FFFBEB',
  goldln:'#FDE68A',
  red:   '#B91C1C',
  redbg: '#FEF2F2',
  redln: '#FECACA',
  green: '#047857',
  greenbg:'#ECFDF5',
  greenln:'#A7F3D0'
};

function cqEsc_(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cqMoney_(n) {
  if (n == null || n === '') return '—';
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function cqPpw_(n) { return n == null ? '—' : '$' + Number(n).toFixed(2); }

// A labelled row inside a section table.
function cqRow_(label, value, opts) {
  opts = opts || {};
  var weight = opts.strong ? '700' : '400';
  var colour = opts.colour || CQ_C.ink;
  return '<tr>' +
    '<td style="padding:7px 14px 7px 0;font-size:13px;color:' + CQ_C.muted + ';white-space:nowrap;vertical-align:top;border-bottom:1px solid ' + CQ_C.line + '">' + cqEsc_(label) + '</td>' +
    '<td style="padding:7px 0;font-size:13px;color:' + colour + ';font-weight:' + weight + ';vertical-align:top;border-bottom:1px solid ' + CQ_C.line + '">' + (value == null ? '—' : value) + '</td>' +
    '</tr>';
}
function cqSection_(title, innerHtml) {
  return '<tr><td style="padding:26px 28px 0">' +
    '<div style="font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:' + CQ_C.muted + ';padding-bottom:8px">' + cqEsc_(title) + '</div>' +
    innerHtml +
    '</td></tr>';
}
function cqBanner_(bg, border, colour, heading, lines) {
  return '<tr><td style="padding:24px 28px 0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + bg + ';border:1px solid ' + border + ';border-radius:10px">' +
    '<tr><td style="padding:16px 18px">' +
    '<div style="font-size:16px;font-weight:700;color:' + colour + ';line-height:1.35">' + heading + '</div>' +
    '<div style="font-size:13px;color:' + CQ_C.body + ';line-height:1.6;margin-top:6px">' + lines + '</div>' +
    '</td></tr></table></td></tr>';
}

function handleCompetitorQuote_(d) {
  var isUpload = (d.stage === 'upload');
  var isProposal = (d.stage === 'proposal');
  var v = d.verdict || {};
  var a = d.assumed || {};
  var opts = d.options || [];
  var chosen = d.chosenOption || {};
  var installer = d.installer || 'Unknown installer';
  var themWon = !isUpload && !!d.promptShown;

  // ---- subject ----------------------------------------------------------
  var tag = isUpload ? 'Quote uploaded' : (isProposal ? 'Side-by-side generated' : 'Comparison run');
  var subject = tag + ' · ' + installer + (d.client ? ' · ' + d.client : '') +
                (themWon ? ' · THEY SCORED HIGHER' : '');

  // ---- banner -----------------------------------------------------------
  var banner;
  if (isUpload) {
    banner = cqBanner_(CQ_C.wash, CQ_C.line, CQ_C.ink,
      'A client uploaded a competing quote',
      'They have not run the comparison yet, so nothing below has been confirmed by them. ' +
      'If no comparison email follows this one, they left without finishing. That is worth a call.');
  } else if (isProposal) {
    banner = cqBanner_(CQ_C.goldbg, CQ_C.goldln, CQ_C.gold,
      'The client generated the side-by-side document',
      'The strongest signal in the sequence. They are comparing seriously and now hold a page they can forward. ' +
      (themWon ? '<b>It tells them ' + cqEsc_(installer) + ' came out ahead and offers them a counter-offer request, so expect that email.</b>'
               : 'It tells them Rivertown came out ahead.'));
  } else if (themWon) {
    banner = cqBanner_(CQ_C.redbg, CQ_C.redln, CQ_C.red,
      installer + ' scored higher',
      'The client was shown the quote-review prompt. Expect contact, and be ready with a counter.');
  } else {
    banner = cqBanner_(CQ_C.greenbg, CQ_C.greenln, CQ_C.green,
      'Rivertown scored higher',
      'No review prompt was shown to the client.');
  }

  // ---- who --------------------------------------------------------------
  var repBits = [];
  if (d.rep) repBits.push(cqEsc_(d.rep));
  if (d.repEmail) repBits.push('<a href="mailto:' + cqEsc_(d.repEmail) + '" style="color:' + CQ_C.ink + '">' + cqEsc_(d.repEmail) + '</a>');
  if (d.repPhone) repBits.push(cqEsc_(d.repPhone));

  var whoRows =
    cqRow_('Installer', cqEsc_(installer), {strong: true}) +
    cqRow_('Rep', repBits.length ? repBits.join('<br>') : null) +
    cqRow_('Client tag', d.client ? cqEsc_(d.client) : '<span style="color:' + CQ_C.muted + '">untracked link</span>') +
    cqRow_('Property', d.address ? cqEsc_(d.address) : null) +
    cqRow_('Quote valid until', d.validThrough ? cqEsc_(d.validThrough) : null) +
    cqRow_('Parse confidence', d.confidence != null ? d.confidence + '%' : null);

  // ---- their options ----------------------------------------------------
  var optHtml = '';
  if (opts.length) {
    optHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
      '<tr>' +
      ['Option', 'Size', 'Gross', 'Net', 'Gross $/W', 'Net $/W'].map(function (h, i) {
        return '<th style="text-align:' + (i === 0 ? 'left' : 'right') + ';padding:0 0 7px ' + (i === 0 ? '0' : '14px') +
               ';font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:' + CQ_C.muted +
               ';font-weight:700;border-bottom:1px solid ' + CQ_C.line + '">' + h + '</th>';
      }).join('') + '</tr>';
    opts.forEach(function (o, i) {
      var pick = (chosen && chosen.label && o.label === chosen.label);
      var bg = pick ? CQ_C.goldbg : 'transparent';
      var cells = [
        cqEsc_(o.label || ('Option ' + (i + 1))) + (pick ? ' <span style="color:' + CQ_C.gold + ';font-size:10.5px;font-weight:700">COMPARED</span>' : ''),
        o.kw != null ? o.kw + ' kW' : '—',
        cqMoney_(o.gross),
        '<b>' + cqMoney_(o.net) + '</b>',
        cqPpw_(o.grossPpw),
        '<b>' + cqPpw_(o.netPpw) + '</b>'
      ];
      optHtml += '<tr>' + cells.map(function (c, j) {
        return '<td style="background:' + bg + ';text-align:' + (j === 0 ? 'left' : 'right') + ';padding:9px 0 9px ' + (j === 0 ? '0' : '14px') +
               ';font-size:13px;color:' + CQ_C.ink + ';border-bottom:1px solid ' + CQ_C.line + '">' + c + '</td>';
      }).join('') + '</tr>';
    });
    optHtml += '</table>' +
      '<div style="font-size:11.5px;color:' + CQ_C.muted + ';padding-top:8px;line-height:1.5">' +
      'The two $/W columns are yours only. They are never rendered anywhere the client can see.</div>';
  } else {
    optHtml = '<div style="font-size:13px;color:' + CQ_C.muted + '">No pricing could be parsed.</div>';
  }

  // ---- their assumptions -------------------------------------------------
  var assumeRows =
    cqRow_('Rate used', a.rate != null ? '$' + a.rate + ' / kWh' : null) +
    cqRow_('Escalator', a.escalator != null ? a.escalator + '% per year' : null,
           {strong: a.escalator != null && a.escalator > 4, colour: (a.escalator != null && a.escalator > 4) ? CQ_C.red : CQ_C.ink}) +
    cqRow_('Annual usage', a.usageKwh != null ? Number(a.usageKwh).toLocaleString() + ' kWh' : null) +
    cqRow_('Claim term', a.term != null ? a.term + ' years' : null) +
    cqRow_('They claim', (d.claimedSavings || []).length ? (d.claimedSavings || []).map(cqMoney_).join('  ·  ') : null, {strong: true});

  if (d.correctedClaim && d.correctedClaim.stated != null) {
    var gap = d.correctedClaim.stated - d.correctedClaim.corrected;
    assumeRows += cqRow_('Recalculated', cqMoney_(d.correctedClaim.corrected) +
      ' <span style="color:' + CQ_C.muted + '">(' + cqMoney_(gap) + ' lower)</span>', {strong: true, colour: CQ_C.gold});
  }

  // ---- equipment ---------------------------------------------------------
  var panel = [(d.panel || {}).watts ? d.panel.watts + 'W' : null, (d.panel || {}).make].filter(String).join(' ');
  var batt = [(d.battery || {}).make,
              (d.battery || {}).usableKwh ? d.battery.usableKwh + ' kWh usable' : null,
              (d.battery || {}).contKw ? d.battery.contKw + ' kW continuous' : null,
              (d.battery || {}).warrantyYrs ? d.battery.warrantyYrs + ' yr warranty' : null].filter(String).join('<br>');
  var warr = (d.warranties || []).map(function (w) { return cqEsc_(w.years + ' yr — ' + w.name); }).join('<br>');
  var kitRows = cqRow_('Panel', panel ? cqEsc_(panel) : null) +
                cqRow_('Battery', batt || null) +
                cqRow_('Warranties', warr || null);

  // ---- flags -------------------------------------------------------------
  var flagHtml = '';
  if ((d.flags || []).length) {
    flagHtml = (d.flags || []).map(function (f) {
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">' +
        '<tr><td style="padding:11px 13px;background:' + CQ_C.goldbg + ';border:1px solid ' + CQ_C.goldln +
        ';border-radius:8px;font-size:12.5px;color:' + CQ_C.body + ';line-height:1.55">' + cqEsc_(f.note) + '</td></tr></table>';
    }).join('') +
    '<div style="font-size:11.5px;color:' + CQ_C.muted + ';line-height:1.5">Never shown to the client.</div>';
  } else {
    flagHtml = '<div style="font-size:13px;color:' + CQ_C.muted + '">Nothing flagged.</div>';
  }

  // ---- what the client saw ------------------------------------------------
  var sawHtml;
  if (isUpload) {
    sawHtml = '<div style="font-size:13px;color:' + CQ_C.muted + ';line-height:1.6">' +
      'Nothing yet. The client still has to confirm the parsed figures and press Compare.</div>';
  } else {
    var scoreCell = function (label, val, colour, lead) {
      return '<td width="50%" style="padding:13px 15px;background:' + CQ_C.wash + ';border:1px solid ' + CQ_C.line + ';border-radius:9px">' +
        '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:' + CQ_C.muted + ';font-weight:700">' + cqEsc_(label) + '</div>' +
        '<div style="font-size:25px;font-weight:700;color:' + colour + ';padding-top:2px">' + (val != null ? val : '—') +
        (lead ? ' <span style="font-size:11px;font-weight:700;color:' + CQ_C.muted + '">LEAD</span>' : '') + '</div></td>';
    };
    sawHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
      scoreCell('Rivertown', v.us, themWon ? CQ_C.ink : CQ_C.green, !themWon) +
      '<td width="12"></td>' +
      scoreCell(installer, v.them, themWon ? CQ_C.red : CQ_C.ink, themWon) +
      '</tr></table>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">' +
      cqRow_('Option compared', (chosen.label ? cqEsc_(chosen.label) : '—') + ' · ' + cqMoney_(chosen.net)) +
      cqRow_('Review prompt', themWon ? 'Shown to the client' : 'Not shown') +
      '</table>';
  }

  // ---- assemble ----------------------------------------------------------
  var html =
    '<div style="background:#F3F4F6;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid ' + CQ_C.line + ';border-radius:14px;overflow:hidden">' +

    '<tr><td style="padding:22px 28px 0">' +
      '<div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:' + CQ_C.muted + '">Rivertown Solar</div>' +
      '<div style="font-size:20px;font-weight:700;color:' + CQ_C.ink + ';padding-top:3px">Competitor quote alert</div>' +
    '</td></tr>' +

    banner +
    cqSection_('The quote', '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + whoRows + '</table>') +
    cqSection_('What they offered', optHtml) +
    cqSection_('Their assumptions', '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + assumeRows + '</table>') +
    cqSection_('Their equipment', '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + kitRows + '</table>') +
    cqSection_('Things to check', flagHtml) +
    cqSection_(isUpload ? 'What the client has seen' : 'What the client saw', sawHtml) +

    '<tr><td style="padding:24px 28px 26px">' +
      '<div style="border-top:1px solid ' + CQ_C.line + ';padding-top:14px;font-size:11.5px;color:' + CQ_C.muted + ';line-height:1.6">' +
        (d.fileName ? 'Their proposal is attached as ' + cqEsc_(d.fileName) + '.<br>' : '') +
        (d.pageUrl ? '<a href="' + cqEsc_(d.pageUrl) + '" style="color:' + CQ_C.muted + '">Open the page the client was on</a>' : '') +
      '</div>' +
    '</td></tr>' +

    '</table></div>';

  // Plain-text fallback for clients that refuse HTML. Deliberately simple,
  // no column alignment, because that is what broke the readability before.
  var plain = [
    subject, '',
    'Installer: ' + installer,
    'Rep: ' + [d.rep, d.repEmail, d.repPhone].filter(String).join(', '),
    'Client tag: ' + (d.client || 'untracked'),
    ''
  ];
  opts.forEach(function (o, i) {
    plain.push((o.label || ('Option ' + (i + 1))) + ': ' + (o.kw != null ? o.kw + ' kW, ' : '') +
      'net ' + cqMoney_(o.net) + ', net ' + cqPpw_(o.netPpw) + '/W');
  });
  if (!isUpload) plain.push('', 'Score: Rivertown ' + v.us + ' vs ' + installer + ' ' + v.them);
  (d.flags || []).forEach(function (f) { plain.push('- ' + f.note); });
  plain = plain.join('\n');

  var mail = { to: CQ_ALERT_TO, subject: subject, htmlBody: html, body: plain };
  if (d.fileB64 && d.fileName) {
    try {
      mail.attachments = [Utilities.newBlob(Utilities.base64Decode(d.fileB64), 'application/pdf', d.fileName)];
    } catch (err) { /* send without it rather than not at all */ }
  }
  MailApp.sendEmail(mail);
  logCompetitorQuote_(d, v);
}

function logCompetitorQuote_(d, v) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sh = ss.getSheetByName(CQ_LOG_SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(CQ_LOG_SHEET_NAME);
      sh.appendRow(['When', 'Stage', 'Client', 'Installer', 'Rep', 'Option', 'Net', 'Gross $/W', 'Net $/W',
                    'Their escalator', 'Their claim', 'Score us', 'Score them', 'Winner', 'Flags', 'Confidence']);
      sh.setFrozenRows(1);
    }
    var o = d.chosenOption || {}, a = d.assumed || {};
    sh.appendRow([
      new Date(), d.stage || 'compare', d.client || '', d.installer || '', d.rep || '',
      o.label || '', o.net || '', o.grossPpw || '', o.netPpw || '',
      a.escalator || '', (d.claimedSavings || [])[0] || '',
      v.us || '', v.them || '', (d.stage === 'upload') ? '(not compared)' : (v.winner === 'them' ? 'COMPETITOR' : 'Rivertown'),
      (d.flags || []).map(function (f) { return f.k; }).join(','),
      d.confidence || ''
    ]);
  } catch (err) {
    console.error('log', err);
  }
}
