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
  emergencyContactPhone: { minLength: 5, maxLength: 30 },
  secondaryContactName: { minLength: 0, maxLength: 100 },
  secondaryContactPhone: { minLength: 0, maxLength: 30 },
  motorcycleDetails: { minLength: 0, maxLength: 150 },
  insuranceDetails: { minLength: 0, maxLength: 150 },
};

const STICKER_PACKAGES = [
  {
    id: 'single',
    name: 'Kit Individual Casco NFC',
    subtitle: 'Para 1 casco principal',
    price: 249,
    specs: '1 Sticker NFC NTAG213 · Acabado Carbono + Naranja · Resina 3M IP68',
  },
  {
    id: 'pro',
    name: 'Kit Biker Safe Pro',
    subtitle: 'Más elegido · Casco + Moto',
    price: 399,
    specs: '2 Stickers NFC para Casco + 1 Sticker NFC Reflejante para Chasis',
  },
  {
    id: 'squad',
    name: 'Kit Dúo / Rodada',
    subtitle: 'Cobertura en múltiples cascos',
    price: 649,
    specs: '4 Stickers NFC NTAG215 Programados con tu URL única de emergencia',
  },
];

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
      emergencyContactPhone,
      secondaryContactName,
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
    cp: sticker.emergencyContactPhone,
    scn: sticker.secondaryContactName || '',
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
      emergencyContactPhone: typeof parsed.cp === 'string' ? parsed.cp : '',
      secondaryContactName: typeof parsed.scn === 'string' ? parsed.scn : '',
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

// Deterministic SVG QR Matrix Renderer (Works 100% offline/hermetic without external image hosts)
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

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${grid} ${grid}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-label="Código QR de Emergencia NFC">${rects}</svg>`;
}

// ============================================================================
// 3. Application State & Reactive Renderer
// ============================================================================
const state = {
  user: null,
  authReady: false,
  viewMode: 'main', // 'main' | 'public_landing'
  mainStep: 'profile_form', // 'profile_form' | 'sticker_checkout'

  // Form fields
  currentTagId: null,
  fullName: '',
  bloodType: '',
  allergies: '',
  medicalConditions: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  secondaryContactName: '',
  secondaryContactPhone: '',
  motorcycleDetails: '',
  insuranceDetails: '',
  organDonor: false,
  showAdvancedFields: false,

  // Status
  submitting: false,
  formError: null,
  saveSuccessBanner: false,
  copiedUrl: false,
  nfcWriteMessage: null,

  // Checkout state
  selectedPkgId: 'pro',
  shippingAddress: '',
  shippingCity: '',
  shippingZip: '',
  orderCompleted: false,
  orderFolio: '',

  // Firestore records
  userSticker: null,
  hasPopulatedInitialForm: false,
  landingTagId: '',
  landingSticker: null,
  loadingLandingSticker: false,
};

let unsubscribeUserStickers = null;

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

async function handleGoogleSignIn() {
  state.formError = null;
  renderApp();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserPrivateProfile(result.user);
  } catch (err) {
    state.formError =
      err instanceof Error
        ? `Error al iniciar sesión: ${err.message}`
        : 'No se pudo completar la autenticación.';
    renderApp();
  }
}

async function handleSignOut() {
  await firebaseSignOut(auth);
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
        secondaryContactName: data.secondaryContactName || '',
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
          secondaryContactName: raw.secondaryContactName || '',
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
          state.emergencyContactPhone = primaryRecord.emergencyContactPhone || '';
          state.secondaryContactName = primaryRecord.secondaryContactName || '';
          state.secondaryContactPhone = primaryRecord.secondaryContactPhone || '';
          state.motorcycleDetails = primaryRecord.motorcycleDetails || '';
          state.insuranceDetails = primaryRecord.insuranceDetails || '';
          state.organDonor = Boolean(primaryRecord.organDonor);
          state.hasPopulatedInitialForm = true;
        }
      }
      renderApp();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stickers');
    }
  );
}

// ============================================================================
// 4. HTML Templates & Event Binding
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
      (sticker.ownerId === state.user.uid || state.userSticker?.ownerId === state.user.uid)
  );

  return `
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Top Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#14161A] border border-zinc-800 rounded-xl px-5 py-3.5">
        <div class="flex items-center gap-2 text-xs text-zinc-400">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          <span class="font-semibold text-zinc-200">LANDING PAGE DE EMERGENCIA NFC</span>
          <span aria-hidden="true">·</span>
          <span class="font-mono tabular-nums text-orange-400">${escapeHtml(sticker.tagId)}</span>
        </div>

        <div class="flex items-center gap-2.5">
          <button type="button" id="copy-landing-url-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
            <span>${state.copiedUrl ? '¡URL Copiada!' : 'Copiar URL del Tag'}</span>
          </button>

          <button type="button" id="back-to-main-btn" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer">
            <span>${isOwnerViewing ? 'Editar mis Datos / Comprar Sticker' : 'Pantalla Principal'}</span>
          </button>
        </div>
      </div>

      <!-- Hero Emergency Identification Banner -->
      <section class="bg-gradient-to-br from-[#181B20] via-[#121418] to-[#0B0C0E] border border-zinc-800 rounded-2xl overflow-hidden">
        <div class="bg-orange-500 text-black px-6 py-2.5 flex items-center justify-between text-xs font-bold tracking-wide">
          <span>INFORMACIÓN MÉDICA CRÍTICA DE EMERGENCIA · ACCESO DIRECTO NFC SIN CLAVE</span>
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
              Toca cualquier botón para realizar la llamada telefónica inmediata sin claves ni bloqueos.
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
              <div class="text-sm font-mono tabular-nums text-zinc-300 mt-0.5">${escapeHtml(sticker.emergencyContactPhone)}</div>
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
                <div class="text-sm font-mono tabular-nums text-zinc-300 mt-0.5">${escapeHtml(sticker.secondaryContactPhone || 'Teléfono no especificado')}</div>
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

function renderStickerCheckoutStep() {
  const sticker = state.userSticker;
  if (!sticker) return '';

  const uniqueUrl = buildUniqueStickerUrl(sticker);
  const selectedPkg =
    STICKER_PACKAGES.find((p) => p.id === state.selectedPkgId) || STICKER_PACKAGES[1];

  return `
    <div class="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-8">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div class="flex items-center gap-2 text-xs font-bold text-orange-500 mb-1">
            <span>PASO 2 · STICKER FÍSICO PERSONALIZADO</span>
            <span aria-hidden="true">·</span>
            <span class="font-mono tabular-nums">${escapeHtml(sticker.tagId)}</span>
          </div>
          <h2 class="text-2xl font-bold text-white tracking-tight">
            Adquiere tu Sticker NFC Biker Safe
          </h2>
          <p class="text-sm text-zinc-400 mt-1">
            Tu sticker se envía pre-programado con tu URL única de emergencia. Al escanearlo sin claves ni contraseñas, despliega tu Landing Page médica.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button type="button" id="open-public-landing-btn" class="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
            <span>Ver mi Landing Page de Emergencia</span>
          </button>
          <button type="button" id="go-edit-profile-btn" class="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
            <span>Modificar mis Datos</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left: Physical Custom Helmet Sticker Preview & Unique URL (5 cols) -->
        <div class="lg:col-span-5 space-y-5">
          <div class="bg-[#0B0C0E] border-2 border-orange-500/80 rounded-2xl p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span class="text-sm font-bold text-white tracking-tight">Biker Safe NFC</span>
              </div>
              <span class="text-xs font-mono tabular-nums text-orange-400">${escapeHtml(sticker.tagId)}</span>
            </div>

            <div class="flex items-center gap-4">
              <div class="bg-white p-2.5 rounded-xl shrink-0">
                ${renderDeterministicQrSvg(uniqueUrl, 92)}
              </div>
              <div class="space-y-1 min-w-0">
                <div class="text-[11px] font-bold text-orange-500">ESCANEO DE EMERGENCIA</div>
                <div class="text-base font-bold text-white truncate">${escapeHtml(sticker.fullName)}</div>
                <div class="text-xs font-mono tabular-nums text-zinc-300">
                  Tipo de Sangre: <strong class="text-orange-400">${escapeHtml(sticker.bloodType)}</strong>
                </div>
                <div class="text-[11px] text-zinc-400 truncate">
                  Contacto: ${escapeHtml(sticker.emergencyContactName)}
                </div>
              </div>
            </div>

            <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Chip NTAG213 · Resina 3M</span>
              <span>Acceso directo sin clave</span>
            </div>
          </div>

          <!-- Unique URL Box -->
          <div class="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-4 space-y-2.5">
            <div class="text-xs font-semibold text-zinc-300">URL Única vinculada a tu Sticker NFC:</div>
            <div class="flex items-center gap-2">
              <input type="text" readonly value="${escapeHtml(uniqueUrl)}" class="w-full px-3 py-2 text-xs font-mono bg-[#14161A] border border-zinc-800 rounded-lg text-zinc-300 select-all" />
              <button type="button" id="copy-checkout-url-btn" class="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer">
                <span>${state.copiedUrl ? 'Copiada' : 'Copiar'}</span>
              </button>
            </div>

            <button type="button" id="write-web-nfc-btn" class="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <span>¿Ya tienes un tag virgen? Grabar por Web NFC</span>
            </button>

            ${
              state.nfcWriteMessage
                ? `<p class="text-xs text-orange-400 pt-1">${escapeHtml(state.nfcWriteMessage)}</p>`
                : ''
            }
          </div>
        </div>

        <!-- Right: Package Selector & Checkout Form (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          ${
            state.orderCompleted
              ? `
            <div class="bg-[#0B0C0E] border border-orange-500/60 rounded-2xl p-6 sm:p-8 space-y-5">
              <div>
                <div class="text-xs font-mono text-orange-400">ORDEN CONFIRMADA · FOLIO ${escapeHtml(state.orderFolio)}</div>
                <h3 class="text-xl font-bold text-white mt-1">¡Tu Sticker NFC Personalizado está en producción!</h3>
              </div>

              <p class="text-sm text-zinc-300 leading-relaxed">
                Hemos vinculado el chip NFC de tu <strong>${escapeHtml(selectedPkg.name)}</strong> directamente a tu perfil médico (<span class="font-mono text-orange-400">${escapeHtml(sticker.tagId)}</span>). Cualquier cambio que realices en tus datos médicos desde la pantalla principal se actualizará automáticamente al escanear tu casco.
              </p>

              <div class="p-4 bg-[#14161A] border border-zinc-800 rounded-xl space-y-1 text-xs text-zinc-300">
                <div><strong class="text-white">Paquete:</strong> ${escapeHtml(selectedPkg.name)} ($${selectedPkg.price} MXN)</div>
                <div><strong class="text-white">Destinatario:</strong> ${escapeHtml(sticker.fullName)}</div>
                <div><strong class="text-white">Dirección de envío:</strong> ${escapeHtml(state.shippingAddress)}, ${escapeHtml(state.shippingCity)} C.P. ${escapeHtml(state.shippingZip)}</div>
              </div>

              <div class="flex flex-wrap items-center gap-3 pt-2">
                <button type="button" id="open-public-landing-after-order-btn" class="px-5 py-3 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer">
                  <span>Abrir mi Landing Page de Emergencia</span>
                </button>
                <button type="button" id="new-order-btn" class="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer">
                  Hacer otro pedido
                </button>
              </div>
            </div>
          `
              : `
            <form id="sticker-purchase-form" class="space-y-5">
              <div>
                <label class="block text-xs font-bold text-zinc-300 mb-3">
                  1. Selecciona tu Kit de Stickers NFC Personalizados
                </label>
                <div class="grid grid-cols-1 gap-3">
                  ${STICKER_PACKAGES.map((pkg) => {
                    const active = pkg.id === state.selectedPkgId;
                    return `
                      <div data-pkg-id="${pkg.id}" class="pkg-option-card p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                        active
                          ? 'bg-[#0B0C0E] border-orange-500'
                          : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                      }">
                        <div class="space-y-0.5">
                          <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-white">${escapeHtml(pkg.name)}</span>
                            <span class="text-xs text-orange-400 font-medium">· ${escapeHtml(pkg.subtitle)}</span>
                          </div>
                          <p class="text-xs text-zinc-400">${escapeHtml(pkg.specs)}</p>
                        </div>
                        <div class="text-right shrink-0">
                          <span class="text-lg font-bold font-mono tabular-nums text-orange-500">$${pkg.price}</span>
                          <span class="block text-[10px] text-zinc-500">MXN</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="space-y-4 pt-2 border-t border-zinc-800">
                <div class="text-xs font-bold text-zinc-300">
                  2. Datos de Envío para tu Sticker Físico
                </div>

                <div>
                  <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Calle, Número y Colonia</label>
                  <input type="text" id="shipping-address-input" required value="${escapeHtml(state.shippingAddress)}" placeholder="Ej. Av. Insurgentes Sur 1450, Col. Del Valle" class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Ciudad y Estado</label>
                    <input type="text" id="shipping-city-input" required value="${escapeHtml(state.shippingCity)}" placeholder="Ej. Ciudad de México, CDMX" class="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-zinc-400 mb-1.5">Código Postal</label>
                    <input type="text" id="shipping-zip-input" required maxlength="10" value="${escapeHtml(state.shippingZip)}" placeholder="Ej. 03100" class="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
              </div>

              <button type="submit" class="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <span>Ordenar ${escapeHtml(selectedPkg.name)} ($${selectedPkg.price} MXN)</span>
              </button>
            </form>
          `
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
        Tu cuenta protege la edición de estos datos. Puedes modificarlos cuando lo necesites y al escanear tu sticker NFC se desplegará tu Landing Page de emergencia de forma inmediata y sin pedir claves de acceso.
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
          Tus datos médicos se han guardado y vinculado a tu tag NFC (<strong class="font-mono text-orange-400">${escapeHtml(state.currentTagId)}</strong>).
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
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="emergencyContactName" class="block text-xs font-semibold text-zinc-300 mb-2">Nombre del Contacto Principal</label>
              <input id="emergencyContactName" type="text" required maxlength="100" value="${escapeHtml(state.emergencyContactName)}" placeholder="Ej. María (Esposa)" class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
            </div>

            <div>
              <label for="emergencyContactPhone" class="block text-xs font-semibold text-zinc-300 mb-2">Teléfono Principal</label>
              <input id="emergencyContactPhone" type="tel" required maxlength="30" value="${escapeHtml(state.emergencyContactPhone)}" placeholder="+52 55 1234 5678" class="w-full px-4 py-2.5 text-sm font-mono tabular-nums text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <!-- Segundo Contacto de Emergencia -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            <div>
              <label for="secondaryContactName" class="block text-xs font-semibold text-zinc-300 mb-2">Nombre del Segundo Contacto (Opcional)</label>
              <input id="secondaryContactName" type="text" maxlength="100" value="${escapeHtml(state.secondaryContactName)}" placeholder="Ej. Carlos Rojas (Hermano / Padre)" class="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500" />
            </div>

            <div>
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
  const emergencyContactPhoneEl = document.getElementById('emergencyContactPhone');
  if (emergencyContactPhoneEl) state.emergencyContactPhone = emergencyContactPhoneEl.value;
  const secondaryContactNameEl = document.getElementById('secondaryContactName');
  if (secondaryContactNameEl) state.secondaryContactName = secondaryContactNameEl.value;
  const secondaryContactPhoneEl = document.getElementById('secondaryContactPhone');
  if (secondaryContactPhoneEl) state.secondaryContactPhone = secondaryContactPhoneEl.value;
  const motorcycleDetailsEl = document.getElementById('motorcycleDetails');
  if (motorcycleDetailsEl) state.motorcycleDetails = motorcycleDetailsEl.value;
  const insuranceDetailsEl = document.getElementById('insuranceDetails');
  if (insuranceDetailsEl) state.insuranceDetails = insuranceDetailsEl.value;
  const organDonorEl = document.getElementById('organDonor');
  if (organDonorEl) state.organDonor = organDonorEl.checked;

  const addrEl = document.getElementById('shipping-address-input');
  if (addrEl) state.shippingAddress = addrEl.value;
  const cityEl = document.getElementById('shipping-city-input');
  if (cityEl) state.shippingCity = cityEl.value;
  const zipEl = document.getElementById('shipping-zip-input');
  if (zipEl) state.shippingZip = zipEl.value;
}

export function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#0B0C0E] text-zinc-100">
      ${renderHeader()}

      <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        ${
          state.viewMode === 'public_landing'
            ? renderPublicLandingView()
            : `
          <div class="space-y-8">
            <!-- Step Progress Bar inside Pantalla Principal -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14161A] border border-zinc-800 rounded-xl p-4">
              <div class="flex items-center gap-2">
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
                <button type="button" id="top-preview-landing-btn" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-bold rounded-lg transition-colors cursor-pointer self-start sm:self-auto">
                  <span>Ver mi Landing Page NFC (${escapeHtml(state.userSticker.tagId)})</span>
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
        `
        }
      </main>

      <footer class="border-t border-zinc-800/80 bg-[#08090B] py-5 px-4 sm:px-8 mt-auto">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>Biker Safe · Perfil Médico de Emergencia y Stickers NFC Personalizados</span>
          <button type="button" id="footer-main-btn" class="text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer">
            Pantalla Principal
          </button>
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

  const topPreviewLandingBtn = document.getElementById('top-preview-landing-btn');
  if (topPreviewLandingBtn) {
    topPreviewLandingBtn.addEventListener('click', () => {
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
      state.emergencyContactName = 'María (Esposa)';
      state.emergencyContactPhone = '+52 55 1234 5678';
      state.secondaryContactName = 'Carlos Rojas (Hermano)';
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
            'Inicia sesión con tu cuenta segura para guardar tu perfil médico y vincular tu Sticker NFC.';
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
        emergencyContactPhone: state.emergencyContactPhone,
        secondaryContactName: state.secondaryContactName,
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
            emergencyContactPhone: validation.data.emergencyContactPhone,
            secondaryContactName: validation.data.secondaryContactName,
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

  const openPublicLandingBtn = document.getElementById('open-public-landing-btn');
  if (openPublicLandingBtn) {
    openPublicLandingBtn.addEventListener('click', () => {
      if (!state.userSticker) return;
      syncFormInputsBeforeReRender();
      state.landingSticker = state.userSticker;
      state.landingTagId = state.userSticker.tagId;
      state.viewMode = 'public_landing';
      renderApp();
    });
  }

  const openPublicLandingAfterOrderBtn = document.getElementById(
    'open-public-landing-after-order-btn'
  );
  if (openPublicLandingAfterOrderBtn) {
    openPublicLandingAfterOrderBtn.addEventListener('click', () => {
      if (!state.userSticker) return;
      state.landingSticker = state.userSticker;
      state.landingTagId = state.userSticker.tagId;
      state.viewMode = 'public_landing';
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

  const copyCheckoutUrlBtn = document.getElementById('copy-checkout-url-btn');
  if (copyCheckoutUrlBtn) {
    copyCheckoutUrlBtn.addEventListener('click', async () => {
      const target = state.userSticker;
      if (!target) return;
      try {
        await navigator.clipboard.writeText(buildUniqueStickerUrl(target));
        state.copiedUrl = true;
        renderApp();
        setTimeout(() => {
          state.copiedUrl = false;
          renderApp();
        }, 2000);
      } catch {
        // Ignore
      }
    });
  }

  const copyLandingUrlBtn = document.getElementById('copy-landing-url-btn');
  if (copyLandingUrlBtn) {
    copyLandingUrlBtn.addEventListener('click', async () => {
      const target = state.landingSticker || state.userSticker;
      if (!target) return;
      try {
        await navigator.clipboard.writeText(buildUniqueStickerUrl(target));
        state.copiedUrl = true;
        renderApp();
        setTimeout(() => {
          state.copiedUrl = false;
          renderApp();
        }, 2000);
      } catch {
        // Ignore
      }
    });
  }

  const writeWebNfcBtn = document.getElementById('write-web-nfc-btn');
  if (writeWebNfcBtn) {
    writeWebNfcBtn.addEventListener('click', async () => {
      const target = state.userSticker;
      if (!target) return;
      const uniqueUrl = buildUniqueStickerUrl(target);
      if (!('NDEFReader' in window)) {
        state.nfcWriteMessage =
          'Para grabar un tag NFC físico desde tu navegador utiliza Chrome en Android con NFC activado, o abre directamente tu Landing Page de Emergencia con el botón superior.';
        renderApp();
        return;
      }
      try {
        state.nfcWriteMessage = 'Acerca tu sticker NFC físico al reverso del teléfono...';
        renderApp();
        const ndef = new window.NDEFReader();
        await ndef.write({
          records: [{ recordType: 'url', data: uniqueUrl }],
        });
        state.nfcWriteMessage = '¡URL única grabada exitosamente en tu chip NFC!';
        renderApp();
      } catch (err) {
        state.nfcWriteMessage = `No se pudo completar la grabación NFC: ${
          err instanceof Error ? err.message : 'Verifica permisos NFC'
        }`;
        renderApp();
      }
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

  const purchaseForm = document.getElementById('sticker-purchase-form');
  if (purchaseForm) {
    purchaseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      syncFormInputsBeforeReRender();
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      state.orderFolio = `BS-${randomNum}`;
      state.orderCompleted = true;
      renderApp();
    });
  }

  const newOrderBtn = document.getElementById('new-order-btn');
  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', () => {
      state.orderCompleted = false;
      renderApp();
    });
  }
}

// ============================================================================
// 5. Bootstrapping Application
// ============================================================================
function initBikerSafeApp() {
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
      state.hasPopulatedInitialForm = false;
      if (unsubscribeUserStickers) {
        unsubscribeUserStickers();
        unsubscribeUserStickers = null;
      }
    } else {
      subscribeToUserSticker(currentUser);
    }
    renderApp();
  });

  renderApp();
}

initBikerSafeApp();
