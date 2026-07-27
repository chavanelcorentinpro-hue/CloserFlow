import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(process.env.CLOSERFLOW_DATA_DIR || resolve(root, 'data'));
const port = Number(process.env.PORT || 8787);
const adminToken = process.env.CLOSERFLOW_API_TOKEN || 'dev-token';
const usersFile = resolve(dataDir, 'users.json');
const devicesFile = resolve(dataDir, 'devices.json');
const integrationsFile = resolve(dataDir, 'integrations.json');
const auditFile = resolve(dataDir, 'saas-audit.json');
const approvalsFile = resolve(dataDir, 'approvals.json');
const subscriptionsFile = resolve(dataDir, 'subscriptions.json');
await mkdir(dataDir, { recursive: true });

const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const readBody = req => new Promise((resolveBody, reject) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 15_000_000) req.destroy(); });
  req.on('end', () => { try { resolveBody(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } });
  req.on('error', reject);
});

const safeWorkspace = value => /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const fileFor = workspace => resolve(dataDir, `workspace-${workspace}.json`);
const historyFileFor = workspace => resolve(dataDir, `workspace-${workspace}-history.json`);
const activityFileFor = workspace => resolve(dataDir, `workspace-${workspace}-activity.json`);
const loadIntegrations = async () => { try { return JSON.parse(await readFile(integrationsFile, 'utf8')); } catch { return { apiKeys: [], webhooks: [], logs: [] }; } };
const saveIntegrations = data => writeFile(integrationsFile, JSON.stringify({ apiKeys: data.apiKeys || [], webhooks: data.webhooks || [], logs: (data.logs || []).slice(0, 1000) }, null, 2), 'utf8');
const loadAudit = async () => { try { return JSON.parse(await readFile(auditFile, 'utf8')); } catch { return []; } };
const loadDevices = async () => { try { return JSON.parse(await readFile(devicesFile, 'utf8')); } catch { return []; } };
const loadApprovals = async () => { try { return JSON.parse(await readFile(approvalsFile, 'utf8')); } catch { return []; } };
const loadSubscriptions = async () => { try { return JSON.parse(await readFile(subscriptionsFile, 'utf8')); } catch { return []; } };
const saveSubscriptions = data => writeFile(subscriptionsFile, JSON.stringify(data.slice(0, 10000), null, 2), 'utf8');
const planLimits = {
  solo: { users:1, storageMb:512 },
  team: { users:5, storageMb:2048 },
  pro: { users:25, storageMb:8192 }
};
const normalizePlan = value => ['solo','team','pro'].includes(String(value)) ? String(value) : 'solo';
const subscriptionPublic = sub => sub ? ({
  workspaceId:sub.workspaceId, companyName:sub.companyName, plan:sub.plan, status:sub.status,
  trialStartedAt:sub.trialStartedAt, trialEndsAt:sub.trialEndsAt,
  createdAt:sub.createdAt, updatedAt:sub.updatedAt,
  paymentsEnabled:false, limits:planLimits[sub.plan] || planLimits.solo
}) : null;

const saveApprovals = data => writeFile(approvalsFile, JSON.stringify(data.slice(0, 2000), null, 2), 'utf8');
const saveDevices = data => writeFile(devicesFile, JSON.stringify(data.slice(0, 500), null, 2), 'utf8');
const appendAudit = async entry => { const rows = await loadAudit(); rows.unshift({ id: randomBytes(10).toString('hex'), createdAt: new Date().toISOString(), ...entry }); await writeFile(auditFile, JSON.stringify(rows.slice(0, 2000), null, 2), 'utf8'); };
const dataSize = value => Buffer.byteLength(JSON.stringify(value || {}), 'utf8');
const keyHash = value => createHash('sha256').update(String(value)).digest('hex');
const publicKey = item => ({ id:item.id, name:item.name, prefix:item.prefix, scopes:item.scopes, workspaceId:item.workspaceId, createdAt:item.createdAt, lastUsedAt:item.lastUsedAt || null, revokedAt:item.revokedAt || null });
const publicWebhook = item => ({ id:item.id, url:item.url, events:item.events, active:item.active, workspaceId:item.workspaceId, createdAt:item.createdAt, lastDeliveryAt:item.lastDeliveryAt || null });
const addIntegrationLog = async (entry) => { const data=await loadIntegrations(); data.logs ||= []; data.logs.unshift({ id:randomBytes(10).toString('hex'), createdAt:new Date().toISOString(), ...entry }); await saveIntegrations(data); };
const findApiKey = async req => { const raw=bearer(req); if(!raw.startsWith('cf_')) return null; const data=await loadIntegrations(); const item=data.apiKeys.find(k=>!k.revokedAt && k.hash===keyHash(raw)); if(!item)return null; item.lastUsedAt=new Date().toISOString(); await saveIntegrations(data); return { item, data }; };
const canScope = (key, scope) => key.scopes.includes('*') || key.scopes.includes(scope);
const openApiDocument = baseUrl => ({ openapi:'3.0.3', info:{title:'CloserFlow Public API',version:'35.0.0'}, servers:[{url:baseUrl}], components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer'}}}, security:[{bearerAuth:[]}], paths:{'/public/v1/workspace':{get:{summary:'Lire le dossier synchronisé',responses:{'200':{description:'Données du workspace'}}}},'/public/v1/clients':{get:{summary:'Lister les clients',responses:{'200':{description:'Clients'}}}},'/public/v1/missions':{get:{summary:'Lister les missions',responses:{'200':{description:'Missions'}}}}} });
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const publicUser = user => ({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, workspaceId: user.workspaceId, createdAt: user.createdAt });
const publicInvite = invite => ({ id: invite.id, email: invite.email, role: invite.role, workspaceId: invite.workspaceId, code: invite.code, createdAt: invite.createdAt, expiresAt: invite.expiresAt, acceptedAt: invite.acceptedAt || null });
const hashPassword = password => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};
const verifyPassword = (password, stored) => {
  try {
    const [salt, expectedHex] = stored.split(':');
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
};
const loadAuth = async () => {
  try { return JSON.parse(await readFile(usersFile, 'utf8')); }
  catch { return { users: [], sessions: {}, invitations: [] }; }
};
const saveAuth = data => { data.invitations ||= []; data.sessions ||= {}; data.users ||= []; return writeFile(usersFile, JSON.stringify(data, null, 2), 'utf8'); };
const bearer = req => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const findSession = async req => {
  const token = bearer(req);
  if (!token) return null;
  const data = await loadAuth();
  const userId = data.sessions?.[token];
  const user = data.users.find(item => item.id === userId);
  return user ? { token, user, data } : null;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.url === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'CloserFlow API', version: '35.0.0', time: new Date().toISOString() });
  if (req.url === '/api/openapi.json' && req.method === 'GET') return json(res, 200, openApiDocument(`http://${req.headers.host || `127.0.0.1:${port}`}`));

  try {
    if (req.url === '/api/platform/summary' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      let workspace = null;
      try { workspace = JSON.parse(await readFile(fileFor(session.user.workspaceId), 'utf8')); } catch {}
      const devices = (await loadDevices()).filter(item => item.workspaceId === session.user.workspaceId && !item.revokedAt);
      const audit = (await loadAudit()).filter(item => item.workspaceId === session.user.workspaceId).slice(0, 20);
      return json(res, 200, { workspaceId: session.user.workspaceId, revision: Number(workspace?.revision || 0), updatedAt: workspace?.updatedAt || null, devices: devices.length, audit });
    }
    if (req.url === '/api/devices' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const devices = (await loadDevices()).filter(item => item.workspaceId === session.user.workspaceId).map(({ tokenHash, ...item }) => item);
      return json(res, 200, { devices });
    }
    if (req.url === '/api/devices/register' && req.method === 'POST') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const input = await readBody(req);
      const deviceId = String(input.deviceId || '').trim();
      const label = String(input.label || 'Appareil').trim().slice(0, 120);
      const platform = String(input.platform || 'web').trim().slice(0, 40);
      if (!deviceId || deviceId.length > 160) return json(res, 400, { error: 'Identifiant appareil invalide.' });
      const rows = await loadDevices();
      const now = new Date().toISOString();
      const existing = rows.find(item => item.workspaceId === session.user.workspaceId && item.deviceId === deviceId);
      if (existing) { existing.label = label; existing.platform = platform; existing.lastSeenAt = now; existing.revokedAt = null; }
      else rows.unshift({ id: randomBytes(12).toString('hex'), workspaceId: session.user.workspaceId, userId: session.user.id, deviceId, label, platform, trusted: false, createdAt: now, lastSeenAt: now, revokedAt: null });
      await saveDevices(rows); await appendAudit({ workspaceId:session.user.workspaceId, userId:session.user.id, actor:session.user.displayName, action:'device.registered', detail:label });
      return json(res, 200, { ok: true });
    }
    const deviceTrust = req.url?.match(/^\/api\/devices\/([^/?]+)\/trust$/);
    if (deviceTrust && req.method === 'PUT') {
      const session = await findSession(req); if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (!['admin','manager'].includes(session.user.role)) return json(res, 403, { error: 'Droits insuffisants.' });
      const rows = await loadDevices(); const item = rows.find(x => x.id === deviceTrust[1] && x.workspaceId === session.user.workspaceId);
      if (!item) return json(res, 404, { error: 'Appareil introuvable.' });
      item.trusted = true; item.revokedAt = null; await saveDevices(rows); await appendAudit({ workspaceId:session.user.workspaceId, userId:session.user.id, actor:session.user.displayName, action:'device.trusted', detail:item.label });
      return json(res, 200, { ok:true });
    }
    const deviceDelete = req.url?.match(/^\/api\/devices\/([^/?]+)$/);
    if (deviceDelete && req.method === 'DELETE') {
      const session = await findSession(req); if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (session.user.role !== 'admin') return json(res, 403, { error: 'Administrateur requis.' });
      const rows = await loadDevices(); const item = rows.find(x => x.id === deviceDelete[1] && x.workspaceId === session.user.workspaceId);
      if (!item) return json(res, 404, { error: 'Appareil introuvable.' });
      item.revokedAt = new Date().toISOString(); item.trusted = false; await saveDevices(rows); await appendAudit({ workspaceId:session.user.workspaceId, userId:session.user.id, actor:session.user.displayName, action:'device.revoked', detail:item.label });
      return json(res, 200, { ok:true });
    }

    if (req.url === '/api/auth/register' && req.method === 'POST') {
      const input = await readBody(req);
      const email = normalizeEmail(input.email);
      const displayName = String(input.displayName || '').trim();
      const password = String(input.password || '');
      const workspaceId = String(input.workspaceId || 'default').trim();
      const companyName = String(input.companyName || displayName).trim().slice(0, 120);
      const plan = normalizePlan(input.plan);
      if (!email.includes('@') || displayName.length < 2 || password.length < 6 || !safeWorkspace(workspaceId)) return json(res, 400, { error: 'Nom, e-mail, mot de passe (6 caractères) ou espace invalide.' });
      const data = await loadAuth();
      if (data.users.some(user => user.email === email)) return json(res, 409, { error: 'Un compte existe déjà avec cet e-mail.' });
      if (data.users.some(user => user.workspaceId === workspaceId)) return json(res, 409, { error: 'Cet identifiant entreprise est déjà utilisé.' });
      const user = {
        id: randomBytes(16).toString('hex'), email, displayName,
        passwordHash: hashPassword(password), workspaceId,
        role: data.users.length === 0 ? 'admin' : 'employee',
        createdAt: new Date().toISOString(),
      };
      const token = randomBytes(32).toString('hex');
      data.users.push(user); data.sessions[token] = user.id; await saveAuth(data);

      const subscriptions = await loadSubscriptions();
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 86400000);
      const subscription = {
        workspaceId,
        companyName: companyName || displayName,
        plan,
        status:'trial',
        trialStartedAt:now.toISOString(),
        trialEndsAt:trialEnds.toISOString(),
        createdAt:now.toISOString(),
        updatedAt:now.toISOString()
      };
      subscriptions.unshift(subscription);
      await saveSubscriptions(subscriptions);
      await appendAudit({ workspaceId, userId:user.id, actor:displayName, action:'auth.register', detail:`trial ${plan}` });
      return json(res, 201, { token, user: publicUser(user), subscription: subscriptionPublic(subscription) });
    }

    if (req.url === '/api/auth/accept-invite' && req.method === 'POST') {
      const input = await readBody(req);
      const code = String(input.code || '').trim();
      const displayName = String(input.displayName || '').trim();
      const password = String(input.password || '');
      const data = await loadAuth();
      data.invitations ||= [];
      const invite = data.invitations.find(item => item.code === code && !item.acceptedAt);
      if (!invite || new Date(invite.expiresAt).getTime() < Date.now()) return json(res, 400, { error: 'Invitation invalide ou expirée.' });
      if (displayName.length < 2 || password.length < 6) return json(res, 400, { error: 'Nom ou mot de passe invalide.' });
      if (data.users.some(user => user.email === invite.email)) return json(res, 409, { error: 'Un compte existe déjà avec cet e-mail.' });
      const user = { id: randomBytes(16).toString('hex'), email: invite.email, displayName, passwordHash: hashPassword(password), workspaceId: invite.workspaceId, role: invite.role, createdAt: new Date().toISOString() };
      const token = randomBytes(32).toString('hex');
      invite.acceptedAt = new Date().toISOString(); data.users.push(user); data.sessions[token] = user.id; await saveAuth(data);
      return json(res, 201, { token, user: publicUser(user) });
    }
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      const input = await readBody(req);
      const email = normalizeEmail(input.email);
      const password = String(input.password || '');
      const data = await loadAuth();
      const user = data.users.find(item => item.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) return json(res, 401, { error: 'E-mail ou mot de passe incorrect.' });
      const token = randomBytes(32).toString('hex');
      data.sessions[token] = user.id; await saveAuth(data); await appendAudit({ workspaceId:user.workspaceId, userId:user.id, actor:user.displayName, action:'auth.login' });
      return json(res, 200, { token, user: publicUser(user) });
    }
    if (req.url === '/api/auth/me' && req.method === 'GET') {
      const session = await findSession(req);
      return session ? json(res, 200, { user: publicUser(session.user) }) : json(res, 401, { error: 'Session invalide.' });
    }
    if (req.url === '/api/auth/logout' && req.method === 'POST') {
      const session = await findSession(req);
      if (session) { delete session.data.sessions[session.token]; await saveAuth(session.data); }
      return json(res, 200, { ok: true });
    }
    if (req.url === '/api/users' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const users = session.data.users.filter(user => user.workspaceId === session.user.workspaceId).map(publicUser);
      return json(res, 200, { users });
    }



    if (req.url === '/api/billing/status' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const rows = await loadSubscriptions();
      let sub = rows.find(item => item.workspaceId === session.user.workspaceId);
      if (!sub) {
        const now = new Date();
        sub = {
          workspaceId:session.user.workspaceId,
          companyName:session.user.displayName,
          plan:'solo',
          status:'trial',
          trialStartedAt:now.toISOString(),
          trialEndsAt:new Date(now.getTime()+14*86400000).toISOString(),
          createdAt:now.toISOString(),
          updatedAt:now.toISOString()
        };
        rows.unshift(sub); await saveSubscriptions(rows);
      }
      if (sub.status === 'trial' && new Date(sub.trialEndsAt).getTime() < Date.now()) {
        sub.status = 'trial_expired';
        sub.updatedAt = new Date().toISOString();
        await saveSubscriptions(rows);
      }
      return json(res, 200, { subscription:subscriptionPublic(sub) });
    }

    if (req.url === '/api/billing/plan' && req.method === 'PUT') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (session.user.role !== 'admin') return json(res, 403, { error: 'Administrateur requis.' });
      const input = await readBody(req);
      const plan = normalizePlan(input.plan);
      const rows = await loadSubscriptions();
      const sub = rows.find(item => item.workspaceId === session.user.workspaceId);
      if (!sub) return json(res, 404, { error: 'Abonnement introuvable.' });
      sub.plan = plan;
      sub.updatedAt = new Date().toISOString();
      await saveSubscriptions(rows);
      await appendAudit({ workspaceId:session.user.workspaceId, userId:session.user.id, actor:session.user.displayName, action:'billing.plan.changed', detail:plan });
      return json(res, 200, { subscription:subscriptionPublic(sub) });
    }

    if (req.url === '/api/saas/status' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const users = session.data.users.filter(user => user.workspaceId === session.user.workspaceId);
      let workspace = null;
      try { workspace = JSON.parse(await readFile(fileFor(session.user.workspaceId), 'utf8')); } catch {}
      const audit = await loadAudit();
      const activeSessions = Object.values(session.data.sessions || {}).filter(id => users.some(user => user.id === id)).length;
      const subscriptions = await loadSubscriptions();
      const billing = subscriptions.find(item => item.workspaceId === session.user.workspaceId);
      return json(res, 200, {
        workspaceId: session.user.workspaceId,
        plan: billing?.plan || 'solo',
        subscriptionStatus: billing?.status || 'self-hosted',
        trialEndsAt: billing?.trialEndsAt || null,
        limits: planLimits[billing?.plan] || { users:25, storageMb:1024 },
        usage: { users: users.length, activeSessions, storageBytes: dataSize(workspace), revision: Number(workspace?.revision || 0) },
        security: { passwordHashing: 'scrypt', bearerSessions: true, tenantIsolation: true, auditLog: true },
        lastAuditAt: audit.find(row => row.workspaceId === session.user.workspaceId)?.createdAt || null,
      });
    }
    if (req.url === '/api/saas/audit' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const rows = (await loadAudit()).filter(row => row.workspaceId === session.user.workspaceId).slice(0, 200);
      return json(res, 200, { rows });
    }
    if (req.url === '/api/saas/backup' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (!['admin','manager'].includes(session.user.role)) return json(res, 403, { error: 'Droits insuffisants.' });
      let workspace = null; let history = []; let activity = [];
      try { workspace = JSON.parse(await readFile(fileFor(session.user.workspaceId), 'utf8')); } catch {}
      try { history = JSON.parse(await readFile(historyFileFor(session.user.workspaceId), 'utf8')); } catch {}
      try { activity = JSON.parse(await readFile(activityFileFor(session.user.workspaceId), 'utf8')); } catch {}
      const users = session.data.users.filter(user => user.workspaceId === session.user.workspaceId).map(publicUser);
      await appendAudit({ workspaceId: session.user.workspaceId, userId: session.user.id, actor: session.user.displayName, action: 'backup.exported' });
      return json(res, 200, { exportedAt: new Date().toISOString(), version: '35.0.0', workspaceId: session.user.workspaceId, workspace, history, activity, users });
    }

    if (req.url === '/api/invitations' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      session.data.invitations ||= [];
      const invitations = session.data.invitations.filter(item => item.workspaceId === session.user.workspaceId && !item.acceptedAt).map(publicInvite);
      return json(res, 200, { invitations });
    }
    if (req.url === '/api/invitations' && req.method === 'POST') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (!['admin','manager'].includes(session.user.role)) return json(res, 403, { error: 'Droits insuffisants.' });
      const input = await readBody(req); const email = normalizeEmail(input.email); const role = String(input.role || 'employee');
      if (!email.includes('@') || !['manager','employee'].includes(role)) return json(res, 400, { error: 'E-mail ou rôle invalide.' });
      if (session.data.users.some(user => user.email === email)) return json(res, 409, { error: 'Cet utilisateur possède déjà un compte.' });
      session.data.invitations ||= [];
      session.data.invitations = session.data.invitations.filter(item => item.email !== email || item.workspaceId !== session.user.workspaceId || item.acceptedAt);
      const invite = { id: randomBytes(12).toString('hex'), code: randomBytes(18).toString('hex'), email, role, workspaceId: session.user.workspaceId, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+7*86400000).toISOString(), acceptedAt: null };
      session.data.invitations.push(invite); await saveAuth(session.data); return json(res, 201, { invitation: publicInvite(invite) });
    }
    const roleMatch = req.url?.match(/^\/api\/users\/([^/?]+)\/role$/);
    if (roleMatch && req.method === 'PUT') {
      const session = await findSession(req); if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (session.user.role !== 'admin') return json(res, 403, { error: 'Seul un administrateur peut modifier les rôles.' });
      const input = await readBody(req); const role = String(input.role || '');
      if (!['admin','manager','employee'].includes(role)) return json(res, 400, { error: 'Rôle invalide.' });
      const target = session.data.users.find(user => user.id === roleMatch[1] && user.workspaceId === session.user.workspaceId);
      if (!target) return json(res, 404, { error: 'Utilisateur introuvable.' });
      const admins = session.data.users.filter(user => user.workspaceId === session.user.workspaceId && user.role === 'admin');
      if (target.role === 'admin' && role !== 'admin' && admins.length <= 1) return json(res, 409, { error: 'Il faut conserver au moins un administrateur.' });
      target.role = role; await saveAuth(session.data); return json(res, 200, { user: publicUser(target) });
    }

    if (req.url === '/api/approvals' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const rows = (await loadApprovals())
        .filter(item => item.workspaceId === session.user.workspaceId)
        .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 300);
      return json(res, 200, { approvals: rows });
    }
    if (req.url === '/api/approvals' && req.method === 'POST') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const input = await readBody(req);
      const title = String(input.title || '').trim();
      const detail = String(input.detail || '').trim().slice(0, 3000);
      const kind = String(input.kind || 'custom');
      const route = String(input.route || '').trim().slice(0, 200);
      const amount = Number(input.amount || 0);
      const allowedKinds = ['expense','discount','payment','data_restore','role_change','purchase','custom'];
      if (title.length < 3 || !allowedKinds.includes(kind) || !Number.isFinite(amount) || amount < 0) {
        return json(res, 400, { error: 'Demande d’approbation invalide.' });
      }
      const now = new Date().toISOString();
      const item = {
        id: randomBytes(12).toString('hex'),
        workspaceId: session.user.workspaceId,
        requesterId: session.user.id,
        requesterName: session.user.displayName,
        requesterRole: session.user.role,
        title,
        detail,
        kind,
        route,
        amount,
        status: 'pending',
        createdAt: now,
        decidedAt: null,
        decidedById: null,
        decidedByName: null,
        decisionNote: ''
      };
      const rows = await loadApprovals();
      rows.unshift(item);
      await saveApprovals(rows);
      await appendAudit({
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        actor: session.user.displayName,
        action: 'approval.created',
        detail: `${kind} · ${title}`
      });
      return json(res, 201, { approval: item });
    }
    const approvalDecisionMatch = req.url?.match(/^\/api\/approvals\/([^/?]+)\/decision$/);
    if (approvalDecisionMatch && req.method === 'PUT') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (!['admin','manager'].includes(session.user.role)) return json(res, 403, { error: 'Validation manager ou administrateur requise.' });
      const input = await readBody(req);
      const decision = String(input.decision || '');
      const note = String(input.note || '').trim().slice(0, 2000);
      if (!['approved','rejected'].includes(decision)) return json(res, 400, { error: 'Décision invalide.' });
      const rows = await loadApprovals();
      const item = rows.find(row => row.id === approvalDecisionMatch[1] && row.workspaceId === session.user.workspaceId);
      if (!item) return json(res, 404, { error: 'Demande introuvable.' });
      if (item.status !== 'pending') return json(res, 409, { error: 'Cette demande a déjà été traitée.' });
      if (item.requesterId === session.user.id && session.user.role !== 'admin') {
        return json(res, 409, { error: 'Un manager ne peut pas approuver sa propre demande.' });
      }
      item.status = decision;
      item.decisionNote = note;
      item.decidedAt = new Date().toISOString();
      item.decidedById = session.user.id;
      item.decidedByName = session.user.displayName;
      await saveApprovals(rows);
      await appendAudit({
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        actor: session.user.displayName,
        action: `approval.${decision}`,
        detail: item.title
      });
      return json(res, 200, { approval: item });
    }
    const approvalDeleteMatch = req.url?.match(/^\/api\/approvals\/([^/?]+)$/);
    if (approvalDeleteMatch && req.method === 'DELETE') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const rows = await loadApprovals();
      const item = rows.find(row => row.id === approvalDeleteMatch[1] && row.workspaceId === session.user.workspaceId);
      if (!item) return json(res, 404, { error: 'Demande introuvable.' });
      if (item.status !== 'pending') return json(res, 409, { error: 'Une demande traitée reste dans le journal.' });
      if (item.requesterId !== session.user.id && session.user.role !== 'admin') {
        return json(res, 403, { error: 'Seul le demandeur ou un administrateur peut annuler cette demande.' });
      }
      const next = rows.filter(row => row.id !== item.id);
      await saveApprovals(next);
      await appendAudit({
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        actor: session.user.displayName,
        action: 'approval.cancelled',
        detail: item.title
      });
      return json(res, 200, { ok: true });
    }

    if (req.url === '/api/integrations/keys' && req.method === 'GET') {
      const session = await findSession(req); if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const data = await loadIntegrations(); return json(res, 200, { keys: data.apiKeys.filter(k => k.workspaceId === session.user.workspaceId).map(publicKey) });
    }
    if (req.url === '/api/integrations/keys' && req.method === 'POST') {
      const session = await findSession(req); if (!session) return json(res, 401, { error: 'Connexion requise.' });
      if (!['admin','manager'].includes(session.user.role)) return json(res, 403, { error: 'Droits insuffisants.' });
      const input=await readBody(req); const name=String(input.name||'').trim(); const scopes=Array.isArray(input.scopes)?input.scopes.filter(s=>['*','workspace:read','clients:read','missions:read'].includes(s)):[];
      if(name.length<2 || scopes.length===0)return json(res,400,{error:'Nom ou droits invalides.'});
      const raw=`cf_${randomBytes(24).toString('hex')}`; const item={id:randomBytes(12).toString('hex'),name,prefix:raw.slice(0,11),hash:keyHash(raw),scopes,workspaceId:session.user.workspaceId,createdAt:new Date().toISOString(),lastUsedAt:null,revokedAt:null};
      const data=await loadIntegrations(); data.apiKeys.push(item); await saveIntegrations(data); await addIntegrationLog({workspaceId:session.user.workspaceId,type:'api_key.created',status:201,detail:name}); return json(res,201,{key:publicKey(item),secret:raw});
    }
    const keyDelete=req.url?.match(/^\/api\/integrations\/keys\/([^/?]+)$/);
    if(keyDelete && req.method==='DELETE'){
      const session=await findSession(req); if(!session)return json(res,401,{error:'Connexion requise.'}); if(session.user.role!=='admin')return json(res,403,{error:'Administrateur requis.'});
      const data=await loadIntegrations(); const item=data.apiKeys.find(k=>k.id===keyDelete[1]&&k.workspaceId===session.user.workspaceId); if(!item)return json(res,404,{error:'Clé introuvable.'}); item.revokedAt=new Date().toISOString(); await saveIntegrations(data); await addIntegrationLog({workspaceId:session.user.workspaceId,type:'api_key.revoked',status:200,detail:item.name}); return json(res,200,{ok:true});
    }
    if(req.url==='/api/integrations/webhooks' && req.method==='GET'){
      const session=await findSession(req); if(!session)return json(res,401,{error:'Connexion requise.'}); const data=await loadIntegrations(); return json(res,200,{webhooks:data.webhooks.filter(w=>w.workspaceId===session.user.workspaceId).map(publicWebhook)});
    }
    if(req.url==='/api/integrations/webhooks' && req.method==='POST'){
      const session=await findSession(req); if(!session)return json(res,401,{error:'Connexion requise.'}); if(!['admin','manager'].includes(session.user.role))return json(res,403,{error:'Droits insuffisants.'});
      const input=await readBody(req); const url=String(input.url||'').trim(); const events=Array.isArray(input.events)?input.events.filter(Boolean):[]; try{new URL(url)}catch{return json(res,400,{error:'URL invalide.'})} if(events.length===0)return json(res,400,{error:'Choisissez au moins un événement.'});
      const item={id:randomBytes(12).toString('hex'),url,events,active:true,workspaceId:session.user.workspaceId,createdAt:new Date().toISOString(),lastDeliveryAt:null}; const data=await loadIntegrations(); data.webhooks.push(item); await saveIntegrations(data); await addIntegrationLog({workspaceId:session.user.workspaceId,type:'webhook.created',status:201,detail:url}); return json(res,201,{webhook:publicWebhook(item)});
    }
    const webhookDelete=req.url?.match(/^\/api\/integrations\/webhooks\/([^/?]+)$/);
    if(webhookDelete && req.method==='DELETE'){
      const session=await findSession(req); if(!session)return json(res,401,{error:'Connexion requise.'}); const data=await loadIntegrations(); const before=data.webhooks.length; data.webhooks=data.webhooks.filter(w=>!(w.id===webhookDelete[1]&&w.workspaceId===session.user.workspaceId)); if(before===data.webhooks.length)return json(res,404,{error:'Webhook introuvable.'}); await saveIntegrations(data); return json(res,200,{ok:true});
    }
    if(req.url==='/api/integrations/logs' && req.method==='GET'){
      const session=await findSession(req); if(!session)return json(res,401,{error:'Connexion requise.'}); const data=await loadIntegrations(); return json(res,200,{logs:data.logs.filter(l=>l.workspaceId===session.user.workspaceId).slice(0,100)});
    }
    if(req.url?.startsWith('/public/v1/') && req.method==='GET'){
      const access=await findApiKey(req); if(!access)return json(res,401,{error:'Clé API invalide ou révoquée.'}); const route=req.url.split('?')[0]; const scope=route.endsWith('/clients')?'clients:read':route.endsWith('/missions')?'missions:read':'workspace:read'; if(!canScope(access.item,scope))return json(res,403,{error:'Droit API insuffisant.'});
      try{const stored=JSON.parse(await readFile(fileFor(access.item.workspaceId),'utf8')); const payload=stored.payload||{}; let response=stored; if(route.endsWith('/clients'))response={items:payload.clients||[]}; else if(route.endsWith('/missions'))response={items:payload.missions||[]}; await addIntegrationLog({workspaceId:access.item.workspaceId,type:'api.request',status:200,detail:route,keyPrefix:access.item.prefix}); return json(res,200,response);}catch{return json(res,404,{error:'Aucune donnée synchronisée pour cet espace.'})}
    }
    if (req.url === '/api/activity' && req.method === 'GET') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      let items = [];
      try { items = JSON.parse(await readFile(activityFileFor(session.user.workspaceId), 'utf8')); } catch {}
      return json(res, 200, { items: items.slice(0, 100) });
    }
    if (req.url === '/api/activity' && req.method === 'POST') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const input = await readBody(req);
      const message = String(input.message || '').trim();
      const category = ['general','mission','client','stock','urgent'].includes(String(input.category)) ? String(input.category) : 'general';
      if (message.length < 2 || message.length > 1000) return json(res, 400, { error: 'Le message doit contenir entre 2 et 1000 caractères.' });
      let items = [];
      const path = activityFileFor(session.user.workspaceId);
      try { items = JSON.parse(await readFile(path, 'utf8')); } catch {}
      const item = { id: randomBytes(12).toString('hex'), workspaceId: session.user.workspaceId, authorId: session.user.id, authorName: session.user.displayName, category, message, createdAt: new Date().toISOString() };
      items.unshift(item);
      await writeFile(path, JSON.stringify(items.slice(0, 500), null, 2), 'utf8');
      return json(res, 201, { item });
    }
    const activityDelete = req.url?.match(/^\/api\/activity\/([^/?]+)$/);
    if (activityDelete && req.method === 'DELETE') {
      const session = await findSession(req);
      if (!session) return json(res, 401, { error: 'Connexion requise.' });
      const path = activityFileFor(session.user.workspaceId);
      let items = [];
      try { items = JSON.parse(await readFile(path, 'utf8')); } catch {}
      const target = items.find(item => item.id === activityDelete[1]);
      if (!target) return json(res, 404, { error: 'Publication introuvable.' });
      if (target.authorId !== session.user.id && !['admin','manager'].includes(session.user.role)) return json(res, 403, { error: 'Droits insuffisants.' });
      items = items.filter(item => item.id !== target.id);
      await writeFile(path, JSON.stringify(items, null, 2), 'utf8');
      return json(res, 200, { ok: true });
    }

    const historyMatch = req.url?.match(/^\/api\/sync\/([^/?]+)\/history$/);
    const match = req.url?.match(/^\/api\/sync\/([^/?]+)$/);
    if (!match && !historyMatch) return json(res, 404, { error: 'Route inconnue.' });
    const workspace = decodeURIComponent((historyMatch || match)[1]);
    if (!safeWorkspace(workspace)) return json(res, 400, { error: 'Identifiant d’espace invalide.' });
    const session = await findSession(req);
    const hasAdminToken = bearer(req) === adminToken;
    if (!hasAdminToken && (!session || session.user.workspaceId !== workspace)) return json(res, 401, { error: 'Accès refusé à cet espace.' });
    const path = fileFor(workspace);

    if (historyMatch && req.method === 'GET') {
      let history = [];
      try { history = JSON.parse(await readFile(historyFileFor(workspace), 'utf8')); } catch {}
      return json(res, 200, { history: history.slice(0, 20) });
    }

    if (req.method === 'GET') {
      const stored = JSON.parse(await readFile(path, 'utf8'));
      return json(res, 200, stored);
    }
    if (req.method === 'PUT') {
      const input = await readBody(req);
      if (!input?.payload || !input?.deviceId) return json(res, 400, { error: 'Payload ou appareil manquant.' });
      let previous = null;
      try { previous = JSON.parse(await readFile(path, 'utf8')); } catch {}
      const currentRevision = Number(previous?.revision || 0);
      const baseRevision = Number(input.revision || 0);
      if (previous && baseRevision !== currentRevision && !input.force) {
        return json(res, 409, { error: 'Conflit de synchronisation.', conflict: true, current: { revision: currentRevision, updatedAt: previous.updatedAt, deviceId: previous.deviceId } });
      }
      const next = { workspaceId: workspace, deviceId: String(input.deviceId), revision: currentRevision + 1, updatedAt: new Date().toISOString(), payload: input.payload };
      let history = [];
      try { history = JSON.parse(await readFile(historyFileFor(workspace), 'utf8')); } catch {}
      if (previous) history.unshift({ revision: previous.revision, updatedAt: previous.updatedAt, deviceId: previous.deviceId, payload: previous.payload });
      history = history.slice(0, 20);
      await writeFile(historyFileFor(workspace), JSON.stringify(history, null, 2), 'utf8');
      await writeFile(path, JSON.stringify(next, null, 2), 'utf8');
      if (session) await appendAudit({ workspaceId:workspace, userId:session.user.id, actor:session.user.displayName, action:'workspace.synced', detail:`revision ${next.revision}` });
      return json(res, 200, next);
    }
    return json(res, 405, { error: 'Méthode non autorisée.' });
  } catch (error) {
    if (error?.code === 'ENOENT') return json(res, 404, { error: 'Aucune donnée trouvée.' });
    console.error(error);
    return json(res, 500, { error: 'Erreur interne du serveur.' });
  }
});
server.listen(port, '0.0.0.0', () => console.log(`CloserFlow API: http://localhost:${port}`));
