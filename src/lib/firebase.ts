import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================================================
// Schema Constants Synchronized Verbatim with firebase-blueprint.json
// ============================================================================
export const BLOOD_TYPES = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'Desconocido',
] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export const SCAN_METHODS = [
  'NFC_TAG',
  'QR_CODE',
  'DIRECT_URL',
  'SIMULATOR',
] as const;

export type ScanMethod = (typeof SCAN_METHODS)[number];

export const SCHEMA_CONSTRAINTS = {
  idPattern: /^[a-zA-Z0-9_\-]+$/,
  phonePattern: /^[0-9+\-()\s]+$/,
  tagId: { minLength: 4, maxLength: 64 },
  ownerId: { minLength: 1, maxLength: 128 },
  fullName: { minLength: 2, maxLength: 100 },
  bloodType: { minLength: 2, maxLength: 15 },
  allergies: { minLength: 0, maxLength: 500 },
  medicalConditions: { minLength: 0, maxLength: 1000 },
  emergencyContactName: { minLength: 2, maxLength: 100 },
  emergencyContactRelation: { minLength: 1, maxLength: 50 },
  emergencyContactPhone: { minLength: 5, maxLength: 30 },
  secondaryContactName: { minLength: 0, maxLength: 100 },
  secondaryContactRelation: { minLength: 0, maxLength: 50 },
  secondaryContactPhone: { minLength: 0, maxLength: 30 },
  motorcycleDetails: { minLength: 0, maxLength: 150 },
  insuranceDetails: { minLength: 0, maxLength: 150 },
  accessPin: { minLength: 0, maxLength: 10 },
  scannerLabel: { minLength: 1, maxLength: 120 },
  locationNote: { minLength: 0, maxLength: 200 },
} as const;

export interface EmergencyStickerRecord {
  tagId: string;
  ownerId: string;
  fullName: string;
  bloodType: BloodType;
  allergies: string;
  medicalConditions: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  secondaryContactName: string;
  secondaryContactRelation: string;
  secondaryContactPhone: string;
  motorcycleDetails: string;
  insuranceDetails: string;
  organDonor: boolean;
  isActive: boolean;
  accessPin: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ScanLogRecord {
  scanId: string;
  tagId: string;
  stickerOwnerId: string;
  scannerUid: string;
  scannerLabel: string;
  scanMethod: ScanMethod;
  locationNote: string;
  createdAt?: Timestamp | null;
}

export interface StickerPackageOption {
  pkgId: string;
  name: string;
  subtitle: string;
  price: number;
  specs: string;
  stickerCount: number;
  availableColors: string[];
  sortOrder: number;
  updatedAt?: Timestamp | null;
}

export const AUTHORIZED_ADMIN_EMAIL = 'gami.rodrigo@gmail.com';

export const ALL_STICKER_COLORS = [
  'Rojo',
  'Negro',
  'Gris',
  'Verde',
  'Azul',
  'Rosa',
  'Morado',
  'Amarillo',
] as const;

export type StickerColorName = (typeof ALL_STICKER_COLORS)[number];

export const STICKER_COLOR_SWATCHES: Record<string, string> = {
  Rojo: '#EF4444',
  Negro: '#18181B',
  Gris: '#71717A',
  Verde: '#22C55E',
  Azul: '#3B82F6',
  Rosa: '#EC4899',
  Morado: '#A855F7',
  Amarillo: '#EAB308',
};

export const DEFAULT_STICKER_PACKAGES: StickerPackageOption[] = [
  {
    pkgId: 'single',
    name: 'Kit Individual Casco NFC',
    subtitle: 'Para 1 casco principal',
    price: 249,
    specs: '1 Sticker NFC NTAG213 · Acabado Resina 3M IP68',
    stickerCount: 1,
    availableColors: [...ALL_STICKER_COLORS],
    sortOrder: 1,
  },
  {
    pkgId: 'pro',
    name: 'Kit Biker Safe Pro',
    subtitle: 'Más elegido · 2 Stickers NFC',
    price: 399,
    specs: '2 Stickers NFC para Casco / Moto · Color elegible por unidad',
    stickerCount: 2,
    availableColors: [...ALL_STICKER_COLORS],
    sortOrder: 2,
  },
  {
    pkgId: 'squad',
    name: 'Kit Dúo / Rodada',
    subtitle: 'Cobertura en múltiples cascos',
    price: 649,
    specs: '4 Stickers NFC NTAG215 Programados con tu perfil médico',
    stickerCount: 4,
    availableColors: [...ALL_STICKER_COLORS],
    sortOrder: 3,
  },
];

export function normalizePackageOption(
  raw: Partial<StickerPackageOption>,
  fallbackIndex = 0
): StickerPackageOption {
  const fallback =
    DEFAULT_STICKER_PACKAGES.find((p) => p.pkgId === raw.pkgId) ||
    DEFAULT_STICKER_PACKAGES[fallbackIndex] ||
    DEFAULT_STICKER_PACKAGES[0];

  const validColors = Array.isArray(raw.availableColors)
    ? raw.availableColors.filter((c) =>
        (ALL_STICKER_COLORS as readonly string[]).includes(c)
      )
    : [];

  return {
    pkgId: raw.pkgId || fallback.pkgId,
    name: raw.name || fallback.name,
    subtitle: raw.subtitle || fallback.subtitle,
    price: typeof raw.price === 'number' && raw.price >= 1 ? raw.price : fallback.price,
    specs: raw.specs || fallback.specs,
    stickerCount:
      typeof raw.stickerCount === 'number' &&
      raw.stickerCount >= 1 &&
      raw.stickerCount <= 10
        ? Math.round(raw.stickerCount)
        : fallback.stickerCount,
    availableColors:
      validColors.length > 0 ? validColors : [...ALL_STICKER_COLORS],
    sortOrder:
      typeof raw.sortOrder === 'number' ? raw.sortOrder : fallback.sortOrder,
    updatedAt: raw.updatedAt,
  };
}

export function generateUniqueTagId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'msm-';
  const randomValues = new Uint32Array(8);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 8; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

export function generateUniqueScanId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'scan-';
  const randomValues = new Uint32Array(8);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 8; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

export function sanitizeAndValidateStickerInput(input: {
  tagId: string;
  ownerId: string;
  fullName: string;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  secondaryContactName: string;
  secondaryContactRelation: string;
  secondaryContactPhone: string;
  motorcycleDetails: string;
  insuranceDetails: string;
  organDonor: boolean;
  isActive: boolean;
  accessPin: string;
}): { valid: true; data: Omit<EmergencyStickerRecord, 'createdAt' | 'updatedAt'> } | { valid: false; error: string } {
  const tagId = input.tagId.trim().slice(0, SCHEMA_CONSTRAINTS.tagId.maxLength);
  if (
    tagId.length < SCHEMA_CONSTRAINTS.tagId.minLength ||
    !SCHEMA_CONSTRAINTS.idPattern.test(tagId)
  ) {
    return { valid: false, error: 'El identificador del tag NFC no es válido.' };
  }

  const ownerId = input.ownerId.trim().slice(0, SCHEMA_CONSTRAINTS.ownerId.maxLength);
  if (
    ownerId.length < SCHEMA_CONSTRAINTS.ownerId.minLength ||
    !SCHEMA_CONSTRAINTS.idPattern.test(ownerId)
  ) {
    return { valid: false, error: 'Sesión de usuario inválida.' };
  }

  const fullName = input.fullName.trim().slice(0, SCHEMA_CONSTRAINTS.fullName.maxLength);
  if (fullName.length < SCHEMA_CONSTRAINTS.fullName.minLength) {
    return { valid: false, error: 'Por favor ingresa el nombre completo (mínimo 2 caracteres).' };
  }

  const bloodType = (BLOOD_TYPES.includes(input.bloodType as BloodType)
    ? input.bloodType
    : '') as BloodType;
  if (!bloodType) {
    return { valid: false, error: 'Por favor selecciona un tipo de sangre válido.' };
  }

  const allergies = input.allergies.trim().slice(0, SCHEMA_CONSTRAINTS.allergies.maxLength);
  const medicalConditions = input.medicalConditions
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.medicalConditions.maxLength);

  const emergencyContactName = input.emergencyContactName
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.emergencyContactName.maxLength);
  if (emergencyContactName.length < SCHEMA_CONSTRAINTS.emergencyContactName.minLength) {
    return {
      valid: false,
      error: 'Por favor ingresa el nombre del contacto de emergencia principal.',
    };
  }

  const emergencyContactRelation = input.emergencyContactRelation
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.emergencyContactRelation.maxLength);
  if (emergencyContactRelation.length < SCHEMA_CONSTRAINTS.emergencyContactRelation.minLength) {
    return {
      valid: false,
      error: 'Por favor ingresa el parentesco del contacto de emergencia principal.',
    };
  }

  const emergencyContactPhone = input.emergencyContactPhone
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.emergencyContactPhone.maxLength);
  if (
    emergencyContactPhone.length < SCHEMA_CONSTRAINTS.emergencyContactPhone.minLength ||
    !SCHEMA_CONSTRAINTS.phonePattern.test(emergencyContactPhone)
  ) {
    return {
      valid: false,
      error:
        'Por favor ingresa un teléfono de emergencia principal válido (solo dígitos, +, -, espacios o paréntesis).',
    };
  }

  const secondaryContactName = input.secondaryContactName
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.secondaryContactName.maxLength);

  const secondaryContactRelation = input.secondaryContactRelation
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.secondaryContactRelation.maxLength);

  const secondaryContactPhone = input.secondaryContactPhone
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.secondaryContactPhone.maxLength);

  if (
    secondaryContactPhone.length > 0 &&
    (secondaryContactPhone.length < 5 || !SCHEMA_CONSTRAINTS.phonePattern.test(secondaryContactPhone))
  ) {
    return {
      valid: false,
      error:
        'Por favor ingresa un teléfono válido para el segundo contacto de emergencia o déjalo en blanco.',
    };
  }

  const motorcycleDetails = input.motorcycleDetails
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.motorcycleDetails.maxLength);
  const insuranceDetails = input.insuranceDetails
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.insuranceDetails.maxLength);
  const accessPin = input.accessPin
    .trim()
    .replace(/[^0-9a-zA-Z]/g, '')
    .slice(0, SCHEMA_CONSTRAINTS.accessPin.maxLength);

  return {
    valid: true,
    data: {
      tagId,
      ownerId,
      fullName,
      bloodType,
      allergies,
      medicalConditions,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      secondaryContactName,
      secondaryContactRelation,
      secondaryContactPhone,
      motorcycleDetails,
      insuranceDetails,
      organDonor: Boolean(input.organDonor),
      isActive: Boolean(input.isActive),
      accessPin,
    },
  };
}

export function buildUniqueStickerUrl(sticker: Omit<EmergencyStickerRecord, 'createdAt' | 'updatedAt'>): string {
  const baseUrl = window.location.origin + window.location.pathname;
  const compactPayload = {
    t: sticker.tagId,
    n: sticker.fullName,
    b: sticker.bloodType,
    a: sticker.allergies,
    m: sticker.medicalConditions,
    cn: sticker.emergencyContactName,
    cr: sticker.emergencyContactRelation || '',
    cp: sticker.emergencyContactPhone,
    scn: sticker.secondaryContactName || '',
    scr: sticker.secondaryContactRelation || '',
    scp: sticker.secondaryContactPhone || '',
    mc: sticker.motorcycleDetails,
    ins: sticker.insuranceDetails,
    od: sticker.organDonor ? 1 : 0,
    pin: sticker.accessPin ? 1 : 0,
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(compactPayload)));
  return `${baseUrl}?tag=${encodeURIComponent(sticker.tagId)}&p=${encodeURIComponent(encoded)}`;
}

export function parseEncodedStickerPacket(encoded: string | null): Partial<EmergencyStickerRecord> | null {
  if (!encoded) return null;
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(jsonStr);
    return {
      tagId: typeof parsed.t === 'string' ? parsed.t : '',
      fullName: typeof parsed.n === 'string' ? parsed.n : '',
      bloodType: BLOOD_TYPES.includes(parsed.b) ? parsed.b : 'Desconocido',
      allergies: typeof parsed.a === 'string' ? parsed.a : '',
      medicalConditions: typeof parsed.m === 'string' ? parsed.m : '',
      emergencyContactName: typeof parsed.cn === 'string' ? parsed.cn : '',
      emergencyContactRelation: typeof parsed.cr === 'string' ? parsed.cr : '',
      emergencyContactPhone: typeof parsed.cp === 'string' ? parsed.cp : '',
      secondaryContactName: typeof parsed.scn === 'string' ? parsed.scn : '',
      secondaryContactRelation: typeof parsed.scr === 'string' ? parsed.scr : '',
      secondaryContactPhone: typeof parsed.scp === 'string' ? parsed.scp : '',
      motorcycleDetails: typeof parsed.mc === 'string' ? parsed.mc : '',
      insuranceDetails: typeof parsed.ins === 'string' ? parsed.ins : '',
      organDonor: parsed.od === 1,
      isActive: true,
    };
  } catch {
    return null;
  }
}

export async function syncUserPrivateProfile(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const path = `users/${user.uid}/private/info`;
  try {
    await setDoc(
      doc(db, 'users', user.uid, 'private', 'info'),
      {
        ownerId: user.uid,
        displayName: (user.displayName || 'Usuario Biker Safe').slice(0, 100),
        email: (user.email || 'usuario@bikersafe.mx').slice(0, 150),
        personalPhone: (user.phoneNumber || '').slice(0, 30),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );
  } catch {
    // Profile may already exist; ignore non-critical sync overwrite error
  }
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserPrivateProfile(result.user);
  return result.user;
}

export async function signInAdminWithGoogle(): Promise<User> {
  const adminProvider = new GoogleAuthProvider();
  adminProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, adminProvider);
  await syncUserPrivateProfile(result.user);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
