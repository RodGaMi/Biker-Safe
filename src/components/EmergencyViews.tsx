import React, { useState } from 'react';
import {
  PhoneCall,
  AlertTriangle,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Activity,
  ShoppingBag,
  Truck,
  CheckCircle2,
  ArrowLeft,
  Edit3,
  HeartPulse,
  Lock,
  Search,
  Settings,
  LogOut,
  Trash2,
} from 'lucide-react';
import {
  EmergencyStickerRecord,
  StickerPackageOption,
  StickerOrderRecord,
  PaymentSettingsRecord,
  OrderStatus,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  DeliveryMethod,
  DEFAULT_STICKER_PACKAGES,
  DEFAULT_PAYMENT_SETTINGS,
  ALL_STICKER_COLORS,
  STICKER_COLOR_SWATCHES,
  AUTHORIZED_ADMIN_EMAIL,
  normalizePackageOption,
  buildUniqueStickerUrl,
  buildWhatsAppOrderUrl,
} from '../lib/firebase';

function isPersonalDeliveryOrder(order: StickerOrderRecord): boolean {
  return (
    order.deliveryMethod === 'personal_cdmx_edomex' ||
    String(order.shippingStreet || '').includes('Entrega Personal')
  );
}

// ============================================================================
// 1. Public Emergency Landing Page (No passwords, no login walls, direct access)
// ============================================================================
interface PublicLandingProps {
  sticker: EmergencyStickerRecord | null;
  loading: boolean;
  isOwnerViewing?: boolean;
  isAdminPreview?: boolean;
  onBackToMainScreen: () => void;
  onEditOwnerInfo?: () => void;
  onBuyOwnerSticker?: () => void;
  onBackToAdmin?: () => void;
}

export const PublicEmergencyLandingPage: React.FC<PublicLandingProps> = ({
  sticker,
  loading,
  isOwnerViewing,
  isAdminPreview,
  onBackToMainScreen,
  onEditOwnerInfo,
  onBuyOwnerSticker,
  onBackToAdmin,
}) => {
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6 animate-pulse">
        <div className="h-40 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-36 bg-zinc-900 border border-zinc-800 rounded-2xl" />
          <div className="h-36 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!sticker) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-[#14161A] border border-zinc-800 rounded-2xl p-10">
        <Wifi className="w-10 h-10 text-orange-500 mx-auto" />
        <h1 className="text-xl font-bold text-white">
          Perfil de Emergencia No Encontrado
        </h1>
        <p className="text-sm text-zinc-400">
          El enlace del sticker NFC consultado no existe o aún no ha sido registrado.
        </p>
        <button
          type="button"
          onClick={onBackToMainScreen}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
        >
          Ir a Pantalla Principal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isAdminPreview && onBackToAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14161A] border border-orange-500/50 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-orange-400 font-semibold">
            <span>Vista Previa de Administrador</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{sticker.tagId}</span>
          </div>
          <button
            type="button"
            onClick={onBackToAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Panel de Administración</span>
          </button>
        </div>
      )}

      {isOwnerViewing && onEditOwnerInfo && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14161A] border border-zinc-800 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-semibold text-white">
              Tu Perfil de Emergencia Activo
            </span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span className="font-mono tabular-nums text-orange-400">
              {sticker.tagId}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onEditOwnerInfo}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar mi Información</span>
            </button>
            {onBuyOwnerSticker && (
              <button
                type="button"
                onClick={onBuyOwnerSticker}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                <span>Comprar Sticker NFC</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Emergency Identification Banner */}
      <section className="bg-gradient-to-br from-[#181B20] via-[#121418] to-[#0B0C0E] border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="bg-orange-500 text-black px-6 py-2.5 flex items-center justify-between text-xs font-bold tracking-wide">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 shrink-0" />
            <span>INFORMACIÓN MÉDICA CRÍTICA DE EMERGENCIA · ACCESO DIRECTO NFC</span>
          </div>
          <span className="font-mono tabular-nums hidden sm:inline">
            BIKER SAFE ID: {sticker.tagId}
          </span>
        </div>

        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-400">
              MOTOCICLISTA / PACIENTE REGISTRADO
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {sticker.fullName}
            </h1>

            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-300">
              {sticker.motorcycleDetails && (
                <>
                  <span>
                    <strong className="text-zinc-100">Motocicleta / Casco:</strong>{' '}
                    {sticker.motorcycleDetails}
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                </>
              )}
              <span>
                <strong className="text-zinc-100">Seguro Médico / Póliza:</strong>{' '}
                {sticker.insuranceDetails || 'No especificado'}
              </span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span>
                <strong className="text-zinc-100">Donador de Órganos:</strong>{' '}
                {sticker.organDonor ? 'Sí (Autorizado)' : 'No especificado'}
              </span>
            </div>
          </div>

          {/* High-Contrast Blood Type Display */}
          <div className="bg-[#0B0C0E] border-2 border-orange-500 rounded-2xl px-7 py-4 text-center shrink-0 self-start md:self-center">
            <span className="block text-[11px] font-bold text-zinc-400 tracking-wider">
              TIPO DE SANGRE
            </span>
            <span className="block text-4xl font-bold font-mono tabular-nums text-orange-500 mt-0.5">
              {sticker.bloodType}
            </span>
          </div>
        </div>
      </section>

      {/* Critical Medical Data Grid (Allergies & Conditions) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-orange-500 font-bold text-xs tracking-wide">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ALERGIAS CONOCIDAS</span>
          </div>
          <p className="text-base font-semibold text-white leading-relaxed">
            {sticker.allergies
              ? sticker.allergies
              : 'Sin alergias medicamentosas o materiales reportadas.'}
          </p>
        </div>

        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-orange-500 font-bold text-xs tracking-wide">
            <Activity className="w-4 h-4 shrink-0" />
            <span>CONDICIONES MÉDICAS Y MEDICACIÓN ACTUAL</span>
          </div>
          <p className="text-base font-semibold text-white leading-relaxed">
            {sticker.medicalConditions
              ? sticker.medicalConditions
              : 'Sin condiciones médicas crónicas ni medicación activa reportada.'}
          </p>
        </div>
      </section>

      {/* Direct Call Emergency Contacts Section */}
      <section className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Contactos de Emergencia Directos
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Toca cualquier botón para realizar la llamada telefónica inmediata sin claves ni bloqueos.
            </p>
          </div>
          <a
            href="tel:911"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
          >
            <PhoneCall className="w-3.5 h-3.5 text-orange-500" />
            <span>Llamar al 911 Emergencias</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Contact */}
          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-orange-400">
                CONTACTO DE EMERGENCIA 1 (PRINCIPAL)
              </span>
              <div className="text-lg font-bold text-white mt-1">
                {sticker.emergencyContactName}
              </div>
              {sticker.emergencyContactRelation && (
                <div className="text-xs font-medium text-orange-300 mt-0.5">
                  Parentesco: {sticker.emergencyContactRelation}
                </div>
              )}
              <div className="text-sm font-mono tabular-nums text-zinc-300 mt-1">
                {sticker.emergencyContactPhone}
              </div>
            </div>

            <a
              href={`tel:${sticker.emergencyContactPhone.replace(/\s+/g, '')}`}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Llamar a {sticker.emergencyContactName}</span>
            </a>
          </div>

          {/* Secondary Contact */}
          {sticker.secondaryContactName || sticker.secondaryContactPhone ? (
            <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400">
                  CONTACTO DE EMERGENCIA 2 (SECUNDARIO)
                </span>
                <div className="text-lg font-bold text-white mt-1">
                  {sticker.secondaryContactName || 'Contacto Secundario'}
                </div>
                {sticker.secondaryContactRelation && (
                  <div className="text-xs font-medium text-zinc-300 mt-0.5">
                    Parentesco: {sticker.secondaryContactRelation}
                  </div>
                )}
                <div className="text-sm font-mono tabular-nums text-zinc-300 mt-1">
                  {sticker.secondaryContactPhone || 'Teléfono no especificado'}
                </div>
              </div>

              {sticker.secondaryContactPhone && (
                <a
                  href={`tel:${sticker.secondaryContactPhone.replace(/\s+/g, '')}`}
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-orange-500" />
                  <span>
                    Llamar a {sticker.secondaryContactName || 'Contacto 2'}
                  </span>
                </a>
              )}
            </div>
          ) : (
            <div className="bg-[#0B0C0E] border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-center items-center text-center text-xs text-zinc-500">
              <span>Sin segundo contacto de emergencia registrado.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// 2. Custom NFC Sticker Purchase & Order Component (Step 2 — NO URL shown to customer)
// ============================================================================
interface StickerPurchaseProps {
  sticker: EmergencyStickerRecord;
  packages: StickerPackageOption[];
  paymentSettings: PaymentSettingsRecord;
  userOrders: StickerOrderRecord[];
  onCreateOrder: (
    orderInput: Omit<
      StickerOrderRecord,
      'orderId' | 'ownerId' | 'paymentMethod' | 'status' | 'createdAt' | 'updatedAt'
    >
  ) => Promise<StickerOrderRecord>;
  onEditProfile: () => void;
}

export const StickerPurchaseSection: React.FC<StickerPurchaseProps> = ({
  sticker,
  packages,
  paymentSettings,
  userOrders,
  onCreateOrder,
  onEditProfile,
}) => {
  const activePackages =
    packages && packages.length === 3
      ? packages.map((p, idx) => normalizePackageOption(p, idx))
      : DEFAULT_STICKER_PACKAGES;
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pro');
  const [selectedColors, setSelectedColors] = useState<string[]>([
    'Rojo',
    'Negro',
    'Gris',
    'Verde',
    'Azul',
    'Rosa',
    'Morado',
    'Amarillo',
    'Rojo',
    'Negro',
  ]);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    'personal_cdmx_edomex'
  );
  const [recipientName, setRecipientName] = useState(sticker.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingStreet, setShippingStreet] = useState('');
  const [shippingColony, setShippingColony] = useState('');
  const [shippingCityState, setShippingCityState] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');

  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<StickerOrderRecord | null>(
    null
  );
  const [copiedClabe, setCopiedClabe] = useState(false);

  const selectedPkg =
    activePackages.find((p) => p.pkgId === selectedPkgId) ||
    activePackages[1] ||
    activePackages[0];

  const stickerCount = Math.max(
    1,
    Math.min(10, Number(selectedPkg.stickerCount) || 1)
  );
  const availColors =
    Array.isArray(selectedPkg.availableColors) &&
    selectedPkg.availableColors.length > 0
      ? selectedPkg.availableColors
      : [...ALL_STICKER_COLORS];

  const chosenColors: string[] = [];
  for (let i = 0; i < stickerCount; i++) {
    const candidate = selectedColors[i];
    if (candidate && availColors.includes(candidate)) {
      chosenColors.push(candidate);
    } else {
      chosenColors.push(availColors[i % availColors.length]);
    }
  }

  const handleSelectColorForUnit = (unitIdx: number, colorName: string) => {
    setSelectedColors((prev) => {
      const next = [...prev];
      next[unitIdx] = colorName;
      return next;
    });
  };

  const handleCopyClabe = async () => {
    try {
      await navigator.clipboard.writeText(paymentSettings.clabe || '');
      setCopiedClabe(true);
      setTimeout(() => setCopiedClabe(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setCheckoutSubmitting(true);
    try {
      const cleanStreet =
        deliveryMethod === 'personal_cdmx_edomex'
          ? 'Entrega Personal (Edo. de México / CDMX)'
          : shippingStreet.trim();
      const cleanColony =
        deliveryMethod === 'personal_cdmx_edomex'
          ? 'Acordar vía WhatsApp'
          : shippingColony.trim();
      const cleanZip =
        deliveryMethod === 'personal_cdmx_edomex'
          ? 'N/A'
          : shippingPostalCode.trim();

      const created = await onCreateOrder({
        tagId: sticker.tagId,
        riderName: sticker.fullName,
        pkgId: selectedPkg.pkgId,
        pkgName: selectedPkg.name,
        stickerCount,
        selectedColors: chosenColors,
        totalPrice: Number(selectedPkg.price) || 249,
        deliveryMethod,
        recipientName: recipientName.trim() || sticker.fullName,
        recipientPhone: recipientPhone.trim(),
        shippingStreet: cleanStreet,
        shippingColony: cleanColony,
        shippingCityState: shippingCityState.trim(),
        shippingPostalCode: cleanZip,
        shippingNotes: shippingNotes.trim(),
      });
      setActiveOrder(created);
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el pedido. Verifica tus datos de entrega.'
      );
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  return (
    <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-500 mb-1">
            <span>PASO 2 · STICKER FÍSICO PERSONALIZADO</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              FOLIO PERFIL: {sticker.tagId}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Adquiere tu Sticker NFC Biker Safe
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Nosotros programamos y vinculamos tu sticker físico con tu perfil médico antes de enviarlo a tu domicilio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modificar mis Datos Médicos</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Physical Custom Helmet Sticker Preview ONLY (No URL shown to customer) (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B0C0E] border-2 border-orange-500/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-sm font-bold text-white tracking-tight">
                  Biker Safe NFC
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-orange-400">
                {sticker.tagId}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-orange-500/40 flex flex-col items-center justify-center shrink-0 text-orange-500">
                <Wifi className="w-7 h-7" />
                <span className="text-[10px] font-bold tracking-wider text-zinc-300 mt-0.5">
                  NFC
                </span>
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-bold text-orange-500 flex items-center gap-1">
                  <span>STICKER DE EMERGENCIA</span>
                </div>
                <div className="text-base font-bold text-white truncate">
                  {sticker.fullName}
                </div>
                <div className="text-xs font-mono tabular-nums text-zinc-300">
                  Tipo de Sangre:{' '}
                  <strong className="text-orange-400">{sticker.bloodType}</strong>
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  Contacto 1: {sticker.emergencyContactName}
                  {sticker.emergencyContactRelation
                    ? ` (${sticker.emergencyContactRelation})`
                    : ''}
                </div>
                {sticker.secondaryContactName && (
                  <div className="text-[11px] text-zinc-400 truncate">
                    Contacto 2: {sticker.secondaryContactName}
                    {sticker.secondaryContactRelation
                      ? ` (${sticker.secondaryContactRelation})`
                      : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Colors Summary in Preview */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-2">
              <div className="text-[11px] font-semibold text-zinc-300">
                {chosenColors.length === 1
                  ? 'Color de Sticker seleccionado:'
                  : `Colores seleccionados (${chosenColors.length} stickers):`}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chosenColors.map((colorName, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{
                        backgroundColor:
                          STICKER_COLOR_SWATCHES[colorName] || '#f97316',
                      }}
                    />
                    <span>
                      #{idx + 1}: {colorName}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end text-[11px] text-zinc-400">
              <span>Listo para colocar en casco</span>
            </div>
          </div>

          <div className="p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200 block mb-1">
              Configuración Certificada Biker Safe
            </strong>
            Nuestro equipo técnico graba tu perfil médico directamente en el chip NFC de tu sticker antes del envío. Si actualizas tus datos en el Paso 1, tu sticker mostrará la información actualizada automáticamente.
          </div>
        </div>

        {/* Right: Package Selector, Shipping Form & Option B SPEI + WhatsApp Checkout (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeOrder ? (
            <div className="bg-[#0B0C0E] border-2 border-orange-500 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-orange-400">
                    <span>
                      PEDIDO REGISTRADO · FOLIO #
                      {activeOrder.orderId.toUpperCase()}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {ORDER_STATUS_LABELS[activeOrder.status] ||
                        'Pendiente de Pago'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Paso Final: Pago por Transferencia SPEI y Confirmación por
                    WhatsApp
                  </h3>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="block text-[10px] text-zinc-400 uppercase">
                    Total a Transferir
                  </span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-orange-500">
                    ${activeOrder.totalPrice} MXN
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {paymentSettings.paymentInstructions}
              </p>

              {/* SPEI Bank Details Card */}
              <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-bold text-orange-400">
                    DATOS BANCARIOS PARA TRANSFERENCIA SPEI / DEPÓSITO
                  </span>
                  <span className="text-[11px] text-zinc-400">0% Comisión</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Banco Receptor:</span>
                    <strong className="text-white text-sm">
                      {paymentSettings.bankName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Beneficiario:</span>
                    <strong className="text-white text-sm">
                      {paymentSettings.beneficiaryName}
                    </strong>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0B0C0E] border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">
                      CLABE Interbancaria:
                    </span>
                    <span className="text-base font-bold font-mono tabular-nums text-orange-400 tracking-wider select-all">
                      {paymentSettings.clabe}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyClabe}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    {copiedClabe ? '¡CLABE Copiada!' : 'Copiar CLABE'}
                  </button>
                </div>

                {paymentSettings.accountOrCard ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <span className="text-zinc-500 block">
                        Número de Cuenta / Tarjeta:
                      </span>
                      <strong className="text-zinc-200 font-mono tabular-nums">
                        {paymentSettings.accountOrCard}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">
                        Concepto o Referencia de Pago:
                      </span>
                      <strong className="text-orange-400 font-mono tabular-nums">
                        FOLIO {activeOrder.orderId.toUpperCase()}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs">
                    <span className="text-zinc-500">
                      Concepto o Referencia de Pago:{' '}
                    </span>
                    <strong className="text-orange-400 font-mono tabular-nums">
                      FOLIO {activeOrder.orderId.toUpperCase()}
                    </strong>
                  </div>
                )}
              </div>

              {/* Order Summary Box */}
              <div className="p-4 bg-[#14161A] border border-zinc-800 rounded-xl space-y-1.5 text-xs text-zinc-300">
                <div>
                  <strong className="text-white">Paquete:</strong>{' '}
                  {activeOrder.pkgName} ({activeOrder.stickerCount}{' '}
                  {activeOrder.stickerCount === 1 ? 'sticker' : 'stickers'} · $
                  {activeOrder.totalPrice} MXN)
                </div>
                <div>
                  <strong className="text-white">Colores por Sticker:</strong>{' '}
                  {(activeOrder.selectedColors || [])
                    .map((c, i) => `Sticker #${i + 1}: ${c}`)
                    .join(' · ')}
                </div>
                <div>
                  <strong className="text-white">Modalidad de Entrega:</strong>{' '}
                  <span className="text-orange-400 font-semibold">
                    {isPersonalDeliveryOrder(activeOrder)
                      ? 'Entrega Personal (Solo Estado de México y CDMX · Se acuerda vía WhatsApp)'
                      : 'Envío por Paquetería a toda la República (Se acuerda vía WhatsApp)'}
                  </span>
                </div>
                <div>
                  <strong className="text-white">Recibe:</strong>{' '}
                  {activeOrder.recipientName} · Tel / WhatsApp:{' '}
                  <span className="font-mono tabular-nums">
                    {activeOrder.recipientPhone}
                  </span>
                </div>
                {isPersonalDeliveryOrder(activeOrder) ? (
                  <div>
                    <strong className="text-white">
                      Zona / Alcaldía o Municipio (CDMX / EdoMéx):
                    </strong>{' '}
                    {activeOrder.shippingCityState}
                    {activeOrder.shippingNotes
                      ? ` · Punto/Horario sugerido: ${activeOrder.shippingNotes}`
                      : ''}
                  </div>
                ) : (
                  <div>
                    <strong className="text-white">Dirección de Envío:</strong>{' '}
                    {activeOrder.shippingStreet}, Col.{' '}
                    {activeOrder.shippingColony}, C.P.{' '}
                    {activeOrder.shippingPostalCode},{' '}
                    {activeOrder.shippingCityState}
                    {activeOrder.shippingNotes
                      ? ` (${activeOrder.shippingNotes})`
                      : ''}
                  </div>
                )}
              </div>

              {/* Primary Action: Send Order & Receipt via WhatsApp */}
              <div className="space-y-3 pt-1">
                <a
                  href={buildWhatsAppOrderUrl(activeOrder, paymentSettings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors text-center"
                >
                  <span>
                    Enviar Comprobante y Acordar Entrega por WhatsApp
                  </span>
                </a>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveOrder(null)}
                    className="text-xs font-semibold text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    ← Realizar otro pedido o cambiar paquete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmPurchase} className="space-y-6">
              {checkoutError && (
                <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
                  {checkoutError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-3">
                  1. Selecciona tu Opción de Compra de Tag NFC
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {activePackages.map((pkg) => {
                    const active = pkg.pkgId === selectedPkgId;
                    const count = Math.max(1, Number(pkg.stickerCount) || 1);
                    return (
                      <div
                        key={pkg.pkgId}
                        onClick={() => setSelectedPkgId(pkg.pkgId)}
                        className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                          active
                            ? 'bg-[#0B0C0E] border-orange-500'
                            : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {pkg.name}
                            </span>
                            <span className="text-xs text-orange-400 font-medium">
                              · {pkg.subtitle}
                            </span>
                            <span className="text-xs font-mono tabular-nums text-zinc-300">
                              · {count} {count === 1 ? 'Sticker' : 'Stickers'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">{pkg.specs}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-bold font-mono tabular-nums text-orange-500">
                            ${pkg.price}
                          </span>
                          <span className="block text-[10px] text-zinc-500">
                            MXN
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Sticker Color Selector based on selectedPkg.stickerCount */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-xs font-bold text-zinc-300">
                    2. Elige el Color de{' '}
                    {chosenColors.length === 1
                      ? 'tu Sticker NFC'
                      : `cada uno de tus ${chosenColors.length} Stickers NFC`}
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {chosenColors.length === 1
                      ? 'Este paquete incluye 1 sticker. Selecciona el color de tu preferencia:'
                      : `Este paquete incluye ${chosenColors.length} stickers. Elige el color para cada uno:`}
                  </p>
                </div>

                <div className="space-y-3">
                  {chosenColors.map((selectedColor, unitIdx) => (
                    <div
                      key={unitIdx}
                      className="p-3.5 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                          Sticker #{unitIdx + 1}
                        </span>
                        <span className="text-orange-400 font-semibold">
                          Color: {selectedColor}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availColors.map((colorOption) => {
                          const isSelected = selectedColor === colorOption;
                          const hex =
                            STICKER_COLOR_SWATCHES[colorOption] || '#f97316';
                          return (
                            <button
                              key={colorOption}
                              type="button"
                              onClick={() =>
                                handleSelectColorForUnit(unitIdx, colorOption)
                              }
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-800 border-orange-500 text-white'
                                  : 'bg-[#14161A] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-white/25 shrink-0"
                                style={{ backgroundColor: hex }}
                              />
                              <span>{colorOption}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Delivery Method (2 options, both agreed via WhatsApp) */}
              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <Truck className="w-4 h-4 text-orange-500" />
                    <span>
                      3. Modalidad de Entrega (En ambos casos se acuerda vía
                      WhatsApp)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Elige si prefieres entrega personal en Estado de México /
                    CDMX o envío por paquetería a toda la República. Ambos
                    métodos se coordinan directamente por WhatsApp.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('personal_cdmx_edomex')}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer space-y-1.5 ${
                      deliveryMethod === 'personal_cdmx_edomex'
                        ? 'bg-[#0B0C0E] border-orange-500'
                        : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        1. Entrega Personal
                      </span>
                      <span className="text-[11px] font-semibold text-orange-400">
                        Solo Edo. Méx. y CDMX
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Nos ponemos de acuerdo vía WhatsApp sobre el punto de
                      encuentro, día y horario en CDMX o Estado de México.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('paqueteria_nacional')}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer space-y-1.5 ${
                      deliveryMethod === 'paqueteria_nacional'
                        ? 'bg-[#0B0C0E] border-orange-500'
                        : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        2. Envío por Paquetería
                      </span>
                      <span className="text-[11px] font-semibold text-orange-400">
                        Toda la República
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Enviamos a cualquier estado de la República Mexicana. La
                      paquetería, cotización y guía se acuerdan vía WhatsApp.
                    </p>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Nombre de quien recibe
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Ej. Miguel Ángel Rojas"
                      className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Teléfono / WhatsApp para acordar entrega
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={30}
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="Ej. +52 55 1234 5678"
                      className="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {deliveryMethod === 'personal_cdmx_edomex' ? (
                  <div className="p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-4">
                    <div className="text-xs text-orange-400 font-semibold">
                      Entrega Personal en Estado de México y CDMX · Se acuerda
                      punto y horario por WhatsApp
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                        Alcaldía (CDMX) o Municipio (Estado de México)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={shippingCityState}
                        onChange={(e) => setShippingCityState(e.target.value)}
                        placeholder="Ej. Naucalpan, Edo. de México / Benito Juárez, CDMX"
                        className="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                        Punto o zona sugerida / Horario preferido (Se acuerda
                        vía WhatsApp)
                      </label>
                      <input
                        type="text"
                        maxLength={250}
                        value={shippingNotes}
                        onChange={(e) => setShippingNotes(e.target.value)}
                        placeholder="Ej. Estación de Metro / Plaza comercial cercana, tardes o fin de semana"
                        className="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#0B0C0E] border border-zinc-800 rounded-xl space-y-4">
                    <div className="text-xs text-orange-400 font-semibold">
                      Envío por Paquetería a toda la República · Se acuerda
                      envío y guía por WhatsApp
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-7">
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Calle y Número (Ext. / Int.)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={200}
                          value={shippingStreet}
                          onChange={(e) => setShippingStreet(e.target.value)}
                          placeholder="Ej. Av. Insurgentes Sur 1450 Int. 4B"
                          className="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Colonia
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={shippingColony}
                          onChange={(e) => setShippingColony(e.target.value)}
                          placeholder="Ej. Col. Del Valle"
                          className="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-8">
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Ciudad, Municipio y Estado de la República
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={shippingCityState}
                          onChange={(e) => setShippingCityState(e.target.value)}
                          placeholder="Ej. Guadalajara, Jalisco / Monterrey, Nuevo León"
                          className="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Código Postal
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={shippingPostalCode}
                          onChange={(e) =>
                            setShippingPostalCode(e.target.value)
                          }
                          placeholder="Ej. 44100"
                          className="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                        Referencias del domicilio / Notas para paquetería
                        (Opcional)
                      </label>
                      <input
                        type="text"
                        maxLength={250}
                        value={shippingNotes}
                        onChange={(e) => setShippingNotes(e.target.value)}
                        placeholder="Ej. Entre calles Pilares y Matías Romero, fachada gris"
                        className="w-full px-4 py-2.5 text-sm bg-[#14161A] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Payment Method Summary (Option B: SPEI + WhatsApp) */}
              <div className="p-4 bg-[#0B0C0E] border border-orange-500/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400">
                    4. Método de Pago: Transferencia SPEI + WhatsApp
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-white">
                    Total: ${selectedPkg.price} MXN
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Al confirmar tu pedido se guardará tu orden con folio único, verás los datos bancarios (CLABE) para realizar tu transferencia SPEI y podrás enviar tu comprobante directo por WhatsApp.
                </p>
              </div>

              <button
                type="submit"
                disabled={checkoutSubmitting}
                className="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {checkoutSubmitting
                    ? 'Registrando tu Pedido...'
                    : `Confirmar Pedido y Pagar por Transferencia SPEI ($${selectedPkg.price} MXN)`}
                </span>
              </button>
            </form>
          )}

          {userOrders.length > 0 && (
            <div className="bg-[#0B0C0E] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="text-xs font-bold text-zinc-300">
                Mis Pedidos Registrados ({userOrders.length})
              </div>
              <div className="space-y-2.5">
                {userOrders.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="p-3.5 bg-[#14161A] border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-orange-400">
                          #{ord.orderId.toUpperCase()}
                        </span>
                        <span className="font-semibold text-white">
                          {ord.pkgName}
                        </span>
                        <span className="font-mono tabular-nums text-zinc-300">
                          · ${ord.totalPrice} MXN
                        </span>
                        <span className="text-zinc-400">
                          · Estatus:{' '}
                          <strong className="text-orange-300">
                            {ORDER_STATUS_LABELS[ord.status] ||
                              'Pendiente de Pago'}
                          </strong>
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Colores:{' '}
                        {(ord.selectedColors || [])
                          .map((c, i) => `#${i + 1}: ${c}`)
                          .join(', ')}{' '}
                        ·{' '}
                        {isPersonalDeliveryOrder(ord)
                          ? 'Entrega Personal (CDMX / EdoMéx · WhatsApp)'
                          : 'Envío por Paquetería (WhatsApp)'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveOrder(ord)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 font-semibold rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                    >
                      Ver Datos SPEI / WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. Authorized Personnel Login View ("Personal autorizado")
// ============================================================================
interface AdminLoginViewProps {
  currentUserEmail?: string | null;
  onLoginSuccess: () => void;
  onCancel: () => void;
  verifyAdminGoogleAccount: () => Promise<{ ok: boolean; error?: string }>;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  currentUserEmail,
  onLoginSuccess,
  onCancel,
  verifyAdminGoogleAccount,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCurrentUserAdmin = Boolean(
    currentUserEmail &&
      currentUserEmail.toLowerCase() === AUTHORIZED_ADMIN_EMAIL
  );

  const handleGoogleVerifyOnly = async () => {
    setError(null);
    setLoading(true);
    const res = await verifyAdminGoogleAccount();
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error ||
          `Acceso denegado. Solo se permite verificar con ${AUTHORIZED_ADMIN_EMAIL}.`
      );
      return;
    }
    onLoginSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (
      (cleanUser === 'admin' || cleanUser === AUTHORIZED_ADMIN_EMAIL) &&
      cleanPass === 'bikersafe2026'
    ) {
      setLoading(true);
      const res = await verifyAdminGoogleAccount();
      setLoading(false);
      if (!res.ok) {
        setError(
          res.error ||
            `Acceso denegado. Solo se permite verificar con ${AUTHORIZED_ADMIN_EMAIL}.`
        );
        return;
      }
      onLoginSuccess();
    } else {
      setError(
        'Credenciales incorrectas. Verifica tu correo autorizado y contraseña.'
      );
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-[#14161A] border border-zinc-800 rounded-2xl p-8 space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-500 tracking-wide">
          <Lock className="w-4 h-4" />
          <span>ACCESO RESTRINGIDO · PERSONAL AUTORIZADO</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Administración Interna Biker Safe
        </h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          El acceso administrativo requiere verificación exclusiva con el correo personal autorizado de Google.
        </p>
      </div>

      {currentUserEmail &&
        (isCurrentUserAdmin ? (
          <div className="p-3.5 bg-[#0B0C0E] border border-orange-500/50 rounded-xl text-xs text-zinc-200">
            Sesión de Google verificada como administrador:{' '}
            <strong className="text-orange-400 font-mono">
              {currentUserEmail}
            </strong>
          </div>
        ) : (
          <div className="p-3.5 bg-red-950/40 border border-red-800/70 rounded-xl text-xs text-red-200">
            La cuenta activa (
            <strong className="font-mono">{currentUserEmail}</strong>) no tiene
            permisos de administrador. Debes verificar con el correo autorizado.
          </div>
        ))}

      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleVerifyOnly}
          className="w-full py-3 px-5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
        >
          {loading
            ? 'Verificando cuenta de Google...'
            : isCurrentUserAdmin
            ? 'Entrar con mi Correo Autorizado Verificado'
            : 'Verificar con Cuenta de Google Autorizada'}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 pt-3 border-t border-zinc-800"
      >
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Correo Autorizado
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Correo autorizado"
            className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Contraseña de Administración Interna
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Validar Credenciales y Correo de Google
        </button>
      </form>

      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="text-zinc-400 hover:text-white cursor-pointer"
        >
          ← Volver a Pantalla Principal
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 4. Internal Administration Panel (All Records + NFC URLs + 3 Package Options Editor)
// ============================================================================
interface AdminDashboardViewProps {
  stickers: EmergencyStickerRecord[];
  orders: StickerOrderRecord[];
  packages: StickerPackageOption[];
  paymentSettings: PaymentSettingsRecord;
  onSavePackages: (updated: StickerPackageOption[]) => Promise<void>;
  onSavePaymentSettings: (updated: PaymentSettingsRecord) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onDeleteSticker: (sticker: EmergencyStickerRecord) => Promise<void>;
  onPreviewStickerLanding: (sticker: EmergencyStickerRecord) => void;
  onExitAdmin: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stickers,
  orders,
  packages,
  paymentSettings,
  onSavePackages,
  onSavePaymentSettings,
  onUpdateOrderStatus,
  onDeleteOrder,
  onDeleteSticker,
  onPreviewStickerLanding,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'records' | 'packages'>(
    'orders'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [copiedTagId, setCopiedTagId] = useState<string | null>(null);
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(
    null
  );
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<
    string | null
  >(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);

  const [editablePackages, setEditablePackages] = useState<
    StickerPackageOption[]
  >(() =>
    (packages && packages.length === 3
      ? packages
      : DEFAULT_STICKER_PACKAGES
    ).map((p, idx) => normalizePackageOption(p, idx))
  );
  const [savingPackages, setSavingPackages] = useState(false);
  const [packagesSavedSuccess, setPackagesSavedSuccess] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);

  const [editablePayment, setEditablePayment] = useState<PaymentSettingsRecord>(
    () => ({
      ...(paymentSettings || DEFAULT_PAYMENT_SETTINGS),
    })
  );
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSavedSuccess, setPaymentSavedSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const q = searchQuery.trim().toLowerCase();
  const filteredStickers = stickers.filter((s) => {
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.tagId.toLowerCase().includes(q) ||
      s.bloodType.toLowerCase().includes(q) ||
      s.emergencyContactName.toLowerCase().includes(q)
    );
  });

  const oq = orderSearchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((ord) => {
    if (!oq) return true;
    return (
      ord.orderId.toLowerCase().includes(oq) ||
      ord.riderName.toLowerCase().includes(oq) ||
      ord.recipientName.toLowerCase().includes(oq) ||
      ord.recipientPhone.toLowerCase().includes(oq) ||
      ord.tagId.toLowerCase().includes(oq) ||
      ord.shippingCityState.toLowerCase().includes(oq)
    );
  });

  const handleCopyUrl = async (sticker: EmergencyStickerRecord) => {
    try {
      await navigator.clipboard.writeText(buildUniqueStickerUrl(sticker));
      setCopiedTagId(sticker.tagId);
      setTimeout(() => setCopiedTagId(null), 2000);
    } catch {
      // Ignore
    }
  };

  const handleConfirmDeleteRecord = async (sticker: EmergencyStickerRecord) => {
    setDeletingTagId(sticker.tagId);
    setNfcMessage(null);
    try {
      await onDeleteSticker(sticker);
      setConfirmDeleteTagId(null);
      setNfcMessage(
        `Registro de ${sticker.fullName} (${sticker.tagId}) eliminado correctamente.`
      );
    } finally {
      setDeletingTagId(null);
    }
  };

  const handleConfirmDeleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId);
    setNfcMessage(null);
    try {
      await onDeleteOrder(orderId);
      setConfirmDeleteOrderId(null);
      setNfcMessage(`Pedido #${orderId.toUpperCase()} eliminado correctamente.`);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleOrderStatusChange = async (
    orderId: string,
    nextStatus: OrderStatus
  ) => {
    setUpdatingOrderId(orderId);
    try {
      await onUpdateOrderStatus(orderId, nextStatus);
      setNfcMessage(
        `Estatus del pedido #${orderId.toUpperCase()} actualizado a "${ORDER_STATUS_LABELS[nextStatus]}".`
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSubmitPaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    setPaymentSavedSuccess(false);
    setPaymentError(null);
    try {
      await onSavePaymentSettings(editablePayment);
      setPaymentSavedSuccess(true);
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Error al guardar la configuración de cobro SPEI y WhatsApp.'
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const handleWritePhysicalNfc = async (sticker: EmergencyStickerRecord) => {
    const nfcUrl = buildUniqueStickerUrl(sticker);
    if (!('NDEFReader' in window)) {
      setNfcMessage(
        `URL lista para ${sticker.fullName} (${sticker.tagId}). Para grabar directamente desde el navegador abre este panel en Chrome para Android con NFC activo, o copia la URL para tu grabador NFC de escritorio.`
      );
      return;
    }
    try {
      setNfcMessage(
        `Acerca el tag NFC físico para grabar el perfil de ${sticker.fullName} (${sticker.tagId})...`
      );
      // @ts-expect-error Web NFC API
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{ recordType: 'url', data: nfcUrl }],
      });
      setNfcMessage(
        `¡Tag NFC grabado exitosamente para ${sticker.fullName} (${sticker.tagId})!`
      );
    } catch (err) {
      setNfcMessage(
        `No se pudo grabar el tag NFC: ${
          err instanceof Error ? err.message : 'Verifica permisos NFC'
        }`
      );
    }
  };

  const handlePackageFieldChange = (
    idx: number,
    field: keyof StickerPackageOption,
    value: string | number | string[]
  ) => {
    setEditablePackages((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleTogglePackageColor = (idx: number, colorName: string) => {
    setEditablePackages((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const current =
          Array.isArray(item.availableColors) && item.availableColors.length > 0
            ? [...item.availableColors]
            : [...ALL_STICKER_COLORS];
        let nextColors: string[];
        if (current.includes(colorName)) {
          if (current.length <= 1) return item; // Keep at least 1 color enabled
          nextColors = current.filter((c) => c !== colorName);
        } else {
          nextColors = ALL_STICKER_COLORS.filter(
            (c) => current.includes(c) || c === colorName
          );
        }
        return { ...item, availableColors: nextColors };
      })
    );
  };

  const handleSubmitPackages = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPackages(true);
    setPackagesSavedSuccess(false);
    setPackagesError(null);
    try {
      await onSavePackages(editablePackages);
      setPackagesSavedSuccess(true);
    } catch (err) {
      setPackagesError(
        err instanceof Error
          ? err.message
          : 'Error al guardar las 3 opciones de compra.'
      );
    } finally {
      setSavingPackages(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Top Header */}
      <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-500 mb-1">
            <span>PANEL INTERNO · PERSONAL AUTORIZADO</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {orders.length} pedidos
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {stickers.length} registros
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Administración de Pedidos, Registros NFC y Cobro SPEI
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            1. Pedidos Recibidos ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'records'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            2. Registros y URLs NFC ({stickers.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setEditablePackages(
                (packages && packages.length === 3
                  ? packages
                  : DEFAULT_STICKER_PACKAGES
                ).map((p, idx) => normalizePackageOption(p, idx))
              );
              setEditablePayment({
                ...(paymentSettings || DEFAULT_PAYMENT_SETTINGS),
              });
              setPackagesSavedSuccess(false);
              setPackagesError(null);
              setPaymentSavedSuccess(false);
              setPaymentError(null);
              setActiveTab('packages');
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>3. Combos y Datos SPEI / WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-orange-500" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Pedidos de Stickers NFC y Confirmaciones SPEI / WhatsApp
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Revisa los colores elegidos por cada cliente, su dirección de envío, copia su URL NFC para programar el tag y actualiza el estatus del pedido.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Buscar por folio, cliente, tag o ciudad..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {nfcMessage && (
            <div className="p-3.5 bg-zinc-900 border border-orange-500/70 rounded-xl text-xs text-orange-400">
              {nfcMessage}
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Aún no hay pedidos registrados con ese criterio. Cuando un cliente confirme su compra en el Paso 2 aparecerá aquí.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const linkedSticker = stickers.find(
                  (s) => s.tagId === ord.tagId
                );
                const nfcUrl = linkedSticker
                  ? buildUniqueStickerUrl(linkedSticker)
                  : '';
                const isCopied = copiedTagId === `ord-${ord.orderId}`;
                const customerCleanPhone = (ord.recipientPhone || '').replace(
                  /[^0-9]/g,
                  ''
                );

                return (
                  <div
                    key={ord.orderId}
                    className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-2.5 py-1 bg-orange-500 text-black text-xs font-bold font-mono tabular-nums rounded">
                          #{ord.orderId.toUpperCase()}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {ord.pkgName} ·{' '}
                          <span className="text-orange-400 font-mono">
                            ${ord.totalPrice} MXN
                          </span>
                        </h3>
                        <span className="text-xs font-mono text-zinc-400">
                          Tag NFC: {ord.tagId} ({ord.riderName})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-[11px] text-zinc-400">
                          Estatus:
                        </label>
                        <select
                          disabled={updatingOrderId === ord.orderId}
                          value={ord.status}
                          onChange={(e) =>
                            handleOrderStatusChange(
                              ord.orderId,
                              e.target.value as OrderStatus
                            )
                          }
                          className="px-3 py-1.5 text-xs font-bold bg-[#14161A] border border-orange-500/60 rounded-lg text-orange-400 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {ORDER_STATUS_LABELS[st]}
                            </option>
                          ))}
                        </select>

                        {customerCleanPhone && (
                          <a
                            href={`https://wa.me/${customerCleanPhone}?text=${encodeURIComponent(
                              `Hola ${ord.recipientName}, te escribimos de Biker Safe respecto a tu pedido #${ord.orderId.toUpperCase()} (${ord.pkgName}) para acordar tu ${
                                isPersonalDeliveryOrder(ord)
                                  ? 'entrega personal en CDMX / Estado de México'
                                  : 'envío por paquetería'
                              }.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Acordar Entrega por WhatsApp
                          </a>
                        )}

                        {confirmDeleteOrderId === ord.orderId ? (
                          <>
                            <button
                              type="button"
                              disabled={deletingOrderId === ord.orderId}
                              onClick={() =>
                                handleConfirmDeleteOrder(ord.orderId)
                              }
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              {deletingOrderId === ord.orderId
                                ? 'Borrando...'
                                : 'Confirmar Borrado'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteOrderId(null)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteOrderId(ord.orderId)
                            }
                            className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 border border-red-800/70 text-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Borrar Pedido
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Selected Colors & Shipping Details */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs text-zinc-300">
                      <div className="md:col-span-5 space-y-2">
                        <span className="text-zinc-500 block">
                          Colores Solicitados ({ord.stickerCount}{' '}
                          {ord.stickerCount === 1 ? 'sticker' : 'stickers'}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(ord.selectedColors || []).map((colorName, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#14161A] border border-zinc-800 text-[11px] text-white font-semibold"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                                style={{
                                  backgroundColor:
                                    STICKER_COLOR_SWATCHES[colorName] ||
                                    '#f97316',
                                }}
                              />
                              <span>
                                Sticker #{i + 1}: {colorName}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-7 space-y-1">
                        <span className="text-zinc-500 block">
                          Modalidad de Entrega:{' '}
                          <strong className="text-orange-400">
                            {isPersonalDeliveryOrder(ord)
                              ? 'Entrega Personal (Solo Edo. de México y CDMX · Acordar vía WhatsApp)'
                              : 'Envío por Paquetería a toda la República (Acordar vía WhatsApp)'}
                          </strong>
                        </span>
                        <div>
                          <strong className="text-white">Recibe:</strong>{' '}
                          {ord.recipientName} ·{' '}
                          <strong className="text-white">
                            Tel / WhatsApp:
                          </strong>{' '}
                          <span className="font-mono tabular-nums text-orange-300">
                            {ord.recipientPhone}
                          </span>
                        </div>
                        {isPersonalDeliveryOrder(ord) ? (
                          <>
                            <div>
                              <strong className="text-white">
                                Zona / Alcaldía o Municipio (CDMX / EdoMéx):
                              </strong>{' '}
                              {ord.shippingCityState}
                            </div>
                            {ord.shippingNotes && (
                              <div>
                                <strong className="text-white">
                                  Punto / Horario sugerido:
                                </strong>{' '}
                                {ord.shippingNotes}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <strong className="text-white">
                                Dirección de Paquetería:
                              </strong>{' '}
                              {ord.shippingStreet}, Col. {ord.shippingColony},
                              C.P.{' '}
                              <span className="font-mono">
                                {ord.shippingPostalCode}
                              </span>
                              , {ord.shippingCityState}
                            </div>
                            {ord.shippingNotes && (
                              <div>
                                <strong className="text-white">
                                  Referencias:
                                </strong>{' '}
                                {ord.shippingNotes}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {nfcUrl && (
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-[11px] font-mono text-zinc-400 truncate">
                          <strong className="text-orange-400 font-sans">
                            URL NFC para grabar este pedido:
                          </strong>{' '}
                          {nfcUrl}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(nfcUrl);
                              setCopiedTagId(`ord-${ord.orderId}`);
                              setTimeout(() => setCopiedTagId(null), 2000);
                            } catch {
                              // Ignore
                            }
                          }}
                          className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                        >
                          {isCopied ? '¡URL Copiada!' : 'Copiar URL NFC'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'packages' ? (
        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-bold text-white">
              Configuración de las 3 Opciones de Compra de Tags NFC
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Modifica el título, subtítulo, precio y descripción de los 3 paquetes que ven los clientes en el Paso 2.
            </p>
          </div>

          {packagesSavedSuccess && (
            <div className="p-4 bg-zinc-900 border border-orange-500 rounded-xl text-xs text-orange-400 font-semibold">
              ¡Las 3 opciones de compra se han actualizado correctamente y ya están visibles para los clientes!
            </div>
          )}

          {packagesError && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
              {packagesError}
            </div>
          )}

          <form onSubmit={handleSubmitPackages} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {editablePackages.map((pkg, idx) => (
                <div
                  key={pkg.pkgId}
                  className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <span className="text-xs font-bold text-orange-500">
                      OPCIÓN {idx + 1} ({pkg.pkgId.toUpperCase()})
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      #{idx + 1}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Nombre del Paquete
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={pkg.name}
                      onChange={(e) =>
                        handlePackageFieldChange(idx, 'name', e.target.value)
                      }
                      className="w-full px-3.5 py-2 text-xs bg-[#14161A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Subtítulo / Etiqueta
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={pkg.subtitle}
                      onChange={(e) =>
                        handlePackageFieldChange(
                          idx,
                          'subtitle',
                          e.target.value
                        )
                      }
                      className="w-full px-3.5 py-2 text-xs bg-[#14161A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Precio ($ MXN)
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={100000}
                        value={pkg.price}
                        onChange={(e) =>
                          handlePackageFieldChange(
                            idx,
                            'price',
                            Number(e.target.value) || 1
                          )
                        }
                        className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-[#14161A] border border-zinc-800 rounded-lg text-orange-400 font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Cantidad de Stickers
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={10}
                        value={pkg.stickerCount || 1}
                        onChange={(e) =>
                          handlePackageFieldChange(
                            idx,
                            'stickerCount',
                            Math.max(
                              1,
                              Math.min(10, Math.round(Number(e.target.value) || 1))
                            )
                          )
                        }
                        className="w-full px-3.5 py-2 text-xs font-mono tabular-nums bg-[#14161A] border border-zinc-800 rounded-lg text-white font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Colores disponibles para elegir (
                      {(pkg.availableColors || ALL_STICKER_COLORS).length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_STICKER_COLORS.map((colorName) => {
                        const enabled = (
                          pkg.availableColors || ALL_STICKER_COLORS
                        ).includes(colorName);
                        const hex =
                          STICKER_COLOR_SWATCHES[colorName] || '#f97316';
                        return (
                          <button
                            key={colorName}
                            type="button"
                            onClick={() =>
                              handleTogglePackageColor(idx, colorName)
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                              enabled
                                ? 'bg-zinc-800 border-orange-500 text-white'
                                : 'bg-[#14161A] border-zinc-800/80 text-zinc-500 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                              style={{ backgroundColor: hex }}
                            />
                            <span>{colorName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Especificaciones / Descripción
                    </label>
                    <textarea
                      rows={3}
                      required
                      maxLength={250}
                      value={pkg.specs}
                      onChange={(e) =>
                        handlePackageFieldChange(idx, 'specs', e.target.value)
                      }
                      className="w-full px-3.5 py-2 text-xs bg-[#14161A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPackages}
                className="px-7 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                {savingPackages
                  ? 'Guardando Opciones...'
                  : 'Guardar Cambios en las 3 Opciones de Compra'}
              </button>
            </div>
          </form>

          {/* SPEI & WhatsApp Payment Configuration */}
          <div className="pt-8 border-t border-zinc-800 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                Configuración de Cobro (Opción B: Transferencia SPEI + WhatsApp)
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configura tu cuenta bancaria CLABE y el número de WhatsApp al que los clientes enviarán su pedido y comprobante de transferencia.
              </p>
            </div>

            {paymentSavedSuccess && (
              <div className="p-4 bg-zinc-900 border border-orange-500 rounded-xl text-xs text-orange-400 font-semibold">
                ¡Los datos de cobro SPEI y WhatsApp se han guardado correctamente!
              </div>
            )}

            {paymentError && (
              <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleSubmitPaymentSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Banco Receptor (SPEI)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={editablePayment.bankName}
                    onChange={(e) =>
                      setEditablePayment((prev) => ({
                        ...prev,
                        bankName: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre del Beneficiario
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={editablePayment.beneficiaryName}
                    onChange={(e) =>
                      setEditablePayment((prev) => ({
                        ...prev,
                        beneficiaryName: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    CLABE Interbancaria (18 dígitos)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={10}
                    maxLength={24}
                    value={editablePayment.clabe}
                    onChange={(e) =>
                      setEditablePayment((prev) => ({
                        ...prev,
                        clabe: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-orange-400 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Número de Tarjeta o Cuenta (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={editablePayment.accountOrCard}
                    onChange={(e) =>
                      setEditablePayment((prev) => ({
                        ...prev,
                        accountOrCard: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    WhatsApp para recibir Comprobantes
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={editablePayment.whatsappNumber}
                    onChange={(e) =>
                      setEditablePayment((prev) => ({
                        ...prev,
                        whatsappNumber: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Instrucciones de Pago para el Cliente
                </label>
                <textarea
                  rows={2}
                  maxLength={350}
                  value={editablePayment.paymentInstructions}
                  onChange={(e) =>
                    setEditablePayment((prev) => ({
                      ...prev,
                      paymentInstructions: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 text-xs bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-y"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-7 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {savingPayment
                    ? 'Guardando Datos de Cobro...'
                    : 'Guardar Configuración SPEI y WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Directorio de Registros y URLs para Programación de Tags NFC
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Copia la URL única de cada cliente o grábala directamente en el sticker NFC físico antes de enviarlo.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, ID de tag o tipo de sangre..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {nfcMessage && (
            <div className="p-3.5 bg-zinc-900 border border-orange-500/70 rounded-xl text-xs text-orange-400">
              {nfcMessage}
            </div>
          )}

          {filteredStickers.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              No se encontraron registros de stickers NFC en la base de datos.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStickers.map((s) => {
                const nfcUrl = buildUniqueStickerUrl(s);
                const isCopied = copiedTagId === s.tagId;
                return (
                  <div
                    key={s.tagId}
                    className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-2.5 py-1 bg-orange-500 text-black text-xs font-bold font-mono tabular-nums rounded">
                          {s.bloodType}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {s.fullName}
                        </h3>
                        <span className="text-xs font-mono tabular-nums text-orange-400">
                          ID: {s.tagId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onPreviewStickerLanding(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Landing Page</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWritePhysicalNfc(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Wifi className="w-3.5 h-3.5" />
                          <span>Grabar en Tag NFC Físico</span>
                        </button>
                        {confirmDeleteTagId === s.tagId ? (
                          <>
                            <button
                              type="button"
                              disabled={deletingTagId === s.tagId}
                              onClick={() => handleConfirmDeleteRecord(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>
                                {deletingTagId === s.tagId
                                  ? 'Borrando...'
                                  : 'Confirmar Borrado'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTagId(null)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTagId(s.tagId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 border border-red-800/70 text-red-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Borrar Registro</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
                      <div>
                        <span className="text-zinc-500 block">
                          Alergias / Condiciones:
                        </span>
                        <strong>{s.allergies || 'Ninguna'}</strong> ·{' '}
                        {s.medicalConditions || 'Ninguna'}
                      </div>
                      <div>
                        <span className="text-zinc-500 block">
                          Contacto Principal (1):
                        </span>
                        <strong>{s.emergencyContactName}</strong>
                        {s.emergencyContactRelation
                          ? ` · ${s.emergencyContactRelation}`
                          : ''}{' '}
                        (
                        <span className="font-mono tabular-nums">
                          {s.emergencyContactPhone}
                        </span>
                        )
                      </div>
                      <div>
                        <span className="text-zinc-500 block">
                          Segundo Contacto (2):
                        </span>
                        {s.secondaryContactName || s.secondaryContactPhone ? (
                          <>
                            <strong>
                              {s.secondaryContactName || 'Contacto 2'}
                            </strong>
                            {s.secondaryContactRelation
                              ? ` · ${s.secondaryContactRelation}`
                              : ''}{' '}
                            (
                            <span className="font-mono tabular-nums">
                              {s.secondaryContactPhone || '-'}
                            </span>
                            )
                          </>
                        ) : (
                          <span className="text-zinc-500">No registrado</span>
                        )}
                      </div>
                    </div>

                    {/* Admin NFC URL Configuration Bar */}
                    <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                      <label className="block text-[11px] font-bold text-orange-400">
                        URL ÚNICA PARA CONFIGURACIÓN DEL TAG NFC DE ESTA PERSONA:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={nfcUrl}
                          className="w-full px-3 py-2 text-xs font-mono bg-[#14161A] border border-zinc-800 rounded-lg text-zinc-200 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(s)}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>¡URL Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar URL NFC</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
