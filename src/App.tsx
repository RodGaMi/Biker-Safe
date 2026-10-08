/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  PhoneCall,
  ChevronDown,
  ChevronUp,
  LogOut,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  auth,
  db,
  signInWithGoogle,
  signInAdminWithGoogle,
  signOutUser,
  OperationType,
  handleFirestoreError,
  BLOOD_TYPES,
  ALL_STICKER_COLORS,
  ALL_STICKER_MODELS,
  AUTHORIZED_ADMIN_EMAIL,
  EmergencyStickerRecord,
  StickerPackageOption,
  StickerModelCatalogRecord,
  StickerOrderRecord,
  PaymentSettingsRecord,
  OrderStatus,
  DEFAULT_STICKER_PACKAGES,
  DEFAULT_STICKER_MODELS,
  DEFAULT_PAYMENT_SETTINGS,
  normalizePackageOption,
  normalizeStickerModelCatalog,
  generateUniqueTagId,
  generateUniqueOrderId,
  sanitizeAndValidateStickerInput,
  parseEncodedStickerPacket,
} from './lib/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  PublicEmergencyLandingPage,
  StickerPurchaseSection,
  AdminLoginView,
  AdminDashboardView,
} from './components/EmergencyViews';

type ViewMode = 'main' | 'public_landing' | 'admin_login' | 'admin_panel';
type MainStep = 'profile_form' | 'sticker_checkout';

function MotorcycleBrandIcon({ logoUrl }: { logoUrl?: string }) {
  if (logoUrl && logoUrl.trim().length > 0) {
    return (
      <img
        src={logoUrl}
        alt="Biker Safe"
        className="h-10 sm:h-12 w-auto max-w-[220px] sm:max-w-[260px] object-contain select-none"
      />
    );
  }
  return (
    <span className="font-bold tracking-tight text-lg text-white">
      BIKER <span className="text-orange-500">SAFE</span>
    </span>
  );
}

export function BikerSafeApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [mainStep, setMainStep] = useState<MainStep>('profile_form');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  // Form states for user's medical emergency profile
  const [currentTagId, setCurrentTagId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [secondaryContactName, setSecondaryContactName] = useState('');
  const [secondaryContactRelation, setSecondaryContactRelation] = useState('');
  const [secondaryContactPhone, setSecondaryContactPhone] = useState('');
  const [motorcycleDetails, setMotorcycleDetails] = useState('');
  const [insuranceDetails, setInsuranceDetails] = useState('');
  const [organDonor, setOrganDonor] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Submission & Feedback state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(false);

  // Saved sticker record for the authenticated user
  const [userSticker, setUserSticker] = useState<EmergencyStickerRecord | null>(
    null
  );
  const [hasPopulatedInitialForm, setHasPopulatedInitialForm] = useState(false);

  // Configurable 3 purchase packages, 3 sticker models & SPEI payment settings
  const [packages, setPackages] = useState<StickerPackageOption[]>(
    DEFAULT_STICKER_PACKAGES
  );
  const [stickerModels, setStickerModels] = useState<
    StickerModelCatalogRecord[]
  >(DEFAULT_STICKER_MODELS);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsRecord>(
    DEFAULT_PAYMENT_SETTINGS
  );
  const [userOrders, setUserOrders] = useState<StickerOrderRecord[]>([]);

  // Admin directory of all registered stickers & orders
  const [adminAllStickers, setAdminAllStickers] = useState<
    EmergencyStickerRecord[]
  >([]);
  const [adminAllOrders, setAdminAllOrders] = useState<StickerOrderRecord[]>(
    []
  );

  // Public NFC Landing Page state (when opened via ?tag=... or previewed by admin)
  const [landingTagId, setLandingTagId] = useState('');
  const [landingSticker, setLandingSticker] =
    useState<EmergencyStickerRecord | null>(null);
  const [loadingLandingSticker, setLoadingLandingSticker] = useState(false);

  // Floating Q&A Page / Doubt Widget State
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [qaCategoryFilter, setQaCategoryFilter] = useState<
    'all' | 'nfc' | 'perfil' | 'compra'
  >('all');
  const [qaExpandedIds, setQaExpandedIds] = useState<string[]>([
    'qa-1',
    'qa-2',
    'qa-4',
    'qa-5',
  ]);

  const QA_CATEGORIES: {
    id: 'all' | 'nfc' | 'perfil' | 'compra';
    label: string;
  }[] = [
    { id: 'all', label: 'Todas las dudas' },
    { id: 'nfc', label: 'Funcionamiento NFC' },
    { id: 'perfil', label: 'Perfil y Privacidad' },
    { id: 'compra', label: 'Modelos, Pago y Entrega' },
  ];

  const QA_ITEMS = [
    {
      id: 'qa-1',
      category: 'nfc',
      categoryLabel: 'Funcionamiento NFC',
      question: '¿Cómo funciona el Sticker NFC durante una emergencia?',
      answer:
        'Al acercar cualquier teléfono inteligente (Android o iPhone) a pocos centímetros del sticker colocado en tu casco o motocicleta, se abre automáticamente en el navegador tu página de emergencia Biker Safe con tu tipo de sangre, alergias, condiciones médicas, póliza de seguro y botones de llamada directa a tus familiares con su parentesco. No requiere instalar ninguna aplicación.',
    },
    {
      id: 'qa-2',
      category: 'nfc',
      categoryLabel: 'Funcionamiento NFC',
      question:
        '¿El sticker necesita batería, recargas o pago de mensualidades?',
      answer:
        'No. La tecnología NFC funciona de forma pasiva por proximidad cuando un celular se acerca al sticker, por lo que nunca requiere batería ni recargas. Además, el acceso y edición de tu perfil médico en Biker Safe no tiene costos mensuales ni anualidades.',
    },
    {
      id: 'qa-3',
      category: 'perfil',
      categoryLabel: 'Perfil y Privacidad',
      question:
        '¿Puedo modificar mis datos médicos o contactos de emergencia después de comprar?',
      answer:
        'Sí, todas las veces que lo necesites. Solo inicia sesión con tu cuenta de Google en Biker Safe, actualiza tus teléfonos de emergencia, parentesco, alergias, seguro o datos de tu motocicleta y guarda los cambios. Tu información se actualiza al instante sin tener que cambiar tu sticker físico.',
    },
    {
      id: 'qa-4',
      category: 'compra',
      categoryLabel: 'Modelos, Pago y Entrega',
      question: '¿Qué modelos y colores puedo elegir para mis stickers?',
      answer:
        'Contamos con 3 modelos diseñados para cada estilo de motociclista: Racer (deportivo/pista), Choper (clásico custom/cruiser) y Cross (enduro/off-road). En cualquiera de nuestros 3 paquetes puedes elegir individualmente el modelo y el color (Rojo, Negro, Gris, Verde, Azul, Rosa, Morado o Amarillo) por cada sticker incluido en tu kit.',
    },
    {
      id: 'qa-5',
      category: 'compra',
      categoryLabel: 'Modelos, Pago y Entrega',
      question: '¿Cómo se realiza el pago y cómo funciona la entrega?',
      answer:
        'Una vez que guardas tu perfil médico (Paso 1) y personalizas tu paquete (Paso 2), realizas tu pago vía Transferencia SPEI indicando tu Folio de Pedido. Para la entrega puedes elegir entre dos opciones que se acuerdan directamente vía WhatsApp: 1) Entrega Personal (únicamente en Estado de México y CDMX) o 2) Envío por Paquetería a toda la República Mexicana.',
    },
    {
      id: 'qa-6',
      category: 'nfc',
      categoryLabel: 'Funcionamiento NFC',
      question:
        '¿En qué parte del casco o motocicleta se recomienda pegar el sticker?',
      answer:
        'En una superficie limpia, lisa y no metálica, preferentemente en el costado lateral o parte trasera inferior de tu casco, o sobre plásticos del carenado/parabrisas de tu motocicleta. Evita pegarlo directamente sobre metal desnudo para asegurar una lectura NFC inmediata.',
    },
    {
      id: 'qa-7',
      category: 'nfc',
      categoryLabel: 'Funcionamiento NFC',
      question: '¿Resiste la lluvia, el sol y el lavado habitual del casco?',
      answer:
        'Sí. Nuestros stickers están diseñados para uso en ruta y exteriores, soportando lluvia, exposición solar, polvo y la limpieza habitual de tu casco o motocicleta sin perder capacidad de lectura.',
    },
    {
      id: 'qa-8',
      category: 'perfil',
      categoryLabel: 'Perfil y Privacidad',
      question: '¿Quién puede ver o editar mi información médica?',
      answer:
        'Tu perfil público contiene exclusivamente datos de auxilio médico e identificación para emergencias. Cualquier paramédico o persona que te auxilie puede leer la ficha al acercar su celular al sticker, pero únicamente tú (iniciando sesión con tu cuenta verificada) puedes modificar tus datos.',
    },
  ];

  // 1. Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setUserSticker(null);
        setHasPopulatedInitialForm(false);
        setAdminAuthenticated(false);
      } else if (
        !currentUser.emailVerified ||
        currentUser.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL
      ) {
        setAdminAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to the 3 purchase packages from Firestore
  useEffect(() => {
    const pkgQuery = query(
      collection(db, 'packages'),
      where('sortOrder', '>=', 1)
    );
    const unsubscribe = onSnapshot(
      pkgQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: StickerPackageOption[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as StickerPackageOption);
          });
          loaded.sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1));
          if (loaded.length === 3) {
            setPackages(
              loaded.map((item, idx) => normalizePackageOption(item, idx))
            );
          }
        }
      },
      () => {
        // Fallback to DEFAULT_STICKER_PACKAGES
      }
    );
    return () => unsubscribe();
  }, []);

  // 2a. Subscribe to the 3 sticker models (Racer, Choper, Cross) from Firestore
  useEffect(() => {
    const modelsQuery = query(
      collection(db, 'sticker_models'),
      where('sortOrder', '>=', 1)
    );
    const unsubscribe = onSnapshot(
      modelsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const byId: Record<string, Partial<StickerModelCatalogRecord>> = {};
          snapshot.forEach((docSnap) => {
            const d = docSnap.data() as StickerModelCatalogRecord;
            if (d && d.modelId) {
              byId[d.modelId] = d;
            }
          });
          setStickerModels(
            DEFAULT_STICKER_MODELS.map((def, idx) =>
              normalizeStickerModelCatalog(byId[def.modelId] || def, idx)
            )
          );
        }
      },
      () => {
        // Fallback to DEFAULT_STICKER_MODELS
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Inspect URL parameters on boot for direct NFC Tag Scan (?tag=msm-xxxx&p=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get('tag');
    const encodedPacket = params.get('p');

    if (tagParam) {
      setLandingTagId(tagParam);
      setViewMode('public_landing');

      const fallbackData = parseEncodedStickerPacket(encodedPacket);
      if (fallbackData && fallbackData.tagId) {
        setLandingSticker({
          tagId: fallbackData.tagId,
          ownerId: '',
          fullName: fallbackData.fullName || 'Motociclista Registrado',
          bloodType: fallbackData.bloodType || 'Desconocido',
          allergies: fallbackData.allergies || '',
          medicalConditions: fallbackData.medicalConditions || '',
          emergencyContactName: fallbackData.emergencyContactName || '',
          emergencyContactRelation: fallbackData.emergencyContactRelation || '',
          emergencyContactPhone: fallbackData.emergencyContactPhone || '',
          secondaryContactName: fallbackData.secondaryContactName || '',
          secondaryContactRelation: fallbackData.secondaryContactRelation || '',
          secondaryContactPhone: fallbackData.secondaryContactPhone || '',
          motorcycleDetails: fallbackData.motorcycleDetails || '',
          insuranceDetails: fallbackData.insuranceDetails || '',
          organDonor: Boolean(fallbackData.organDonor),
          isActive: true,
          accessPin: '',
        });
      }
    }
  }, []);

  // 4. Fetch public sticker from Firestore whenever landingTagId is active
  useEffect(() => {
    const cleanId = landingTagId.trim();
    if (cleanId.length < 4) return;

    let cancelled = false;
    async function fetchPublicSticker() {
      setLoadingLandingSticker(true);
      try {
        const snap = await getDoc(doc(db, 'stickers', cleanId));
        if (!cancelled && snap.exists()) {
          const data = snap.data() as EmergencyStickerRecord;
          setLandingSticker({
            ...data,
            emergencyContactRelation: data.emergencyContactRelation || '',
            secondaryContactName: data.secondaryContactName || '',
            secondaryContactRelation: data.secondaryContactRelation || '',
            secondaryContactPhone: data.secondaryContactPhone || '',
          });
        }
      } catch {
        // Fallback packet in URL will still display if offline
      } finally {
        if (!cancelled) {
          setLoadingLandingSticker(false);
        }
      }
    }

    fetchPublicSticker();
    return () => {
      cancelled = true;
    };
  }, [landingTagId]);

  // 5. Subscribe to the authenticated user's profile in Firestore
  useEffect(() => {
    if (!authReady || !user) return;

    const stickersQuery = query(
      collection(db, 'stickers'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      stickersQuery,
      (snapshot) => {
        const records: EmergencyStickerRecord[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as EmergencyStickerRecord;
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
          setUserSticker(primaryRecord);
          setCurrentTagId(primaryRecord.tagId);

          if (!hasPopulatedInitialForm) {
            setFullName(primaryRecord.fullName);
            setBloodType(primaryRecord.bloodType);
            setAllergies(primaryRecord.allergies);
            setMedicalConditions(primaryRecord.medicalConditions);
            setEmergencyContactName(primaryRecord.emergencyContactName);
            setEmergencyContactRelation(
              primaryRecord.emergencyContactRelation || ''
            );
            setEmergencyContactPhone(primaryRecord.emergencyContactPhone);
            setSecondaryContactName(primaryRecord.secondaryContactName || '');
            setSecondaryContactRelation(
              primaryRecord.secondaryContactRelation || ''
            );
            setSecondaryContactPhone(primaryRecord.secondaryContactPhone || '');
            setMotorcycleDetails(primaryRecord.motorcycleDetails || '');
            setInsuranceDetails(primaryRecord.insuranceDetails || '');
            setOrganDonor(Boolean(primaryRecord.organDonor));
            setHasPopulatedInitialForm(true);

            // Automatically send registered user to their Landing Page on login
            setLandingSticker(primaryRecord);
            setLandingTagId(primaryRecord.tagId);
            setViewMode((prev) =>
              prev === 'admin_login' || prev === 'admin_panel'
                ? prev
                : 'public_landing'
            );
          } else {
            setLandingSticker((prev) =>
              prev && prev.tagId === primaryRecord.tagId ? primaryRecord : prev
            );
          }
        } else {
          setUserSticker(null);
          setCurrentTagId(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'stickers');
      }
    );

    return () => unsubscribe();
  }, [authReady, user, hasPopulatedInitialForm]);

  // 5b. Subscribe to the authenticated user's orders
  useEffect(() => {
    if (!authReady || !user) {
      setUserOrders([]);
      return;
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const list: StickerOrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as StickerOrderRecord);
        });
        list.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setUserOrders(list);
      },
      () => {
        // Ignore if empty
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // 6. Subscribe to all active stickers & orders when Authorized Personnel is logged into Admin Panel
  useEffect(() => {
    if (!authReady || !user || !adminAuthenticated) return;

    const allStickersQuery = query(
      collection(db, 'stickers'),
      where('isActive', '==', true)
    );

    const unsubscribeStickers = onSnapshot(
      allStickersQuery,
      (snapshot) => {
        const all: EmergencyStickerRecord[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as EmergencyStickerRecord;
          all.push({
            ...raw,
            emergencyContactRelation: raw.emergencyContactRelation || '',
            secondaryContactName: raw.secondaryContactName || '',
            secondaryContactRelation: raw.secondaryContactRelation || '',
            secondaryContactPhone: raw.secondaryContactPhone || '',
          });
        });
        setAdminAllStickers(all);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'stickers');
      }
    );

    const allOrdersQuery = query(collection(db, 'orders'));
    const unsubscribeOrders = onSnapshot(
      allOrdersQuery,
      (snapshot) => {
        const allOrd: StickerOrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          allOrd.push(docSnap.data() as StickerOrderRecord);
        });
        allOrd.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setAdminAllOrders(allOrd);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => {
      unsubscribeStickers();
      unsubscribeOrders();
    };
  }, [authReady, user, adminAuthenticated]);

  const handleGoogleSignIn = async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? `Error al iniciar sesión: ${err.message}`
          : 'No se pudo completar la autenticación.'
      );
    }
  };

  const handleSavePackagesFromAdmin = async (
    updatedPackages: StickerPackageOption[]
  ) => {
    for (let i = 0; i < updatedPackages.length; i++) {
      const pkg = updatedPackages[i];
      const cleanName = pkg.name.trim().slice(0, 80);
      const cleanSubtitle = pkg.subtitle.trim().slice(0, 80);
      const cleanPrice = Math.max(1, Math.min(100000, Number(pkg.price) || 249));
      const cleanStickerCount = Math.max(
        1,
        Math.min(10, Math.round(Number(pkg.stickerCount) || 1))
      );
      const cleanAvailableColors =
        Array.isArray(pkg.availableColors) && pkg.availableColors.length > 0
          ? pkg.availableColors.filter((c) =>
              (ALL_STICKER_COLORS as readonly string[]).includes(c)
            )
          : [...ALL_STICKER_COLORS];
      const cleanAvailableModels =
        Array.isArray(pkg.availableModels) && pkg.availableModels.length > 0
          ? pkg.availableModels.filter((m) =>
              (ALL_STICKER_MODELS as readonly string[]).includes(m)
            )
          : [...ALL_STICKER_MODELS];
      const cleanSpecs = pkg.specs.trim().slice(0, 250);
      const path = `packages/${pkg.pkgId}`;

      try {
        await setDoc(doc(db, 'packages', pkg.pkgId), {
          pkgId: pkg.pkgId,
          name: cleanName.length >= 2 ? cleanName : pkg.name,
          subtitle: cleanSubtitle.length >= 1 ? cleanSubtitle : pkg.subtitle,
          price: cleanPrice,
          specs: cleanSpecs.length >= 2 ? cleanSpecs : pkg.specs,
          stickerCount: cleanStickerCount,
          availableColors: cleanAvailableColors,
          availableModels: cleanAvailableModels,
          sortOrder: i + 1,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  const handleSaveStickerModelFromAdmin = async (
    updatedModel: StickerModelCatalogRecord
  ) => {
    const normalized = normalizeStickerModelCatalog(
      updatedModel,
      Math.max(0, (updatedModel.sortOrder || 1) - 1)
    );
    const path = `sticker_models/${normalized.modelId}`;
    try {
      await setDoc(doc(db, 'sticker_models', normalized.modelId), {
        modelId: normalized.modelId,
        name: normalized.name,
        description: normalized.description,
        referenceImageUrl: normalized.referenceImageUrl,
        imageRojo: normalized.imageRojo,
        imageNegro: normalized.imageNegro,
        imageGris: normalized.imageGris,
        imageVerde: normalized.imageVerde,
        imageAzul: normalized.imageAzul,
        imageRosa: normalized.imageRosa,
        imageMorado: normalized.imageMorado,
        imageAmarillo: normalized.imageAmarillo,
        sortOrder: normalized.sortOrder,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDeleteStickerFromAdmin = async (
    targetSticker: EmergencyStickerRecord
  ) => {
    const docPath = `stickers/${targetSticker.tagId}`;
    try {
      await deleteDoc(doc(db, 'stickers', targetSticker.tagId));
      setAdminAllStickers((prev) =>
        prev.filter((item) => item.tagId !== targetSticker.tagId)
      );
      if (userSticker && userSticker.tagId === targetSticker.tagId) {
        setUserSticker(null);
        setCurrentTagId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const handleCreateOrder = async (
    orderInput: Omit<
      StickerOrderRecord,
      'orderId' | 'ownerId' | 'paymentMethod' | 'status' | 'createdAt' | 'updatedAt'
    >
  ): Promise<StickerOrderRecord> => {
    if (!user) {
      throw new Error('Inicia sesión para registrar tu pedido.');
    }
    const orderId = generateUniqueOrderId();
    const record: StickerOrderRecord = {
      orderId,
      ownerId: user.uid,
      paymentMethod: 'SPEI_WHATSAPP',
      status: 'pendiente_pago',
      ...orderInput,
    };
    const docPath = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  };

  const handleSavePaymentSettingsFromAdmin = async (
    updated: PaymentSettingsRecord
  ) => {
    const docPath = 'payment_settings/spei';
    try {
      await setDoc(doc(db, 'payment_settings', 'spei'), {
        settingId: 'spei',
        bankName: updated.bankName.trim().slice(0, 80),
        beneficiaryName: updated.beneficiaryName.trim().slice(0, 120),
        clabe: updated.clabe.trim().slice(0, 24),
        accountOrCard: (updated.accountOrCard || '').trim().slice(0, 30),
        whatsappNumber: updated.whatsappNumber.trim().slice(0, 25),
        paymentInstructions: (updated.paymentInstructions || '')
          .trim()
          .slice(0, 350),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  };

  const handleUpdateOrderStatusFromAdmin = async (
    orderId: string,
    status: OrderStatus
  ) => {
    const docPath = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  };

  const handleDeleteOrderFromAdmin = async (orderId: string) => {
    const docPath = `orders/${orderId}`;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setAdminAllOrders((prev) =>
        prev.filter((item) => item.orderId !== orderId)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const handleLoadSampleData = () => {
    setFullName('Miguel Ángel Rojas');
    setBloodType('O+');
    setAllergies('Penicilina, Látex');
    setMedicalConditions('Asma controlada, Tomo salbutamol en inhalador');
    setEmergencyContactName('María González');
    setEmergencyContactRelation('Esposa');
    setEmergencyContactPhone('+52 55 1234 5678');
    setSecondaryContactName('Carlos Rojas');
    setSecondaryContactRelation('Hermano');
    setSecondaryContactPhone('+52 55 8765 4321');
    setMotorcycleDetails('Yamaha MT-07 Gris · Casco AGV K6');
    setInsuranceDetails('GNP Seguros Póliza #MX-994120');
    setOrganDonor(true);
    setFormError(null);
  };

  const handleSubmitProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccessBanner(false);

    let activeUser = user;
    if (!activeUser) {
      try {
        activeUser = await signInWithGoogle();
      } catch {
        setFormError(
          'Inicia sesión con tu cuenta segura para guardar tu perfil médico y vincular tu Sticker NFC.'
        );
        return;
      }
    }

    const isUpdatingExisting = Boolean(currentTagId && userSticker);
    const targetTagId = currentTagId || generateUniqueTagId();

    const validation = sanitizeAndValidateStickerInput({
      tagId: targetTagId,
      ownerId: activeUser.uid,
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
      organDonor,
      isActive: true,
      accessPin: '',
    });

    if (validation.valid === false) {
      setFormError(validation.error);
      return;
    }

    setSubmitting(true);
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

      setUserSticker(validation.data);
      setCurrentTagId(validation.data.tagId);
      setLandingSticker(validation.data);
      setLandingTagId(validation.data.tagId);
      setSaveSuccessBanner(true);

      // Once generated/updated, advance to the custom NFC Sticker purchase step
      setMainStep('sticker_checkout');
    } catch (error) {
      handleFirestoreError(
        error,
        isUpdatingExisting ? OperationType.UPDATE : OperationType.CREATE,
        docPath
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C0E] text-zinc-100">
      {/* Top Bar Contract: Brand — Single Main Screen Link — User Auth Action */}
      <header className="bg-[#08090B] text-white border-b border-zinc-800/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark (Logo only) */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('main');
              setMainStep('profile_form');
            }}
            aria-label="Biker Safe"
            className="inline-flex items-center whitespace-nowrap shrink-0"
          >
            <MotorcycleBrandIcon />
          </a>

          {/* Zone 2: Only Main Screen in Menu */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setViewMode('main');
              }}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'main'
                  ? 'text-orange-500 border-b-2 border-orange-500 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pantalla Principal
            </button>
          </nav>

          {/* Zone 3: User Account Action */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-zinc-400 truncate max-w-[180px]">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={signOutUser}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-orange-500" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-black bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión Segura</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {viewMode === 'public_landing' ? (
          <PublicEmergencyLandingPage
            sticker={landingSticker || userSticker}
            loading={loadingLandingSticker}
            isOwnerViewing={Boolean(
              user &&
                (landingSticker || userSticker) &&
                ((landingSticker || userSticker)?.ownerId === user.uid ||
                  (userSticker &&
                    userSticker.tagId === (landingSticker || userSticker)?.tagId))
            )}
            isAdminPreview={adminAuthenticated}
            onBackToMainScreen={() => {
              setViewMode('main');
            }}
            onEditOwnerInfo={() => {
              setViewMode('main');
              setMainStep('profile_form');
            }}
            onBuyOwnerSticker={() => {
              setViewMode('main');
              setMainStep('sticker_checkout');
            }}
            onBackToAdmin={() => {
              setViewMode('admin_panel');
            }}
          />
        ) : viewMode === 'admin_login' ? (
          <AdminLoginView
            currentUserEmail={user?.email}
            verifyAdminGoogleAccount={async () => {
              let targetUser = user;
              if (
                !targetUser ||
                !targetUser.emailVerified ||
                targetUser.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL
              ) {
                try {
                  targetUser = await signInAdminWithGoogle();
                } catch {
                  return {
                    ok: false,
                    error:
                      'Se requiere verificar tu identidad con Google para acceder al panel.',
                  };
                }
              }

              if (
                !targetUser.emailVerified ||
                targetUser.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL
              ) {
                setAdminAuthenticated(false);
                return {
                  ok: false,
                  error: `Acceso denegado: El correo "${
                    targetUser.email || 'desconocido'
                  }" no está autorizado. Solo se permite verificar con ${AUTHORIZED_ADMIN_EMAIL}.`,
                };
              }

              return { ok: true };
            }}
            onLoginSuccess={() => {
              setAdminAuthenticated(true);
              setViewMode('admin_panel');
            }}
            onCancel={() => setViewMode('main')}
          />
        ) : viewMode === 'admin_panel' && adminAuthenticated ? (
          <AdminDashboardView
            stickers={adminAllStickers}
            orders={adminAllOrders}
            packages={packages}
            stickerModels={stickerModels}
            paymentSettings={paymentSettings}
            onSavePackages={handleSavePackagesFromAdmin}
            onSaveStickerModel={handleSaveStickerModelFromAdmin}
            onSavePaymentSettings={handleSavePaymentSettingsFromAdmin}
            onUpdateOrderStatus={handleUpdateOrderStatusFromAdmin}
            onDeleteOrder={handleDeleteOrderFromAdmin}
            onDeleteSticker={handleDeleteStickerFromAdmin}
            onPreviewStickerLanding={(targetSticker) => {
              setLandingSticker(targetSticker);
              setLandingTagId(targetSticker.tagId);
              setViewMode('public_landing');
            }}
            onExitAdmin={() => {
              setAdminAuthenticated(false);
              setViewMode('main');
            }}
          />
        ) : (
          <div className="space-y-8">
            {/* Step Progress & Mode Switcher inside Pantalla Principal (No URL exposed to customer) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14161A] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMainStep('profile_form')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    mainStep === 'profile_form'
                      ? 'bg-orange-500 text-black'
                      : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
                  }`}
                >
                  1. Mis Datos Médicos (Perfil Seguro)
                </button>

                <button
                  type="button"
                  disabled={!userSticker}
                  onClick={() => {
                    if (userSticker) setMainStep('sticker_checkout');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                    !userSticker
                      ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                      : mainStep === 'sticker_checkout'
                      ? 'bg-orange-500 text-black cursor-pointer'
                      : 'bg-zinc-800/80 text-zinc-300 hover:text-white cursor-pointer'
                  }`}
                >
                  2. Compra de Sticker NFC Personalizado
                </button>
              </div>
            </div>

            {mainStep === 'sticker_checkout' && userSticker ? (
              <StickerPurchaseSection
                sticker={userSticker}
                packages={packages}
                stickerModels={stickerModels}
                paymentSettings={paymentSettings}
                userOrders={userOrders}
                onCreateOrder={handleCreateOrder}
                onEditProfile={() => setMainStep('profile_form')}
              />
            ) : (
              /* Step 1: Secure User Profile Form (Create & Modify anytime) */
              <div className="max-w-3xl mx-auto bg-[#14161A] rounded-2xl border border-zinc-800 p-6 sm:p-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-500 mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {userSticker
                          ? `PERFIL MÉDICO ACTIVO · ID: ${userSticker.tagId}`
                          : 'PERFIL MÉDICO DE EMERGENCIA'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
                      {userSticker
                        ? 'Tus Datos de Emergencia (Modificables)'
                        : 'Configura tu Sticker NFC'}
                    </h1>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline cursor-pointer self-start sm:self-center whitespace-nowrap"
                  >
                    Cargar ejemplo
                  </button>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed mb-7">
                  Tu cuenta protege la edición de estos datos. Puedes modificarlos cuando lo necesites y una vez guardado tu registro pasarás a la selección y compra de tu sticker NFC personalizado.
                </p>

                {!user && (
                  <div className="mb-6 p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-zinc-300">
                      <strong className="text-white block mb-0.5">
                        Cuenta Segura de Usuario
                      </strong>
                      Inicia sesión para guardar o modificar tus datos médicos en cualquier momento.
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      Conectar mi Cuenta
                    </button>
                  </div>
                )}

                {formError && (
                  <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-200 font-medium">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {saveSuccessBanner && (
                  <div className="mb-6 p-4 bg-zinc-900 border border-orange-500/60 rounded-xl flex items-center justify-between gap-3 text-xs text-zinc-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>
                        Tus datos médicos se han guardado correctamente en tu perfil (
                        <strong className="font-mono text-orange-400">
                          {currentTagId}
                        </strong>
                        ).
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitProfileForm} className="space-y-5">
                  {/* Row 1: Nombre Completo & Tipo de Sangre */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                    <div className="sm:col-span-7">
                      <label
                        htmlFor="fullName"
                        className="block text-xs font-semibold text-zinc-300 mb-2"
                      >
                        Nombre Completo
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        required
                        maxLength={100}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Miguel Ángel Rojas"
                        className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label
                        htmlFor="bloodType"
                        className="block text-xs font-semibold text-zinc-300 mb-2"
                      >
                        Tipo de Sangre
                      </label>
                      <select
                        id="bloodType"
                        required
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Selecciona...</option>
                        {BLOOD_TYPES.map((bt) => (
                          <option key={bt} value={bt}>
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Alergias Conocidas */}
                  <div>
                    <label
                      htmlFor="allergies"
                      className="block text-xs font-semibold text-zinc-300 mb-2"
                    >
                      Alergias Conocidas
                    </label>
                    <input
                      id="allergies"
                      type="text"
                      maxLength={500}
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Ej. Penicilina, Látex (Deja en blanco si no aplica)"
                      className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Row 3: Condiciones Médicas / Medicación Actual */}
                  <div>
                    <label
                      htmlFor="medicalConditions"
                      className="block text-xs font-semibold text-zinc-300 mb-2"
                    >
                      Condiciones Médicas / Medicación Actual
                    </label>
                    <textarea
                      id="medicalConditions"
                      rows={3}
                      maxLength={1000}
                      value={medicalConditions}
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      placeholder="Ej. Asma, Diabetes tipo 1, Tomo anticoagulantes..."
                      className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-y"
                    />
                  </div>

                  <hr className="border-zinc-800 my-6" />

                  {/* Section: Contactos de Emergencia */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-orange-500 shrink-0" />
                      <h2 className="text-base font-bold text-white">
                        Contactos de Emergencia
                      </h2>
                    </div>

                    {/* Contacto Principal */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-5">
                        <label
                          htmlFor="emergencyContactName"
                          className="block text-xs font-semibold text-zinc-300 mb-2"
                        >
                          Nombre del Contacto Principal
                        </label>
                        <input
                          id="emergencyContactName"
                          type="text"
                          required
                          maxLength={100}
                          value={emergencyContactName}
                          onChange={(e) =>
                            setEmergencyContactName(e.target.value)
                          }
                          placeholder="Ej. María González"
                          className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor="emergencyContactRelation"
                          className="block text-xs font-semibold text-zinc-300 mb-2"
                        >
                          Parentesco
                        </label>
                        <input
                          id="emergencyContactRelation"
                          type="text"
                          required
                          maxLength={50}
                          value={emergencyContactRelation}
                          onChange={(e) =>
                            setEmergencyContactRelation(e.target.value)
                          }
                          placeholder="Ej. Esposa, Madre..."
                          className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label
                          htmlFor="emergencyContactPhone"
                          className="block text-xs font-semibold text-zinc-300 mb-2"
                        >
                          Teléfono Principal
                        </label>
                        <input
                          id="emergencyContactPhone"
                          type="tel"
                          required
                          maxLength={30}
                          value={emergencyContactPhone}
                          onChange={(e) =>
                            setEmergencyContactPhone(e.target.value)
                          }
                          placeholder="+52 55 1234 5678"
                          className="w-full px-4 py-2.5 text-sm font-mono tabular-nums text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Segundo Contacto de Emergencia */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                      <div className="sm:col-span-5">
                        <label
                          htmlFor="secondaryContactName"
                          className="block text-xs font-semibold text-zinc-300 mb-2"
                        >
                          Nombre del Segundo Contacto (Opcional)
                        </label>
                        <input
                          id="secondaryContactName"
                          type="text"
                          maxLength={100}
                          value={secondaryContactName}
                          onChange={(e) =>
                            setSecondaryContactName(e.target.value)
                          }
                          placeholder="Ej. Carlos Rojas"
                          className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor="secondaryContactRelation"
                          className="block text-xs font-semibold text-zinc-300 mb-2"
                        >
                          Parentesco (Opcional)
                        </label>
                        <input
                          id="secondaryContactRelation"
                          type="text"
                          maxLength={50}
                          value={secondaryContactRelation}
                          onChange={(e) =>
                            setSecondaryContactRelation(e.target.value)
                          }
                          placeholder="Ej. Hermano, Padre..."
                          className="w-full px-4 py-2.5 text-sm text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label
                          htmlFor="secondaryContactPhone"
                          className="block text-xs font-semibold text-zinc-300 mb-2"
                        >
                          Teléfono del Segundo Contacto (Opcional)
                        </label>
                        <input
                          id="secondaryContactPhone"
                          type="tel"
                          maxLength={30}
                          value={secondaryContactPhone}
                          onChange={(e) =>
                            setSecondaryContactPhone(e.target.value)
                          }
                          placeholder="+52 55 8765 4321"
                          className="w-full px-4 py-2.5 text-sm font-mono tabular-nums text-white bg-[#0B0C0E] border border-zinc-800 rounded-lg placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional Extended Identification Parameters */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      {showAdvancedFields ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span>
                        Datos de motocicleta, póliza de seguro médico y donación de órganos (Opcional)
                      </span>
                    </button>

                    {showAdvancedFields && (
                      <div className="mt-4 p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                              Motocicleta / Casco / Placa
                            </label>
                            <input
                              type="text"
                              maxLength={150}
                              value={motorcycleDetails}
                              onChange={(e) =>
                                setMotorcycleDetails(e.target.value)
                              }
                              placeholder="Ej. Yamaha MT-07 · Casco AGV Negro"
                              className="w-full px-3.5 py-2 text-xs text-white bg-[#14161A] border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                              Seguro Médico / Póliza / NSS
                            </label>
                            <input
                              type="text"
                              maxLength={150}
                              value={insuranceDetails}
                              onChange={(e) =>
                                setInsuranceDetails(e.target.value)
                              }
                              placeholder="Ej. IMSS / GNP Póliza #88412"
                              className="w-full px-3.5 py-2 text-xs text-white bg-[#14161A] border border-zinc-800 rounded-lg focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={organDonor}
                            onChange={(e) => setOrganDonor(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
                          />
                          <span>Soy donador de órganos voluntario</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Consentimiento expreso Aviso de Privacidad */}
                  <div className="p-3.5 bg-[#0B0C0E] border border-zinc-800 rounded-xl text-xs text-zinc-400 leading-relaxed">
                    Al guardar tu perfil médico otorgas tu consentimiento expreso
                    conforme a nuestro{' '}
                    <button
                      type="button"
                      onClick={() => setPrivacyModalOpen(true)}
                      className="text-orange-400 hover:text-orange-300 font-semibold underline cursor-pointer"
                    >
                      Aviso de Privacidad Integral
                    </button>{' '}
                    para que los datos registrados en esta ficha puedan ser
                    consultados de forma inmediata al escanear físicamente tu
                    Sticker NFC en caso de emergencia, y declaras contar con
                    autorización de tus contactos de emergencia para incluir sus
                    teléfonos de auxilio.
                  </div>

                  {/* Primary Action Button */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-9 py-3.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {submitting
                        ? 'Guardando tu perfil...'
                        : userSticker
                        ? 'Guardar Cambios y Continuar al Sticker NFC'
                        : 'Generar Registro y Comprar Sticker NFC'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer with requested slogan "Stickers de emergencia NFC", Aviso de Privacidad and "Personal autorizado" link */}
      <footer className="border-t border-zinc-800/80 bg-[#08090B] py-5 px-4 sm:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 text-xs text-zinc-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-semibold text-zinc-300">
              Stickers de emergencia NFC
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('main');
                  setMainStep('profile_form');
                }}
                className="text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer"
              >
                Pantalla Principal
              </button>
              <span aria-hidden="true" className="text-zinc-700">
                ·
              </span>
              <button
                type="button"
                onClick={() => setQaModalOpen(true)}
                className="text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer"
              >
                Dudas (Q&amp;A)
              </button>
              <span aria-hidden="true" className="text-zinc-700">
                ·
              </span>
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(true)}
                className="text-zinc-300 hover:text-orange-400 font-semibold transition-colors cursor-pointer"
              >
                Aviso de Privacidad
              </button>
              <span aria-hidden="true" className="text-zinc-700">
                ·
              </span>
              <button
                type="button"
                onClick={() => {
                  if (adminAuthenticated) {
                    setViewMode('admin_panel');
                  } else {
                    setViewMode('admin_login');
                  }
                }}
                className="text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer"
              >
                Personal autorizado
              </button>
            </div>
          </div>
          <div className="border-t border-zinc-900 pt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 text-center sm:text-left">
            <span>
              Tus datos personales y médicos están protegidos conforme a la
              LFPDPPP y se utilizan exclusivamente para tu identificación de
              emergencia NFC y entrega de pedidos.
            </span>
            <button
              type="button"
              onClick={() => setPrivacyModalOpen(true)}
              className="text-orange-400/90 hover:text-orange-300 underline cursor-pointer shrink-0"
            >
              Consultar Aviso de Privacidad Integral
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Doubt / Q&A Button (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setQaModalOpen((prev) => !prev)}
          aria-label="Dudas y Preguntas Frecuentes (Q&A)"
          title="Dudas y Preguntas Frecuentes (Q&A)"
          aria-expanded={qaModalOpen}
          className={`group w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-xl transition-transform duration-150 hover:scale-105 cursor-pointer ${
            qaModalOpen
              ? 'bg-zinc-900 text-orange-500 border-2 border-orange-500'
              : 'bg-orange-500 hover:bg-orange-400 text-black border border-orange-400/40'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 sm:w-7 sm:h-7"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>

      {/* Floating Q&A Page Overlay */}
      {qaModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setQaModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qa-modal-title"
        >
          <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-[#14161A] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col">
            {/* Top Sticky Header of Q&A Page */}
            <div className="sticky top-0 z-10 bg-[#08090B]/95 backdrop-blur border-b border-zinc-800 px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-500 shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h2
                    id="qa-modal-title"
                    className="text-base sm:text-lg font-bold text-white tracking-tight"
                  >
                    Centro de Dudas y Preguntas Frecuentes (Q&amp;A)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Conoce qué hacemos en Biker Safe y resuelve todas tus dudas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQaModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <span>Cerrar</span>
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            {/* Q&A Page Body */}
            <div className="p-5 sm:p-8 space-y-8">
              {/* Initial Section: Brief Description of What We Do */}
              <section className="bg-gradient-to-br from-[#181B20] via-[#121418] to-[#0B0C0E] border border-orange-500/40 rounded-2xl p-5 sm:p-7 space-y-5">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-orange-500 tracking-wide">
                    ¿QUÉ HACEMOS EN BIKER SAFE?
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Identificación Médica de Emergencia al Instante para Motociclistas
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    En <strong className="text-white">Biker Safe</strong>{' '}
                    desarrollamos un sistema de identificación médica y contacto
                    de emergencia mediante{' '}
                    <strong className="text-orange-400">
                      Stickers NFC inteligentes
                    </strong>{' '}
                    diseñados para colocarse en tu casco o motocicleta.
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Sabemos que en un accidente en ruta o ciudad cada segundo
                    cuenta. Nuestro objetivo es que cualquier paramédico,
                    rescatista o ciudadano pueda{' '}
                    <strong className="text-zinc-200">
                      acercar su teléfono celular a tu sticker NFC
                    </strong>{' '}
                    y consultar en menos de 2 segundos tu ficha médica vital
                    (tipo de sangre, alergias, condiciones médicas, póliza de
                    seguro y datos de tu moto) así como{' '}
                    <strong className="text-zinc-200">
                      llamar con un toque a tus familiares de emergencia
                    </strong>{' '}
                    sabiendo su parentesco, sin necesidad de instalar
                    aplicaciones ni desbloquear tu teléfono.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      01. Registra tu Perfil Médico
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Guarda tus datos vitales, alergias y contactos de
                      emergencia con su parentesco. Puedes actualizar tu
                      información cuando quieras.
                    </p>
                  </div>

                  <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      02. Elige Modelo y Color
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Selecciona tu paquete y personaliza cada sticker eligiendo
                      entre los modelos{' '}
                      <strong className="text-zinc-200">
                        Racer, Choper o Cross
                      </strong>{' '}
                      y 8 colores disponibles.
                    </p>
                  </div>

                  <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      03. Protección Activa 24/7
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Recibe tus stickers programados (entrega personal en
                      CDMX/EdoMéx o envío nacional acordado por WhatsApp). No
                      usan batería ni mensualidades.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2: Interactive Q&A / Preguntas Frecuentes */}
              <section className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Preguntas Frecuentes (Q&amp;A)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Haz clic en cualquier pregunta para ver u ocultar la
                      respuesta detallada
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0B0C0E] border border-zinc-800 rounded-xl">
                    {QA_CATEGORIES.map((cat) => {
                      const isActive = qaCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setQaCategoryFilter(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            isActive
                              ? 'bg-orange-500 text-black font-bold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {(qaCategoryFilter === 'all'
                    ? QA_ITEMS
                    : QA_ITEMS.filter(
                        (item) => item.category === qaCategoryFilter
                      )
                  ).map((item) => {
                    const isExpanded = qaExpandedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`bg-[#0B0C0E] border ${
                          isExpanded ? 'border-orange-500/50' : 'border-zinc-800'
                        } rounded-xl overflow-hidden transition-colors`}
                      >
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setQaExpandedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            )
                          }
                          className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-zinc-900/60 transition-colors cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="text-[11px] font-medium text-orange-400">
                              {item.categoryLabel}
                            </div>
                            <div className="text-sm sm:text-base font-bold text-white">
                              {item.question}
                            </div>
                          </div>
                          <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 shrink-0 font-bold text-sm">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/70">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Bottom Call to Action inside Q&A Page */}
              <section className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    ¿Listo para proteger tu casco o tienes otra pregunta?
                  </div>
                  <p className="text-xs text-zinc-400">
                    Configura tu perfil médico ahora mismo o escríbenos
                    directamente por WhatsApp.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <a
                    href={`https://wa.me/${String(
                      paymentSettings?.whatsappNumber ||
                        DEFAULT_PAYMENT_SETTINGS.whatsappNumber
                    ).replace(
                      /[^0-9]/g,
                      ''
                    )}?text=${encodeURIComponent(
                      'Hola Biker Safe, visité su plataforma y tengo una duda sobre los Stickers NFC de emergencia:'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    Preguntar por WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setQaModalOpen(false);
                      setViewMode('main');
                    }}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Ir a Configurar mi Sticker NFC
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Aviso de Privacidad Integral Modal Overlay */}
      {privacyModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPrivacyModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
        >
          <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-[#14161A] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 bg-[#08090B]/95 backdrop-blur border-b border-zinc-800 px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-500 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="privacy-modal-title"
                    className="text-base sm:text-lg font-bold text-white tracking-tight"
                  >
                    Aviso de Privacidad Integral y Protección de Datos Personales
                  </h2>
                  <p className="text-xs text-zinc-400">
                    En cumplimiento con la Ley Federal de Protección de Datos
                    Personales en Posesión de los Particulares (LFPDPPP)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <span>Cerrar</span>
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="p-5 sm:p-8 space-y-6 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <section className="bg-gradient-to-br from-[#181B20] via-[#121418] to-[#0B0C0E] border border-orange-500/40 rounded-2xl p-5 sm:p-6 space-y-2.5">
                <div className="text-xs font-bold text-orange-500 tracking-wide">
                  1. IDENTIDAD Y COMPROMISO DEL RESPONSABLE
                </div>
                <p>
                  <strong className="text-white">Biker Safe</strong> (Sistema de
                  Identificación Médica de Emergencia mediante Stickers NFC), con
                  operaciones en la Ciudad de México y Estado de México, es
                  responsable del uso, resguardo y protección de los datos
                  personales y datos personales sensibles que usted (el{' '}
                  <strong className="text-white">«Titular»</strong> o{' '}
                  <strong className="text-white">«Usuario»</strong>) registra
                  voluntariamente en nuestra plataforma digital, en estricto apego
                  a la{' '}
                  <strong className="text-white">
                    Ley Federal de Protección de Datos Personales en Posesión de
                    los Particulares (LFPDPPP)
                  </strong>
                  , su Reglamento y los Lineamientos del Aviso de Privacidad
                  vigentes en los Estados Unidos Mexicanos.
                </p>
              </section>

              <section className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  2. Datos Personales y Datos Sensibles que Recabamos
                </h3>
                <p className="text-zinc-400">
                  Para el funcionamiento del sistema de auxilio médico NFC y la
                  entrega de sus stickers personalizados, recabamos única y
                  exclusivamente las siguientes categorías de datos proporcionados
                  de manera directa por el Usuario:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      A) Datos de Identificación y Cuenta
                    </div>
                    <p className="text-xs text-zinc-300">
                      Nombre completo, correo electrónico de autenticación segura
                      (vía inicio de sesión verificado con Google), datos
                      identificativos de motocicleta/casco e identificador único del
                      Sticker NFC (
                      <span className="font-mono text-orange-400">Tag ID</span>).
                    </p>
                  </div>

                  <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      B) Datos Personales Sensibles de Salud
                    </div>
                    <p className="text-xs text-zinc-300">
                      Tipo de sangre, alergias conocidas, condiciones médicas o
                      padecimientos crónicos, medicación actual, institución o número
                      de póliza de seguro médico/NSS y declaración de donación
                      voluntaria de órganos.
                    </p>
                  </div>

                  <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      C) Datos de Contactos de Emergencia (Terceros)
                    </div>
                    <p className="text-xs text-zinc-300">
                      Nombre, parentesco y número telefónico de hasta dos personas
                      de confianza designadas para recibir llamadas de auxilio en
                      caso de accidente. El Usuario manifiesta bajo protesta de
                      decir verdad que cuenta con el consentimiento previo de dichos
                      contactos para registrar sus datos con fines exclusivamente de
                      emergencia.
                    </p>
                  </div>

                  <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-orange-400">
                      D) Datos de Pedido y Entrega
                    </div>
                    <p className="text-xs text-zinc-300">
                      Nombre del destinatario, número telefónico/WhatsApp de contacto
                      y domicilio o zona de entrega (alcaldía/municipio en CDMX y
                      Estado de México para entrega personal, o dirección postal para
                      envío por paquetería nacional).{' '}
                      <strong className="text-white">
                        No recabamos ni almacenamos números de tarjetas bancarias,
                        CVV ni contraseñas financieras.
                      </strong>
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  3. Finalidades del Tratamiento y Naturaleza Pública del Sticker de
                  Emergencia NFC
                </h3>
                <p>
                  Los datos recabados se utilizan{' '}
                  <strong className="text-white">
                    única y exclusivamente para las siguientes finalidades primarias
                  </strong>{' '}
                  que dan origen a la relación entre Biker Safe y el Usuario:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                  <li>
                    <strong className="text-white">
                      Despliegue inmediato en emergencias viales o médicas:
                    </strong>{' '}
                    Generar y alojar la ficha médica digital vinculada al chip NFC
                    de su sticker para que paramédicos, cuerpos de emergencia,
                    autoridades o ciudadanos que auxilien al motociclista puedan
                    leerla en segundos al acercar un teléfono móvil al sticker sin
                    requerir contraseñas ni bloqueos.
                  </li>
                  <li>
                    <strong className="text-white">
                      Comunicación inmediata con familiares:
                    </strong>{' '}
                    Habilitar los botones de marcación telefónica directa a los
                    contactos de emergencia registrados por el Usuario.
                  </li>
                  <li>
                    <strong className="text-white">
                      Programación, cobro SPEI y entrega del pedido:
                    </strong>{' '}
                    Grabar el identificador único en los modelos de sticker
                    seleccionados (
                    <strong className="text-orange-400">
                      Racer, Choper o Cross
                    </strong>
                    ), validar su pago vía transferencia SPEI y coordinar la entrega
                    personal (CDMX / Estado de México) o el envío por paquetería a
                    toda la República Mexicana mediante WhatsApp.
                  </li>
                </ul>
                <div className="p-4 bg-[#14161A] border border-orange-500/40 rounded-xl text-xs text-zinc-200 space-y-1.5 mt-2">
                  <div className="font-bold text-orange-400">
                    CONSENTIMIENTO EXPRESO Y ALCANCE DE RESPONSABILIDAD SOBRE EL
                    STICKER FÍSICO:
                  </div>
                  <p>
                    El Usuario comprende, acepta y consiente expresamente que, por la
                    naturaleza misma de un dispositivo de identificación de
                    emergencia colocado en el exterior de un casco o motocicleta,{' '}
                    <strong className="text-white">
                      cualquier persona que tenga acceso físico o cercano a su
                      Sticker NFC podrá visualizar los datos médicos y teléfonos de
                      emergencia vinculados a dicho identificador
                    </strong>
                    . En consecuencia, el Usuario decide bajo su propia
                    responsabilidad qué información incluye en su perfil público y
                    libera a <strong className="text-white">Biker Safe</strong> de
                    cualquier responsabilidad civil, administrativa o de cualquier
                    otra índole derivada de la consulta por terceros que escaneen
                    físicamente el sticker, así como de la veracidad, exactitud o
                    actualización de los datos médicos ingresados por el propio
                    Usuario.
                  </p>
                </div>
              </section>

              <section className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  4. Confidencialidad, Seguridad y No Comercialización de Datos
                </h3>
                <p>
                  <strong className="text-white">
                    Biker Safe NO vende, renta, cede ni comercializa sus datos
                    personales ni médicos con terceros
                  </strong>{' '}
                  para fines publicitarios, de mercadotecnia ni de prospección
                  comercial.
                </p>
                <p className="text-zinc-400">
                  Los datos de domicilio postal y teléfono de contacto
                  proporcionados en el Paso 2 de compra nunca se muestran en la
                  ficha pública de emergencia del Sticker NFC; permanecen
                  resguardados con acceso restringido únicamente para coordinar la
                  entrega de su paquete y, en caso de envío nacional, compartir los
                  datos de destinatario con la empresa de paquetería acordada. La
                  edición del perfil médico está protegida mediante autenticación
                  criptográfica de cuenta de usuario (Firebase Authentication), de
                  modo que solo el titular autenticado puede modificar su ficha.
                </p>
              </section>

              <section className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  5. Ejercicio de Derechos ARCO (Acceso, Rectificación, Cancelación y
                  Oposición) y Revocación
                </h3>
                <p>
                  Usted es dueño de su información en todo momento y cuenta con dos
                  vías directas para ejercer sus{' '}
                  <strong className="text-white">Derechos ARCO</strong> o revocar su
                  consentimiento:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                  <li>
                    <strong className="text-white">
                      Edición inmediata en línea:
                    </strong>{' '}
                    Al iniciar sesión con su cuenta en la Pantalla Principal de Biker
                    Safe, usted puede consultar, rectificar, actualizar o suprimir
                    cualquier dato médico o teléfono de emergencia en tiempo real.
                  </li>
                  <li>
                    <strong className="text-white">
                      Solicitud de Cancelación o Baja Definitiva:
                    </strong>{' '}
                    Puede solicitar en cualquier momento la eliminación total y
                    definitiva de su perfil médico y de su historial de pedidos
                    enviando un mensaje directo a nuestro canal oficial de atención
                    por WhatsApp indicando su nombre completo y el folio de su perfil
                    (
                    <span className="font-mono text-orange-400">Tag ID</span>). Su
                    solicitud será atendida y ejecutada de forma inmediata sin costo
                    alguno.
                  </li>
                </ul>
              </section>

              <section className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">
                    6. Actualizaciones y Contacto Directo de Privacidad
                  </div>
                  <p className="text-xs text-zinc-400">
                    Cualquier actualización a este Aviso de Privacidad estará
                    siempre disponible en el pie de página de esta plataforma.
                    Última actualización: Octubre 2026.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <a
                    href={`https://wa.me/${String(
                      paymentSettings?.whatsappNumber ||
                        DEFAULT_PAYMENT_SETTINGS.whatsappNumber
                    ).replace(
                      /[^0-9]/g,
                      ''
                    )}?text=${encodeURIComponent(
                      'Hola Biker Safe, deseo realizar una consulta sobre el Aviso de Privacidad y mis Datos Personales (Derechos ARCO):'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    Contacto de Privacidad / Derechos ARCO
                  </a>
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(false)}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Entendido y Aceptar
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BikerSafeApp />
    </ErrorBoundary>
  );
}
