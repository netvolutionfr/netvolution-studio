import {
  type AiRequest,
  type AiResponse,
  type AiStatus,
  type Asset,
  type Check,
  type Diagnostic,
  type Message,
  type Site,
  t,
  tm,
} from '@ns/core';

/** Client of the development API (apps/studio/dev-server/api.ts). */
export class ApiError extends Error {
  readonly status: number;
  readonly diagnostics: Diagnostic[];
  constructor(status: number, message: string, diagnostics: Diagnostic[] = []) {
    super(message);
    this.status = status;
    this.diagnostics = diagnostics;
  }
}

const HEADERS = { 'x-ns-request': '1', 'content-type': 'application/json' };

async function call(input: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError(0, t('api.unreachable'));
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: Message; diagnostics?: Diagnostic[] };
    const message = body.error?.key ? tm(body.error) : t('api.error', { status: res.status });
    throw new ApiError(res.status, message, body.diagnostics);
  }
  return res;
}

export type ProjectSummary = { id: string; name: string; pages: number; updatedAt: string };
const project = (id: string, rest = '') => `./api/projects/${encodeURIComponent(id)}${rest}`;

export const listProjects = async () => (await (await call('./api/projects')).json()) as ProjectSummary[];

/** Creates a project from a site (template or import); the server assigns the id. */
export async function createProject(site: unknown) {
  const res = await call('./api/projects', { method: 'POST', headers: HEADERS, body: JSON.stringify(site) });
  return (await res.json()) as { id: string; missingMedia: number };
}

export async function getProject(id: string) {
  const res = await call(project(id));
  return { doc: (await res.json()) as unknown, etag: res.headers.get('etag') ?? '' };
}

/** Saves the site over the version `etag`; never overwrites a newer version (412). */
export async function saveProject(doc: Site, etag: string) {
  const res = await call(project(doc.id), {
    method: 'PUT',
    headers: { ...HEADERS, 'if-match': etag },
    body: JSON.stringify(doc),
  });
  return ((await res.json()) as { etag: string }).etag;
}

export const duplicateProject = async (id: string) =>
  (await (await call(project(id, '/duplicate'), { method: 'POST', headers: HEADERS })).json()) as {
    id: string;
  };

/** Moves the project to the server trash. */
export const deleteProject = async (id: string) =>
  void (await call(project(id), { method: 'DELETE', headers: HEADERS }));

/** URL prefix of a project's media in the Studio (exports use MEDIA_PATH). */
export const mediaBase = (projectId: string) => `/media/${projectId}/`;

/** Accepted by the media library (checked again by the server). */
export const MEDIA_ACCEPT =
  'image/png,image/jpeg,image/webp,image/avif,image/svg+xml,application/pdf,application/zip,.docx,.xlsx,.pptx,.woff2';
/** Types that browsers often leave empty, by extension. */
const OFFICE: Record<string, string> = {
  woff2: 'font/woff2',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Intrinsic size measured by the browser (images and SVG); null for other files. */
async function measure(file: File): Promise<{ width: number; height: number } | null> {
  if (file.type === 'image/svg+xml') {
    // Size from width/height, else from the viewBox (a browser reports 300×150 for a viewBox-only SVG).
    const root = /<svg\b[^>]*>/i.exec(await file.text())?.[0] ?? '';
    const num = (name: string) =>
      Number(new RegExp(`\\s${name}\\s*=\\s*["']\\s*([\\d.]+)(px)?\\s*["']`, 'i').exec(root)?.[1]);
    const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(root);
    const width = num('width') || Number(box?.[1]);
    const height = num('height') || Number(box?.[2]);
    if (width > 0 && height > 0)
      return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
    return { width: 300, height: 150 };
  }
  if (!file.type.startsWith('image/')) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new ApiError(415, 'Image illisible');
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/** Sends a media to the project library; the server checks its type and content. */
export async function uploadMedia(projectId: string, file: File, alt = ''): Promise<Asset> {
  const type =
    file.type || OFFICE[file.name.split('.').pop()?.toLowerCase() ?? ''] || 'application/octet-stream';
  const size = await measure(file);
  const query = new URLSearchParams({ name: file.name, ...(alt && { alt }) });
  if (size) for (const [k, v] of Object.entries(size)) query.set(k, String(v));
  const res = await call(project(projectId, `/media?${query}`), {
    method: 'POST',
    headers: { 'x-ns-request': '1', 'content-type': type },
    body: file,
  });
  return (await res.json()) as Asset;
}

/** Files of the project's media folder with their size in bytes (pre-export checks). */
export const listMediaSizes = async (projectId: string) =>
  new Map(
    Object.entries((await (await call(project(projectId, '/media?sizes'))).json()) as Record<string, number>),
  );

/** Files present in the project's media folder (missing-media detection). */
export const listMediaFiles = async (projectId: string) =>
  (await (await call(project(projectId, '/media'))).json()) as string[];

export type ExportResult = {
  path: string;
  staticPath?: string;
  /** Archive names, downloadable at ./api/exports/<name>.tar.gz (hosted Studio, ADR-0015). */
  download?: string;
  staticDownload?: string;
  files: number;
  checks: Check[];
};

/** Exports the site as edited (checked again by the server); `build` also produces the static site. */
export async function exportAstro(doc: Site, build = false) {
  const res = await call(project(doc.id, '/export'), {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ site: doc, build }),
  });
  return (await res.json()) as ExportResult;
}

/** Download URL of the project archive (site + media, SB-12). */
export const archiveUrl = (projectId: string) => project(projectId, '/archive');

/** Creates a project from an archive (media files checked like uploads). */
export async function importArchive(archive: unknown) {
  const res = await call('./api/projects/import', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(archive),
  });
  return (await res.json()) as { id: string; missingMedia: number };
}

/** Site template (CS-02): built-in, or saved from a project by the user. */
export type TemplateSummary = {
  id: string;
  name: string;
  description: string;
  pages: number;
  builtIn: boolean;
};

export const listTemplates = async () => (await (await call('./api/templates')).json()) as TemplateSummary[];

/** New project from a site template (pages, menus, header/footer, design system, media). */
export async function createFromTemplate(templateId: string, name: string) {
  const res = await call(`./api/templates/${encodeURIComponent(templateId)}/projects`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name }),
  });
  return (await res.json()) as { id: string; missingMedia: number };
}

/** Saves the saved version of a project as a site template. */
export async function saveAsTemplate(projectId: string, name: string, description: string) {
  const res = await call(project(projectId, '/template'), {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name, description }),
  });
  return (await res.json()) as { id: string };
}

export const deleteTemplate = async (id: string) =>
  void (await call(`./api/templates/${encodeURIComponent(id)}`, { method: 'DELETE', headers: HEADERS }));

/** State of the AI assistant on the server (never a key). */
export const aiStatus = async () => (await (await call('./api/ai/status')).json()) as AiStatus;

/** Asks the assistant through the server (which holds the keys and enforces the limits). */
export async function aiComplete(request: AiRequest) {
  const res = await call('./api/ai/complete', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(request),
  });
  return (await res.json()) as AiResponse;
}

/** A font of the Studio's catalog (ADR-0018): open-licensed, Latin subset, woff2. */
export type CatalogFont = {
  id: string;
  family: string;
  category: string;
  license: string;
  files: { file: string; weight: { min: number; max: number }; style: 'normal' | 'italic' }[];
};
export const listFonts = async () => (await (await call('./api/fonts')).json()) as CatalogFont[];
export const fontFileUrl = (file: string) => `./api/fonts/files/${file}`;

/** Copies a catalog font into the project's media; the caller adds the returned assets to the site. */
export async function addCatalogFont(projectId: string, font: string): Promise<Asset[]> {
  const res = await call(project(projectId, '/fonts'), {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ font }),
  });
  return (await res.json()) as Asset[];
}
