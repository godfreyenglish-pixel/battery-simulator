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
 *  5. Set ALERT_TO below.
 *
 * The tool POSTs with mode:'no-cors' and Content-Type text/plain, so nothing
 * is read back. Failures here are silent on the client by design.
 */

var ALERT_TO = 'godfrey@rivertownsolar.com';
var LOG_SHEET_NAME = 'Competitor Quotes';

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'competitor_quote') handleCompetitorQuote_(body);
  } catch (err) {
    console.error('doPost', err);
  }
  return ContentService.createTextOutput('ok');
}

function handleCompetitorQuote_(d) {
  var money = function (n) {
    return (n == null || n === '') ? '—' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };
  var ppw = function (n) { return n == null ? '—' : '$' + Number(n).toFixed(2) + '/W'; };

  var opts = d.options || [];
  var rows = opts.map(function (o, i) {
    return [
      '  ' + (o.label || ('Option ' + (i + 1))),
      '    size            ' + (o.kw != null ? o.kw + ' kW' : '—'),
      '    production      ' + (o.productionKwh != null ? Number(o.productionKwh).toLocaleString() + ' kWh/yr' : '—'),
      '    offset          ' + (o.offsetPct != null ? o.offsetPct + '%' : '—'),
      '    gross           ' + money(o.gross) + '   (' + ppw(o.grossPpw) + ')',
      '    incentive       ' + money(o.incentive),
      '    NET             ' + money(o.net) + '   (' + ppw(o.netPpw) + ')',
      '    claimed payback ' + (o.claimedPaybackYr != null ? 'year ' + o.claimedPaybackYr : '—')
    ].join('\n');
  }).join('\n\n');

  var flags = (d.flags || []).map(function (f) { return '  • [' + f.k + '] ' + f.note; }).join('\n') || '  none';
  var warr = (d.warranties || []).map(function (w) { return w.years + 'y ' + w.name; }).join(' · ') || '—';
  var a = d.assumed || {};
  var v = d.verdict || {};
  var chosen = d.chosenOption || {};

  // Three stages per document:
  //   'upload'   fired the moment the parse succeeded, before the client
  //              confirmed anything. No verdict yet. PDF attached.
  //   'compare'  fired when they ran the comparison. Corrected fields, score,
  //              and whether the review prompt appeared. PDF attached.
  //   'proposal' fired when they generated the standalone side-by-side page.
  //              Highest-intent signal of the three. No PDF, it already came.
  var isUpload = (d.stage === 'upload');
  var isProposal = (d.stage === 'proposal');
  var tag = isUpload ? '[1/3 UPLOADED] ' : (isProposal ? '[3/3 SIDE-BY-SIDE] ' : '[2/3 COMPARED] ');

  var subject = tag +
                'Competitor quote — ' + (d.installer || 'unknown installer') +
                (d.client ? ' — ' + d.client : '') +
                (!isUpload && d.promptShown ? '  [THEY SCORED HIGHER]' : '');

  var head;
  if (isUpload) {
    head = 'A client just uploaded this competitor quote. They have NOT run the comparison yet.\n' +
           'Figures below are the raw parse and have not been confirmed by the client.\n' +
           'If no "COMPARED" email follows, they left without finishing. Worth a call.\n';
  } else if (isProposal) {
    head = '*** The client generated the standalone side-by-side document. ***\n' +
           'This is the strongest signal in the sequence: they are comparing you seriously\n' +
           'and now hold a page they can forward to whoever else is deciding.\n' +
           (d.promptShown
             ? 'It tells them ' + (d.installer || 'the competitor') + ' came out ahead, states the margin,\n' +
               'and offers them a counter-offer request. Expect that email.\n'
             : 'It tells them Rivertown came out ahead.\n');
    if (d.correctedClaim && d.correctedClaim.stated != null) {
      head += '\nThe page shows their ' + (d.correctedClaim.term || 20) + '-year claim of ' +
              money(d.correctedClaim.stated) + ' next to ' + money(d.correctedClaim.corrected) +
              ' recalculated.\nBe ready to defend that arithmetic on a phone call.\n';
    }
  } else {
    head = d.promptShown
      ? '*** The tool scored THEM higher and showed the client the quote-review prompt. Expect contact. ***\n'
      : 'The tool scored Rivertown higher. No review prompt was shown.\n';
  }

  var lines = [
    head,
    'INSTALLER      ' + (d.installer || '—'),
    'REP            ' + [d.rep, d.repEmail, d.repPhone].filter(String).join(' · '),
    'CLIENT TAG     ' + (d.client || '(untracked link)'),
    'PROPERTY       ' + (d.address || '—'),
    'QUOTE VALID    ' + (d.validThrough || '—'),
    'PARSE CONF.    ' + (d.confidence != null ? d.confidence + '%' : '—'),
    '',
    'THEIR ASSUMPTIONS',
    '  rate          ' + (a.rate != null ? '$' + a.rate + '/kWh' : '—'),
    '  escalator     ' + (a.escalator != null ? a.escalator + '%/yr' : '—'),
    '  annual usage  ' + (a.usageKwh != null ? Number(a.usageKwh).toLocaleString() + ' kWh' : '—'),
    '  claim term    ' + (a.term != null ? a.term + ' yrs' : '—'),
    '  claimed grid cost  ' + money(d.claimedGridCost),
    '  claimed savings    ' + ((d.claimedSavings || []).map(money).join(' · ') || '—'),
    '',
    'OPTIONS  ($/W is installer-only, never shown to the client)',
    rows || '  none parsed',
    '',
    'EQUIPMENT',
    '  panel     ' + [(d.panel || {}).watts ? (d.panel.watts + 'W') : null, (d.panel || {}).make].filter(String).join(' ') || '—',
    '  battery   ' + [(d.battery || {}).make,
                      (d.battery || {}).usableKwh ? d.battery.usableKwh + ' kWh usable' : null,
                      (d.battery || {}).contKw ? d.battery.contKw + ' kW cont' : null,
                      (d.battery || {}).warrantyYrs ? d.battery.warrantyYrs + ' yr warranty' : null].filter(String).join(' · ') || '—',
    '  warranties  ' + warr,
    '',
    'THINGS TO CHECK  (never shown to the client)',
    flags,
    '',
    isUpload ? 'CLIENT HAS NOT COMPARED YET' : 'CLIENT SAW',
    isUpload ? '  (no verdict until they confirm the fields and hit Compare)'
             : '  option compared   ' + (chosen.label || '—') + ' · ' + money(chosen.net),
    isUpload ? '' : '  score             Rivertown ' + (v.us != null ? v.us : '—') + '  vs  ' + (d.installer || 'them') + ' ' + (v.them != null ? v.them : '—'),
    isUpload ? '' : '  winner            ' + (v.winner === 'them' ? (d.installer || 'competitor') : 'Rivertown'),
    '',
    'PAGE           ' + (d.pageUrl || '—')
  ].join('\n');

  var opts2 = {};
  if (d.fileB64 && d.fileName) {
    try {
      opts2.attachments = [Utilities.newBlob(Utilities.base64Decode(d.fileB64), 'application/pdf', d.fileName)];
    } catch (err) {
      lines += '\n\n(Could not attach the PDF: ' + err + ')';
    }
  } else if (!isProposal) {
    lines += '\n\n(No PDF attached — file was over the size cap or could not be read.)';
  }

  MailApp.sendEmail(ALERT_TO, subject, lines, opts2);
  logCompetitorQuote_(d, v);
}

function logCompetitorQuote_(d, v) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sh = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(LOG_SHEET_NAME);
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
