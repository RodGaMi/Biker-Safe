import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
} from 'lucide-react';
import {
  EmergencyStickerRecord,
  StickerPackageOption,
  DEFAULT_STICKER_PACKAGES,
  buildUniqueStickerUrl,
} from '../lib/firebase';

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
              <div className="text-sm font-mono tabular-nums text-zinc-300 mt-0.5">
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
                <div className="text-sm font-mono tabular-nums text-zinc-300 mt-0.5">
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
  onEditProfile: () => void;
}

export const StickerPurchaseSection: React.FC<StickerPurchaseProps> = ({
  sticker,
  packages,
  onEditProfile,
}) => {
  const activePackages =
    packages && packages.length === 3 ? packages : DEFAULT_STICKER_PACKAGES;
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pro');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderFolio, setOrderFolio] = useState('');

  const selectedPkg =
    activePackages.find((p) => p.pkgId === selectedPkgId) ||
    activePackages[1] ||
    activePackages[0];

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setOrderFolio(`BS-${randomNum}`);
    setOrderCompleted(true);
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
              <div className="bg-white p-2.5 rounded-xl shrink-0">
                <QRCodeSVG value={sticker.tagId} size={92} level="M" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-bold text-orange-500 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" />
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
                </div>
                {sticker.secondaryContactName && (
                  <div className="text-[11px] text-zinc-400 truncate">
                    Contacto 2: {sticker.secondaryContactName}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Chip NTAG213 · Resina Epóxica 3M</span>
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

        {/* Right: Package Selector & Checkout Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {orderCompleted ? (
            <div className="bg-[#0B0C0E] border border-orange-500/60 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 text-orange-500">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-orange-400">
                    ORDEN CONFIRMADA · FOLIO {orderFolio}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    ¡Tu Sticker NFC Personalizado está en producción!
                  </h3>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                Hemos recibido tu pedido de <strong>{selectedPkg.name}</strong> vinculado al registro médico de <strong>{sticker.fullName}</strong>. Nuestro personal autorizado configurará tu tag NFC y lo enviará a tu domicilio.
              </p>

              <div className="p-4 bg-[#14161A] border border-zinc-800 rounded-xl space-y-1 text-xs text-zinc-300">
                <div>
                  <strong className="text-white">Paquete:</strong> {selectedPkg.name} (${selectedPkg.price} MXN)
                </div>
                <div>
                  <strong className="text-white">Titular del Perfil:</strong> {sticker.fullName} ({sticker.bloodType})
                </div>
                <div>
                  <strong className="text-white">Dirección de envío:</strong>{' '}
                  {shippingAddress}, {shippingCity} C.P. {shippingZip}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderCompleted(false)}
                  className="px-5 py-3 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Realizar otro pedido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmPurchase} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-3">
                  1. Selecciona tu Opción de Compra de Tag NFC
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {activePackages.map((pkg) => {
                    const active = pkg.pkgId === selectedPkgId;
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
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {pkg.name}
                            </span>
                            <span className="text-xs text-orange-400 font-medium">
                              · {pkg.subtitle}
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

              <div className="space-y-4 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                  <Truck className="w-4 h-4 text-orange-500" />
                  <span>2. Datos de Envío para tu Sticker Físico</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Calle, Número y Colonia
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Ej. Av. Insurgentes Sur 1450, Col. Del Valle"
                    className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Ciudad y Estado
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      placeholder="Ej. Ciudad de México, CDMX"
                      className="w-full px-4 py-2.5 text-sm bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={shippingZip}
                      onChange={(e) => setShippingZip(e.target.value)}
                      placeholder="Ej. 03100"
                      className="w-full px-4 py-2.5 text-sm font-mono tabular-nums bg-[#0B0C0E] border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  Ordenar {selectedPkg.name} (${selectedPkg.price} MXN)
                </span>
              </button>
            </form>
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
  onLoginSuccess: () => void;
  onCancel: () => void;
  ensureFirebaseSignedIn: () => Promise<boolean>;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onCancel,
  ensureFirebaseSignedIn,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (
      (cleanUser === 'admin' || cleanUser === 'gami.rodrigo@gmail.com') &&
      cleanPass === 'bikersafe2026'
    ) {
      setLoading(true);
      const ok = await ensureFirebaseSignedIn();
      setLoading(false);
      if (!ok) {
        setError(
          'Se requiere confirmar la sesión de Google autorizada para consultar la base de datos.'
        );
        return;
      }
      onLoginSuccess();
    } else {
      setError(
        'Usuario o contraseña incorrectos. Verifica tus credenciales de personal autorizado.'
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
          Ingresa tus credenciales de personal autorizado para consultar todos los registros, obtener las URLs de programación de tags NFC y editar los paquetes de venta.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Usuario o Correo Autorizado
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin o correo autorizado"
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
          <span className="block text-[11px] text-zinc-500 mt-1.5 font-mono">
            Credencial interna por defecto: admin / bikersafe2026
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-colors cursor-pointer"
        >
          {loading
            ? 'Verificando acceso...'
            : 'Ingresar al Panel de Administración'}
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
  packages: StickerPackageOption[];
  onSavePackages: (updated: StickerPackageOption[]) => Promise<void>;
  onPreviewStickerLanding: (sticker: EmergencyStickerRecord) => void;
  onExitAdmin: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stickers,
  packages,
  onSavePackages,
  onPreviewStickerLanding,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'packages'>('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTagId, setCopiedTagId] = useState<string | null>(null);
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);

  const [editablePackages, setEditablePackages] = useState<StickerPackageOption[]>(
    () =>
      (packages && packages.length === 3 ? packages : DEFAULT_STICKER_PACKAGES).map(
        (p) => ({ ...p })
      )
  );
  const [savingPackages, setSavingPackages] = useState(false);
  const [packagesSavedSuccess, setPackagesSavedSuccess] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);

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

  const handleCopyUrl = async (sticker: EmergencyStickerRecord) => {
    try {
      await navigator.clipboard.writeText(buildUniqueStickerUrl(sticker));
      setCopiedTagId(sticker.tagId);
      setTimeout(() => setCopiedTagId(null), 2000);
    } catch {
      // Ignore
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
    value: string | number
  ) => {
    setEditablePackages((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
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
              {stickers.length} registros totales
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Administración de Registros NFC y Opciones de Compra
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'records'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            1. Registros y URLs para Tags NFC ({stickers.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setEditablePackages(
                (packages && packages.length === 3
                  ? packages
                  : DEFAULT_STICKER_PACKAGES
                ).map((p) => ({ ...p }))
              );
              setPackagesSavedSuccess(false);
              setPackagesError(null);
              setActiveTab('packages');
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>2. Editar las 3 Opciones de Compra</span>
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-orange-500" />
            <span>Salir de Administración</span>
          </button>
        </div>
      </div>

      {activeTab === 'packages' ? (
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

                      <div className="flex items-center gap-2">
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
                        <strong>{s.emergencyContactName}</strong> (
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
                            </strong>{' '}
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
