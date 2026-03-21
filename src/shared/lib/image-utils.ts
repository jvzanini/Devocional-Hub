/**
 * Utilitários de processamento de imagem
 * Usa sharp para compressão e redimensionamento
 */

import fs from "fs";
import path from "path";

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), "data");
const USER_PHOTOS_DIR = path.join(STORAGE_ROOT, "user-photos");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PROFILE_SIZE = 300;
const THUMBNAIL_SIZE = 64;
const JPEG_QUALITY = 80;
const THUMBNAIL_QUALITY = 70;

export interface ProcessedPhoto {
  profilePath: string;
  thumbnailPath: string;
  profileRelative: string;
  thumbnailRelative: string;
}

/**
 * Valida o tamanho e tipo do arquivo de imagem
 */
export function validateImageUpload(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `Arquivo excede o limite de 5MB (${(buffer.length / 1024 / 1024).toFixed(1)}MB)` };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: `Tipo de arquivo não permitido: ${mimeType}. Use JPEG, PNG, WebP ou GIF.` };
  }

  return { valid: true };
}

/**
 * Processa e salva a foto do usuário em 2 tamanhos:
 * - profile: 300x300 (~50KB)
 * - thumbnail: 64x64 (~10KB)
 */
export async function processAndSavePhoto(
  userId: string,
  buffer: Buffer
): Promise<ProcessedPhoto> {
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default;
  } catch {
    // Fallback: salvar sem compressão se sharp não estiver disponível
    return saveWithoutCompression(userId, buffer);
  }

  const userDir = path.join(USER_PHOTOS_DIR, userId);
  fs.mkdirSync(userDir, { recursive: true });

  const profilePath = path.join(userDir, "profile.jpg");
  const thumbnailPath = path.join(userDir, "thumbnail.jpg");

  // Gerar profile (300x300)
  await sharp(buffer)
    .resize(PROFILE_SIZE, PROFILE_SIZE, { fit: "cover", position: "center" })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(profilePath);

  // Gerar thumbnail (64x64)
  await sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover", position: "center" })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toFile(thumbnailPath);

  const profileRelative = `user-photos/${userId}/profile.jpg`;
  const thumbnailRelative = `user-photos/${userId}/thumbnail.jpg`;

  return { profilePath, thumbnailPath, profileRelative, thumbnailRelative };
}

/**
 * Fallback: salva sem compressão caso sharp não esteja instalado
 */
function saveWithoutCompression(
  userId: string,
  buffer: Buffer
): ProcessedPhoto {
  const userDir = path.join(USER_PHOTOS_DIR, userId);
  fs.mkdirSync(userDir, { recursive: true });

  const profilePath = path.join(userDir, "profile.jpg");
  const thumbnailPath = path.join(userDir, "thumbnail.jpg");

  fs.writeFileSync(profilePath, buffer);
  fs.writeFileSync(thumbnailPath, buffer);

  const profileRelative = `user-photos/${userId}/profile.jpg`;
  const thumbnailRelative = `user-photos/${userId}/thumbnail.jpg`;

  return { profilePath, thumbnailPath, profileRelative, thumbnailRelative };
}

/**
 * Remove fotos de um usuário
 */
export function deleteUserPhotos(userId: string): void {
  const userDir = path.join(USER_PHOTOS_DIR, userId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
}
