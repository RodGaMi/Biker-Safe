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
  availableModels?: string[];
  sortOrder: number;
  updatedAt?: Timestamp | null;
}

export const ALL_STICKER_MODELS = ['Racer', 'Choper', 'Cross'] as const;

export type StickerModelName = (typeof ALL_STICKER_MODELS)[number];

export interface StickerModelCatalogRecord {
  modelId: 'racer' | 'choper' | 'cross';
  name: StickerModelName;
  description: string;
  referenceImageUrl: string;
  imageRojo: string;
  imageNegro: string;
  imageGris: string;
  imageVerde: string;
  imageAzul: string;
  imageRosa: string;
  imageMorado: string;
  imageAmarillo: string;
  sortOrder: number;
  updatedAt?: Timestamp | null;
}

export const DEFAULT_STICKER_MODELS: StickerModelCatalogRecord[] = [
  {
    modelId: 'racer',
    name: 'Racer',
    description: 'Diseño aerodinámico deportivo para cascos integrales y pista.',
    referenceImageUrl: '',
    imageRojo: '',
    imageNegro: '',
    imageGris: '',
    imageVerde: '',
    imageAzul: '',
    imageRosa: '',
    imageMorado: '',
    imageAmarillo: '',
    sortOrder: 1,
  },
  {
    modelId: 'choper',
    name: 'Choper',
    description: 'Diseño clásico custom / cruiser para cascos abiertos, 3/4 y modulares.',
    referenceImageUrl: '',
    imageRojo: '',
    imageNegro: '',
    imageGris: '',
    imageVerde: '',
    imageAzul: '',
    imageRosa: '',
    imageMorado: '',
    imageAmarillo: '',
    sortOrder: 2,
  },
  {
    modelId: 'cross',
    name: 'Cross',
    description: 'Diseño off-road / enduro / motocross de alta visibilidad.',
    referenceImageUrl: '',
    imageRojo: '',
    imageNegro: '',
    imageGris: '',
    imageVerde: '',
    imageAzul: '',
    imageRosa: '',
    imageMorado: '',
    imageAmarillo: '',
    sortOrder: 3,
  },
];

export const ORDER_STATUSES = [
  'pendiente_pago',
  'pagado',
  'tag_programado',
  'enviado',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente_pago: 'Pendiente de Pago',
  pagado: 'Pagado',
  tag_programado: 'Tag Programado',
  enviado: 'Enviado',
};

export const DELIVERY_METHODS = [
  'personal_cdmx_edomex',
  'paqueteria_nacional',
] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  personal_cdmx_edomex:
    'Entrega Personal (Solo Edo. de México y CDMX · Acordar vía WhatsApp)',
  paqueteria_nacional:
    'Envío por Paquetería a toda la República (Acordar vía WhatsApp)',
};

export interface StickerOrderRecord {
  orderId: string;
  tagId: string;
  ownerId: string;
  riderName: string;
  pkgId: string;
  pkgName: string;
  stickerCount: number;
  selectedModels?: string[];
  selectedColors: string[];
  totalPrice: number;
  paymentMethod: 'SPEI_WHATSAPP';
  deliveryMethod?: DeliveryMethod;
  status: OrderStatus;
  recipientName: string;
  recipientPhone: string;
  shippingStreet: string;
  shippingColony: string;
  shippingCityState: string;
  shippingPostalCode: string;
  shippingNotes: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PaymentSettingsRecord {
  settingId: string;
  bankName: string;
  beneficiaryName: string;
  clabe: string;
  accountOrCard: string;
  whatsappNumber: string;
  paymentInstructions: string;
  updatedAt?: Timestamp | null;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsRecord = {
  settingId: 'spei',
  bankName: 'BBVA México / Transferencia SPEI',
  beneficiaryName: 'Biker Safe México',
  clabe: '012180001234567890',
  accountOrCard: '4152 3138 0000 0000',
  whatsappNumber: '5215512345678',
  paymentInstructions:
    'Realiza tu transferencia SPEI por el monto exacto indicando tu Folio de Pedido en el concepto y envía tu comprobante por WhatsApp para programar tus stickers NFC y acordar tu entrega.',
};

export function generateUniqueOrderId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'ord-';
  const randomValues = new Uint32Array(6);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

export function buildWhatsAppOrderUrl(
  order: Omit<StickerOrderRecord, 'createdAt' | 'updatedAt'>,
  settings: PaymentSettingsRecord
): string {
  const cleanPhone = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
  const modelsList = Array.isArray(order.selectedModels) ? order.selectedModels : [];
  const itemsBreakdown = (order.selectedColors || [])
    .map((c, i) => {
      const m = modelsList[i] || 'Racer';
      return `Sticker #${i + 1}: Modelo ${m} · Color ${c}`;
    })
    .join(', ');

  const isPersonalDelivery =
    order.deliveryMethod === 'personal_cdmx_edomex' ||
    order.shippingStreet.includes('Entrega Personal');

  const deliveryLines = isPersonalDelivery
    ? [
        `*Modalidad de Entrega:* Entrega Personal (Solo Estado de México y CDMX · A acordar vía WhatsApp)`,
        `Recibe: ${order.recipientName} (${order.recipientPhone})`,
        `Zona / Alcaldía o Municipio: ${order.shippingCityState}`,
        order.shippingNotes
          ? `Punto u horario sugerido: ${order.shippingNotes}`
          : '',
      ]
    : [
        `*Modalidad de Entrega:* Envío por Paquetería a toda la República (A acordar vía WhatsApp)`,
        `Recibe: ${order.recipientName} (${order.recipientPhone})`,
        `Dirección: ${order.shippingStreet}, Col. ${order.shippingColony}, C.P. ${order.shippingPostalCode}, ${order.shippingCityState}`,
        order.shippingNotes ? `Referencias: ${order.shippingNotes}` : '',
      ];

  const messageLines = [
    `Hola *Biker Safe*, acabo de registrar mi pedido de Stickers NFC y me comunico para enviar mi comprobante SPEI y acordar la entrega por WhatsApp:`,
    ``,
    `*Folio de Pedido:* ${order.orderId.toUpperCase()}`,
    `*ID Tag NFC:* ${order.tagId}`,
    `*Perfil Biker:* ${order.riderName}`,
    `*Paquete:* ${order.pkgName} (${order.stickerCount} ${order.stickerCount === 1 ? 'sticker' : 'stickers'})`,
    `*Modelos y colores elegidos:* ${itemsBreakdown}`,
    `*Total del paquete:* $${order.totalPrice} MXN`,
    ``,
    ...deliveryLines,
    ``,
    `Enseguida envío mi comprobante de pago SPEI para ponernos de acuerdo con la entrega.`,
  ].filter(Boolean);

  const encodedText = encodeURIComponent(messageLines.join('\n'));
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
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

export type StickerModelColorField =
  | 'imageRojo'
  | 'imageNegro'
  | 'imageGris'
  | 'imageVerde'
  | 'imageAzul'
  | 'imageRosa'
  | 'imageMorado'
  | 'imageAmarillo';

export function getStickerModelColorField(
  colorName: string
): StickerModelColorField {
  const map: Record<string, StickerModelColorField> = {
    Rojo: 'imageRojo',
    Negro: 'imageNegro',
    Gris: 'imageGris',
    Verde: 'imageVerde',
    Azul: 'imageAzul',
    Rosa: 'imageRosa',
    Morado: 'imageMorado',
    Amarillo: 'imageAmarillo',
  };
  return map[colorName] || 'imageRojo';
}

export function normalizeStickerModelCatalog(
  raw: Partial<StickerModelCatalogRecord>,
  fallbackIndex = 0
): StickerModelCatalogRecord {
  const fallback =
    DEFAULT_STICKER_MODELS.find(
      (m) =>
        m.modelId === raw.modelId ||
        m.name.toLowerCase() === String(raw.name || '').toLowerCase()
    ) ||
    DEFAULT_STICKER_MODELS[fallbackIndex] ||
    DEFAULT_STICKER_MODELS[0];

  return {
    modelId: fallback.modelId,
    name: fallback.name,
    description:
      typeof raw.description === 'string' && raw.description.trim().length > 0
        ? raw.description.trim().slice(0, 200)
        : fallback.description,
    referenceImageUrl: String(raw.referenceImageUrl || '').slice(0, 350000),
    imageRojo: String(raw.imageRojo || '').slice(0, 250000),
    imageNegro: String(raw.imageNegro || '').slice(0, 250000),
    imageGris: String(raw.imageGris || '').slice(0, 250000),
    imageVerde: String(raw.imageVerde || '').slice(0, 250000),
    imageAzul: String(raw.imageAzul || '').slice(0, 250000),
    imageRosa: String(raw.imageRosa || '').slice(0, 250000),
    imageMorado: String(raw.imageMorado || '').slice(0, 250000),
    imageAmarillo: String(raw.imageAmarillo || '').slice(0, 250000),
    sortOrder:
      typeof raw.sortOrder === 'number' ? raw.sortOrder : fallback.sortOrder,
    updatedAt: raw.updatedAt,
  };
}

export function resolveStickerModelImage(
  models: StickerModelCatalogRecord[],
  modelName: string,
  colorName: string
): string {
  const found =
    (models || []).find(
      (m) =>
        m.name.toLowerCase() === String(modelName || '').toLowerCase() ||
        m.modelId === String(modelName || '').toLowerCase()
    ) || DEFAULT_STICKER_MODELS[0];

  const colorField = getStickerModelColorField(colorName);
  const specificColorImg = found[colorField];
  if (specificColorImg && specificColorImg.trim().length > 0) {
    return specificColorImg.trim();
  }
  if (found.referenceImageUrl && found.referenceImageUrl.trim().length > 0) {
    return found.referenceImageUrl.trim();
  }
  for (const c of ALL_STICKER_COLORS) {
    const f = getStickerModelColorField(c);
    if (found[f] && found[f].trim().length > 0) {
      return found[f].trim();
    }
  }
  return '';
}

export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 440,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecciona un archivo de imagen válido (PNG, JPG, WEBP).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
      img.onload = () => {
        let width = img.width || 400;
        let height = img.height || 400;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp') || dataUrl.length > 220000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.76);
        }
        if (dataUrl.length > 240000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const DEFAULT_STICKER_PACKAGES: StickerPackageOption[] = [
  {
    pkgId: 'single',
    name: 'Kit Individual Casco NFC',
    subtitle: 'Para 1 casco principal',
    price: 249,
    specs: '1 Sticker NFC de emergencia · Modelo (Racer, Choper, Cross) y color elegible',
    stickerCount: 1,
    availableColors: [...ALL_STICKER_COLORS],
    availableModels: [...ALL_STICKER_MODELS],
    sortOrder: 1,
  },
  {
    pkgId: 'pro',
    name: 'Kit Biker Safe Pro',
    subtitle: 'Más elegido · 2 Stickers NFC',
    price: 399,
    specs: '2 Stickers NFC para Casco / Moto · Modelo y color elegible por unidad',
    stickerCount: 2,
    availableColors: [...ALL_STICKER_COLORS],
    availableModels: [...ALL_STICKER_MODELS],
    sortOrder: 2,
  },
  {
    pkgId: 'squad',
    name: 'Kit Dúo / Rodada',
    subtitle: 'Cobertura en múltiples cascos',
    price: 649,
    specs: '4 Stickers NFC programados con tu perfil médico · Modelo y color por unidad',
    stickerCount: 4,
    availableColors: [...ALL_STICKER_COLORS],
    availableModels: [...ALL_STICKER_MODELS],
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

  const validModels = Array.isArray(raw.availableModels)
    ? raw.availableModels.filter((m) =>
        (ALL_STICKER_MODELS as readonly string[]).includes(m)
      )
    : [];

  let cleanedSpecs = raw.specs || fallback.specs;
  if (
    /NTAG213|NTAG215|Resina Epóxica 3M|Acabado Resina 3M/i.test(cleanedSpecs)
  ) {
    cleanedSpecs = fallback.specs;
  }

  return {
    pkgId: raw.pkgId || fallback.pkgId,
    name: raw.name || fallback.name,
    subtitle: raw.subtitle || fallback.subtitle,
    price: typeof raw.price === 'number' && raw.price >= 1 ? raw.price : fallback.price,
    specs: cleanedSpecs,
    stickerCount:
      typeof raw.stickerCount === 'number' &&
      raw.stickerCount >= 1 &&
      raw.stickerCount <= 10
        ? Math.round(raw.stickerCount)
        : fallback.stickerCount,
    availableColors:
      validColors.length > 0 ? validColors : [...ALL_STICKER_COLORS],
    availableModels:
      validModels.length > 0 ? validModels : [...ALL_STICKER_MODELS],
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
