/**
 * Armazenamento local de arquivos
 * Os arquivos ficam em /data/sessions/ no servidor (ou ./data/sessions/ localmente)
 */

import fs from "fs";
import path from "path";

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), "data");

function getFullPath(objectPath: string): string {
  const fullPath = path.join(STORAGE_ROOT, objectPath);
  // Garante que o diretório existe
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

/**
 * Salva texto como arquivo
 */
export async function uploadText(
  objectPath: string,
  content: string
): Promise<string> {
  const fullPath = getFullPath(objectPath);
  fs.writeFileSync(fullPath, content, "utf-8");
  return objectPath;
}

/**
 * Copia arquivo de um caminho temporário para o storage
 */
export async function uploadFile(
  objectPath: string,
  sourcePath: string
): Promise<string> {
  const fullPath = getFullPath(objectPath);
  fs.copyFileSync(sourcePath, fullPath);
  return objectPath;
}

/**
 * Lê arquivo e retorna como Buffer
 */
export async function downloadFile(objectPath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_ROOT, objectPath);
  return fs.readFileSync(fullPath);
}

/**
 * Retorna tamanho do arquivo em bytes
 */
export function getFileSize(objectPath: string): number {
  try {
    const fullPath = path.join(STORAGE_ROOT, objectPath);
    return fs.statSync(fullPath).size;
  } catch {
    return 0;
  }
}

/**
 * Remove arquivo
 */
export async function deleteFile(objectPath: string): Promise<void> {
  const fullPath = path.join(STORAGE_ROOT, objectPath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

/**
 * Garante que o diretório raiz de storage existe
 */
export async function ensureBucket(): Promise<void> {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}
