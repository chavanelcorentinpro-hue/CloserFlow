export const APP_VERSION = '35.0.0';
export const BACKUP_FORMAT = 'closerflow-backup';
export const SAFETY_KEY = 'closerflow.safety.snapshots.v13_2';
export const LAST_AUTO_KEY = 'closerflow.safety.lastAuto.v13_2';
export const DATA_PREFIXES = ['closerflow', 'cf_', 'v4_'];

export type BackupSnapshot = {
  format: typeof BACKUP_FORMAT;
  version: string;
  createdAt: string;
  origin: string;
  reason: 'manual' | 'automatic' | 'before-restore' | 'before-reset';
  entries: Record<string, string>;
};

export type IntegrityReport = {
  checked: number;
  validJson: number;
  invalidKeys: string[];
  criticalMissing: string[];
  sizeBytes: number;
};

const isDataKey = (key: string) =>
  key !== SAFETY_KEY && key !== LAST_AUTO_KEY && DATA_PREFIXES.some(prefix => key.toLowerCase().startsWith(prefix));

export function collectCloserFlowEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && isDataKey(key)) entries[key] = localStorage.getItem(key) ?? '';
  }
  return entries;
}

export function createSnapshot(reason: BackupSnapshot['reason']): BackupSnapshot {
  return {
    format: BACKUP_FORMAT,
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    origin: location.origin,
    reason,
    entries: collectCloserFlowEntries(),
  };
}

export function readRestorePoints(): BackupSnapshot[] {
  try {
    const value = JSON.parse(localStorage.getItem(SAFETY_KEY) ?? '[]') as BackupSnapshot[];
    return Array.isArray(value) ? value.filter(item => item?.format === BACKUP_FORMAT) : [];
  } catch {
    return [];
  }
}

export function saveRestorePoint(reason: BackupSnapshot['reason']): BackupSnapshot {
  const snapshot = createSnapshot(reason);
  const history = [snapshot, ...readRestorePoints()].slice(0, 5);
  localStorage.setItem(SAFETY_KEY, JSON.stringify(history));
  return snapshot;
}

export function ensureDailyRestorePoint(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(LAST_AUTO_KEY) === today) return;
  saveRestorePoint('automatic');
  localStorage.setItem(LAST_AUTO_KEY, today);
}

export function restoreEntries(entries: Record<string, string>): void {
  const currentKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && isDataKey(key)) currentKeys.push(key);
  }
  currentKeys.forEach(key => localStorage.removeItem(key));
  Object.entries(entries).forEach(([key, value]) => {
    if (isDataKey(key)) localStorage.setItem(key, value);
  });
}

export function inspectEntries(entries = collectCloserFlowEntries()): IntegrityReport {
  const invalidKeys: string[] = [];
  let validJson = 0;
  let sizeBytes = 0;
  Object.entries(entries).forEach(([key, value]) => {
    sizeBytes += key.length + value.length;
    try {
      JSON.parse(value);
      validJson += 1;
    } catch {
      invalidKeys.push(key);
    }
  });
  const criticalPrefixes = ['closerflow.company', 'closerflow.clients', 'closerflow.missions', 'closerflow.quotes', 'closerflow.invoices'];
  const criticalMissing = criticalPrefixes.filter(prefix => !Object.keys(entries).some(key => key.startsWith(prefix)));
  return { checked: Object.keys(entries).length, validJson, invalidKeys, criticalMissing, sizeBytes };
}

export function parseBackup(text: string): BackupSnapshot {
  const value = JSON.parse(text) as Partial<BackupSnapshot>;
  if (value.format !== BACKUP_FORMAT || !value.entries || typeof value.entries !== 'object') {
    throw new Error('Ce fichier n’est pas une sauvegarde CloserFlow valide.');
  }
  return {
    format: BACKUP_FORMAT,
    version: String(value.version || 'inconnue'),
    createdAt: String(value.createdAt || new Date().toISOString()),
    origin: String(value.origin || 'fichier importé'),
    reason: value.reason || 'manual',
    entries: value.entries,
  };
}
