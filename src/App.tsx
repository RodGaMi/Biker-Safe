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
  AUTHORIZED_ADMIN_EMAIL,
  EmergencyStickerRecord,
  StickerPackageOption,
  StickerOrderRecord,
  PaymentSettingsRecord,
  OrderStatus,
  DEFAULT_STICKER_PACKAGES,
  DEFAULT_PAYMENT_SETTINGS,
  normalizePackageOption,
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

function MotorcycleBrandIcon() {
  return (
    <svg
      viewBox="0 0 28 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-7 h-5 text-orange-500 shrink-0"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="22.5" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M5.5 14.5L10 8H16.5L19.5 14.5M10 8L13 14.5H19.5M15 4.5H18.5L22.5 14.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  // Configurable 3 purchase packages & SPEI payment settings
  const [packages, setPackages] = useState<StickerPackageOption[]>(
    DEFAULT_STICKER_PACKAGES
  );
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
          sortOrder: i + 1,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
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
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('main');
              setMainStep('profile_form');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <MotorcycleBrandIcon />
            <span>Biker Safe</span>
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
            paymentSettings={paymentSettings}
            onSavePackages={handleSavePackagesFromAdmin}
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

      {/* Footer with requested slogan "Stickers de emergencia NFC" and "Personal autorizado" link */}
      <footer className="border-t border-zinc-800/80 bg-[#08090B] py-5 px-4 sm:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">
            Stickers de emergencia NFC
          </span>
          <div className="flex items-center gap-4">
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
      </footer>
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
