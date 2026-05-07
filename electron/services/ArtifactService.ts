import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const electron = ((globalThis as any).__electronModule || require('electron')) as typeof import('electron');
const { app, shell } = electron;

type ArtifactKind = 'slides' | 'website' | 'design' | 'data-analysis' | 'justice-case' | 'purchase-protection';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48) || 'artifact';

export class ArtifactService {
  private root: string;

  constructor() {
    this.root = path.join(app.getPath('documents'), 'HermesDesk ME Artifacts');
    if (!fs.existsSync(this.root)) fs.mkdirSync(this.root, { recursive: true });
  }

  getRoot() {
    return this.root;
  }

  private createFolder(kind: ArtifactKind, title: string) {
    const folder = path.join(this.root, `${new Date().toISOString().slice(0, 10)}-${kind}-${slugify(title)}`);
    fs.mkdirSync(folder, { recursive: true });
    return folder;
  }

  async revealRoot() {
    await shell.openPath(this.root);
    return { ok: true, path: this.root };
  }

  async createSlides(title: string, brief: string) {
    const cleanTitle = title?.trim() || 'HermesDesk ME Slide Deck';
    const cleanBrief = brief?.trim() || 'Create a clear, practical slide deck.';
    const folder = this.createFolder('slides', cleanTitle);
    const sections = [
      ['Context', cleanBrief],
      ['Key Findings', 'Add researched findings, evidence, and decisions here.'],
      ['Plan', 'Break the work into clear next steps, owners, and timelines.'],
      ['Risks', 'List constraints, unknowns, and review points.'],
      ['Close', 'Summarize the recommendation and immediate action.']
    ];
    const md = `# ${cleanTitle}\n\n${sections.map(([h, body]) => `## ${h}\n${body}`).join('\n\n')}\n`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(cleanTitle)}</title><style>
      body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:#111827;color:#111827}
      section{min-height:100vh;box-sizing:border-box;padding:72px;display:flex;flex-direction:column;justify-content:center;background:#f8fafc;border-bottom:1px solid #e5e7eb}
      h1{font-size:54px;max-width:900px;margin:0 0 20px} h2{font-size:44px;margin:0 0 24px} p{font-size:24px;line-height:1.45;max-width:920px}
      .cover{background:#111827;color:white}.tag{font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#2563eb}
    </style></head><body>
      <section class="cover"><div class="tag">HermesDesk ME deck</div><h1>${escapeHtml(cleanTitle)}</h1><p>${escapeHtml(cleanBrief)}</p></section>
      ${sections.map(([h, body]) => `<section><div class="tag">Slide</div><h2>${escapeHtml(h)}</h2><p>${escapeHtml(body)}</p></section>`).join('')}
    </body></html>`;
    fs.writeFileSync(path.join(folder, 'deck.md'), md);
    fs.writeFileSync(path.join(folder, 'deck.html'), html);
    await shell.openPath(path.join(folder, 'deck.html'));
    return { ok: true, kind: 'slides', folder, files: ['deck.md', 'deck.html'] };
  }

  async createWebsite(title: string, brief: string) {
    const cleanTitle = title?.trim() || 'HermesDesk ME Website';
    const cleanBrief = brief?.trim() || 'A production-ready website starter.';
    const folder = this.createFolder('website', cleanTitle);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(cleanTitle)}</title><link rel="stylesheet" href="./styles.css"></head><body>
      <main><section class="hero"><p class="eyebrow">HermesDesk ME build</p><h1>${escapeHtml(cleanTitle)}</h1><p>${escapeHtml(cleanBrief)}</p><a href="#work">Start</a></section>
      <section id="work" class="grid"><article><h2>Offer</h2><p>Replace this with the real offer, service, or app workflow.</p></article><article><h2>Proof</h2><p>Add evidence, screenshots, customer notes, or metrics.</p></article><article><h2>Action</h2><p>Connect forms, calls, checkout, or app routes here.</p></article></section></main>
    </body></html>`;
    const css = `body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;background:#f8fafc}.hero{min-height:82vh;padding:72px 8vw;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(135deg,#0f172a,#164e63);color:white}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#67e8f9}h1{font-size:clamp(42px,7vw,88px);max-width:980px;margin:0 0 20px}p{font-size:20px;line-height:1.55;max-width:760px}a{width:max-content;background:white;color:#111827;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:900}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;padding:44px 8vw}article{background:white;border:1px solid #e5e7eb;border-radius:8px;padding:24px}`;
    fs.writeFileSync(path.join(folder, 'index.html'), html);
    fs.writeFileSync(path.join(folder, 'styles.css'), css);
    await shell.openPath(path.join(folder, 'index.html'));
    return { ok: true, kind: 'website', folder, files: ['index.html', 'styles.css'] };
  }

  async createDesign(title: string, brief: string) {
    const cleanTitle = title?.trim() || 'HermesDesk ME Design';
    const folder = this.createFolder('design', cleanTitle);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1024" viewBox="0 0 1440 1024">
      <rect width="1440" height="1024" fill="#f8fafc"/><rect x="80" y="72" width="1280" height="880" rx="16" fill="#fff" stroke="#e5e7eb"/>
      <text x="130" y="160" font-family="Inter,Segoe UI,Arial" font-size="46" font-weight="800" fill="#111827">${escapeHtml(cleanTitle)}</text>
      <text x="130" y="210" font-family="Inter,Segoe UI,Arial" font-size="22" fill="#475569">${escapeHtml((brief || 'Editable design preview').slice(0, 130))}</text>
      <rect x="130" y="280" width="360" height="180" rx="8" fill="#dbeafe"/><rect x="530" y="280" width="360" height="180" rx="8" fill="#dcfce7"/><rect x="930" y="280" width="360" height="180" rx="8" fill="#fee2e2"/>
      <rect x="130" y="520" width="1160" height="300" rx="8" fill="#111827"/><text x="170" y="590" font-family="Inter,Segoe UI,Arial" font-size="28" font-weight="800" fill="#fff">Primary workspace</text>
    </svg>`;
    fs.writeFileSync(path.join(folder, 'design-preview.svg'), svg);
    fs.writeFileSync(path.join(folder, 'brief.md'), `# ${cleanTitle}\n\n${brief || ''}\n`);
    await shell.openPath(path.join(folder, 'design-preview.svg'));
    return { ok: true, kind: 'design', folder, files: ['design-preview.svg', 'brief.md'] };
  }

  async analyzeData(filePath: string) {
    if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: 'Select a CSV file first.' };
    const text = fs.readFileSync(filePath, 'utf8');
    const rows = text.split(/\r?\n/).filter(Boolean).map(line => line.split(',').map(cell => cell.trim()));
    if (rows.length < 2) return { ok: false, error: 'CSV needs a header row and at least one data row.' };
    const headers = rows[0];
    const data = rows.slice(1);
    const numeric = headers.map((header, i) => {
      const values = data.map(row => Number(row[i])).filter(value => Number.isFinite(value));
      const sum = values.reduce((a, b) => a + b, 0);
      return { header, count: values.length, sum, average: values.length ? sum / values.length : 0, max: values.length ? Math.max(...values) : 0 };
    }).filter(col => col.count > 0);
    const folder = this.createFolder('data-analysis', path.basename(filePath));
    const report = `# Data Analysis: ${path.basename(filePath)}\n\nRows: ${data.length}\nColumns: ${headers.length}\n\n${numeric.map(col => `## ${col.header}\n- Count: ${col.count}\n- Sum: ${col.sum.toFixed(2)}\n- Average: ${col.average.toFixed(2)}\n- Max: ${col.max.toFixed(2)}`).join('\n\n') || 'No numeric columns detected.'}\n`;
    const max = Math.max(...numeric.map(col => col.max), 1);
    const bars = numeric.slice(0, 8).map((col, i) => `<div><b>${escapeHtml(col.header)}</b><span style="display:block;height:18px;width:${Math.max(4, (col.max / max) * 100)}%;background:#2563eb;border-radius:4px"></span><small>max ${col.max.toFixed(2)}</small></div>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Data Analysis</title><style>body{font-family:Inter,Segoe UI,Arial;padding:36px;background:#f8fafc;color:#111827}main{max-width:920px;margin:auto;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:28px}div{margin:18px 0}span{margin-top:6px}</style></head><body><main><h1>${escapeHtml(path.basename(filePath))}</h1><p>${data.length} rows, ${headers.length} columns</p>${bars || '<p>No numeric columns detected.</p>'}</main></body></html>`;
    fs.writeFileSync(path.join(folder, 'report.md'), report);
    fs.writeFileSync(path.join(folder, 'chart.html'), html);
    await shell.openPath(path.join(folder, 'chart.html'));
    return { ok: true, kind: 'data-analysis', folder, files: ['report.md', 'chart.html'], summary: { rows: data.length, columns: headers.length, numeric } };
  }

  async createJusticeCasePack(title: string, brief: string) {
    const cleanTitle = title?.trim() || 'Justice Case Pack';
    const cleanBrief = brief?.trim() || 'Describe the legal issue, decision, evidence, deadlines, parties, and what outcome you want.';
    const folder = this.createFolder('justice-case', cleanTitle);
    const files: Record<string, string> = {
      '00-readme.md': `# ${cleanTitle}\n\nThis is an AI-assisted case preparation pack, not legal advice and not a substitute for a regulated solicitor/barrister. Use it to organize evidence, questions, draft arguments, and approval-gated next actions.\n\n## Issue\n${cleanBrief}\n\n## Immediate rule\nDo not miss deadlines. Verify current procedure on GOV.UK, judiciary/tribunal guidance, regulator/ombudsman pages, and any court order you already received.\n`,
      '01-case-summary.md': `# Case Summary\n\n## Parties\n- Claimant/applicant:\n- Defendant/respondent:\n- Court/tribunal/ombudsman/regulator:\n\n## What happened\n\n## What decision or conduct is wrong\n\n## What outcome is wanted\n\n## Urgent deadlines\n\n`,
      '02-chronology.md': `# Chronology\n\n| Date | Event | Evidence | Why it matters |\n|---|---|---|---|\n| YYYY-MM-DD |  |  |  |\n`,
      '03-evidence-index.md': `# Evidence Index\n\n| Ref | File / source | Fact proved | Weakness / objection | Action |\n|---|---|---|---|---|\n| E1 |  |  |  |  |\n`,
      '04-legal-issues-and-loopholes.md': `# Legal Issues, Loopholes, and Pressure Points\n\n## Jurisdiction and deadline checks\n- Which body has power to decide this?\n- Is there an appeal/review/reconsideration route?\n- Is permission required?\n- Was the decision irrational, procedurally unfair, biased, unsupported by evidence, or legally wrong?\n\n## Arguments to test\n- Procedural unfairness\n- Error of law\n- Failure to consider relevant evidence\n- Taking irrelevant matters into account\n- Reasons inadequate or contradictory\n- Discrimination / human rights angle where genuinely supported\n- Consumer/professional misconduct angle where supported\n\n## Weaknesses to fix before action\n\n`,
      '05-route-map-uk-appeal-review.md': `# Route Map: UK Review / Appeal / Escalation\n\nUse this as a checklist, then verify current rules before filing.\n\n1. Ask for written reasons / decision notice if missing.\n2. Check internal review, complaint, reconsideration, set aside, or permission-to-appeal route.\n3. Check court/tribunal appeal route and deadline.\n4. If public body conduct is involved, check judicial review time limits urgently.\n5. If consumer/professional misconduct is involved, check regulator or ombudsman route.\n6. Human rights escalation normally requires exhausting effective domestic remedies first. Do not assume EU/International court jurisdiction.\n\n`,
      '06-draft-letter-before-action.md': `# Draft Letter Before Action / Formal Complaint\n\n[Your name]\n[Address]\n[Date]\n\nTo: [Recipient]\n\nSubject: Formal complaint / proposed action - ${cleanTitle}\n\nI write regarding: ${cleanBrief}\n\nFacts:\n1. \n\nWhy this is wrong:\n1. \n\nEvidence enclosed:\n1. \n\nRemedy requested:\n1. \n\nPlease respond by [date].\n\nThis draft must be reviewed before sending.\n`,
      '07-hearing-prep.md': `# Hearing / Meeting Prep\n\n## One-page case theory\n\n## Top 10 points to make\n\n## Questions for the other side\n\n## Questions for the judge/tribunal/regulator if appropriate\n\n## Bundle checklist\n\n`,
      '08-public-interest-and-scam-patterns.md': `# Public Interest / Scam Pattern Analysis\n\n## Pattern\n\n## Who else may be affected\n\n## Evidence of systemic issue\n\n## Regulator / ombudsman / press / MP routes\n\n## Risks of defamation or contempt\nOnly make public claims backed by evidence and legal review.\n`
    };
    Object.entries(files).forEach(([name, content]) => fs.writeFileSync(path.join(folder, name), content));
    await shell.openPath(path.join(folder, '00-readme.md'));
    return { ok: true, kind: 'justice-case', folder, files: Object.keys(files) };
  }

  async createPurchaseProtectionPack(title: string, brief: string) {
    const cleanTitle = title?.trim() || 'Purchase Protection Pack';
    const cleanBrief = brief?.trim() || 'Describe the product, seller, price, website, payment method, and concern.';
    const folder = this.createFolder('purchase-protection', cleanTitle);
    const files: Record<string, string> = {
      '00-readme.md': `# ${cleanTitle}\n\nReal online-buying research and protection pack.\n\n## Purchase / issue\n${cleanBrief}\n`,
      '01-seller-research.md': `# Seller Research\n\n| Check | Finding | Evidence URL / screenshot | Risk |\n|---|---|---|---|\n| Company identity |  |  |  |\n| Domain age / ownership |  |  |  |\n| Reviews outside seller site |  |  |  |\n| Address / phone / email |  |  |  |\n| Return policy |  |  |  |\n| Payment protection |  |  |  |\n`,
      '02-product-comparison.md': `# Product Comparison\n\n| Seller | Product | Price | Delivery | Warranty | Return | Notes |\n|---|---|---:|---|---|---|---|\n`,
      '03-scam-risk-checklist.md': `# Scam Risk Checklist\n\n- Price too good to be true\n- New or hidden domain identity\n- No real address or mismatched company details\n- Pressure countdowns or fake stock urgency\n- Bank transfer / crypto / friends-and-family payment requested\n- Reviews look copied or only on seller site\n- Return policy vague or impossible\n- Product photos copied from another listing\n\n`,
      '04-complaint-chargeback-route.md': `# Complaint / Refund / Chargeback Route\n\n1. Screenshot product page, checkout, confirmation, tracking, messages.\n2. Ask seller for remedy in writing.\n3. Check card chargeback / Section 75 if credit card and eligible.\n4. Check PayPal/eBay/Amazon/platform dispute route if used.\n5. Report fraud/scam where appropriate.\n6. Save all evidence before public accusations.\n`,
      '05-draft-seller-message.md': `# Draft Seller Message\n\nSubject: Order issue / refund request - ${cleanTitle}\n\nHello,\n\nI am contacting you about: ${cleanBrief}\n\nPlease confirm:\n1. \n2. \n\nRequested remedy:\n\nPlease respond by [date].\n`
    };
    Object.entries(files).forEach(([name, content]) => fs.writeFileSync(path.join(folder, name), content));
    await shell.openPath(path.join(folder, '00-readme.md'));
    return { ok: true, kind: 'purchase-protection', folder, files: Object.keys(files) };
  }
}
