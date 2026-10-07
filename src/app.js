/**
 * Biker Safe — Plataforma de Emergencia Médica NFC
 * Pure ES6 Module (Zero-build compatible with GitHub Pages & Vite)
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from './firebase-config.js';

// ============================================================================
// 1. Firebase Initialization & Mandatory Error / Connection Handlers
// ============================================================================
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
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
// 2. Schema Validation Synchronized Verbatim with firebase-blueprint.json
// ============================================================================
const BLOOD_TYPES = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'Desconocido',
];

const SCHEMA_CONSTRAINTS = {
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
};

const AUTHORIZED_ADMIN_EMAIL = 'gami.rodrigo@gmail.com';

const ALL_STICKER_COLORS = [
  'Rojo',
  'Negro',
  'Gris',
  'Verde',
  'Azul',
  'Rosa',
  'Morado',
  'Amarillo',
];

const STICKER_COLOR_SWATCHES = {
  Rojo: '#EF4444',
  Negro: '#18181B',
  Gris: '#71717A',
  Verde: '#22C55E',
  Azul: '#3B82F6',
  Rosa: '#EC4899',
  Morado: '#A855F7',
  Amarillo: '#EAB308',
};

const ORDER_STATUSES = [
  'pendiente_pago',
  'pagado',
  'tag_programado',
  'enviado',
];

const ORDER_STATUS_LABELS = {
  pendiente_pago: 'Pendiente de Pago',
  pagado: 'Pagado',
  tag_programado: 'Tag Programado',
  enviado: 'Enviado',
};

const DELIVERY_METHOD_LABELS = {
  personal_cdmx_edomex:
    'Entrega Personal (Solo Edo. de México y CDMX · Acordar vía WhatsApp)',
  paqueteria_nacional:
    'Envío por Paquetería a toda la República (Acordar vía WhatsApp)',
};

const DEFAULT_PAYMENT_SETTINGS = {
  settingId: 'spei',
  bankName: 'BBVA México / Transferencia SPEI',
  beneficiaryName: 'Biker Safe México',
  clabe: '012180001234567890',
  accountOrCard: '4152 3138 0000 0000',
  whatsappNumber: '5215512345678',
  paymentInstructions:
    'Realiza tu transferencia SPEI por el monto exacto indicando tu Folio de Pedido en el concepto y envía tu comprobante por WhatsApp para programar tus stickers NFC y acordar tu entrega.',
};

function generateUniqueOrderId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'ord-';
  const randomValues = new Uint32Array(6);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

function isPersonalDeliveryOrder(order) {
  return (
    order?.deliveryMethod === 'personal_cdmx_edomex' ||
    String(order?.shippingStreet || '').includes('Entrega Personal')
  );
}

function buildWhatsAppOrderUrl(order, settings) {
  const cleanPhone = String(settings?.whatsappNumber || '').replace(/[^0-9]/g, '');
  const colorsBreakdown = (order.selectedColors || [])
    .map((c, i) => `Sticker #${i + 1}: ${c}`)
    .join(', ');

  const isPersonal = isPersonalDeliveryOrder(order);
  const deliveryLines = isPersonal
    ? [
        `*Modalidad de Entrega:* Entrega Personal (Solo Estado de México y CDMX · A acordar vía WhatsApp)`,
        `Recibe: ${order.recipientName} (${order.recipientPhone})`,
        `Zona / Alcaldía o Municipio (CDMX o EdoMéx): ${order.shippingCityState}`,
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
    `*Folio de Pedido:* ${String(order.orderId || '').toUpperCase()}`,
    `*ID Tag NFC:* ${order.tagId}`,
    `*Perfil Biker:* ${order.riderName}`,
    `*Paquete:* ${order.pkgName} (${order.stickerCount} ${order.stickerCount === 1 ? 'sticker' : 'stickers'})`,
    `*Colores elegidos:* ${colorsBreakdown}`,
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

const DEFAULT_STICKER_PACKAGES = [
  {
    pkgId: 'single',
    name: 'Kit Individual Casco NFC',
    subtitle: 'Para 1 casco principal',
    price: 249,
    specs: '1 Sticker NFC de emergencia · Color elegible',
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
    specs: '4 Stickers NFC programados con tu perfil médico',
    stickerCount: 4,
    availableColors: [...ALL_STICKER_COLORS],
    sortOrder: 3,
  },
];

function normalizePackageOption(raw, fallbackIndex = 0) {
  const fallback =
    DEFAULT_STICKER_PACKAGES.find((p) => p.pkgId === raw?.pkgId) ||
    DEFAULT_STICKER_PACKAGES[fallbackIndex] ||
    DEFAULT_STICKER_PACKAGES[0];

  const validColors = Array.isArray(raw?.availableColors)
    ? raw.availableColors.filter((c) => ALL_STICKER_COLORS.includes(c))
    : [];

  let cleanedSpecs = raw?.specs || fallback.specs;
  if (
    /NTAG213|NTAG215|Resina Epóxica 3M|Acabado Resina 3M/i.test(cleanedSpecs)
  ) {
    cleanedSpecs = fallback.specs;
  }

  return {
    pkgId: raw?.pkgId || fallback.pkgId,
    name: raw?.name || fallback.name,
    subtitle: raw?.subtitle || fallback.subtitle,
    price: typeof raw?.price === 'number' && raw.price >= 1 ? raw.price : fallback.price,
    specs: cleanedSpecs,
    stickerCount:
      typeof raw?.stickerCount === 'number' &&
      raw.stickerCount >= 1 &&
      raw.stickerCount <= 10
        ? Math.round(raw.stickerCount)
        : fallback.stickerCount,
    availableColors: validColors.length > 0 ? validColors : [...ALL_STICKER_COLORS],
    sortOrder: typeof raw?.sortOrder === 'number' ? raw.sortOrder : fallback.sortOrder,
  };
}

function generateUniqueTagId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'msm-';
  const randomValues = new Uint32Array(8);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 8; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeAndValidateStickerInput(input) {
  const tagId = String(input.tagId || '').trim().slice(0, SCHEMA_CONSTRAINTS.tagId.maxLength);
  if (tagId.length < SCHEMA_CONSTRAINTS.tagId.minLength || !SCHEMA_CONSTRAINTS.idPattern.test(tagId)) {
    return { valid: false, error: 'El identificador del tag NFC no es válido.' };
  }

  const ownerId = String(input.ownerId || '').trim().slice(0, SCHEMA_CONSTRAINTS.ownerId.maxLength);
  if (ownerId.length < SCHEMA_CONSTRAINTS.ownerId.minLength || !SCHEMA_CONSTRAINTS.idPattern.test(ownerId)) {
    return { valid: false, error: 'Sesión de usuario inválida.' };
  }

  const fullName = String(input.fullName || '').trim().slice(0, SCHEMA_CONSTRAINTS.fullName.maxLength);
  if (fullName.length < SCHEMA_CONSTRAINTS.fullName.minLength) {
    return { valid: false, error: 'Por favor ingresa el nombre completo (mínimo 2 caracteres).' };
  }

  const bloodType = BLOOD_TYPES.includes(input.bloodType) ? input.bloodType : '';
  if (!bloodType) {
    return { valid: false, error: 'Por favor selecciona un tipo de sangre válido.' };
  }

  const allergies = String(input.allergies || '').trim().slice(0, SCHEMA_CONSTRAINTS.allergies.maxLength);
  const medicalConditions = String(input.medicalConditions || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.medicalConditions.maxLength);

  const emergencyContactName = String(input.emergencyContactName || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.emergencyContactName.maxLength);
  if (emergencyContactName.length < SCHEMA_CONSTRAINTS.emergencyContactName.minLength) {
    return { valid: false, error: 'Por favor ingresa el nombre del contacto de emergencia principal.' };
  }

  const emergencyContactRelation = String(input.emergencyContactRelation || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.emergencyContactRelation.maxLength);
  if (emergencyContactRelation.length < SCHEMA_CONSTRAINTS.emergencyContactRelation.minLength) {
    return { valid: false, error: 'Por favor ingresa el parentesco del contacto de emergencia principal.' };
  }

  const emergencyContactPhone = String(input.emergencyContactPhone || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.emergencyContactPhone.maxLength);
  if (
    emergencyContactPhone.length < SCHEMA_CONSTRAINTS.emergencyContactPhone.minLength ||
    !SCHEMA_CONSTRAINTS.phonePattern.test(emergencyContactPhone)
  ) {
    return {
      valid: false,
      error: 'Por favor ingresa un teléfono de emergencia principal válido (solo dígitos, +, -, espacios o paréntesis).',
    };
  }

  const secondaryContactName = String(input.secondaryContactName || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.secondaryContactName.maxLength);
  const secondaryContactRelation = String(input.secondaryContactRelation || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.secondaryContactRelation.maxLength);
  const secondaryContactPhone = String(input.secondaryContactPhone || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.secondaryContactPhone.maxLength);

  if (
    secondaryContactPhone.length > 0 &&
    (secondaryContactPhone.length < 5 || !SCHEMA_CONSTRAINTS.phonePattern.test(secondaryContactPhone))
  ) {
    return {
      valid: false,
      error: 'Por favor ingresa un teléfono válido para el segundo contacto de emergencia o déjalo en blanco.',
    };
  }

  const motorcycleDetails = String(input.motorcycleDetails || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.motorcycleDetails.maxLength);
  const insuranceDetails = String(input.insuranceDetails || '')
    .trim()
    .slice(0, SCHEMA_CONSTRAINTS.insuranceDetails.maxLength);

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
      isActive: true,
      accessPin: '',
    },
  };
}

function buildUniqueStickerUrl(sticker) {
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
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(compactPayload)));
  return `${baseUrl}?tag=${encodeURIComponent(sticker.tagId)}&p=${encodeURIComponent(encoded)}`;
}

function parseEncodedStickerPacket(encoded) {
  if (!encoded) return null;
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(jsonStr);
    return {
      tagId: typeof parsed.t === 'string' ? parsed.t : '',
      ownerId: '',
      fullName: typeof parsed.n === 'string' ? parsed.n : 'Motociclista Registrado',
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
      accessPin: '',
    };
  } catch {
    return null;
  }
}

function renderDeterministicQrSvg(text, size = 92) {
  const grid = 21;
  let hash = 2166136261;
  const str = String(text || 'bikersafe');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  function isFinderPattern(r, c) {
    const topLeft = r < 7 && c < 7;
    const topRight = r < 7 && c >= grid - 7;
    const bottomLeft = r >= grid - 7 && c < 7;
    return topLeft || topRight || bottomLeft;
  }

  function finderCell(r, c, r0, c0) {
    const dr = r - r0;
    const dc = c - c0;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
    return false;
  }

  let rects = '';
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      let filled = false;
      if (isFinderPattern(r, c)) {
        if (r < 7 && c < 7) filled = finderCell(r, c, 0, 0);
        else if (r < 7 && c >= grid - 7) filled = finderCell(r, c, 0, grid - 7);
        else if (r >= grid - 7 && c < 7) filled = finderCell(r, c, grid - 7, 0);
      } else {
        const seed = Math.imul(hash ^ (r * 31 + c * 17), 1597334677);
        const charByte = str.charCodeAt((r * grid + c) % str.length);
        filled = ((seed ^ charByte) & 1) === 1;
      }
      if (filled) {
        rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#0B0C0E"/>`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${grid} ${grid}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-label="Código QR de Sticker NFC">${rects}</svg>`;
}

// ============================================================================
// 3. Application State
// ============================================================================
const state = {
  user: null,
  authReady: false,
  viewMode: 'main', // 'main' | 'public_landing' | 'admin_login' | 'admin_panel'
  mainStep: 'profile_form', // 'profile_form' | 'sticker_checkout'

  // Customer Form fields
  currentTagId: null,
  fullName: '',
  bloodType: '',
  allergies: '',
  medicalConditions: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
  secondaryContactName: '',
  secondaryContactRelation: '',
  secondaryContactPhone: '',
  motorcycleDetails: '',
  insuranceDetails: '',
  organDonor: false,
  showAdvancedFields: false,

  // Status
  submitting: false,
  formError: null,
  saveSuccessBanner: false,

  // Dynamic Sticker Packages (Editable by Admin)
  packages: DEFAULT_STICKER_PACKAGES.map((p) => ({
    ...p,
    availableColors: [...p.availableColors],
  })),
  packagesLoadedFromDb: false,

  // Dynamic SPEI + WhatsApp Payment Settings (Editable by Admin)
  paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },

  // Checkout state
  selectedPkgId: 'pro',
  selectedStickerColors: ['Rojo', 'Negro', 'Gris', 'Verde', 'Azul', 'Rosa', 'Morado', 'Amarillo', 'Rojo', 'Negro'],
  deliveryMethod: 'personal_cdmx_edomex', // 'personal_cdmx_edomex' | 'paqueteria_nacional'
  recipientName: '',
  recipientPhone: '',
  shippingStreet: '',
  shippingColony: '',
  shippingCityState: '',
  shippingPostalCode: '',
  shippingNotes: '',
  checkoutSubmitting: false,
  checkoutError: null,
  activeOrder: null,
  userOrders: [],
  copiedClabe: false,

  // Firestore records for current user & public landing
  userSticker: null,
  hasPopulatedInitialForm: false,
  landingTagId: '',
  landingSticker: null,
  loadingLandingSticker: false,

  // Internal Admin State
  adminAuthenticated: false,
  adminUsernameInput: '',
  adminPasswordInput: '',
  adminLoginError: null,
  adminTab: 'orders', // 'orders' | 'records' | 'packages'
  adminAllStickers: [],
  adminAllOrders: [],
  adminSearchQuery: '',
  adminOrderSearchQuery: '',
  adminCopiedTagId: null,
  adminConfirmDeleteTagId: null,
  adminDeletingTagId: null,
  adminConfirmDeleteOrderId: null,
  adminDeletingOrderId: null,
  adminUpdatingOrderId: null,
  adminNfcMessage: null,
  adminSavingPackages: false,
  adminPackagesSavedSuccess: false,
  adminPackagesError: null,
  adminSavingPayment: false,
  adminPaymentSavedSuccess: false,
  adminPaymentError: null,
};

let unsubscribeUserStickers = null;
let unsubscribeUserOrders = null;
let unsubscribeAllStickersAdmin = null;
let unsubscribeAllOrdersAdmin = null;
let unsubscribePackages = null;
let unsubscribePaymentSettings = null;

async function syncUserPrivateProfile(user) {
  if (!user || !user.emailVerified) return;
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
    // Non-critical if already exists
  }
}

async function handleGoogleSignIn(forceAccountSelection = false) {
  state.formError = null;
  renderApp();
  try {
    const provider = new GoogleAuthProvider();
    if (forceAccountSelection) {
      provider.setCustomParameters({ prompt: 'select_account' });
    }
    const result = await signInWithPopup(auth, provider);
    await syncUserPrivateProfile(result.user);
    return result.user;
  } catch (err) {
    state.formError =
      err instanceof Error
        ? `Error al iniciar sesión: ${err.message}`
        : 'No se pudo completar la autenticación.';
    renderApp();
    return null;
  }
}

function isAuthorizedAdminUser(user) {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email &&
      user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL
  );
}

function getSelectedColorsForPackage(pkg) {
  const count = Math.max(1, Math.min(10, Number(pkg?.stickerCount) || 1));
  const avail =
    Array.isArray(pkg?.availableColors) && pkg.availableColors.length > 0
      ? pkg.availableColors
      : ALL_STICKER_COLORS;
  const result = [];
  for (let i = 0; i < count; i++) {
    const chosen = state.selectedStickerColors[i];
    if (chosen && avail.includes(chosen)) {
      result.push(chosen);
    } else {
      result.push(avail[i % avail.length]);
    }
  }
  return result;
}

async function handleSignOut() {
  state.adminAuthenticated = false;
  if (unsubscribeAllStickersAdmin) {
    unsubscribeAllStickersAdmin();
    unsubscribeAllStickersAdmin = null;
  }
  if (unsubscribeAllOrdersAdmin) {
    unsubscribeAllOrdersAdmin();
    unsubscribeAllOrdersAdmin = null;
  }
  if (unsubscribeUserOrders) {
    unsubscribeUserOrders();
    unsubscribeUserOrders = null;
  }
  await firebaseSignOut(auth);
}

// Subscribe to the 3 customizable purchase packages in Firestore
function subscribeToPackages() {
  if (unsubscribePackages) return;
  const pkgQuery = query(collection(db, 'packages'), where('sortOrder', '>=', 1));
  unsubscribePackages = onSnapshot(
    pkgQuery,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data());
        });
        loaded.sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1));
        if (loaded.length === 3) {
          state.packages = loaded.map((item, idx) => normalizePackageOption(item, idx));
          state.packagesLoadedFromDb = true;
          renderApp();
        }
      }
    },
    () => {
      // Fallback to default packages if not yet initialized
    }
  );
}

function subscribeToPaymentSettings() {
  if (unsubscribePaymentSettings) return;
  unsubscribePaymentSettings = onSnapshot(
    doc(db, 'payment_settings', 'spei'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        state.paymentSettings = {
          settingId: 'spei',
          bankName: data.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
          beneficiaryName: data.beneficiaryName || DEFAULT_PAYMENT_SETTINGS.beneficiaryName,
          clabe: data.clabe || DEFAULT_PAYMENT_SETTINGS.clabe,
          accountOrCard: data.accountOrCard || '',
          whatsappNumber: data.whatsappNumber || DEFAULT_PAYMENT_SETTINGS.whatsappNumber,
          paymentInstructions:
            data.paymentInstructions !== undefined
              ? data.paymentInstructions
              : DEFAULT_PAYMENT_SETTINGS.paymentInstructions,
        };
        renderApp();
      }
    },
    () => {
      // Fallback to default payment settings
    }
  );
}

function subscribeToUserOrders(user) {
  if (unsubscribeUserOrders) {
    unsubscribeUserOrders();
    unsubscribeUserOrders = null;
  }
  if (!user) return;
  const userOrdersQuery = query(
    collection(db, 'orders'),
    where('ownerId', '==', user.uid)
  );
  unsubscribeUserOrders = onSnapshot(
    userOrdersQuery,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      state.userOrders = list;
      if (state.activeOrder) {
        const updatedActive = list.find((o) => o.orderId === state.activeOrder.orderId);
        if (updatedActive) {
          state.activeOrder = updatedActive;
        }
      }
      renderApp();
    },
    () => {
      // Ignore if empty
    }
  );
}

// Subscribe to ALL stickers and ALL orders for the Internal Admin Panel
function subscribeToAllStickersForAdmin() {
  if (unsubscribeAllStickersAdmin) {
    unsubscribeAllStickersAdmin();
    unsubscribeAllStickersAdmin = null;
  }
  if (unsubscribeAllOrdersAdmin) {
    unsubscribeAllOrdersAdmin();
    unsubscribeAllOrdersAdmin = null;
  }
  if (!state.user || !isAuthorizedAdminUser(state.user)) return;

  const allStickersQuery = query(collection(db, 'stickers'), where('isActive', '==', true));
  unsubscribeAllStickersAdmin = onSnapshot(
    allStickersQuery,
    (snapshot) => {
      const all = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        all.push({
          ...raw,
          emergencyContactRelation: raw.emergencyContactRelation || '',
          secondaryContactName: raw.secondaryContactName || '',
          secondaryContactRelation: raw.secondaryContactRelation || '',
          secondaryContactPhone: raw.secondaryContactPhone || '',
        });
      });
      state.adminAllStickers = all;
      renderApp();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stickers');
    }
  );

  const allOrdersQuery = query(collection(db, 'orders'));
  unsubscribeAllOrdersAdmin = onSnapshot(
    allOrdersQuery,
    (snapshot) => {
      const orders = [];
      snapshot.forEach((docSnap) => {
        orders.push(docSnap.data());
      });
      orders.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      state.adminAllOrders = orders;
      renderApp();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

async function fetchPublicSticker(tagId) {
  const cleanId = String(tagId || '').trim();
  if (cleanId.length < 4) return;

  state.loadingLandingSticker = true;
  renderApp();

  try {
    const snap = await getDoc(doc(db, 'stickers', cleanId));
    if (snap.exists()) {
      const data = snap.data();
      state.landingSticker = {
        ...data,
        emergencyContactRelation: data.emergencyContactRelation || '',
        secondaryContactName: data.secondaryContactName || '',
        secondaryContactRelation: data.secondaryContactRelation || '',
        secondaryContactPhone: data.secondaryContactPhone || '',
      };
    }
  } catch {
    // Fallback URL packet remains active if offline
  } finally {
    state.loadingLandingSticker = false;
    renderApp();
  }
}

function subscribeToUserSticker(user) {
  if (unsubscribeUserStickers) {
    unsubscribeUserStickers();
    unsubscribeUserStickers = null;
  }
  if (!user) return;

  const stickersQuery = query(collection(db, 'stickers'), where('ownerId', '==', user.uid));
  unsubscribeUserStickers = onSnapshot(
    stickersQuery,
    (snapshot) => {
      const records = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        records.push({
          ...raw,
          emergencyContactRelation: raw.emergencyContactRelation || '',
          secondaryContactName: raw.secondaryContactName || '',
          secondaryContactRelation: raw.secondaryContactRelation || '',
          secondaryContactPhone: raw.secondaryContactPhone || '',
        });
      });

      if (records.length > 0) {
        const primaryRecord = records[0];
        state.userSticker = primaryRecord;
        state.currentTagId = primaryRecord.tagId;

        if (!state.hasPopulatedInitialForm) {
          state.fullName = primaryRecord.fullName || '';
          state.bloodType = primaryRecord.bloodType || '';
          state.allergies = primaryRecord.allergies || '';
          state.medicalConditions = primaryRecord.medicalConditions || '';
          state.emergencyContactName = primaryRecord.emergencyContactName || '';
          state.emergencyContactRelation = primaryRecord.emergencyContactRelation || '';
          state.emergencyContactPhone = primaryRecord.emergencyContactPhone || '';
          state.secondaryContactName = primaryRecord.secondaryContactName || '';
          state.secondaryContactRelation = primaryRecord.secondaryContactRelation || '';
          state.secondaryContactPhone = primaryRecord.secondaryContactPhone || '';
          state.motorcycleDetails = primaryRecord.motorcycleDetails || '';
          state.insuranceDetails = primaryRecord.insuranceDetails || '';
          state.organDonor = Boolean(primaryRecord.organDonor);
          state.hasPopulatedInitialForm = true;

          // Automatically send registered user to their Landing Page upon sign-in
          state.landingSticker = primaryRecord;
          state.landingTagId = primaryRecord.tagId;
          if (state.viewMode !== 'admin_login' && state.viewMode !== 'admin_panel') {
            state.viewMode = 'public_landing';
          }
        } else if (state.landingTagId === primaryRecord.tagId) {
          state.landingSticker = primaryRecord;
        }
      } else {
        state.userSticker = null;
        state.currentTagId = null;
      }
      renderApp();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stickers');
    }
  );
}

// ============================================================================
// 4. HTML Templates
// ============================================================================
function renderHeader() {
  return `
    <header class="bg-[#08090B] text-white border-b border-zinc-800/90">
      <div class="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Zone 1: Brand Wordmark -->
        <a href="#inicio" id="nav-brand-link" class="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          <svg viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-7 h-5 text-orange-500 shrink-0" aria-hidden="true">
            <circle cx="5.5" cy="14.5" r="3.5" stroke="currentColor" stroke-width="2.2" />
            <circle cx="22.5" cy="14.5" r="3.5" stroke="currentColor" stroke-width="2.2" />
            <path d="M5.5 14.5L10 8H16.5L19.5 14.5M10 8L13 14.5H19.5M15 4.5H18.5L22.5 14.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Biker Safe</span>
        </a>

        <!-- Zone 2: Only Main Screen in Menu -->
        <nav class="flex items-center gap-6 text-sm font-medium">
          <button type="button" id="nav-main-btn" class="py-1 transition-colors whitespace-nowrap cursor-pointer ${
            state.viewMode === 'main'
              ? 'text-orange-500 border-b-2 border-orange-500 font-bold'
              : 'text-zinc-400 hover:text-white'
          }">
            Pantalla Principal
          </button>
        </nav>

        <!-- Zone 3: User Account Action -->
        <div class="flex items-center gap-3">
          ${
            state.user
              ? `
            <div class="flex items-center gap-3">
              <span class="hidden sm:inline text-xs text-zinc-400 truncate max-w-[180px]">
                ${escapeHtml(state.user.displayName || state.user.email)}
              </span>
              <button type="button" id="auth-signout-btn" class="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
                <span>Cerrar Sesión</span>
              </button>
            </div>
          `
              : `
            <button type="button" id="auth-signin-btn" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-black bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
              <span>Iniciar Sesión Segura</span>
            </button>
          `
          }
        </div>
      </div>
    </header>
  `;
}

function renderPublicLandingView() {
  const sticker = state.landingSticker || state.userSticker;

  if (state.loadingLandingSticker && !sticker) {
    return `
      <div class="max-w-4xl mx-auto py-8 space-y-6 animate-pulse">
        <div class="h-40 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="h-36 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
          <div class="h-36 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
        </div>
      </div>
    `;
  }

  if (!sticker) {
    return `
      <div class="max-w-xl mx-auto py-16 text-center space-y-4 bg-[#14161A] border border-zinc-800 rounded-2xl p-10">
        <h1 class="text-xl font-bold text-white">Perfil de Emergencia No Encontrado</h1>
        <p class="text-sm text-zinc-400">
          El enlace del sticker NFC consultado no existe o aún no ha sido registrado.
        </p>
        <button type="button" id="back-to-main-btn" class="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer">
          Ir a Pantalla Principal
        </button>
      </div>
    `;
  }

  const isOwnerViewing = Boolean(
    state.user &&
      sticker &&
      (sticker.ownerId === state.user.uid ||
        (state.userSticker && state.userSticker.tagId === sticker.tagId))
  );

  return `
    <div class="max-w-4xl mx-auto space-y-6">
      ${
        state.adminAuthenticated
          ? `
        <div class="flex items-center justify-between gap-3 bg-[#14161A] border border-orange-500/50 rounded-xl px-5 py-3">
          <span class="text-xs font-semibold text-orange-400">
            Vista Previa de Administrador · ID: ${escapeHtml(sticker.tagId)}
          </span>
          <button type="button" id="back-to-admin-btn" class="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer">
            ← Volver al Panel de Administración
          </button>
        </div>
      `
          : ''
      }

      ${
        isOwnerViewing
          ? `
        <div class="flex flex-wrap items-center justify-between gap-3 bg-[#14161A] border border-zinc-800 rounded-xl px-5 py-3.5">
          <div class="flex items-center gap-2 text-xs text-zinc-300">
            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
            <span class="font-semibold text-white">Tu Perfil de Emergencia Activo</span>
            <span aria-hidden="true" class="text-zinc-600">·</span>
            <span class="font-mono tabular-nums text-orange-400">${escapeHtml(sticker.tagId)}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" id="owner-edit-info-btn" class="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer">
              <span>Editar mi Información</span>
            </button>
            <button type="button" id="owner-buy-sticker-btn" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
              <span>Comprar Sticker NFC</span>
            </button>
          </div>
        </div>
      `
          : ''
      }

      <!-- Hero Emergency Identification Banner -->
      <section class="bg-gradient-to-br from-[#181B20] via-[#121418] to-[#0B0C0E] border border-zinc-800 rounded-2xl overflow-hidden">
        <div class="bg-orange-500 text-black px-6 py-2.5 flex items-center justify-between text-xs font-bold tracking-wide">
          <span>INFORMACIÓN MÉDICA CRÍTICA DE EMERGENCIA · ACCESO DIRECTO NFC</span>
          <span class="font-mono tabular-nums hidden sm:inline">BIKER SAFE ID: ${escapeHtml(sticker.tagId)}</span>
        </div>

        <div class="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="text-xs font-medium text-zinc-400">MOTOCICLISTA / PACIENTE REGISTRADO</div>
            <h1 class="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              ${escapeHtml(sticker.fullName)}
            </h1>

            <div class="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-300">
              ${
                sticker.motorcycleDetails
                  ? `<span><strong class="text-zinc-100">Motocicleta / Casco:</strong> ${escapeHtml(sticker.motorcycleDetails)}</span><span aria-hidden="true" class="text-zinc-600">·</span>`
                  : ''
              }
              <span><strong class="text-zinc-100">Seguro Médico / Póliza:</strong> ${escapeHtml(sticker.insuranceDetails || 'No especificado')}</span>
              <span aria-hidden="true" class="text-zinc-600">·</span>
              <span><strong class="text-zinc-100">Donador de Órganos:</strong> ${sticker.organDonor ? 'Sí (Autorizado)' : 'No especificado'}</span>
            </div>
          </div>

          <div class="bg-[#0B0C0E] border-2 border-orange-500 rounded-2xl px-7 py-4 text-center shrink-0 self-start md:self-center">
            <span class="block text-[11px] font-bold text-zinc-400 tracking-wider">TIPO DE SANGRE</span>
            <span class="block text-4xl font-bold font-mono tabular-nums text-orange-500 mt-0.5">
              ${escapeHtml(sticker.bloodType)}
            </span>
          </div>
        </div>
      </section>

      <!-- Critical Medical Data Grid -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div class="text-orange-500 font-bold text-xs tracking-wide">ALERGIAS CONOCIDAS</div>
          <p class="text-base font-semibold text-white leading-relaxed">
            ${escapeHtml(sticker.allergies || 'Sin alergias medicamentosas o materiales reportadas.')}
          </p>
        </div>

        <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div class="text-orange-500 font-bold text-xs tracking-wide">CONDICIONES MÉDICAS Y MEDICACIÓN ACTUAL</div>
          <p class="text-base font-semibold text-white leading-relaxed">
            ${escapeHtml(sticker.medicalConditions || 'Sin condiciones médicas crónicas ni medicación activa reportada.')}
          </p>
        </div>
      </section>

      <!-- Direct Call Emergency Contacts Section -->
      <section class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <h2 class="text-lg font-bold text-white">Contactos de Emergencia Directos</h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Toca cualquier botón para realizar la llamada telefónica inmediata.
            </p>
          </div>
          <a href="tel:911" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap">
            <span class="text-orange-500">●</span>
            <span>Llamar al 911 Emergencias</span>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Primary Contact -->
          <div class="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div>
              <span class="text-[11px] font-semibold text-orange-400">CONTACTO DE EMERGENCIA 1 (PRINCIPAL)</span>
              <div class="text-lg font-bold text-white mt-1">${escapeHtml(sticker.emergencyContactName)}</div>
              ${
                sticker.emergencyContactRelation
                  ? `<div class="text-xs font-medium text-orange-300 mt-0.5">Parentesco: ${escapeHtml(sticker.emergencyContactRelation)}</div>`
                  : ''
              }
              <div class="text-sm font-mono tabular-nums text-zinc-300 mt-1">${escapeHtml(sticker.emergencyContactPhone)}</div>
            </div>

            <a href="tel:${escapeHtml(String(sticker.emergencyContactPhone || '').replace(/\s+/g, ''))}" class="w-full py-3 px-4 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors">
              <span>Llamar a ${escapeHtml(sticker.emergencyContactName)}</span>
            </a>
          </div>

          <!-- Secondary Contact -->
          ${
            sticker.secondaryContactName || sticker.secondaryContactPhone
              ? `
            <div class="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div>
                <span class="text-[11px] font-semibold text-zinc-400">CONTACTO DE EMERGENCIA 2 (SECUNDARIO)</span>
                <div class="text-lg font-bold text-white mt-1">${escapeHtml(sticker.secondaryContactName || 'Contacto Secundario')}</div>
                ${
                  sticker.secondaryContactRelation
                    ? `<div class="text-xs font-medium text-zinc-300 mt-0.5">Parentesco: ${escapeHtml(sticker.secondaryContactRelation)}</div>`
                    : ''
                }
                <div class="text-sm font-mono tabular-nums text-zinc-300 mt-1">${escapeHtml(sticker.secondaryContactPhone || 'Teléfono no especificado')}</div>
              </div>
              ${
                sticker.secondaryContactPhone
                  ? `<a href="tel:${escapeHtml(String(sticker.secondaryContactPhone).replace(/\s+/g, ''))}" class="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors">
                      <span>Llamar a ${escapeHtml(sticker.secondaryContactName || 'Contacto 2')}</span>
                    </a>`
                  : ''
              }
            </div>
          `
              : `
            <div class="bg-[#0B0C0E] border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-center items-center text-center text-xs text-zinc-500">
              <span>Sin segundo contacto de emergencia registrado.</span>
            </div>
          `
          }
        </div>
      </section>
    </div>
  `;
}

// Step 2: Customer Sticker Purchase (NO URL shown to the customer!)
function renderStickerCheckoutStep() {
  const sticker = state.userSticker;
  if (!sticker) return '';

  const selectedPkg =
    state.packages.find((p) => p.pkgId === state.selectedPkgId) || state.packages[1] || state.packages[0];
  const chosenColors = getSelectedColorsForPackage(selectedPkg);
  const availColors =
    Array.isArray(selectedPkg.availableColors) && selectedPkg.availableColors.length > 0
      ? selectedPkg.availableColors
      : ALL_STICKER_COLORS;

  return `
    <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-8">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-orange-500 mb-1">
            <span>PASO 2 · STICKER FÍSICO PERSONALIZADO</span>
            <span aria-hidden="true">·</span>
            <span class="font-mono tabular-nums">FOLIO PERFIL: ${escapeHtml(sticker.tagId)}</span>
          </div>
          <h2 class="text-2xl font-bold text-white tracking-tight">
            Adquiere tu Sticker NFC Biker Safe
          </h2>
          <p class="text-sm text-zinc-400 mt-1">
            Nosotros programamos y vinculamos tu sticker físico con tu perfil médico antes de enviarlo a tu domicilio.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button type="button" id="go-edit-profile-btn" class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
            <span>← Modificar mis Datos Médicos</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left: Physical Custom Helmet Sticker Preview ONLY (No URL shown to customer) (5 cols) -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-[#0B0C0E] border-2 border-orange-500/80 rounded-2xl p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span class="text-sm font-bold text-white tracking-tight">Biker Safe NFC</span>
              </div>
              <span class="text-xs font-mono tabular-nums text-orange-400">${escapeHtml(sticker.tagId)}</span>
            </div>

            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-xl bg-zinc-900 border border-orange-500/40 flex flex-col items-center justify-center shrink-0 text-orange-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-7 h-7" aria-hidden="true">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="20" r="1" fill="currentColor"/>
                </svg>
                <span class="text-[10px] font-bold tracking-wider text-zinc-300 mt-0.5">NFC</span>
              </div>
              <div class="space-y-1 min-w-0">
                <div class="text-[11px] font-bold text-orange-500">STICKER DE EMERGENCIA</div>
                <div class="text-base font-bold text-white truncate">${escapeHtml(sticker.fullName)}</div>
                <div class="text-xs font-mono tabular-nums text-zinc-300">
                  Tipo de Sangre: <strong class="text-orange-400">${escapeHtml(sticker.bloodType)}</strong>
                </div>
                <div class="text-[11px] text-zinc-400 truncate">
                  Contacto 1: ${escapeHtml(sticker.emergencyContactName)}${sticker.emergencyContactRelation ? ` (${escapeHtml(sticker.emergencyContactRelation)})` : ''}
                </div>
                ${
                  sticker.secondaryContactName
                    ? `<div class="text-[11px] text-zinc-400 truncate">Contacto 2: ${escapeHtml(sticker.secondaryContactName)}${sticker.secondaryContactRelation ? ` (${escapeHtml(sticker.secondaryContactRelation)})` : ''}</div>`
                    : ''
                }
              </div>
            </div>

            <!-- Selected Colors Summary in Preview -->
            <div class="pt-3 border-t border-zinc-800/80 space-y-2">
              <div class="text-[11px] font-semibold text-zinc-300">
                ${chosenColors.length === 1 ? 'Color de Sticker seleccionado:' : `Colores seleccionados (${chosenColors.length} stickers):`}
              </div>
              <div class="flex flex-wrap gap-1.5">
                ${chosenColors
                  .map(
                    (colorName, idx) => `
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200">
                    <span class="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style="background-color: ${STICKER_COLOR_SWATCHES[colorName] || '#f97316'}"></span>
                    <span>#${idx + 1}: ${escapeHtml(colorName)}</span>
                  </span>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-end text-[11px] text-zinc-400">
              <span>Listo para colocar en casco</span>
            </div>
          </div>

          <div class="p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl text-xs text-zinc-400 leading-relaxed">
            <strong class="text-zinc-200 block mb-1">Configuración Certificada Biker Safe</strong>
            Nuestro equipo técnico graba tu perfil médico directamente en el chip NFC de tu sticker antes del envío. Si actualizas tus datos en el Paso 1, tu sticker mostrará la información actualizada automáticamente.
          </div>
        </div>

        <!-- Right: Package Selector, Shipping Form & Option B SPEI + WhatsApp Checkout (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          ${
            state.activeOrder
              ? (() => {
                  const ord = state.activeOrder;
                  const waUrl = buildWhatsAppOrderUrl(ord, state.paymentSettings);
                  const statusLabel = ORDER_STATUS_LABELS[ord.status] || 'Pendiente de Pago';
                  return `
            <div class="bg-[#0B0C0E] border-2 border-orange-500 rounded-2xl p-6 sm:p-8 space-y-6">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <div class="flex items-center gap-2 text-xs font-mono text-orange-400">
                    <span>PEDIDO REGISTRADO · FOLIO #${escapeHtml(ord.orderId.toUpperCase())}</span>
                    <span aria-hidden="true">·</span>
                    <span>${escapeHtml(statusLabel)}</span>
                  </div>
                  <h3 class="text-xl font-bold text-white mt-1">
                    Paso Final: Pago por Transferencia SPEI y Confirmación por WhatsApp
                  </h3>
                </div>
                <div class="text-left sm:text-right shrink-0">
                  <span class="block text-[10px] text-zinc-400 uppercase">Total a Transferir</span>
                  <span class="text-2xl font-bold font-mono tabular-nums text-orange-500">$${ord.totalPrice} MXN</span>
                </div>
              </div>

              <p class="text-xs text-zinc-300 leading-relaxed">
                ${escapeHtml(state.paymentSettings.paymentInstructions)}
              </p>

              <!-- SPEI Bank Details Card -->
              <div class="bg-[#14161A] border border-zinc-800 rounded-xl p-5 space-y-4">
                <div class="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span class="text-xs font-bold text-orange-400">
                    DATOS BANCARIOS PARA TRANSFERENCIA SPEI / DEPÓSITO
                  </span>
                  <span class="text-[11px] text-zinc-400">0% Comisión</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span class="text-zinc-500 block">Banco Receptor:</span>
                    <strong class="text-white text-sm">${escapeHtml(state.paymentSettings.bankName)}</strong>
                  </div>
                  <div>
                    <span class="text-zinc-500 block">Beneficiario:</span>
                    <strong class="text-white text-sm">${escapeHtml(state.paymentSettings.beneficiaryName)}</strong>
                  </div>
                </div>

                <div class="p-3.5 bg-[#0B0C0E] border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span class="text-[11px] text-zinc-400 block">CLABE Interbancaria:</span>
                    <span class="text-base font-bold font-mono tabular-nums text-orange-400 tracking-wider select-all">${escapeHtml(state.paymentSettings.clabe)}</span>
                  </div>
                  <button
                    type="button"
                    id="copy-clabe-btn"
                    class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    ${state.copiedClabe ? '¡CLABE Copiada!' : 'Copiar CLABE'}
                  </button>
                </div>

                ${
                  state.paymentSettings.accountOrCard
                    ? `
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <span class="text-zinc-500 block">Número de Cuenta / Tarjeta:</span>
                      <strong class="text-zinc-200 font-mono tabular-nums">${escapeHtml(state.paymentSettings.accountOrCard)}</strong>
                    </div>
                    <div>
                      <span class="text-zinc-500 block">Concepto o Referencia de Pago:</span>
                      <strong class="text-orange-400 font-mono tabular-nums">FOLIO ${escapeHtml(ord.orderId.toUpperCase())}</strong>
                    </div>
                  </div>
                `
                    : `
                  <div class="text-xs">
                    <span class="text-zinc-500">Concepto o Referencia de Pago: </span>
                    <strong class="text-orange-400 font-mono tabular-nums">FOLIO ${escapeHtml(ord.orderId.toUpperCase())}</strong>
                  </div>
                `
                }
              </div>

              <!-- Order Summary Box -->
              <div class="p-4 bg-[#14161A] border border-zinc-800 rounded-xl space-y-1.5 text-xs text-zinc-300">
                <div><strong class="text-white">Paquete:</strong> ${escapeHtml(ord.pkgName)} (${ord.stickerCount} ${ord.stickerCount === 1 ? 'sticker' : 'stickers'} · $${ord.totalPrice} MXN)</div>
                <div><strong class="text-white">Colores por Sticker:</strong> ${(ord.selectedColors || []).map((c, i) => `Sticker #${i + 1}: ${escapeHtml(c)}`).join(' · ')}</div>
                <div>
                  <strong class="text-white">Modalidad de Entrega:</strong>
                  <span class="text-orange-400 font-semibold">
                    ${
                      isPersonalDeliveryOrder(ord)
                        ? 'Entrega Personal (Solo Estado de México y CDMX · Se acuerda vía WhatsApp)'
                        : 'Envío por Paquetería a toda la República (Se acuerda vía WhatsApp)'
                    }
                  </span>
                </div>
                <div><strong class="text-white">Recibe:</strong> ${escapeHtml(ord.recipientName)} · Tel / WhatsApp: <span class="font-mono tabular-nums">${escapeHtml(ord.recipientPhone)}</span></div>
                ${
                  isPersonalDeliveryOrder(ord)
                    ? `
                  <div><strong class="text-white">Zona / Alcaldía o Municipio (CDMX / EdoMéx):</strong> ${escapeHtml(ord.shippingCityState)}${ord.shippingNotes ? ` · Punto/Horario sugerido: ${escapeHtml(ord.shippingNotes)}` : ''}</div>
                `
                    : `
                  <div><strong class="text-white">Dirección de Envío:</strong> ${escapeHtml(ord.shippingStreet)}, Col. ${escapeHtml(ord.shippingColony)}, C.P. ${escapeHtml(ord.shippingPostalCode)}, ${escapeHtml(ord.shippingCityState)}${ord.shippingNotes ? ` (${escapeHtml(ord.shippingNotes)})` : ''}</div>
                `
                }
              </div>

              <!-- Primary Action: Send Order & Receipt via WhatsApp -->
              <div class="space-y-3 pt-1">
                <a
                  href="${escapeHtml(waUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-4 px-6 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors text-center"
                >
                  <span>Enviar Comprobante y Acordar Entrega por WhatsApp</span>
                </a>

                <div class="flex items-center justify-between pt-2">
                  <button type="button" id="new-order-btn" class="text-xs font-semibold text-zinc-400 hover:text-white underline cursor-pointer">
                    ← Realizar otro pedido o cambiar paquete
                  </button>
                </div>
              </div>
            </div>
          `;
                })()
              : `
            <form id="sticker-purchase-form" class="space-y-6">
              ${
                state.checkoutError
                  ? `
                <div class="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
                  ${escapeHtml(state.checkoutError)}
                </div>
              `
                  : ''
              }

              <div>
                <label class="block text-xs font-bold text-zinc-300 mb-3">
                  1. Selecciona tu Opción de Compra de Tag NFC
                </label>
                <div class="grid grid-cols-1 gap-3">
                  ${state.packages
                    .map((pkg) => {
                      const active = pkg.pkgId === state.selectedPkgId;
                      const count = Math.max(1, Number(pkg.stickerCount) || 1);
                      return `
                      <div data-pkg-id="${escapeHtml(pkg.pkgId)}" class="pkg-option-card p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                        active
                          ? 'bg-[#0B0C0E] border-orange-500'
                          : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                      }">
                        <div class="space-y-1">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-sm font-bold text-white">${escapeHtml(pkg.name)}</span>
                            <span class="text-xs text-orange-400 font-medium">· ${escapeHtml(pkg.subtitle)}</span>
                            <span class="text-xs font-mono tabular-nums text-zinc-300">· ${count} ${count === 1 ? 'Sticker' : 'Stickers'}</span>
                          </div>
                          <p class="text-xs text-zinc-400">${escapeHtml(pkg.specs)}</p>
                        </div>
                        <div class="text-right shrink-0">
                          <span class="text-lg font-bold font-mono tabular-nums text-orange-500">$${pkg.price}</span>
                          <span class="block text-[10px] text-zinc-500">MXN</span>
                        </div>
                      </div>
                    `;
                    })
                    .join('')}
                </div>
              </div>

              <!-- Per-Sticker Color Selector based on selectedPkg.stickerCount -->
              <div class="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <label class="block text-xs font-bold text-zinc-300">
                    2. Elige el Color de ${chosenColors.length === 1 ? 'tu Sticker NFC' : `cada uno de tus ${chosenColors.length} Stickers NFC`}
                  </label>
                  <p class="text-[11px] text-zinc-400 mt-0.5">
                    ${
                      chosenColors.length === 1
                        ? 'Este paquete incluye 1 sticker. Selecciona el color de tu preferencia:'
                        : `Este paquete incluye ${chosenColors.length} stickers. Elige el color para cada uno:`
                    }
                  </p>
                </div>

                <div class="space-y-3">
                  ${chosenColors
                    .map(
                      (selectedColor, unitIdx) => `
                    <div class="p-3.5 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-2.5">
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-bold text-white">Sticker #${unitIdx + 1}</span>
                        <span class="text-orange-400 font-semibold">Color: ${escapeHtml(selectedColor)}</span>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        ${availColors
                          .map((colorOption) => {
                            const isSelected = selectedColor === colorOption;
                            const hex = STICKER_COLOR_SWATCHES[colorOption] || '#f97316';
                            return `
                            <button
                              type="button"
                              data-sticker-unit="${unitIdx}"
                              data-sticker-color="${escapeHtml(colorOption)}"
                              class="sticker-color-choice-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-800 border-orange-500 text-white'
                                  : 'bg-[#14161A] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                              }"
                            >
                              <span class="w-3 h-3 rounded-full border border-white/25 shrink-0" style="background-color: ${hex}"></span>
                              <span>${escapeHtml(colorOption)}</span>
                            </button>
                          `;
                          })
                          .join('')}
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- Step 3: Delivery Method (2 options, both agreed via WhatsApp) -->
              <div class="space-y-4 pt-2 border-t border-zinc-800">
                <div>
                  <div class="text-xs font-bold text-zinc-300">
                    3. Modalidad de Entrega (En ambos casos se acuerda vía WhatsApp)
                  </div>
                  <p class="text-[11px] text-zinc-400 mt-0.5">
                    Elige si prefieres entrega personal en Estado de México / CDMX o envío por paquetería a toda la República. Ambos métodos se coordinan directamente por WhatsApp.
                  </p>
                </div>

                <!-- 2 Delivery Option Selector Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-delivery-method="personal_cdmx_edomex"
                    class="delivery-method-btn p-4 rounded-xl border text-left transition-colors cursor-pointer space-y-1.5 ${
                      state.deliveryMethod === 'personal_cdmx_edomex'
                        ? 'bg-[#0B0C0E] border-orange-500'
                        : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                    }"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-bold text-white">1. Entrega Personal</span>
                      <span class="text-[11px] font-semibold text-orange-400">Solo Edo. Méx. y CDMX</span>
                    </div>
                    <p class="text-[11px] text-zinc-400 leading-relaxed">
                      Nos ponemos de acuerdo vía WhatsApp sobre el punto de encuentro, día y horario en CDMX o Estado de México.
                    </p>
                  </button>

                  <button
                    type="button"
                    data-delivery-method="paqueteria_nacional"
                    class="delivery-method-btn p-4 rounded-xl border text-left transition-colors cursor-pointer space-y-1.5 ${
                      state.deliveryMethod === 'paqueteria_nacional'
                        ? 'bg-[#0B0C0E] border-orange-500'
                        : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                    }"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-bold text-white">2. Envío por Paquetería</span>
                      <span class="text-[11px] font-semibold text-orange-400">Toda la República</span>
                    </div>
                    <p class="text-[11px] text-zinc-400 leading-relaxed">
                      Enviamos a cualquier estado de la República Mexicana. La paquetería, cotización y guía se acuerdan vía WhatsApp.
                    </p>
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Nombre de quien recibe</label>
                    <input type="text" id="recipient-name-input" required maxlength="100" value="${escapeHtml(state.recipientName || sticker.fullName)}" placeholder="Ej. Miguel Ángel Rojas" class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Teléfono / WhatsApp para acordar entrega</label>
                    <input type="tel" id="recipient-phone-input" required maxlength="30" value="${escapeHtml(state.recipientPhone)}" placeholder="Ej. +52 55 1234 5678" class="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500" />
                  </div>
                </div>

                ${
                  state.deliveryMethod === 'personal_cdmx_edomex'
                    ? `
                  <!-- Fields for Personal Delivery in EdoMex & CDMX -->
                  <div class="p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-4">
                    <div class="text-xs text-orange-400 font-semibold">
                      Entrega Personal en Estado de México y CDMX · Se acuerda punto y horario por WhatsApp
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Alcaldía (CDMX) o Municipio (Estado de México)</label>
                      <input type="text" id="shipping-city-input" required maxlength="120" value="${escapeHtml(state.shippingCityState)}" placeholder="Ej. Naucalpan, Edo. de México / Benito Juárez, CDMX" class="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Punto o zona sugerida / Horario preferido (Se acuerda vía WhatsApp)</label>
                      <input type="text" id="shipping-notes-input" maxlength="250" value="${escapeHtml(state.shippingNotes)}" placeholder="Ej. Estación de Metro / Plaza comercial cercana, tardes o fin de semana" class="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                `
                    : `
                  <!-- Fields for Parcel Shipping across Mexico -->
                  <div class="p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-4">
                    <div class="text-xs text-orange-400 font-semibold">
                      Envío por Paquetería a toda la República · Se acuerda envío y guía por WhatsApp
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div class="sm:col-span-7">
                        <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Calle y Número (Ext. / Int.)</label>
                        <input type="text" id="shipping-street-input" required maxlength="200" value="${escapeHtml(state.shippingStreet)}" placeholder="Ej. Av. Insurgentes Sur 1450 Int. 4B" class="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                      </div>
                      <div class="sm:col-span-5">
                        <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Colonia</label>
                        <input type="text" id="shipping-colony-input" required maxlength="120" value="${escapeHtml(state.shippingColony)}" placeholder="Ej. Col. Del Valle" class="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div class="sm:col-span-8">
                        <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Ciudad, Municipio y Estado de la República</label>
                        <input type="text" id="shipping-city-input" required maxlength="120" value="${escapeHtml(state.shippingCityState)}" placeholder="Ej. Guadalajara, Jalisco / Monterrey, Nuevo León" class="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                      </div>
                      <div class="sm:col-span-4">
                        <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Código Postal</label>
                        <input type="text" id="shipping-zip-input" required maxlength="15" value="${escapeHtml(state.shippingPostalCode)}" placeholder="Ej. 44100" class="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Referencias del domicilio / Notas para paquetería (Opcional)</label>
                      <input type="text" id="shipping-notes-input" maxlength="250" value="${escapeHtml(state.shippingNotes)}" placeholder="Ej. Entre calles Pilares y Matías Romero, fachada gris" class="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                `
                }
              </div>

              <!-- Step 4: Payment Method Summary (Option B: SPEI + WhatsApp) -->
              <div class="p-4 bg-[#0B0C0E] border border-orange-500/50 rounded-xl space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-orange-400">4. Método de Pago: Transferencia SPEI + WhatsApp</span>
                  <span class="text-sm font-bold font-mono tabular-nums text-white">Total: $${selectedPkg.price} MXN</span>
                </div>
                <p class="text-[11px] text-zinc-400 leading-relaxed">
                  Al confirmar tu pedido se guardará tu orden con folio único, verás los datos bancarios (CLABE) para realizar tu transferencia SPEI y podrás enviar tu comprobante directo por WhatsApp.
                </p>
              </div>

              <button type="submit" ${state.checkoutSubmitting ? 'disabled' : ''} class="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <span>${
                  state.checkoutSubmitting
                    ? 'Registrando tu Pedido...'
                    : `Confirmar Pedido y Pagar por Transferencia SPEI ($${selectedPkg.price} MXN)`
                }</span>
              </button>
            </form>
          `
          }

          ${
            state.userOrders.length > 0
              ? `
            <div class="bg-[#0B0C0E] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div class="text-xs font-bold text-zinc-300">
                Mis Pedidos Registrados (${state.userOrders.length})
              </div>
              <div class="space-y-2.5">
                ${state.userOrders
                  .map((ord) => {
                    const stLabel = ORDER_STATUS_LABELS[ord.status] || 'Pendiente de Pago';
                    return `
                    <div class="p-3.5 bg-[#14161A] border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div class="space-y-0.5">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-mono font-bold text-orange-400">#${escapeHtml(ord.orderId.toUpperCase())}</span>
                          <span class="font-semibold text-white">${escapeHtml(ord.pkgName)}</span>
                          <span class="font-mono tabular-nums text-zinc-300">· $${ord.totalPrice} MXN</span>
                          <span class="text-zinc-400">· Estatus: <strong class="text-orange-300">${escapeHtml(stLabel)}</strong></span>
                        </div>
                        <div class="text-[11px] text-zinc-400">
                          Colores: ${(ord.selectedColors || []).map((c, i) => `#${i + 1}: ${escapeHtml(c)}`).join(', ')} · ${
                            isPersonalDeliveryOrder(ord)
                              ? 'Entrega Personal (CDMX / EdoMéx · WhatsApp)'
                              : 'Envío por Paquetería (WhatsApp)'
                          }
                        </div>
                      </div>
                      <button
                        type="button"
                        data-open-order-id="${escapeHtml(ord.orderId)}"
                        class="view-existing-order-btn px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 font-semibold rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                      >
                        Ver Datos SPEI / WhatsApp
                      </button>
                    </div>
                  `;
                  })
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

function renderProfileFormStep() {
  return `
    <div class="max-w-3xl mx-auto bg-[#14161A] rounded-2xl border border-zinc-800 p-6 sm:p-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div class="text-xs font-bold text-orange-500 mb-1">
            ${
              state.userSticker
                ? `PERFIL MÉDICO ACTIVO · ID: ${escapeHtml(state.userSticker.tagId)}`
                : 'PERFIL MÉDICO DE EMERGENCIA'
            }
          </div>
          <h1 class="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
            ${state.userSticker ? 'Tus Datos de Emergencia (Modificables)' : 'Configura tu Sticker NFC'}
          </h1>
        </div>

        <button type="button" id="load-sample-btn" class="text-xs font-semibold text-orange-400 hover:text-orange-300 underline cursor-pointer self-start sm:self-center whitespace-nowrap">
          Cargar ejemplo
        </button>
      </div>

      <p class="text-sm text-zinc-400 leading-relaxed mb-7">
        Tu cuenta protege la edición de estos datos. Puedes modificarlos cuando lo necesites y una vez guardado tu registro pasarás a la selección y compra de tu sticker NFC personalizado.
      </p>

      ${
        !state.user
          ? `
        <div class="mb-6 p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="text-xs text-zinc-300">
            <strong class="text-white block mb-0.5">Cuenta Segura de Usuario</strong>
            Inicia sesión para guardar o modificar tus datos médicos en cualquier momento.
          </div>
          <button type="button" id="form-signin-btn" class="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer">
            Conectar mi Cuenta
          </button>
        </div>
      `
          : ''
      }

      ${
        state.formError
          ? `
        <div class="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200 font-medium">
          ${escapeHtml(state.formError)}
        </div>
      `
          : ''
      }

      ${
        state.saveSuccessBanner
          ? `
        <div class="mb-6 p-4 bg-zinc-900 border border-orange-500/60 rounded-xl text-xs text-zinc-200">
          Tus datos médicos se han guardado correctamente en tu perfil (<strong class="font-mono text-orange-400">${escapeHtml(state.currentTagId)}</strong>).
        </div>
      `
          : ''
      }

      <form id="profile-medical-form" class="space-y-5">
        <!-- Row 1: Nombre Completo & Tipo de Sangre -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-5">
          <div class="sm:col-span-7">
            <label for="fullName" class="block text-xs font-semibold text-zinc-300 mb-2">Nombre Completo</label>
            <input id="fullName" type="text" required maxlength="100" value="${escapeHtml(state.fullName)}" placeholder="Ej. Miguel Ángel Rojas" class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
          </div>

          <div class="sm:col-span-5">
            <label for="bloodType" class="block text-xs font-semibold text-zinc-300 mb-2">Tipo de Sangre</label>
            <select id="bloodType" required class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500">
              <option value="">Selecciona...</option>
              ${BLOOD_TYPES.map(
                (bt) =>
                  `<option value="${bt}" ${state.bloodType === bt ? 'selected' : ''}>${bt}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <!-- Row 2: Alergias Conocidas -->
        <div>
          <label for="allergies" class="block text-xs font-semibold text-zinc-300 mb-2">Alergias Conocidas</label>
          <input id="allergies" type="text" maxlength="500" value="${escapeHtml(state.allergies)}" placeholder="Ej. Penicilina, Látex (Deja en blanco si no aplica)" class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
        </div>

        <!-- Row 3: Condiciones Médicas / Medicación Actual -->
        <div>
          <label for="medicalConditions" class="block text-xs font-semibold text-zinc-300 mb-2">Condiciones Médicas / Medicación Actual</label>
          <textarea id="medicalConditions" rows="3" maxlength="1000" placeholder="Ej. Asma, Diabetes tipo 1, Tomo anticoagulantes..." class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-y">${escapeHtml(state.medicalConditions)}</textarea>
        </div>

        <hr class="border-zinc-800 my-6" />

        <!-- Section: Contactos de Emergencia -->
        <div class="space-y-4">
          <h2 class="text-base font-bold text-white">Contactos de Emergencia</h2>

          <!-- Contacto Principal -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div class="sm:col-span-5">
              <label for="emergencyContactName" class="block text-xs font-semibold text-zinc-300 mb-2">Nombre del Contacto Principal</label>
              <input id="emergencyContactName" type="text" required maxlength="100" value="${escapeHtml(state.emergencyContactName)}" placeholder="Ej. María González" class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
            </div>

            <div class="sm:col-span-3">
              <label for="emergencyContactRelation" class="block text-xs font-semibold text-zinc-300 mb-2">Parentesco</label>
              <input id="emergencyContactRelation" type="text" required maxlength="50" value="${escapeHtml(state.emergencyContactRelation)}" placeholder="Ej. Esposa, Madre..." class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
            </div>

            <div class="sm:col-span-4">
              <label for="emergencyContactPhone" class="block text-xs font-semibold text-zinc-300 mb-2">Teléfono Principal</label>
              <input id="emergencyContactPhone" type="tel" required maxlength="30" value="${escapeHtml(state.emergencyContactPhone)}" placeholder="+52 55 1234 5678" class="w-full px-4 py-2.5 text-sm font-mono tabular-nums text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <!-- Segundo Contacto de Emergencia -->
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
            <div class="sm:col-span-5">
              <label for="secondaryContactName" class="block text-xs font-semibold text-zinc-300 mb-2">Nombre del Segundo Contacto (Opcional)</label>
              <input id="secondaryContactName" type="text" maxlength="100" value="${escapeHtml(state.secondaryContactName)}" placeholder="Ej. Carlos Rojas" class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
            </div>

            <div class="sm:col-span-3">
              <label for="secondaryContactRelation" class="block text-xs font-semibold text-zinc-300 mb-2">Parentesco (Opcional)</label>
              <input id="secondaryContactRelation" type="text" maxlength="50" value="${escapeHtml(state.secondaryContactRelation)}" placeholder="Ej. Hermano, Padre..." class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
            </div>

            <div class="sm:col-span-4">
              <label for="secondaryContactPhone" class="block text-xs font-semibold text-zinc-300 mb-2">Teléfono del Segundo Contacto (Opcional)</label>
              <input id="secondaryContactPhone" type="tel" maxlength="30" value="${escapeHtml(state.secondaryContactPhone)}" placeholder="+52 55 8765 4321" class="w-full px-4 py-2.5 text-sm font-mono tabular-nums text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        </div>

        <!-- Optional Extended Identification Parameters -->
        <div class="pt-2">
          <button type="button" id="toggle-advanced-btn" class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer">
            <span>${state.showAdvancedFields ? '▲' : '▼'} Datos de motocicleta, póliza de seguro médico y donación de órganos (Opcional)</span>
          </button>

          ${
            state.showAdvancedFields
              ? `
            <div class="mt-4 p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Motocicleta / Casco / Placa</label>
                  <input id="motorcycleDetails" type="text" maxlength="150" value="${escapeHtml(state.motorcycleDetails)}" placeholder="Ej. Yamaha MT-07 · Casco AGV Negro" class="w-full px-3.5 py-2 text-xs text-white bg-[#14161A] border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500" />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Seguro Médico / Póliza / NSS</label>
                  <input id="insuranceDetails" type="text" maxlength="150" value="${escapeHtml(state.insuranceDetails)}" placeholder="Ej. IMSS / GNP Póliza #88412" class="w-full px-3.5 py-2 text-xs text-white bg-[#14161A] border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <label class="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 cursor-pointer">
                <input id="organDonor" type="checkbox" ${state.organDonor ? 'checked' : ''} class="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500" />
                <span>Soy donador de órganos voluntario</span>
              </label>
            </div>
          `
              : ''
          }
        </div>

        <!-- Primary Action Button -->
        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button type="submit" ${state.submitting ? 'disabled' : ''} class="w-full sm:w-auto px-9 py-3.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer">
            ${
              state.submitting
                ? 'Guardando tu perfil...'
                : state.userSticker
                ? 'Guardar Cambios y Continuar al Sticker NFC'
                : 'Generar Registro y Comprar Sticker NFC'
            }
          </button>
        </div>
      </form>
    </div>
  `;
}

// ============================================================================
// 5. Internal Admin Login & Admin Panel Views ("Personal autorizado")
// ============================================================================
function renderAdminLoginView() {
  const isCurrentUserAdmin = isAuthorizedAdminUser(state.user);

  return `
    <div class="max-w-md mx-auto my-8 bg-[#14161A] border border-zinc-800 rounded-2xl p-8 space-y-6">
      <div class="space-y-1.5">
        <div class="text-xs font-bold text-orange-500 tracking-wide">
          ACCESO RESTRINGIDO · PERSONAL AUTORIZADO
        </div>
        <h1 class="text-2xl font-bold text-white">
          Administración Interna Biker Safe
        </h1>
        <p class="text-xs text-zinc-400 leading-relaxed">
          El acceso administrativo requiere verificación exclusiva con el correo personal autorizado de Google.
        </p>
      </div>

      ${
        state.user
          ? isCurrentUserAdmin
            ? `
          <div class="p-3.5 bg-[#0B0C0E] border border-orange-500/50 rounded-xl text-xs text-zinc-200">
            Sesión de Google verificada como administrador: <strong class="text-orange-400 font-mono">${escapeHtml(state.user.email)}</strong>
          </div>
        `
            : `
          <div class="p-3.5 bg-red-950/40 border border-red-800/70 rounded-xl text-xs text-red-200">
            La cuenta activa (<strong class="font-mono">${escapeHtml(state.user.email)}</strong>) no tiene permisos de administrador. Debes verificar con el correo autorizado.
          </div>
        `
          : ''
      }

      ${
        state.adminLoginError
          ? `
        <div class="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
          ${escapeHtml(state.adminLoginError)}
        </div>
      `
          : ''
      }

      <div class="space-y-3">
        <button
          type="button"
          id="admin-google-verify-btn"
          class="w-full py-3 px-5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
        >
          ${
            isCurrentUserAdmin
              ? 'Entrar con mi Correo Autorizado Verificado'
              : 'Verificar con Cuenta de Google Autorizada'
          }
        </button>
      </div>

      <form id="admin-login-form" class="space-y-4 pt-3 border-t border-zinc-800">
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
            Correo Autorizado
          </label>
          <input
            type="text"
            id="admin-username-input"
            required
            value="${escapeHtml(state.adminUsernameInput)}"
            placeholder="Correo autorizado"
            class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
            Contraseña de Administración Interna
          </label>
          <input
            type="password"
            id="admin-password-input"
            required
            value="${escapeHtml(state.adminPasswordInput)}"
            placeholder="••••••••••••"
            class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        <button
          type="submit"
          class="w-full py-2.5 px-5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Validar Credenciales y Correo de Google
        </button>
      </form>

      <div class="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
        <button type="button" id="admin-back-main-btn" class="text-zinc-400 hover:text-white cursor-pointer">
          ← Volver a Pantalla Principal
        </button>
      </div>
    </div>
  `;
}

function renderAdminPanelView() {
  const q = state.adminSearchQuery.trim().toLowerCase();
  const filteredStickers = state.adminAllStickers.filter((s) => {
    if (!q) return true;
    return (
      String(s.fullName || '').toLowerCase().includes(q) ||
      String(s.tagId || '').toLowerCase().includes(q) ||
      String(s.bloodType || '').toLowerCase().includes(q) ||
      String(s.emergencyContactName || '').toLowerCase().includes(q)
    );
  });

  const oq = state.adminOrderSearchQuery.trim().toLowerCase();
  const filteredOrders = state.adminAllOrders.filter((ord) => {
    if (!oq) return true;
    return (
      String(ord.orderId || '').toLowerCase().includes(oq) ||
      String(ord.riderName || '').toLowerCase().includes(oq) ||
      String(ord.recipientName || '').toLowerCase().includes(oq) ||
      String(ord.recipientPhone || '').toLowerCase().includes(oq) ||
      String(ord.tagId || '').toLowerCase().includes(oq) ||
      String(ord.shippingCityState || '').toLowerCase().includes(oq)
    );
  });

  return `
    <div class="space-y-8">
      <!-- Admin Top Header -->
      <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-orange-500 mb-1">
            <span>PANEL INTERNO · PERSONAL AUTORIZADO</span>
            <span aria-hidden="true">·</span>
            <span class="font-mono tabular-nums">${state.adminAllOrders.length} pedidos</span>
            <span aria-hidden="true">·</span>
            <span class="font-mono tabular-nums">${state.adminAllStickers.length} registros</span>
          </div>
          <h1 class="text-2xl font-bold text-white">
            Administración de Pedidos, Registros NFC y Cobro SPEI
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="admin-tab-orders-btn"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              state.adminTab === 'orders'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }"
          >
            1. Pedidos Recibidos (${state.adminAllOrders.length})
          </button>

          <button
            type="button"
            id="admin-tab-records-btn"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              state.adminTab === 'records'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }"
          >
            2. Registros y URLs NFC (${state.adminAllStickers.length})
          </button>

          <button
            type="button"
            id="admin-tab-packages-btn"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              state.adminTab === 'packages'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }"
          >
            3. Combos y Datos SPEI / WhatsApp
          </button>

          <button
            type="button"
            id="admin-exit-btn"
            class="px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
          >
            Salir
          </button>
        </div>
      </div>

      ${
        state.adminTab === 'orders'
          ? `
        <!-- Section Orders: Customer Orders Management -->
        <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 class="text-lg font-bold text-white">
                Pedidos de Stickers NFC y Confirmaciones SPEI / WhatsApp
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">
                Revisa los colores elegidos por cada cliente, su dirección de envío, copia su URL NFC para programar el tag y actualiza el estatus del pedido.
              </p>
            </div>

            <input
              type="text"
              id="admin-order-search-input"
              value="${escapeHtml(state.adminOrderSearchQuery)}"
              placeholder="Buscar por folio, cliente, tag o ciudad..."
              class="w-full sm:w-80 px-4 py-2 text-xs bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          ${
            state.adminNfcMessage
              ? `
            <div class="p-3.5 bg-zinc-900 border border-orange-500/70 rounded-xl text-xs text-orange-400">
              ${escapeHtml(state.adminNfcMessage)}
            </div>
          `
              : ''
          }

          ${
            filteredOrders.length === 0
              ? `
            <div class="py-12 text-center text-sm text-zinc-400">
              Aún no hay pedidos registrados con ese criterio. Cuando un cliente confirme su compra en el Paso 2 aparecerá aquí.
            </div>
          `
              : `
            <div class="space-y-4">
              ${filteredOrders
                .map((ord) => {
                  const linkedSticker = state.adminAllStickers.find((s) => s.tagId === ord.tagId);
                  const nfcUrl = linkedSticker ? buildUniqueStickerUrl(linkedSticker) : '';
                  const isCopied = state.adminCopiedTagId === `ord-${ord.orderId}`;
                  const customerCleanPhone = String(ord.recipientPhone || '').replace(/[^0-9]/g, '');
                  return `
                  <div class="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div class="flex items-center gap-3 flex-wrap">
                        <span class="px-2.5 py-1 bg-orange-500 text-black text-xs font-bold font-mono tabular-nums rounded">
                          #${escapeHtml(String(ord.orderId || '').toUpperCase())}
                        </span>
                        <h3 class="text-base font-bold text-white">
                          ${escapeHtml(ord.pkgName)} · <span class="text-orange-400 font-mono">$${ord.totalPrice} MXN</span>
                        </h3>
                        <span class="text-xs font-mono text-zinc-400">
                          Tag NFC: ${escapeHtml(ord.tagId)} (${escapeHtml(ord.riderName)})
                        </span>
                      </div>

                      <div class="flex items-center gap-2 flex-wrap">
                        <label class="text-[11px] text-zinc-400">Estatus:</label>
                        <select
                          data-order-status-id="${escapeHtml(ord.orderId)}"
                          ${state.adminUpdatingOrderId === ord.orderId ? 'disabled' : ''}
                          class="admin-order-status-select px-3 py-1.5 text-xs font-bold bg-[#14161A] border border-orange-500/60 rounded-lg text-orange-400 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          ${ORDER_STATUSES.map(
                            (st) => `
                            <option value="${st}" ${ord.status === st ? 'selected' : ''}>
                              ${escapeHtml(ORDER_STATUS_LABELS[st])}
                            </option>
                          `
                          ).join('')}
                        </select>

                        ${
                          customerCleanPhone
                            ? `
                          <a
                            href="https://wa.me/${escapeHtml(customerCleanPhone)}?text=${encodeURIComponent(
                              `Hola ${ord.recipientName}, te escribimos de Biker Safe respecto a tu pedido #${String(ord.orderId).toUpperCase()} (${ord.pkgName}) para acordar tu ${
                                isPersonalDeliveryOrder(ord)
                                  ? 'entrega personal en CDMX / Estado de México'
                                  : 'envío por paquetería'
                              }.`
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Acordar Entrega por WhatsApp
                          </a>
                        `
                            : ''
                        }

                        ${
                          state.adminConfirmDeleteOrderId === ord.orderId
                            ? `
                          <button
                            type="button"
                            data-confirm-delete-order="${escapeHtml(ord.orderId)}"
                            ${state.adminDeletingOrderId === ord.orderId ? 'disabled' : ''}
                            class="admin-confirm-delete-order-btn px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            ${state.adminDeletingOrderId === ord.orderId ? 'Borrando...' : 'Confirmar Borrado'}
                          </button>
                          <button
                            type="button"
                            data-cancel-delete-order="${escapeHtml(ord.orderId)}"
                            class="admin-cancel-delete-order-btn px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        `
                            : `
                          <button
                            type="button"
                            data-ask-delete-order="${escapeHtml(ord.orderId)}"
                            class="admin-ask-delete-order-btn px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 border border-red-800/70 text-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Borrar Pedido
                          </button>
                        `
                        }
                      </div>
                    </div>

                    <!-- Selected Colors and Shipping Details -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs text-zinc-300">
                      <div class="md:col-span-5 space-y-2">
                        <span class="text-zinc-500 block">
                          Colores Solicitados (${ord.stickerCount} ${ord.stickerCount === 1 ? 'sticker' : 'stickers'}):
                        </span>
                        <div class="flex flex-wrap gap-1.5">
                          ${(ord.selectedColors || [])
                            .map(
                              (colorName, i) => `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#14161A] border border-zinc-800 text-[11px] text-white font-semibold">
                              <span class="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0" style="background-color: ${STICKER_COLOR_SWATCHES[colorName] || '#f97316'}"></span>
                              <span>Sticker #${i + 1}: ${escapeHtml(colorName)}</span>
                            </span>
                          `
                            )
                            .join('')}
                        </div>
                      </div>

                      <div class="md:col-span-7 space-y-1">
                        <span class="text-zinc-500 block">
                          Modalidad de Entrega:
                          <strong class="text-orange-400">
                            ${
                              isPersonalDeliveryOrder(ord)
                                ? 'Entrega Personal (Solo Edo. de México y CDMX · Acordar vía WhatsApp)'
                                : 'Envío por Paquetería a toda la República (Acordar vía WhatsApp)'
                            }
                          </strong>
                        </span>
                        <div>
                          <strong class="text-white">Recibe:</strong> ${escapeHtml(ord.recipientName)} · <strong class="text-white">Tel / WhatsApp:</strong> <span class="font-mono tabular-nums text-orange-300">${escapeHtml(ord.recipientPhone)}</span>
                        </div>
                        ${
                          isPersonalDeliveryOrder(ord)
                            ? `
                          <div>
                            <strong class="text-white">Zona / Alcaldía o Municipio (CDMX / EdoMéx):</strong> ${escapeHtml(ord.shippingCityState)}
                          </div>
                          ${
                            ord.shippingNotes
                              ? `<div><strong class="text-white">Punto / Horario sugerido:</strong> ${escapeHtml(ord.shippingNotes)}</div>`
                              : ''
                          }
                        `
                            : `
                          <div>
                            <strong class="text-white">Dirección de Paquetería:</strong> ${escapeHtml(ord.shippingStreet)}, Col. ${escapeHtml(ord.shippingColony)}, C.P. <span class="font-mono">${escapeHtml(ord.shippingPostalCode)}</span>, ${escapeHtml(ord.shippingCityState)}
                          </div>
                          ${
                            ord.shippingNotes
                              ? `<div><strong class="text-white">Referencias:</strong> ${escapeHtml(ord.shippingNotes)}</div>`
                              : ''
                          }
                        `
                        }
                      </div>
                    </div>

                    ${
                      nfcUrl
                        ? `
                      <div class="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div class="text-[11px] font-mono text-zinc-400 truncate">
                          <strong class="text-orange-400 font-sans">URL NFC para grabar este pedido:</strong> ${escapeHtml(nfcUrl)}
                        </div>
                        <button
                          type="button"
                          data-copy-order-url="${escapeHtml(nfcUrl)}"
                          data-copy-order-id="${escapeHtml(ord.orderId)}"
                          class="admin-copy-order-url-btn px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                        >
                          ${isCopied ? '¡URL Copiada!' : 'Copiar URL NFC'}
                        </button>
                      </div>
                    `
                        : ''
                    }
                  </div>
                `;
                })
                .join('')}
            </div>
          `
          }
        </div>
      `
          : state.adminTab === 'packages'
          ? `
        <!-- Section B: Edit the 3 Purchase Options + SPEI / WhatsApp Payment Settings -->
        <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div class="border-b border-zinc-800 pb-4">
            <h2 class="text-xl font-bold text-white">
              Configuración de las 3 Opciones de Compra de Tags NFC
            </h2>
            <p class="text-xs text-zinc-400 mt-1">
              Modifica el título, subtítulo, precio, cantidad de stickers y colores disponibles de los 3 paquetes.
            </p>
          </div>

          ${
            state.adminPackagesSavedSuccess
              ? `
            <div class="p-4 bg-zinc-900 border border-orange-500 rounded-xl text-xs text-orange-400 font-semibold">
              ¡Las 3 opciones de compra se han actualizado correctamente y ya están visibles para los clientes!
            </div>
          `
              : ''
          }

          ${
            state.adminPackagesError
              ? `
            <div class="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
              ${escapeHtml(state.adminPackagesError)}
            </div>
          `
              : ''
          }

          <form id="admin-packages-form" class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              ${state.packages
                .map(
                  (pkg, idx) => `
                <div class="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div class="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <span class="text-xs font-bold text-orange-500">
                      OPCIÓN ${idx + 1} (${escapeHtml(pkg.pkgId.toUpperCase())})
                    </span>
                    <span class="text-xs font-mono text-zinc-500">#${idx + 1}</span>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1">
                      Nombre del Paquete
                    </label>
                    <input
                      type="text"
                      required
                      maxlength="80"
                      id="pkg-name-${idx}"
                      value="${escapeHtml(pkg.name)}"
                      class="w-full px-3.5 py-2 text-xs bg-[#14161A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1">
                      Subtítulo / Etiqueta
                    </label>
                    <input
                      type="text"
                      required
                      maxlength="80"
                      id="pkg-subtitle-${idx}"
                      value="${escapeHtml(pkg.subtitle)}"
                      class="w-full px-3.5 py-2 text-xs bg-[#14161A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-semibold text-zinc-300 mb-1">
                        Precio ($ MXN)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="100000"
                        id="pkg-price-${idx}"
                        value="${Number(pkg.price)}"
                        class="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-[#14161A] border border-zinc-800 rounded-lg text-orange-400 font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-zinc-300 mb-1">
                        Cantidad de Stickers
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="10"
                        id="pkg-count-${idx}"
                        value="${Number(pkg.stickerCount || 1)}"
                        class="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-[#14161A] border border-zinc-800 rounded-lg text-white font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Colores disponibles para elegir (${(pkg.availableColors || ALL_STICKER_COLORS).length})
                    </label>
                    <div class="flex flex-wrap gap-1.5">
                      ${ALL_STICKER_COLORS.map((colorName) => {
                        const enabled = (pkg.availableColors || ALL_STICKER_COLORS).includes(colorName);
                        const hex = STICKER_COLOR_SWATCHES[colorName] || '#f97316';
                        return `
                          <button
                            type="button"
                            data-pkg-idx="${idx}"
                            data-toggle-color="${escapeHtml(colorName)}"
                            class="admin-pkg-color-toggle inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                              enabled
                                ? 'bg-zinc-800 border-orange-500 text-white'
                                : 'bg-[#14161A] border-zinc-800/80 text-zinc-500 opacity-60 hover:opacity-100'
                            }"
                          >
                            <span class="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0" style="background-color: ${hex}"></span>
                            <span>${escapeHtml(colorName)}</span>
                          </button>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-zinc-300 mb-1">
                      Especificaciones / Descripción
                    </label>
                    <textarea
                      rows="3"
                      required
                      maxlength="250"
                      id="pkg-specs-${idx}"
                      class="w-full px-3.5 py-2 text-xs bg-[#14161A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-y"
                    >${escapeHtml(pkg.specs)}</textarea>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                ${state.adminSavingPackages ? 'disabled' : ''}
                class="px-7 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                ${
                  state.adminSavingPackages
                    ? 'Guardando Opciones...'
                    : 'Guardar Cambios en las 3 Opciones de Compra'
                }
              </button>
            </div>
          </form>
        </div>

        <!-- Section C: SPEI Bank Transfer & WhatsApp Payment Configuration -->
        <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div class="border-b border-zinc-800 pb-4">
            <h2 class="text-xl font-bold text-white">
              Configuración de Cobro (Opción B: Transferencia SPEI + WhatsApp)
            </h2>
            <p class="text-xs text-zinc-400 mt-1">
              Configura tu cuenta bancaria CLABE y el número de WhatsApp al que los clientes enviarán su pedido y comprobante de transferencia.
            </p>
          </div>

          ${
            state.adminPaymentSavedSuccess
              ? `
            <div class="p-4 bg-zinc-900 border border-orange-500 rounded-xl text-xs text-orange-400 font-semibold">
              ¡Los datos de cobro SPEI y WhatsApp se han guardado correctamente!
            </div>
          `
              : ''
          }

          ${
            state.adminPaymentError
              ? `
            <div class="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
              ${escapeHtml(state.adminPaymentError)}
            </div>
          `
              : ''
          }

          <form id="admin-payment-settings-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Banco Receptor (SPEI)
                </label>
                <input
                  type="text"
                  id="pay-bank-name"
                  required
                  maxlength="80"
                  value="${escapeHtml(state.paymentSettings.bankName)}"
                  placeholder="Ej. BBVA México / STP / Nu"
                  class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nombre del Beneficiario
                </label>
                <input
                  type="text"
                  id="pay-beneficiary-name"
                  required
                  maxlength="120"
                  value="${escapeHtml(state.paymentSettings.beneficiaryName)}"
                  placeholder="Ej. Rodrigo Gamiño / Biker Safe"
                  class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                  CLABE Interbancaria (18 dígitos)
                </label>
                <input
                  type="text"
                  id="pay-clabe"
                  required
                  minlength="10"
                  maxlength="24"
                  value="${escapeHtml(state.paymentSettings.clabe)}"
                  placeholder="012180001234567890"
                  class="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-orange-400 font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Número de Tarjeta o Cuenta (Opcional)
                </label>
                <input
                  type="text"
                  id="pay-account-card"
                  maxlength="30"
                  value="${escapeHtml(state.paymentSettings.accountOrCard)}"
                  placeholder="Ej. 4152 3138 0000 0000"
                  class="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                  WhatsApp para recibir Comprobantes (con lada, ej. 521...)
                </label>
                <input
                  type="text"
                  id="pay-whatsapp-number"
                  required
                  maxlength="25"
                  value="${escapeHtml(state.paymentSettings.whatsappNumber)}"
                  placeholder="Ej. 5215512345678"
                  class="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
                Instrucciones de Pago para el Cliente
              </label>
              <textarea
                id="pay-instructions"
                rows="2"
                maxlength="350"
                class="w-full px-4 py-2.5 text-xs bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-y"
              >${escapeHtml(state.paymentSettings.paymentInstructions)}</textarea>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                ${state.adminSavingPayment ? 'disabled' : ''}
                class="px-7 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                ${
                  state.adminSavingPayment
                    ? 'Guardando Datos de Cobro...'
                    : 'Guardar Configuración SPEI y WhatsApp'
                }
              </button>
            </div>
          </form>
        </div>
      `
          : `
        <!-- Section A: All Registered Records & NFC Tag Configuration URLs -->
        <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 class="text-lg font-bold text-white">
                Directorio de Registros y URLs para Programación de Tags NFC
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">
                Copia la URL única de cada cliente o grábala directamente en el sticker NFC físico antes de enviarlo.
              </p>
            </div>

            <input
              type="text"
              id="admin-search-input"
              value="${escapeHtml(state.adminSearchQuery)}"
              placeholder="Buscar por nombre, ID de tag o tipo de sangre..."
              class="w-full sm:w-80 px-4 py-2 text-xs bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          ${
            state.adminNfcMessage
              ? `
            <div class="p-3.5 bg-zinc-900 border border-orange-500/70 rounded-xl text-xs text-orange-400">
              ${escapeHtml(state.adminNfcMessage)}
            </div>
          `
              : ''
          }

          ${
            filteredStickers.length === 0
              ? `
            <div class="py-12 text-center text-sm text-zinc-400">
              No se encontraron registros de stickers NFC en la base de datos.
            </div>
          `
              : `
            <div class="space-y-4">
              ${filteredStickers
                .map((s) => {
                  const nfcUrl = buildUniqueStickerUrl(s);
                  const isCopied = state.adminCopiedTagId === s.tagId;
                  return `
                  <div class="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div class="flex items-center gap-3 flex-wrap">
                        <span class="px-2.5 py-1 bg-orange-500 text-black text-xs font-bold font-mono tabular-nums rounded">
                          ${escapeHtml(s.bloodType)}
                        </span>
                        <h3 class="text-base font-bold text-white">
                          ${escapeHtml(s.fullName)}
                        </h3>
                        <span class="text-xs font-mono tabular-nums text-orange-400">
                          ID: ${escapeHtml(s.tagId)}
                        </span>
                      </div>

                      <div class="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          data-preview-tag="${escapeHtml(s.tagId)}"
                          class="admin-preview-landing-btn px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Ver Landing Page
                        </button>
                        <button
                          type="button"
                          data-write-tag="${escapeHtml(s.tagId)}"
                          class="admin-write-nfc-btn px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Grabar en Tag NFC Físico
                        </button>
                        ${
                          state.adminConfirmDeleteTagId === s.tagId
                            ? `
                          <button
                            type="button"
                            data-confirm-delete-tag="${escapeHtml(s.tagId)}"
                            ${state.adminDeletingTagId === s.tagId ? 'disabled' : ''}
                            class="admin-confirm-delete-btn px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            ${state.adminDeletingTagId === s.tagId ? 'Borrando...' : 'Confirmar Borrado'}
                          </button>
                          <button
                            type="button"
                            data-cancel-delete-tag="${escapeHtml(s.tagId)}"
                            class="admin-cancel-delete-btn px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        `
                            : `
                          <button
                            type="button"
                            data-ask-delete-tag="${escapeHtml(s.tagId)}"
                            class="admin-ask-delete-btn px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 border border-red-800/70 text-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Borrar Registro
                          </button>
                        `
                        }
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
                      <div>
                        <span class="text-zinc-500 block">Alergias / Condiciones:</span>
                        <strong>${escapeHtml(s.allergies || 'Ninguna')}</strong> · ${escapeHtml(s.medicalConditions || 'Ninguna')}
                      </div>
                      <div>
                        <span class="text-zinc-500 block">Contacto Principal (1):</span>
                        <strong>${escapeHtml(s.emergencyContactName)}</strong>${s.emergencyContactRelation ? ` · ${escapeHtml(s.emergencyContactRelation)}` : ''} (<span class="font-mono tabular-nums">${escapeHtml(s.emergencyContactPhone)}</span>)
                      </div>
                      <div>
                        <span class="text-zinc-500 block">Segundo Contacto (2):</span>
                        ${
                          s.secondaryContactName || s.secondaryContactPhone
                            ? `<strong>${escapeHtml(s.secondaryContactName || 'Contacto 2')}</strong>${s.secondaryContactRelation ? ` · ${escapeHtml(s.secondaryContactRelation)}` : ''} (<span class="font-mono tabular-nums">${escapeHtml(s.secondaryContactPhone || '-')}</span>)`
                            : '<span class="text-zinc-500">No registrado</span>'
                        }
                      </div>
                    </div>

                    <!-- Admin NFC URL Configuration Bar -->
                    <div class="pt-2 border-t border-zinc-800/80 space-y-1.5">
                      <label class="block text-[11px] font-bold text-orange-400">
                        URL ÚNICA PARA CONFIGURACIÓN DEL TAG NFC DE ESTA PERSONA:
                      </label>
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          readonly
                          value="${escapeHtml(nfcUrl)}"
                          class="w-full px-3 py-2 text-xs font-mono bg-[#14161A] border border-zinc-800 rounded-lg text-zinc-200 select-all"
                        />
                        <button
                          type="button"
                          data-copy-tag="${escapeHtml(s.tagId)}"
                          class="admin-copy-url-btn px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                        >
                          ${isCopied ? '¡URL Copiada!' : 'Copiar URL NFC'}
                        </button>
                      </div>
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>
          `
          }
        </div>
      `
      }
    </div>
  `;
}

function syncFormInputsBeforeReRender() {
  const fullNameEl = document.getElementById('fullName');
  if (fullNameEl) state.fullName = fullNameEl.value;
  const bloodTypeEl = document.getElementById('bloodType');
  if (bloodTypeEl) state.bloodType = bloodTypeEl.value;
  const allergiesEl = document.getElementById('allergies');
  if (allergiesEl) state.allergies = allergiesEl.value;
  const medicalConditionsEl = document.getElementById('medicalConditions');
  if (medicalConditionsEl) state.medicalConditions = medicalConditionsEl.value;
  const emergencyContactNameEl = document.getElementById('emergencyContactName');
  if (emergencyContactNameEl) state.emergencyContactName = emergencyContactNameEl.value;
  const emergencyContactRelationEl = document.getElementById('emergencyContactRelation');
  if (emergencyContactRelationEl) state.emergencyContactRelation = emergencyContactRelationEl.value;
  const emergencyContactPhoneEl = document.getElementById('emergencyContactPhone');
  if (emergencyContactPhoneEl) state.emergencyContactPhone = emergencyContactPhoneEl.value;
  const secondaryContactNameEl = document.getElementById('secondaryContactName');
  if (secondaryContactNameEl) state.secondaryContactName = secondaryContactNameEl.value;
  const secondaryContactRelationEl = document.getElementById('secondaryContactRelation');
  if (secondaryContactRelationEl) state.secondaryContactRelation = secondaryContactRelationEl.value;
  const secondaryContactPhoneEl = document.getElementById('secondaryContactPhone');
  if (secondaryContactPhoneEl) state.secondaryContactPhone = secondaryContactPhoneEl.value;
  const motorcycleDetailsEl = document.getElementById('motorcycleDetails');
  if (motorcycleDetailsEl) state.motorcycleDetails = motorcycleDetailsEl.value;
  const insuranceDetailsEl = document.getElementById('insuranceDetails');
  if (insuranceDetailsEl) state.insuranceDetails = insuranceDetailsEl.value;
  const organDonorEl = document.getElementById('organDonor');
  if (organDonorEl) state.organDonor = organDonorEl.checked;

  const recNameEl = document.getElementById('recipient-name-input');
  if (recNameEl) state.recipientName = recNameEl.value;
  const recPhoneEl = document.getElementById('recipient-phone-input');
  if (recPhoneEl) state.recipientPhone = recPhoneEl.value;
  const streetEl = document.getElementById('shipping-street-input');
  if (streetEl) state.shippingStreet = streetEl.value;
  const colEl = document.getElementById('shipping-colony-input');
  if (colEl) state.shippingColony = colEl.value;
  const cityEl = document.getElementById('shipping-city-input');
  if (cityEl) state.shippingCityState = cityEl.value;
  const zipEl = document.getElementById('shipping-zip-input');
  if (zipEl) state.shippingPostalCode = zipEl.value;
  const notesEl = document.getElementById('shipping-notes-input');
  if (notesEl) state.shippingNotes = notesEl.value;

  const adminUserEl = document.getElementById('admin-username-input');
  if (adminUserEl) state.adminUsernameInput = adminUserEl.value;
  const adminPassEl = document.getElementById('admin-password-input');
  if (adminPassEl) state.adminPasswordInput = adminPassEl.value;
  const adminSearchEl = document.getElementById('admin-search-input');
  if (adminSearchEl) state.adminSearchQuery = adminSearchEl.value;
  const adminOrdSearchEl = document.getElementById('admin-order-search-input');
  if (adminOrdSearchEl) state.adminOrderSearchQuery = adminOrdSearchEl.value;

  const payBankEl = document.getElementById('pay-bank-name');
  if (payBankEl) state.paymentSettings.bankName = payBankEl.value;
  const payBenEl = document.getElementById('pay-beneficiary-name');
  if (payBenEl) state.paymentSettings.beneficiaryName = payBenEl.value;
  const payClabeEl = document.getElementById('pay-clabe');
  if (payClabeEl) state.paymentSettings.clabe = payClabeEl.value;
  const payAccEl = document.getElementById('pay-account-card');
  if (payAccEl) state.paymentSettings.accountOrCard = payAccEl.value;
  const payWaEl = document.getElementById('pay-whatsapp-number');
  if (payWaEl) state.paymentSettings.whatsappNumber = payWaEl.value;
  const payInstEl = document.getElementById('pay-instructions');
  if (payInstEl) state.paymentSettings.paymentInstructions = payInstEl.value;

  state.packages = state.packages.map((pkg, idx) => {
    const nameEl = document.getElementById(`pkg-name-${idx}`);
    const subEl = document.getElementById(`pkg-subtitle-${idx}`);
    const priceEl = document.getElementById(`pkg-price-${idx}`);
    const countEl = document.getElementById(`pkg-count-${idx}`);
    const specsEl = document.getElementById(`pkg-specs-${idx}`);
    return {
      ...pkg,
      name: nameEl ? nameEl.value : pkg.name,
      subtitle: subEl ? subEl.value : pkg.subtitle,
      price: priceEl ? Number(priceEl.value) || pkg.price : pkg.price,
      stickerCount: countEl
        ? Math.max(1, Math.min(10, Math.round(Number(countEl.value) || pkg.stickerCount || 1)))
        : pkg.stickerCount || 1,
      specs: specsEl ? specsEl.value : pkg.specs,
    };
  });
}

export function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;

  let mainContentHtml = '';
  if (state.viewMode === 'public_landing') {
    mainContentHtml = renderPublicLandingView();
  } else if (state.viewMode === 'admin_login') {
    mainContentHtml = renderAdminLoginView();
  } else if (state.viewMode === 'admin_panel') {
    mainContentHtml = renderAdminPanelView();
  } else {
    mainContentHtml = `
      <div class="space-y-8">
        <!-- Step Progress Bar inside Pantalla Principal (No URL shown to customer) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14161A] border border-zinc-800 rounded-xl p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" id="step-profile-btn" class="px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              state.mainStep === 'profile_form'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
            }">
              1. Mis Datos Médicos (Perfil Seguro)
            </button>

            <button type="button" id="step-checkout-btn" ${!state.userSticker ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              !state.userSticker
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                : state.mainStep === 'sticker_checkout'
                ? 'bg-orange-500 text-black cursor-pointer'
                : 'bg-zinc-800/80 text-zinc-300 hover:text-white cursor-pointer'
            }">
              2. Compra de Sticker NFC Personalizado
            </button>
          </div>

          ${
            state.userSticker
              ? `
            <button type="button" id="step-open-landing-btn" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-bold rounded-lg transition-colors cursor-pointer self-start sm:self-auto">
              Ver mi Información (Landing Page)
            </button>
          `
              : ''
          }
        </div>

        ${
          state.mainStep === 'sticker_checkout' && state.userSticker
            ? renderStickerCheckoutStep()
            : renderProfileFormStep()
        }
      </div>
    `;
  }

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#0B0C0E] text-zinc-100">
      ${renderHeader()}

      <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        ${mainContentHtml}
      </main>

      <!-- Footer with requested slogan "Stickers de emergencia NFC" and "Personal autorizado" link -->
      <footer class="border-t border-zinc-800/80 bg-[#08090B] py-5 px-4 sm:px-8 mt-auto">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <span class="font-semibold text-zinc-300">Stickers de emergencia NFC</span>
          <div class="flex items-center gap-4">
            <button type="button" id="footer-main-btn" class="text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer">
              Pantalla Principal
            </button>
            <span aria-hidden="true" class="text-zinc-700">·</span>
            <button type="button" id="footer-admin-btn" class="text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer">
              Personal autorizado
            </button>
          </div>
        </div>
      </footer>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  const navBrand = document.getElementById('nav-brand-link');
  if (navBrand) {
    navBrand.addEventListener('click', (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      state.viewMode = 'main';
      state.mainStep = 'profile_form';
      renderApp();
    });
  }

  const navMainBtn = document.getElementById('nav-main-btn');
  if (navMainBtn) {
    navMainBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.viewMode = 'main';
      renderApp();
    });
  }

  const footerMainBtn = document.getElementById('footer-main-btn');
  if (footerMainBtn) {
    footerMainBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.viewMode = 'main';
      state.mainStep = 'profile_form';
      renderApp();
    });
  }

  const footerAdminBtn = document.getElementById('footer-admin-btn');
  if (footerAdminBtn) {
    footerAdminBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      if (state.adminAuthenticated) {
        state.viewMode = 'admin_panel';
        subscribeToAllStickersForAdmin();
      } else {
        state.adminLoginError = null;
        state.viewMode = 'admin_login';
      }
      renderApp();
    });
  }

  const signInBtn = document.getElementById('auth-signin-btn');
  if (signInBtn) signInBtn.addEventListener('click', handleGoogleSignIn);

  const formSignInBtn = document.getElementById('form-signin-btn');
  if (formSignInBtn) formSignInBtn.addEventListener('click', handleGoogleSignIn);

  const signOutBtn = document.getElementById('auth-signout-btn');
  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);

  const stepProfileBtn = document.getElementById('step-profile-btn');
  if (stepProfileBtn) {
    stepProfileBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.mainStep = 'profile_form';
      renderApp();
    });
  }

  const stepCheckoutBtn = document.getElementById('step-checkout-btn');
  if (stepCheckoutBtn) {
    stepCheckoutBtn.addEventListener('click', () => {
      if (!state.userSticker) return;
      syncFormInputsBeforeReRender();
      state.mainStep = 'sticker_checkout';
      renderApp();
    });
  }

  const stepOpenLandingBtn = document.getElementById('step-open-landing-btn');
  if (stepOpenLandingBtn) {
    stepOpenLandingBtn.addEventListener('click', () => {
      if (!state.userSticker) return;
      syncFormInputsBeforeReRender();
      state.landingSticker = state.userSticker;
      state.landingTagId = state.userSticker.tagId;
      state.viewMode = 'public_landing';
      renderApp();
    });
  }

  const loadSampleBtn = document.getElementById('load-sample-btn');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      state.fullName = 'Miguel Ángel Rojas';
      state.bloodType = 'O+';
      state.allergies = 'Penicilina, Látex';
      state.medicalConditions = 'Asma controlada, Tomo salbutamol en inhalador';
      state.emergencyContactName = 'María González';
      state.emergencyContactRelation = 'Esposa';
      state.emergencyContactPhone = '+52 55 1234 5678';
      state.secondaryContactName = 'Carlos Rojas';
      state.secondaryContactRelation = 'Hermano';
      state.secondaryContactPhone = '+52 55 8765 4321';
      state.motorcycleDetails = 'Yamaha MT-07 Gris · Casco AGV K6';
      state.insuranceDetails = 'GNP Seguros Póliza #MX-994120';
      state.organDonor = true;
      state.formError = null;
      renderApp();
    });
  }

  const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
  if (toggleAdvancedBtn) {
    toggleAdvancedBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.showAdvancedFields = !state.showAdvancedFields;
      renderApp();
    });
  }

  const profileForm = document.getElementById('profile-medical-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      state.formError = null;
      state.saveSuccessBanner = false;

      let activeUser = state.user;
      if (!activeUser) {
        try {
          const res = await signInWithPopup(auth, googleProvider);
          await syncUserPrivateProfile(res.user);
          activeUser = res.user;
          state.user = activeUser;
        } catch {
          state.formError =
            'Inicia sesión con tu cuenta segura para guardar tu perfil médico y continuar a la compra de tu Sticker NFC.';
          renderApp();
          return;
        }
      }

      const isUpdatingExisting = Boolean(state.currentTagId && state.userSticker);
      const targetTagId = state.currentTagId || generateUniqueTagId();

      const validation = sanitizeAndValidateStickerInput({
        tagId: targetTagId,
        ownerId: activeUser.uid,
        fullName: state.fullName,
        bloodType: state.bloodType,
        allergies: state.allergies,
        medicalConditions: state.medicalConditions,
        emergencyContactName: state.emergencyContactName,
        emergencyContactRelation: state.emergencyContactRelation,
        emergencyContactPhone: state.emergencyContactPhone,
        secondaryContactName: state.secondaryContactName,
        secondaryContactRelation: state.secondaryContactRelation,
        secondaryContactPhone: state.secondaryContactPhone,
        motorcycleDetails: state.motorcycleDetails,
        insuranceDetails: state.insuranceDetails,
        organDonor: state.organDonor,
      });

      if (!validation.valid) {
        state.formError = validation.error;
        renderApp();
        return;
      }

      state.submitting = true;
      renderApp();

      const docPath = `stickers/${targetTagId}`;
      try {
        if (isUpdatingExisting) {
          await updateDoc(doc(db, 'stickers', targetTagId), {
            fullName: validation.data.fullName,
            bloodType: validation.data.bloodType,
            allergies: validation.data.allergies,
            medicalConditions: validation.data.medicalConditions,
            emergencyContactName: validation.data.emergencyContactName,
            emergencyContactRelation: validation.data.emergencyContactRelation,
            emergencyContactPhone: validation.data.emergencyContactPhone,
            secondaryContactName: validation.data.secondaryContactName,
            secondaryContactRelation: validation.data.secondaryContactRelation,
            secondaryContactPhone: validation.data.secondaryContactPhone,
            motorcycleDetails: validation.data.motorcycleDetails,
            insuranceDetails: validation.data.insuranceDetails,
            organDonor: validation.data.organDonor,
            isActive: true,
            accessPin: '',
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'stickers', targetTagId), {
            ...validation.data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        state.userSticker = validation.data;
        state.currentTagId = validation.data.tagId;
        state.landingSticker = validation.data;
        state.landingTagId = validation.data.tagId;
        state.saveSuccessBanner = true;
        state.mainStep = 'sticker_checkout';
      } catch (err) {
        handleFirestoreError(
          err,
          isUpdatingExisting ? OperationType.UPDATE : OperationType.CREATE,
          docPath
        );
      } finally {
        state.submitting = false;
        renderApp();
      }
    });
  }

  // Checkout & Landing Page Events
  const backToMainBtn = document.getElementById('back-to-main-btn');
  if (backToMainBtn) {
    backToMainBtn.addEventListener('click', () => {
      state.viewMode = 'main';
      renderApp();
    });
  }

  const backToAdminBtn = document.getElementById('back-to-admin-btn');
  if (backToAdminBtn) {
    backToAdminBtn.addEventListener('click', () => {
      state.viewMode = 'admin_panel';
      renderApp();
    });
  }

  const ownerEditInfoBtn = document.getElementById('owner-edit-info-btn');
  if (ownerEditInfoBtn) {
    ownerEditInfoBtn.addEventListener('click', () => {
      state.viewMode = 'main';
      state.mainStep = 'profile_form';
      renderApp();
    });
  }

  const ownerBuyStickerBtn = document.getElementById('owner-buy-sticker-btn');
  if (ownerBuyStickerBtn) {
    ownerBuyStickerBtn.addEventListener('click', () => {
      state.viewMode = 'main';
      state.mainStep = 'sticker_checkout';
      renderApp();
    });
  }

  const goEditProfileBtn = document.getElementById('go-edit-profile-btn');
  if (goEditProfileBtn) {
    goEditProfileBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.mainStep = 'profile_form';
      renderApp();
    });
  }

  const pkgCards = document.querySelectorAll('.pkg-option-card');
  pkgCards.forEach((card) => {
    card.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      const pkgId = card.getAttribute('data-pkg-id');
      if (pkgId) {
        state.selectedPkgId = pkgId;
        renderApp();
      }
    });
  });

  const colorChoiceBtns = document.querySelectorAll('.sticker-color-choice-btn');
  colorChoiceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      const unitIdx = Number(btn.getAttribute('data-sticker-unit'));
      const colorName = btn.getAttribute('data-sticker-color');
      if (!Number.isNaN(unitIdx) && colorName && ALL_STICKER_COLORS.includes(colorName)) {
        const nextColors = [...state.selectedStickerColors];
        nextColors[unitIdx] = colorName;
        state.selectedStickerColors = nextColors;
        renderApp();
      }
    });
  });

  const deliveryMethodBtns = document.querySelectorAll('.delivery-method-btn');
  deliveryMethodBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      const method = btn.getAttribute('data-delivery-method');
      if (method === 'personal_cdmx_edomex' || method === 'paqueteria_nacional') {
        state.deliveryMethod = method;
        state.checkoutError = null;
        renderApp();
      }
    });
  });

  const purchaseForm = document.getElementById('sticker-purchase-form');
  if (purchaseForm) {
    purchaseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      state.checkoutError = null;

      if (!state.user || !state.userSticker) {
        state.checkoutError = 'Inicia sesión y guarda primero tu perfil médico.';
        renderApp();
        return;
      }

      const selectedPkg =
        state.packages.find((p) => p.pkgId === state.selectedPkgId) ||
        state.packages[1] ||
        state.packages[0];
      const chosenColors = getSelectedColorsForPackage(selectedPkg);

      const deliveryMethod =
        state.deliveryMethod === 'paqueteria_nacional'
          ? 'paqueteria_nacional'
          : 'personal_cdmx_edomex';

      const recipientName = String(state.recipientName || state.userSticker.fullName || '')
        .trim()
        .slice(0, 100);
      const recipientPhone = String(state.recipientPhone || '')
        .trim()
        .slice(0, 30);
      const shippingCityState = String(state.shippingCityState || '')
        .trim()
        .slice(0, 120);
      const shippingNotes = String(state.shippingNotes || '')
        .trim()
        .slice(0, 250);

      let shippingStreet = String(state.shippingStreet || '')
        .trim()
        .slice(0, 200);
      let shippingColony = String(state.shippingColony || '')
        .trim()
        .slice(0, 120);
      let shippingPostalCode = String(state.shippingPostalCode || '')
        .trim()
        .slice(0, 15);

      if (recipientName.length < 2) {
        state.checkoutError = 'Ingresa el nombre completo de la persona que recibirá el pedido.';
        renderApp();
        return;
      }
      if (recipientPhone.length < 5 || !SCHEMA_CONSTRAINTS.phonePattern.test(recipientPhone)) {
        state.checkoutError = 'Ingresa un teléfono / WhatsApp válido para acordar la entrega.';
        renderApp();
        return;
      }

      if (deliveryMethod === 'personal_cdmx_edomex') {
        if (shippingCityState.length < 2) {
          state.checkoutError =
            'Indica tu Alcaldía (CDMX) o Municipio (Estado de México) para acordar la entrega personal por WhatsApp.';
          renderApp();
          return;
        }
        shippingStreet = 'Entrega Personal (Edo. de México / CDMX)';
        shippingColony = 'Acordar vía WhatsApp';
        shippingPostalCode = 'N/A';
      } else {
        if (
          shippingStreet.length < 3 ||
          shippingColony.length < 2 ||
          shippingCityState.length < 2 ||
          shippingPostalCode.length < 3
        ) {
          state.checkoutError =
            'Para envío por paquetería completa calle, colonia, ciudad/estado y código postal.';
          renderApp();
          return;
        }
      }

      const orderId = generateUniqueOrderId();
      const orderPayload = {
        orderId,
        tagId: state.userSticker.tagId,
        ownerId: state.user.uid,
        riderName: state.userSticker.fullName,
        pkgId: selectedPkg.pkgId,
        pkgName: selectedPkg.name,
        stickerCount: Math.max(1, Math.min(10, Number(selectedPkg.stickerCount) || 1)),
        selectedColors: chosenColors,
        totalPrice: Number(selectedPkg.price) || 249,
        paymentMethod: 'SPEI_WHATSAPP',
        deliveryMethod,
        status: 'pendiente_pago',
        recipientName,
        recipientPhone,
        shippingStreet,
        shippingColony,
        shippingCityState,
        shippingPostalCode,
        shippingNotes,
      };

      state.checkoutSubmitting = true;
      renderApp();

      const docPath = `orders/${orderId}`;
      try {
        await setDoc(doc(db, 'orders', orderId), {
          ...orderPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        state.activeOrder = orderPayload;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, docPath);
      } finally {
        state.checkoutSubmitting = false;
        renderApp();
      }
    });
  }

  const copyClabeBtn = document.getElementById('copy-clabe-btn');
  if (copyClabeBtn) {
    copyClabeBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(state.paymentSettings.clabe || '');
        state.copiedClabe = true;
        renderApp();
        setTimeout(() => {
          state.copiedClabe = false;
          renderApp();
        }, 2000);
      } catch {
        // Ignore clipboard errors
      }
    });
  }

  const newOrderBtn = document.getElementById('new-order-btn');
  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', () => {
      state.activeOrder = null;
      renderApp();
    });
  }

  const viewExistingOrderBtns = document.querySelectorAll('.view-existing-order-btn');
  viewExistingOrderBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const ordId = btn.getAttribute('data-open-order-id');
      const found = state.userOrders.find((o) => o.orderId === ordId);
      if (found) {
        state.activeOrder = found;
        renderApp();
      }
    });
  });

  // ==========================================================================
  // Admin Login & Admin Panel Events
  // ==========================================================================
  const adminBackMainBtn = document.getElementById('admin-back-main-btn');
  if (adminBackMainBtn) {
    adminBackMainBtn.addEventListener('click', () => {
      state.viewMode = 'main';
      renderApp();
    });
  }

  async function verifyAuthorizedAdminGoogleAccount() {
    let targetUser = state.user;
    if (!isAuthorizedAdminUser(targetUser)) {
      targetUser = await handleGoogleSignIn(true);
    }
    if (!targetUser) {
      state.adminLoginError =
        'Se requiere verificar tu identidad con Google para acceder al panel.';
      renderApp();
      return false;
    }
    if (!isAuthorizedAdminUser(targetUser)) {
      state.adminAuthenticated = false;
      state.adminLoginError = `Acceso denegado: El correo "${
        targetUser.email || 'desconocido'
      }" no está autorizado. Solo se permite verificar con ${AUTHORIZED_ADMIN_EMAIL}.`;
      renderApp();
      return false;
    }
    state.adminAuthenticated = true;
    state.viewMode = 'admin_panel';
    subscribeToAllStickersForAdmin();
    renderApp();
    return true;
  }

  const adminGoogleVerifyBtn = document.getElementById('admin-google-verify-btn');
  if (adminGoogleVerifyBtn) {
    adminGoogleVerifyBtn.addEventListener('click', async () => {
      syncFormInputsBeforeReRender();
      state.adminLoginError = null;
      await verifyAuthorizedAdminGoogleAccount();
    });
  }

  const adminLoginForm = document.getElementById('admin-login-form');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      state.adminLoginError = null;

      const userClean = state.adminUsernameInput.trim().toLowerCase();
      const passClean = state.adminPasswordInput.trim();

      if (
        (userClean === 'admin' || userClean === AUTHORIZED_ADMIN_EMAIL) &&
        passClean === 'bikersafe2026'
      ) {
        await verifyAuthorizedAdminGoogleAccount();
      } else {
        state.adminLoginError =
          'Credenciales incorrectas. Verifica tu correo autorizado y contraseña.';
        renderApp();
      }
    });
  }

  const adminTabOrdersBtn = document.getElementById('admin-tab-orders-btn');
  if (adminTabOrdersBtn) {
    adminTabOrdersBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.adminTab = 'orders';
      renderApp();
    });
  }

  const adminTabRecordsBtn = document.getElementById('admin-tab-records-btn');
  if (adminTabRecordsBtn) {
    adminTabRecordsBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.adminTab = 'records';
      renderApp();
    });
  }

  const adminTabPackagesBtn = document.getElementById('admin-tab-packages-btn');
  if (adminTabPackagesBtn) {
    adminTabPackagesBtn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      state.adminTab = 'packages';
      state.adminPackagesSavedSuccess = false;
      state.adminPackagesError = null;
      state.adminPaymentSavedSuccess = false;
      state.adminPaymentError = null;
      renderApp();
    });
  }

  const adminOrderSearchInput = document.getElementById('admin-order-search-input');
  if (adminOrderSearchInput) {
    adminOrderSearchInput.addEventListener('input', (e) => {
      state.adminOrderSearchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderApp();
      const newInput = document.getElementById('admin-order-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  const adminOrderStatusSelects = document.querySelectorAll('.admin-order-status-select');
  adminOrderStatusSelects.forEach((selectEl) => {
    selectEl.addEventListener('change', async (e) => {
      const orderId = selectEl.getAttribute('data-order-status-id');
      const nextStatus = e.target.value;
      if (!orderId || !ORDER_STATUSES.includes(nextStatus)) return;
      state.adminUpdatingOrderId = orderId;
      renderApp();
      const docPath = `orders/${orderId}`;
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
        state.adminNfcMessage = `Estatus del pedido #${orderId.toUpperCase()} actualizado a "${ORDER_STATUS_LABELS[nextStatus]}".`;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      } finally {
        state.adminUpdatingOrderId = null;
        renderApp();
      }
    });
  });

  const adminCopyOrderUrlBtns = document.querySelectorAll('.admin-copy-order-url-btn');
  adminCopyOrderUrlBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-copy-order-url');
      const ordId = btn.getAttribute('data-copy-order-id');
      if (!url || !ordId) return;
      try {
        await navigator.clipboard.writeText(url);
        state.adminCopiedTagId = `ord-${ordId}`;
        renderApp();
        setTimeout(() => {
          state.adminCopiedTagId = null;
          renderApp();
        }, 2000);
      } catch {
        // Ignore
      }
    });
  });

  const adminAskDeleteOrderBtns = document.querySelectorAll('.admin-ask-delete-order-btn');
  adminAskDeleteOrderBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.adminConfirmDeleteOrderId = btn.getAttribute('data-ask-delete-order');
      renderApp();
    });
  });

  const adminCancelDeleteOrderBtns = document.querySelectorAll('.admin-cancel-delete-order-btn');
  adminCancelDeleteOrderBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.adminConfirmDeleteOrderId = null;
      renderApp();
    });
  });

  const adminConfirmDeleteOrderBtns = document.querySelectorAll('.admin-confirm-delete-order-btn');
  adminConfirmDeleteOrderBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.getAttribute('data-confirm-delete-order');
      if (!orderId) return;
      state.adminDeletingOrderId = orderId;
      renderApp();
      const docPath = `orders/${orderId}`;
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        state.adminAllOrders = state.adminAllOrders.filter((o) => o.orderId !== orderId);
        state.adminConfirmDeleteOrderId = null;
        state.adminNfcMessage = `Pedido #${orderId.toUpperCase()} eliminado correctamente.`;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      } finally {
        state.adminDeletingOrderId = null;
        renderApp();
      }
    });
  });

  const adminPaymentForm = document.getElementById('admin-payment-settings-form');
  if (adminPaymentForm) {
    adminPaymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      state.adminPaymentSavedSuccess = false;
      state.adminPaymentError = null;

      const bankName = String(state.paymentSettings.bankName || '').trim().slice(0, 80);
      const beneficiaryName = String(state.paymentSettings.beneficiaryName || '').trim().slice(0, 120);
      const clabe = String(state.paymentSettings.clabe || '').trim().slice(0, 24);
      const accountOrCard = String(state.paymentSettings.accountOrCard || '').trim().slice(0, 30);
      const whatsappNumber = String(state.paymentSettings.whatsappNumber || '').trim().slice(0, 25);
      const paymentInstructions = String(state.paymentSettings.paymentInstructions || '').trim().slice(0, 350);

      if (bankName.length < 2 || beneficiaryName.length < 2 || clabe.length < 10) {
        state.adminPaymentError = 'Verifica el nombre del banco, beneficiario y CLABE (mínimo 10 caracteres).';
        renderApp();
        return;
      }
      if (whatsappNumber.length < 8 || !SCHEMA_CONSTRAINTS.phonePattern.test(whatsappNumber)) {
        state.adminPaymentError = 'Ingresa un número de WhatsApp válido (ej. 5215512345678).';
        renderApp();
        return;
      }

      state.adminSavingPayment = true;
      renderApp();

      try {
        await setDoc(doc(db, 'payment_settings', 'spei'), {
          settingId: 'spei',
          bankName,
          beneficiaryName,
          clabe,
          accountOrCard,
          whatsappNumber,
          paymentInstructions,
          updatedAt: serverTimestamp(),
        });
        state.paymentSettings = {
          settingId: 'spei',
          bankName,
          beneficiaryName,
          clabe,
          accountOrCard,
          whatsappNumber,
          paymentInstructions,
        };
        state.adminPaymentSavedSuccess = true;
      } catch (err) {
        state.adminPaymentError =
          err instanceof Error
            ? `Error al guardar configuración SPEI: ${err.message}`
            : 'No se pudo guardar la configuración de cobro.';
      } finally {
        state.adminSavingPayment = false;
        renderApp();
      }
    });
  }

  const adminExitBtn = document.getElementById('admin-exit-btn');
  if (adminExitBtn) {
    adminExitBtn.addEventListener('click', () => {
      state.adminAuthenticated = false;
      state.viewMode = 'main';
      renderApp();
    });
  }

  const adminSearchInput = document.getElementById('admin-search-input');
  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', (e) => {
      state.adminSearchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderApp();
      const newInput = document.getElementById('admin-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  const adminCopyBtns = document.querySelectorAll('.admin-copy-url-btn');
  adminCopyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tagId = btn.getAttribute('data-copy-tag');
      const found = state.adminAllStickers.find((s) => s.tagId === tagId);
      if (!found) return;
      try {
        await navigator.clipboard.writeText(buildUniqueStickerUrl(found));
        state.adminCopiedTagId = tagId;
        renderApp();
        setTimeout(() => {
          state.adminCopiedTagId = null;
          renderApp();
        }, 2000);
      } catch {
        // Ignore
      }
    });
  });

  const adminPreviewBtns = document.querySelectorAll('.admin-preview-landing-btn');
  adminPreviewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tagId = btn.getAttribute('data-preview-tag');
      const found = state.adminAllStickers.find((s) => s.tagId === tagId);
      if (!found) return;
      state.landingSticker = found;
      state.landingTagId = found.tagId;
      state.viewMode = 'public_landing';
      renderApp();
    });
  });

  const adminWriteNfcBtns = document.querySelectorAll('.admin-write-nfc-btn');
  adminWriteNfcBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tagId = btn.getAttribute('data-write-tag');
      const found = state.adminAllStickers.find((s) => s.tagId === tagId);
      if (!found) return;
      const nfcUrl = buildUniqueStickerUrl(found);
      if (!('NDEFReader' in window)) {
        state.adminNfcMessage = `URL lista para ${found.fullName} (${found.tagId}). Para grabar directamente desde el navegador abre este panel en Chrome para Android con NFC activo, o copia la URL para tu grabador NFC de escritorio.`;
        renderApp();
        return;
      }
      try {
        state.adminNfcMessage = `Acerca el tag NFC físico para grabar el perfil de ${found.fullName} (${found.tagId})...`;
        renderApp();
        const ndef = new window.NDEFReader();
        await ndef.write({
          records: [{ recordType: 'url', data: nfcUrl }],
        });
        state.adminNfcMessage = `¡Tag NFC grabado exitosamente para ${found.fullName} (${found.tagId})!`;
        renderApp();
      } catch (err) {
        state.adminNfcMessage = `No se pudo grabar el tag NFC: ${
          err instanceof Error ? err.message : 'Verifica permisos NFC'
        }`;
        renderApp();
      }
    });
  });

  const adminAskDeleteBtns = document.querySelectorAll('.admin-ask-delete-btn');
  adminAskDeleteBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tagId = btn.getAttribute('data-ask-delete-tag');
      state.adminConfirmDeleteTagId = tagId;
      renderApp();
    });
  });

  const adminCancelDeleteBtns = document.querySelectorAll('.admin-cancel-delete-btn');
  adminCancelDeleteBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.adminConfirmDeleteTagId = null;
      renderApp();
    });
  });

  const adminConfirmDeleteBtns = document.querySelectorAll('.admin-confirm-delete-btn');
  adminConfirmDeleteBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tagId = btn.getAttribute('data-confirm-delete-tag');
      if (!tagId) return;
      const found = state.adminAllStickers.find((s) => s.tagId === tagId);
      state.adminDeletingTagId = tagId;
      state.adminNfcMessage = null;
      renderApp();

      const docPath = `stickers/${tagId}`;
      try {
        await deleteDoc(doc(db, 'stickers', tagId));
        state.adminAllStickers = state.adminAllStickers.filter((s) => s.tagId !== tagId);
        if (state.userSticker && state.userSticker.tagId === tagId) {
          state.userSticker = null;
          state.currentTagId = null;
        }
        state.adminConfirmDeleteTagId = null;
        state.adminNfcMessage = `Registro de ${found ? found.fullName : tagId} (${tagId}) eliminado correctamente.`;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      } finally {
        state.adminDeletingTagId = null;
        renderApp();
      }
    });
  });

  const adminPkgColorToggles = document.querySelectorAll('.admin-pkg-color-toggle');
  adminPkgColorToggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      syncFormInputsBeforeReRender();
      const pkgIdx = Number(btn.getAttribute('data-pkg-idx'));
      const colorName = btn.getAttribute('data-toggle-color');
      if (Number.isNaN(pkgIdx) || !colorName || !state.packages[pkgIdx]) return;

      const currentColors = Array.isArray(state.packages[pkgIdx].availableColors)
        ? [...state.packages[pkgIdx].availableColors]
        : [...ALL_STICKER_COLORS];

      let nextColors;
      if (currentColors.includes(colorName)) {
        if (currentColors.length <= 1) return; // Require at least 1 selectable color
        nextColors = currentColors.filter((c) => c !== colorName);
      } else {
        nextColors = ALL_STICKER_COLORS.filter(
          (c) => currentColors.includes(c) || c === colorName
        );
      }

      state.packages[pkgIdx] = {
        ...state.packages[pkgIdx],
        availableColors: nextColors,
      };
      renderApp();
    });
  });

  const adminPackagesForm = document.getElementById('admin-packages-form');
  if (adminPackagesForm) {
    adminPackagesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      state.adminPackagesSavedSuccess = false;
      state.adminPackagesError = null;

      const updatedPackages = state.packages.map((pkg, idx) => {
        const name = String(pkg.name || '').trim().slice(0, 80);
        const subtitle = String(pkg.subtitle || '').trim().slice(0, 80);
        const priceNum = Math.max(1, Math.min(100000, Number(pkg.price) || 249));
        const stickerCount = Math.max(
          1,
          Math.min(10, Math.round(Number(pkg.stickerCount) || 1))
        );
        const specs = String(pkg.specs || '').trim().slice(0, 250);
        const availableColors =
          Array.isArray(pkg.availableColors) && pkg.availableColors.length > 0
            ? pkg.availableColors.filter((c) => ALL_STICKER_COLORS.includes(c))
            : [...ALL_STICKER_COLORS];

        return {
          pkgId: pkg.pkgId,
          name: name.length >= 2 ? name : DEFAULT_STICKER_PACKAGES[idx].name,
          subtitle: subtitle.length >= 1 ? subtitle : DEFAULT_STICKER_PACKAGES[idx].subtitle,
          price: priceNum,
          specs: specs.length >= 2 ? specs : DEFAULT_STICKER_PACKAGES[idx].specs,
          stickerCount,
          availableColors,
          sortOrder: idx + 1,
        };
      });

      state.adminSavingPackages = true;
      renderApp();

      try {
        for (const item of updatedPackages) {
          await setDoc(doc(db, 'packages', item.pkgId), {
            ...item,
            updatedAt: serverTimestamp(),
          });
        }
        state.packages = updatedPackages;
        state.adminPackagesSavedSuccess = true;
      } catch (err) {
        state.adminPackagesError =
          err instanceof Error
            ? `No se pudieron guardar los paquetes en la base de datos: ${err.message}`
            : 'Error al guardar las opciones de compra.';
      } finally {
        state.adminSavingPackages = false;
        renderApp();
      }
    });
  }
}

// ============================================================================
// 6. Bootstrapping Application
// ============================================================================
function initBikerSafeApp() {
  subscribeToPackages();
  subscribeToPaymentSettings();

  const params = new URLSearchParams(window.location.search);
  const tagParam = params.get('tag');
  const encodedPacket = params.get('p');

  if (tagParam) {
    state.landingTagId = tagParam;
    state.viewMode = 'public_landing';
    const fallbackData = parseEncodedStickerPacket(encodedPacket);
    if (fallbackData && fallbackData.tagId) {
      state.landingSticker = fallbackData;
    }
    fetchPublicSticker(tagParam);
  }

  onAuthStateChanged(auth, (currentUser) => {
    state.user = currentUser;
    state.authReady = true;
    if (!currentUser) {
      state.userSticker = null;
      state.userOrders = [];
      state.activeOrder = null;
      state.hasPopulatedInitialForm = false;
      if (unsubscribeUserStickers) {
        unsubscribeUserStickers();
        unsubscribeUserStickers = null;
      }
      if (unsubscribeUserOrders) {
        unsubscribeUserOrders();
        unsubscribeUserOrders = null;
      }
    } else {
      subscribeToUserSticker(currentUser);
      subscribeToUserOrders(currentUser);
      if (!isAuthorizedAdminUser(currentUser)) {
        state.adminAuthenticated = false;
        if (state.viewMode === 'admin_panel') {
          state.viewMode = 'admin_login';
        }
      } else if (state.adminAuthenticated) {
        subscribeToAllStickersForAdmin();
      }
    }
    renderApp();
  });

  renderApp();
}

initBikerSafeApp();
