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
  Shield,
} from 'lucide-react';
import {
  EmergencyStickerRecord,
  buildUniqueStickerUrl,
} from '../lib/firebase';

// ============================================================================
// 1. Public Emergency Landing Page (No passwords, no login walls, direct access)
// ============================================================================
interface PublicLandingProps {
  sticker: EmergencyStickerRecord | null;
  loading: boolean;
  isOwnerViewing: boolean;
  onBackToMainScreen: () => void;
}

export const PublicEmergencyLandingPage: React.FC<PublicLandingProps> = ({
  sticker,
  loading,
  isOwnerViewing,
  onBackToMainScreen,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  const uniqueUrl = buildUniqueStickerUrl(sticker);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uniqueUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar for returning to main profile screen */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14161A] border border-zinc-800 rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="font-semibold text-zinc-200">
            LANDING PAGE DE EMERGENCIA NFC
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-orange-400">
            {sticker.tagId}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-orange-400" />
                <span>URL Copiada</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar URL del Tag</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToMainScreen}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {isOwnerViewing ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar mis Datos / Comprar Sticker</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Pantalla Principal</span>
              </>
            )}
          </button>
        </div>
      </div>

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
// 2. Custom NFC Sticker Purchase & Order Component (Shown after profile save)
// ============================================================================
interface StickerPurchaseProps {
  sticker: EmergencyStickerRecord;
  onOpenPublicLanding: () => void;
  onEditProfile: () => void;
}

interface StickerPackage {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  specs: string;
}

const STICKER_PACKAGES: StickerPackage[] = [
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

export const StickerPurchaseSection: React.FC<StickerPurchaseProps> = ({
  sticker,
  onOpenPublicLanding,
  onEditProfile,
}) => {
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pro');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderFolio, setOrderFolio] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [nfcWriteMessage, setNfcWriteMessage] = useState<string | null>(null);

  const uniqueUrl = buildUniqueStickerUrl(sticker);
  const selectedPkg =
    STICKER_PACKAGES.find((p) => p.id === selectedPkgId) || STICKER_PACKAGES[1];

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(uniqueUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setOrderFolio(`BS-${randomNum}`);
    setOrderCompleted(true);
  };

  const handleWritePhysicalNfc = async () => {
    if (!('NDEFReader' in window)) {
      setNfcWriteMessage(
        'Para grabar un tag NFC físico desde tu navegador utiliza Chrome en Android con NFC activado, o abre directamente tu Landing Page de Emergencia con el botón superior.'
      );
      return;
    }
    try {
      setNfcWriteMessage('Acerca tu sticker NFC físico al reverso del teléfono...');
      // @ts-expect-error Web NFC API
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{ recordType: 'url', data: uniqueUrl }],
      });
      setNfcWriteMessage('¡URL única grabada exitosamente en tu chip NFC!');
    } catch (err) {
      setNfcWriteMessage(
        `No se pudo completar la grabación NFC: ${err instanceof Error ? err.message : 'Verifica permisos NFC'}`
      );
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
            <span className="font-mono tabular-nums">{sticker.tagId}</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Adquiere tu Sticker NFC Biker Safe
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Tu sticker se envía pre-programado con tu URL única de emergencia. Al escanearlo sin claves ni contraseñas, despliega tu Landing Page médica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenPublicLanding}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver mi Landing Page de Emergencia</span>
          </button>
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modificar mis Datos</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Physical Custom Helmet Sticker Preview & Unique URL (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
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
                <QRCodeSVG value={uniqueUrl} size={92} level="M" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-bold text-orange-500 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>ESCANEO DE EMERGENCIA</span>
                </div>
                <div className="text-base font-bold text-white truncate">
                  {sticker.fullName}
                </div>
                <div className="text-xs font-mono tabular-nums text-zinc-300">
                  Tipo de Sangre:{' '}
                  <strong className="text-orange-400">{sticker.bloodType}</strong>
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  Contacto: {sticker.emergencyContactName}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Chip NTAG213 · Resina 3M</span>
              <span>Acceso directo sin clave</span>
            </div>
          </div>

          {/* Unique URL Box */}
          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-semibold text-zinc-300">
              URL Única vinculada a tu Sticker NFC:
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={uniqueUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-[#14161A] border border-zinc-800 rounded-lg text-zinc-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-orange-400" />
                    <span>Copiada</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleWritePhysicalNfc}
              className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5 text-orange-500" />
              <span>¿Ya tienes un tag virgen? Grabar por Web NFC</span>
            </button>

            {nfcWriteMessage && (
              <p className="text-xs text-orange-400 pt-1">{nfcWriteMessage}</p>
            )}
          </div>
        </div>

        {/* Right: Package Selector & Checkout Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {orderCompleted ? (
            <div className="bg-[#0B0C0E] border border-orange-500/60 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 text-orange-500">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-zinc-400">
                    ORDEN CONFIRMADA · FOLIO {orderFolio}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    ¡Tu Sticker NFC Personalizado está en producción!
                  </h3>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                Hemos vinculado el chip NFC de tu <strong>{selectedPkg.name}</strong> directamente a tu perfil médico (<span className="font-mono text-orange-400">{sticker.tagId}</span>). Cualquier cambio que realices en tus datos médicos desde la pantalla principal se actualizará automáticamente al escanear tu casco.
              </p>

              <div className="p-4 bg-[#14161A] border border-zinc-800 rounded-xl space-y-1 text-xs text-zinc-300">
                <div>
                  <strong className="text-white">Paquete:</strong> {selectedPkg.name} (${selectedPkg.price} MXN)
                </div>
                <div>
                  <strong className="text-white">Destinatario:</strong> {sticker.fullName}
                </div>
                <div>
                  <strong className="text-white">Dirección de envío:</strong>{' '}
                  {shippingAddress}, {shippingCity} C.P. {shippingZip}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenPublicLanding}
                  className="px-5 py-3 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir mi Landing Page de Emergencia</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderCompleted(false)}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hacer otro pedido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmPurchase} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-3">
                  1. Selecciona tu Kit de Stickers NFC Personalizados
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {STICKER_PACKAGES.map((pkg) => {
                    const active = pkg.id === selectedPkgId;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkgId(pkg.id)}
                        className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                          active
                            ? 'bg-[#0B0C0E] border-orange-500'
                            : 'bg-[#0B0C0E]/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
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
