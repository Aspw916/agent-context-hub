export function generateId(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${id}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** Detect if a string contains CJK characters */
export function containsCJK(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
}

/** Redact sensitive patterns from a string */
const SECRET_PATTERNS = [
  /(api[_-]?key\s*[=:]\s*)(\S+)/gi,
  /(apikey\s*[=:]\s*)(\S+)/gi,
  /(token\s*[=:]\s*)(\S+)/gi,
  /(secret\s*[=:]\s*)(\S+)/gi,
  /(password\s*[=:]\s*)(\S+)/gi,
  /(authorization\s*[=:]\s*)(\S+)/gi,
  /(bearer\s+)(\S+)/gi,
  /(sk-[a-zA-Z0-9]{20,})/g,
];

export function redact(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "$1[REDACTED]");
  }
  return result;
}

/** Default data directory */
export function defaultDataDir(): string {
  const home = process.env.AGENT_HUB_HOME
    || (process.env.HOME ?? process.env.USERPROFILE ?? ".");
  return `${home}/.agent-context-hub`;
}

/** Absolute path normalizer */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "");
}
