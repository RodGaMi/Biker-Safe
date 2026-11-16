import React, { useState } from 'react';
import {
  ShieldAlert,
  Eye,
  Shuffle,
  BatteryCharging,
  Droplets,
  Award,
  PhoneCall,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  StickerPackageOption,
  StickerModelCatalogRecord,
  StickerColorName,
  ALL_STICKER_COLORS,
  STICKER_COLOR_SWATCHES,
} from '../lib/firebase';

interface HomeLandingViewProps {
  packages: StickerPackageOption[];
  stickerModels?: StickerModelCatalogRecord[];
  whatsappNumber?: string;
  isLoggedIn: boolean;
  onGoToApp: () => void;
  onSelectPackage: (pkgId: string) => void;
  onOpenFullQa: () => void;
}

const HOME_FAQ_ITEMS = [
  {
    id: 'hfaq-1',
    question: '¿Qué sucede exactamente cuando un paramédico escanea mi casco?',
    answer:
      'Al acercar cualquier smartphone (iPhone o Android) a 2 o 3 centímetros de tu sticker NFC, se despliega de inmediato en el navegador tu Ficha Médica de Emergencia con tipo de sangre, alergias críticas, condiciones médicas, seguro y botones para llamar con un solo toque a tus familiares con su parentesco. Todo en menos de 2 segundos, sin instalar apps ni pedir contraseñas.',
  },
  {
    id: 'hfaq-2',
    question: '¿Por qué un sticker NFC es más seguro que mi teléfono celular?',
    answer:
      'En un accidente de motocicleta, los celulares se bloquean por código PIN o huella digital (la cual no funciona con guantes), se quedan sin batería o se estrellan con el impacto. El sticker Biker Safe va adherido en el exterior de tu casco o chasis, es 100% pasivo (no usa batería) y permite a cualquier rescatista asistirte de inmediato.',
  },
  {
    id: 'hfaq-3',
    question: '¿Tengo que pagar mensualidades o costos de suscripción?',
    answer:
      'No. Tu compra es un pago único. No cobramos mensualidades, anualidades ni tarifas ocultas por alojar tu ficha médica ni por modificar tus datos las veces que lo requieras.',
  },
  {
    id: 'hfaq-4',
    question: '¿Puedo actualizar mis datos si cambio de moto, póliza de seguro o número de teléfono?',
    answer:
      'Sí, en cualquier momento. Solo inicia sesión en Biker Safe con tu correo o cuenta de Google, edita tu información médica o contactos de emergencia y guarda los cambios. Tu información en la nube se actualiza al instante sin tener que cambiar tus stickers físicos.',
  },
  {
    id: 'hfaq-5',
    question: '¿Cómo se coordina el pago y la entrega de mis stickers?',
    answer:
      'El pago se realiza mediante transferencia interbancaria directa (SPEI) indicando tu Folio de Pedido. Para la entrega, ofrecemos entrega personal en puntos clave de CDMX y Estado de México, o envío por paquetería a cualquier estado de la República Mexicana, acordado directamente vía WhatsApp.',
  },
];

const SAMPLE_RANDOM_PROFILES = [
  {
    tagId: 'bs-7k92mx',
    fullName: 'Alejandro Vega Morales',
    bloodType: 'O+',
    motorcycleDetails: 'Yamaha MT-07 Azul · Casco Integral',
    insuranceDetails: 'Gastos Médicos #GM-482910',
    organDonor: true,
    allergies: 'Alérgico a Penicilina y sulfas.',
    medicalConditions: 'Asma leve (usa inhalador Salbutamol). Sin cirugías recientes.',
    emergencyContactName: 'Sofía Vega Morales',
    emergencyContactRelation: 'Hermana',
    emergencyContactPhone: '55 4192 8374',
    secondaryContactName: 'Fernando Vega Ríos',
    secondaryContactRelation: 'Padre',
    secondaryContactPhone: '55 3018 6492',
  },
  {
    tagId: 'bs-3p84qz',
    fullName: 'Valeria Herrera Castillo',
    bloodType: 'A-',
    motorcycleDetails: 'Kawasaki Ninja 400 Verde · Casco Deportivo',
    insuranceDetails: 'IMSS Vigente + Póliza Moto #AX-73920',
    organDonor: true,
    allergies: 'Sin alergias medicamentosas conocidas.',
    medicalConditions: 'Diabetes Tipo 1 controlada con insulina basal.',
    emergencyContactName: 'Ricardo Herrera Soto',
    emergencyContactRelation: 'Padre',
    emergencyContactPhone: '33 2847 1950',
    secondaryContactName: 'Laura Castillo Méndez',
    secondaryContactRelation: 'Madre',
    secondaryContactPhone: '33 1956 4821',
  },
  {
    tagId: 'bs-9m51wr',
    fullName: 'Mateo Navarro Salinas',
    bloodType: 'B+',
    motorcycleDetails: 'Royal Enfield Meteor 350 Negra · Casco Modular',
    insuranceDetails: 'Póliza Cobertura Amplia #SG-61042',
    organDonor: false,
    allergies: 'Alérgico al látex y antiinflamatorios (AINEs).',
    medicalConditions: 'Ninguna condición crónica ni medicación activa.',
    emergencyContactName: 'Lucía Salinas Ortiz',
    emergencyContactRelation: 'Esposa',
    emergencyContactPhone: '81 4729 3015',
    secondaryContactName: 'Jorge Navarro Peña',
    secondaryContactRelation: 'Hermano',
    secondaryContactPhone: '81 6384 9201',
  },
];

export const HomeLandingView: React.FC<HomeLandingViewProps> = ({
  packages,
  whatsappNumber = '5215512345678',
  isLoggedIn,
  onGoToApp,
  onSelectPackage,
  onOpenFullQa,
}) => {
  const [sampleProfileIdx, setSampleProfileIdx] = useState(0);
  const [expandedFaqs, setExpandedFaqs] = useState<string[]>(['hfaq-1', 'hfaq-2']);
  const [modelColors, setModelColors] = useState<Record<string, StickerColorName>>({
    racer: 'Rojo',
    choper: 'Negro',
    cross: 'Verde',
  });
  const [activeGlobalColor, setActiveGlobalColor] = useState<StickerColorName>('Rojo');

  const sampleProfile = SAMPLE_RANDOM_PROFILES[sampleProfileIdx % SAMPLE_RANDOM_PROFILES.length];

  const cleanWaNumber = String(whatsappNumber).replace(/[^0-9]/g, '') || '5215512345678';
  const waInquiryUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
    'Hola Biker Safe, vi su página web y me gustaría información para comprar un sticker de emergencia NFC para mi casco.'
  )}`;

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getColorIndex = (c: string) => (ALL_STICKER_COLORS as readonly string[]).indexOf(c);

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. Hero Section: Service Value & Competitive Differentiation (Zero Photos) */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#14161A] via-[#0E1013] to-[#08090B] border border-zinc-800/90 shadow-2xl p-6 sm:p-10 lg:p-14">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span>Servicio Especializado NFC · Salvamento Vial</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.12]">
                  El Sticker NFC que{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
                    puede salvar tu vida
                  </span>{' '}
                  en la carretera.
                </h1>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  En un accidente vial cada segundo cuenta. Los paramédicos acercan cualquier
                  smartphone a tu casco y consultan en menos de 2 segundos tu{' '}
                  <strong className="text-white">
                    tipo de sangre, alergias, póliza de seguro y llaman a tus familiares
                  </strong>{' '}
                  con un solo toque, sin apps ni contraseñas.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="bg-[#08090B]/80 border border-zinc-800 rounded-xl p-2.5 text-center">
                  <span className="block text-base font-extrabold text-orange-400 font-mono">
                    &lt; 2 seg
                  </span>
                  <span className="text-[11px] text-zinc-400">Lectura universal</span>
                </div>
                <div className="bg-[#08090B]/80 border border-zinc-800 rounded-xl p-2.5 text-center">
                  <span className="block text-base font-extrabold text-white font-mono">
                    100% Pasivo
                  </span>
                  <span className="text-[11px] text-zinc-400">Cero baterías</span>
                </div>
                <div className="bg-[#08090B]/80 border border-zinc-800 rounded-xl p-2.5 text-center">
                  <span className="block text-base font-extrabold text-orange-400 font-mono">
                    Vinil
                  </span>
                  <span className="text-[11px] text-zinc-400">Lluvia y sol UV</span>
                </div>
                <div className="bg-[#08090B]/80 border border-zinc-800 rounded-xl p-2.5 text-center">
                  <span className="block text-base font-extrabold text-white font-mono">$0 Mes</span>
                  <span className="text-[11px] text-zinc-400">Sin mensualidad</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onGoToApp}
                className="px-6 py-3.5 bg-orange-500 hover:bg-orange-400 text-black text-sm font-extrabold rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2"
              >
                <span>{isLoggedIn ? 'Ir a mi Ficha Médica' : 'Configurar mi Ficha Médica'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('paquetes')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-3.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 text-sm font-bold rounded-xl transition-colors cursor-pointer border border-zinc-700"
              >
                Ver Modelos y Precios
              </button>

              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById('seccion-perfil-ejemplo')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-3.5 bg-[#08090B] hover:bg-zinc-900 text-orange-400 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-orange-500/40 inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Perfil de Ejemplo</span>
              </button>
            </div>
          </div>

          {/* Right Column: Competitive Advantages & Why Buy With Biker Safe (No Photos) */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-[#08090B]/95 border border-orange-500/30 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-wider block">
                  ¿POR QUÉ ADQUIRIR TU TAG CON BIKER SAFE?
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  Lo que nos diferencia de tags genéricos y otros servicios
                </h2>
              </div>
              <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg text-[10px] font-bold text-orange-400 uppercase tracking-wide">
                Servicio Integral
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14161A] border border-zinc-800/90">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Pre-programación Profesional y Chip Protegido
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed mt-0.5">
                    A diferencia de stickers en blanco o improvisados, nosotros vinculamos,
                    verificamos y protegemos tu tag contra sobrescrituras antes de enviarlo. Lo
                    recibes listo para pegar y usar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14161A] border border-zinc-800/90">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Plataforma Propia de Por Vida ($0 Rentas Anuales)
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed mt-0.5">
                    Otros competidores cobran suscripciones mensuales o te amarran a apps que nadie
                    descarga. Con nosotros pagas una sola vez y actualizas tu ficha 24/7 desde
                    cualquier navegador.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14161A] border border-zinc-800/90">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Más Confiable que un QR + Vinil Especializado Biker
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed mt-0.5">
                    Los códigos QR se rayan, se ensucian con lodo y fallan de noche. Nuestro NFC
                    responde por proximidad, en vinil resistente al clima y en 3 diseños exclusivos
                    (Racer, Choper, Cross).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#14161A] border border-zinc-800/90">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Privacidad LFPDPPP y Atención Directa en México
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed mt-0.5">
                    Tu perfil médico se edita solo bajo tu cuenta segura. Además cuentas con
                    seguimiento real por WhatsApp, entrega personal en CDMX/EdoMéx y envíos a toda
                    la República.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Folio único por pedido
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Pago directo SPEI
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Soporte humano por WhatsApp
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Emergency Profile Visualization (Random Sample Profile) */}
      <section
        id="seccion-perfil-ejemplo"
        className="bg-[#14161A] border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
              VISUALIZACIÓN REAL DE FICHA MÉDICA
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Así se visualiza un Perfil de Emergencia Biker Safe
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Ejemplo demostrativo con datos generados al azar. Cuando alguien acerca su teléfono a tu
              sticker NFC, esta es la pantalla exacta que se abre al instante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSampleProfileIdx((prev) => (prev + 1) % SAMPLE_RANDOM_PROFILES.length)}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-zinc-700 inline-flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Ver otro perfil al azar</span>
            </button>
            <button
              type="button"
              onClick={onGoToApp}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-lg shadow-orange-500/20"
            >
              Crear mi Perfil →
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#08090B] border border-zinc-800 rounded-xl text-[11px] text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <strong className="text-zinc-200">
                Vista Pública de Emergencia (Perfil de Ejemplo #{(sampleProfileIdx % SAMPLE_RANDOM_PROFILES.length) + 1})
              </strong>
            </span>
            <span className="font-mono text-zinc-500">Sin contraseñas · Acceso inmediato en navegador</span>
          </div>

          <div className="bg-gradient-to-br from-[#181B20] via-[#121418] to-[#0B0C0E] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-orange-500 text-black px-5 sm:px-6 py-2.5 flex items-center justify-between text-[11px] sm:text-xs font-bold tracking-wide">
              <span>INFORMACIÓN MÉDICA CRÍTICA DE EMERGENCIA · ACCESO DIRECTO NFC</span>
              <span className="font-mono tabular-nums hidden sm:inline">
                BIKER SAFE ID: {sampleProfile.tagId}
              </span>
            </div>

            <div className="p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-400">
                  MOTOCICLISTA / PACIENTE DE EJEMPLO
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {sampleProfile.fullName}
                </h3>

                <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-300">
                  <span>
                    <strong className="text-zinc-100">Motocicleta / Casco:</strong>{' '}
                    {sampleProfile.motorcycleDetails}
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                  <span>
                    <strong className="text-zinc-100">Seguro Médico / Póliza:</strong>{' '}
                    {sampleProfile.insuranceDetails}
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                  <span>
                    <strong className="text-zinc-100">Donador de Órganos:</strong>{' '}
                    {sampleProfile.organDonor ? 'Sí (Autorizado)' : 'No especificado'}
                  </span>
                </div>
              </div>

              <div className="bg-[#0B0C0E] border-2 border-orange-500 rounded-2xl px-6 py-3.5 text-center shrink-0 self-start md:self-center">
                <span className="block text-[10px] font-bold text-zinc-400 tracking-wider">
                  TIPO DE SANGRE
                </span>
                <span className="block text-3xl sm:text-4xl font-bold font-mono tabular-nums text-orange-500 mt-0.5">
                  {sampleProfile.bloodType}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0B0C0E] border border-zinc-800 rounded-2xl p-5 space-y-2">
              <div className="text-orange-500 font-bold text-xs tracking-wide uppercase">
                Alergias Conocidas
              </div>
              <p className="text-sm font-semibold text-white leading-relaxed">
                {sampleProfile.allergies}
              </p>
            </div>

            <div className="bg-[#0B0C0E] border border-zinc-800 rounded-2xl p-5 space-y-2">
              <div className="text-orange-500 font-bold text-xs tracking-wide uppercase">
                Condiciones Médicas y Medicación Actual
              </div>
              <p className="text-sm font-semibold text-white leading-relaxed">
                {sampleProfile.medicalConditions}
              </p>
            </div>
          </div>

          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">Contactos de Emergencia Directos</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  En una ficha real, el rescatista toca cualquier botón para iniciar la llamada
                  inmediata.
                </p>
              </div>
              <span className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-zinc-800 text-white text-xs font-bold rounded-xl whitespace-nowrap border border-zinc-700">
                <span className="text-orange-500">●</span>
                <span>911 Emergencias</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-orange-400 uppercase">
                    Contacto de Emergencia 1 (Principal)
                  </span>
                  <div className="text-base font-bold text-white mt-1">
                    {sampleProfile.emergencyContactName}
                  </div>
                  <div className="text-xs font-medium text-orange-300 mt-0.5">
                    Parentesco: {sampleProfile.emergencyContactRelation}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-zinc-400 mt-1">
                    {sampleProfile.emergencyContactPhone} (Ejemplo)
                  </div>
                </div>
                <div className="w-full py-2.5 px-4 bg-orange-500 text-black text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Llamar a {sampleProfile.emergencyContactName}</span>
                </div>
              </div>

              <div className="bg-[#14161A] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                    Contacto de Emergencia 2 (Secundario)
                  </span>
                  <div className="text-base font-bold text-white mt-1">
                    {sampleProfile.secondaryContactName}
                  </div>
                  <div className="text-xs font-medium text-zinc-300 mt-0.5">
                    Parentesco: {sampleProfile.secondaryContactRelation}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-zinc-400 mt-1">
                    {sampleProfile.secondaryContactPhone} (Ejemplo)
                  </div>
                </div>
                <div className="w-full py-2.5 px-4 bg-zinc-800 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 border border-zinc-700">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Llamar a {sampleProfile.secondaryContactName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Golden Hour Comparison */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
            LA HORA DORADA DEL RESCATE VIAL
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            ¿Por qué tu teléfono celular no es suficiente en un accidente?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Los primeros 60 minutos posteriores a una caída son decisivos para salvar la vida o
            evitar secuelas graves. Mira la diferencia real entre depender de un teléfono o llevar
            Biker Safe en tu casco.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="bg-[#14161A] border border-red-500/30 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                ✕ Smartphone Tradicional
              </span>
              <span className="text-xs text-zinc-500">En una emergencia real</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-zinc-300">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Bloqueado con contraseña o PIN:</strong> Los
                  paramédicos o transeúntes no pueden entrar a tus contactos ni ver tu ficha.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">La huella no responde con guantes:</strong> Nadie
                  puede usar el lector biométrico con equipo de protección puesto.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Pantalla rota o batería agotada:</strong> El
                  celular frecuentemente sale proyectado y queda inservible tras la caída.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Minutos perdidos:</strong> La ambulancia traslada al
                  piloto como desconocido sin conocer su tipo de sangre ni alergias.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-[#14161A] border border-green-500/40 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl shadow-green-500/5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold text-green-400 uppercase tracking-wide">
                ✓ Con Sticker NFC Biker Safe
              </span>
              <span className="text-xs text-orange-400 font-semibold">
                Solución Médica Inmediata
              </span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-zinc-200">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Lectura instantánea en &lt; 2 segundos:</strong>{' '}
                  Cualquier persona con cualquier celular lo lee al instante por proximidad.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Adherido en tu casco visible:</strong> No importa
                  si tu celular quedó roto o a metros de distancia, tu ficha va contigo.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">100% Pasivo y Libre de Baterías:</strong> Funciona
                  siempre, haga frío, calor o lluvia torrencial.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Tipo de sangre y llamada a tu familia:</strong> La
                  Cruz Roja o paramédico llama directamente a tu contacto de confianza con su
                  parentesco.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Competitive Comparison Matrix: Biker Safe vs. Tags Genéricos / Competidores */}
        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wider block">
                COMPARATIVA CONTRA COMPETIDORES
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                ¿Por qué elegir Biker Safe y no etiquetas genéricas u otros proveedores?
              </h3>
            </div>
            <span className="text-xs text-zinc-400 shrink-0">
              Transparencia total en nuestro servicio
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 pr-4 font-bold">Característica del Servicio</th>
                  <th className="py-3 px-4 font-extrabold text-orange-400 bg-orange-500/5 rounded-t-xl">
                    Biker Safe NFC
                  </th>
                  <th className="py-3 pl-4 font-semibold text-zinc-500">
                    Tags Genéricos / Competencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                <tr>
                  <td className="py-3 pr-4 font-semibold text-white">
                    Programación y Protección del Chip
                  </td>
                  <td className="py-3 px-4 text-green-400 font-bold bg-orange-500/5">
                    ✓ Pre-programado, verificado y bloqueado contra borrado
                  </td>
                  <td className="py-3 pl-4 text-zinc-500">
                    ✕ En blanco (tú lo configuras) o sin bloqueo
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-semibold text-white">
                    Costo de Plataforma y Alojamiento
                  </td>
                  <td className="py-3 px-4 text-green-400 font-bold bg-orange-500/5">
                    ✓ Pago único de por vida ($0 mensualidades)
                  </td>
                  <td className="py-3 pl-4 text-zinc-500">
                    ✕ Rentas anuales o enlaces que caducan
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-semibold text-white">
                    Edición de Datos Médicos 24/7
                  </td>
                  <td className="py-3 px-4 text-green-400 font-bold bg-orange-500/5">
                    ✓ Instantánea desde tu cuenta sin cambiar sticker
                  </td>
                  <td className="py-3 pl-4 text-zinc-500">
                    ✕ Datos fijos grabados o requieren recompra
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-semibold text-white">
                    Lectura en Emergencia (Paramédicos)
                  </td>
                  <td className="py-3 px-4 text-green-400 font-bold bg-orange-500/5">
                    ✓ Sin apps, sin QR borrosos, llamada a 1 toque
                  </td>
                  <td className="py-3 pl-4 text-zinc-500">
                    ✕ QR que se desgastan o exigen app instalada
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-semibold text-white">
                    Material y Estética para Motociclistas
                  </td>
                  <td className="py-3 px-4 text-green-400 font-bold bg-orange-500/5 rounded-b-xl">
                    ✓ Vinil automotriz · 3 modelos y 8 colores
                  </td>
                  <td className="py-3 pl-4 text-zinc-500">
                    ✕ Stickers blancos redondos de oficina
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. 3 Steps */}
      <section
        id="como-funciona"
        className="bg-gradient-to-br from-[#14161A] via-[#0E1013] to-[#08090B] border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-8"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
            PROCESO SIMPLE Y RÁPIDO
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            ¿Cómo funciona Biker Safe en 3 pasos?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Desde la creación de tu perfil médico hasta rodar con tu sticker en el casco, todo está
            diseñado para ser ágil y confiable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0B0C0E] border border-zinc-800/90 rounded-2xl p-6 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-mono font-bold text-lg">
              01
            </div>
            <h3 className="text-base font-bold text-white">Crea tu Ficha Médica</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ingresa tu tipo de sangre, alergias a medicamentos, padecimientos crónicos, seguro
              médico y los números de tus contactos de emergencia con parentesco.
            </p>
          </div>

          <div className="bg-[#0B0C0E] border border-zinc-800/90 rounded-2xl p-6 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-mono font-bold text-lg">
              02
            </div>
            <h3 className="text-base font-bold text-white">Elige tu Paquete y Estilo</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Selecciona tu paquete y personaliza cada sticker eligiendo entre los modelos{' '}
              <strong className="text-zinc-200">Racer, Choper o Cross</strong> y 8 colores para
              combinar con tu moto y casco.
            </p>
          </div>

          <div className="bg-[#0B0C0E] border border-zinc-800/90 rounded-2xl p-6 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-mono font-bold text-lg">
              03
            </div>
            <h3 className="text-base font-bold text-white">Pégalo y Rueda Seguro</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Recibe tus stickers programados listos para pegar en tu casco. Entrega personal en
              CDMX/EdoMéx o paquetería nacional. ¡Protección activa 24/7 sin pagar mensualidades!
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onGoToApp}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Comenzar mi Registro de Ficha Médica →
          </button>
        </div>
      </section>

      {/* 5. Sticker Models Catalog */}
      <section id="modelos" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
              DISEÑO Y AERODINÁMICA
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              3 Modelos de Sticker para Cada Estilo de Motociclista
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Fabricados con chip NFC NTAG de alta sensibilidad en vinil de grado automotriz de alta adherencia, resistente a lluvia, sol UV y lavado a presión.
            </p>
          </div>

          <div className="text-xs text-zinc-400 shrink-0">8 Colores Disponibles por Modelo · Carrusel Interactivo</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Racer Card */}
          {(() => {
            const racerColor = modelColors.racer || 'Rojo';
            const hex = STICKER_COLOR_SWATCHES[racerColor] || '#EF4444';
            return (
              <div className="bg-[#14161A] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg hover:border-orange-500/40 transition">
                <div>
                  <div className="h-52 overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80"
                      alt={`Modelo Racer para motos deportivas y pista en color ${racerColor}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14161A] via-transparent to-black/40" />
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#08090B]/90 backdrop-blur-sm border border-orange-500/50 rounded-lg text-xs font-extrabold text-orange-400">
                      MODELO RACER
                    </div>
                    {/* Live Badge */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 p-1.5 bg-[#08090B]/90 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-xl">
                      <span className="w-4 h-4 rounded-full border border-white/40" style={{ backgroundColor: hex }} />
                      <div className="pr-1.5 text-left">
                        <span className="block text-[9px] uppercase font-bold text-orange-400 tracking-wider">Sticker NFC</span>
                        <span className="block text-xs font-bold text-white">{racerColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs text-orange-400 font-semibold">
                        Deportivo · Pista · Superbike
                      </div>
                      <h3 className="text-base font-bold text-white">Perfil Aerodinámico Racer</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Líneas afiladas y perfil bajo diseñados específicamente para cascos integrales de
                        alta velocidad y carenados deportivos.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">Color: <strong className="text-white">{racerColor}</strong></span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border" style={{ backgroundColor: `${hex}20`, borderColor: `${hex}60`, color: hex === '#18181B' ? '#e4e4e7' : hex }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                          {hex}
                        </span>
                      </div>

                      {/* Swatches Carousel */}
                      <div className="flex items-center gap-1.5 justify-between bg-[#0B0C0E] border border-zinc-800/80 rounded-xl p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = getColorIndex(racerColor);
                            const prevIdx = curIdx <= 0 ? ALL_STICKER_COLORS.length - 1 : curIdx - 1;
                            setModelColors((prev) => ({ ...prev, racer: ALL_STICKER_COLORS[prevIdx] }));
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Color anterior"
                        >
                          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                        </button>

                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                          {ALL_STICKER_COLORS.map((cName) => {
                            const cHex = STICKER_COLOR_SWATCHES[cName] || '#f97316';
                            const isSelected = cName === racerColor;
                            return (
                              <button
                                key={cName}
                                type="button"
                                onClick={() => setModelColors((prev) => ({ ...prev, racer: cName }))}
                                className={`relative w-6 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                                  isSelected ? 'ring-2 ring-orange-500 scale-110 shadow-md z-10' : 'opacity-75 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: cHex, border: `1.5px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.2)'}` }}
                                title={`Color ${cName}`}
                              >
                                {isSelected && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">✓</span>}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = getColorIndex(racerColor);
                            const nextIdx = curIdx >= ALL_STICKER_COLORS.length - 1 ? 0 : curIdx + 1;
                            setModelColors((prev) => ({ ...prev, racer: ALL_STICKER_COLORS[nextIdx] }));
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Siguiente color"
                        >
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onGoToApp}
                        className="w-full mt-2 py-2.5 px-3 bg-zinc-800/90 hover:bg-orange-600 hover:text-white text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-zinc-700/60 shadow-sm"
                      >
                        <span>Elegir Racer en {racerColor}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Choper Card */}
          {(() => {
            const choperColor = modelColors.choper || 'Negro';
            const hex = STICKER_COLOR_SWATCHES[choperColor] || '#18181B';
            return (
              <div className="bg-[#14161A] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg hover:border-orange-500/40 transition">
                <div>
                  <div className="h-52 overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80"
                      alt={`Modelo Choper para motocicletas cruiser y custom en color ${choperColor}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14161A] via-transparent to-black/40" />
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#08090B]/90 backdrop-blur-sm border border-orange-500/50 rounded-lg text-xs font-extrabold text-orange-400">
                      MODELO CHOPER
                    </div>
                    {/* Live Badge */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 p-1.5 bg-[#08090B]/90 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-xl">
                      <span className="w-4 h-4 rounded-full border border-white/40" style={{ backgroundColor: hex }} />
                      <div className="pr-1.5 text-left">
                        <span className="block text-[9px] uppercase font-bold text-orange-400 tracking-wider">Sticker NFC</span>
                        <span className="block text-xs font-bold text-white">{choperColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs text-orange-400 font-semibold">
                        Clásico · Custom · Cruiser · Touring
                      </div>
                      <h3 className="text-base font-bold text-white">Estilo Robusto Choper</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Presencia contundente y estética sobria pensada para motocicletas cruiser, bobber,
                        custom y viajes de larga distancia.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">Color: <strong className="text-white">{choperColor}</strong></span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border" style={{ backgroundColor: `${hex}20`, borderColor: `${hex}60`, color: hex === '#18181B' ? '#e4e4e7' : hex }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                          {hex}
                        </span>
                      </div>

                      {/* Swatches Carousel */}
                      <div className="flex items-center gap-1.5 justify-between bg-[#0B0C0E] border border-zinc-800/80 rounded-xl p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = getColorIndex(choperColor);
                            const prevIdx = curIdx <= 0 ? ALL_STICKER_COLORS.length - 1 : curIdx - 1;
                            setModelColors((prev) => ({ ...prev, choper: ALL_STICKER_COLORS[prevIdx] }));
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Color anterior"
                        >
                          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                        </button>

                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                          {ALL_STICKER_COLORS.map((cName) => {
                            const cHex = STICKER_COLOR_SWATCHES[cName] || '#f97316';
                            const isSelected = cName === choperColor;
                            return (
                              <button
                                key={cName}
                                type="button"
                                onClick={() => setModelColors((prev) => ({ ...prev, choper: cName }))}
                                className={`relative w-6 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                                  isSelected ? 'ring-2 ring-orange-500 scale-110 shadow-md z-10' : 'opacity-75 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: cHex, border: `1.5px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.2)'}` }}
                                title={`Color ${cName}`}
                              >
                                {isSelected && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">✓</span>}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = getColorIndex(choperColor);
                            const nextIdx = curIdx >= ALL_STICKER_COLORS.length - 1 ? 0 : curIdx + 1;
                            setModelColors((prev) => ({ ...prev, choper: ALL_STICKER_COLORS[nextIdx] }));
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Siguiente color"
                        >
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onGoToApp}
                        className="w-full mt-2 py-2.5 px-3 bg-zinc-800/90 hover:bg-orange-600 hover:text-white text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-zinc-700/60 shadow-sm"
                      >
                        <span>Elegir Choper en {choperColor}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Cross Card */}
          {(() => {
            const crossColor = modelColors.cross || 'Verde';
            const hex = STICKER_COLOR_SWATCHES[crossColor] || '#10B981';
            return (
              <div className="bg-[#14161A] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-lg hover:border-orange-500/40 transition">
                <div>
                  <div className="h-52 overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1547483238-f400e65ccd56?auto=format&fit=crop&w=800&q=80"
                      alt={`Modelo Cross para motocross y enduro en color ${crossColor}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14161A] via-transparent to-black/40" />
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#08090B]/90 backdrop-blur-sm border border-orange-500/50 rounded-lg text-xs font-extrabold text-orange-400">
                      MODELO CROSS
                    </div>
                    {/* Live Badge */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 p-1.5 bg-[#08090B]/90 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-xl">
                      <span className="w-4 h-4 rounded-full border border-white/40" style={{ backgroundColor: hex }} />
                      <div className="pr-1.5 text-left">
                        <span className="block text-[9px] uppercase font-bold text-orange-400 tracking-wider">Sticker NFC</span>
                        <span className="block text-xs font-bold text-white">{crossColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs text-orange-400 font-semibold">
                        Enduro · Off-Road · Doble Propósito
                      </div>
                      <h3 className="text-base font-bold text-white">Alta Visibilidad Cross</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Geometría agresiva de máxima notoriedad y resistencia reforzada para terracería,
                        salpicaduras de lodo y aventura extrema.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">Color: <strong className="text-white">{crossColor}</strong></span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border" style={{ backgroundColor: `${hex}20`, borderColor: `${hex}60`, color: hex === '#18181B' ? '#e4e4e7' : hex }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                          {hex}
                        </span>
                      </div>

                      {/* Swatches Carousel */}
                      <div className="flex items-center gap-1.5 justify-between bg-[#0B0C0E] border border-zinc-800/80 rounded-xl p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = getColorIndex(crossColor);
                            const prevIdx = curIdx <= 0 ? ALL_STICKER_COLORS.length - 1 : curIdx - 1;
                            setModelColors((prev) => ({ ...prev, cross: ALL_STICKER_COLORS[prevIdx] }));
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Color anterior"
                        >
                          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                        </button>

                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                          {ALL_STICKER_COLORS.map((cName) => {
                            const cHex = STICKER_COLOR_SWATCHES[cName] || '#f97316';
                            const isSelected = cName === crossColor;
                            return (
                              <button
                                key={cName}
                                type="button"
                                onClick={() => setModelColors((prev) => ({ ...prev, cross: cName }))}
                                className={`relative w-6 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                                  isSelected ? 'ring-2 ring-orange-500 scale-110 shadow-md z-10' : 'opacity-75 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: cHex, border: `1.5px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.2)'}` }}
                                title={`Color ${cName}`}
                              >
                                {isSelected && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">✓</span>}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = getColorIndex(crossColor);
                            const nextIdx = curIdx >= ALL_STICKER_COLORS.length - 1 ? 0 : curIdx + 1;
                            setModelColors((prev) => ({ ...prev, cross: ALL_STICKER_COLORS[nextIdx] }));
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Siguiente color"
                        >
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={onGoToApp}
                        className="w-full mt-2 py-2.5 px-3 bg-zinc-800/90 hover:bg-orange-600 hover:text-white text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-zinc-700/60 shadow-sm"
                      >
                        <span>Elegir Cross en {crossColor}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Global Interactive Color Carousel */}
        <div className="bg-[#14161A] border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-orange-500 uppercase tracking-wider block">
                CARRUSEL DE COLORES BIKER SAFE
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                8 Opciones de Color en Vinil Automotriz Ultra Resistente
              </h3>
              <p className="text-xs text-zinc-400 max-w-2xl">
                Fabricados en vinil con adhesivo de grado automotriz para cascos y carenados. Elige o combina colores en tu paquete. Haz clic en cualquier color para aplicarlo a los modelos:
              </p>
            </div>
            <div className="shrink-0 text-xs text-zinc-400 bg-[#08090B] px-3 py-1.5 rounded-xl border border-zinc-800">
              Color activo global: <span className="text-orange-400 font-bold font-mono">{activeGlobalColor}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
            {ALL_STICKER_COLORS.map((cName) => {
              const hex = STICKER_COLOR_SWATCHES[cName] || '#f97316';
              const isGlobalActive = activeGlobalColor === cName;
              return (
                <button
                  key={cName}
                  type="button"
                  onClick={() => {
                    setActiveGlobalColor(cName);
                    setModelColors({
                      racer: cName,
                      choper: cName,
                      cross: cName,
                    });
                  }}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isGlobalActive
                      ? 'bg-orange-500/10 border-orange-500 shadow-md ring-1 ring-orange-500/50'
                      : 'bg-[#0B0C0E] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-5 h-5 rounded-full border border-white/30 shrink-0 shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                    {isGlobalActive && (
                      <span className="text-[10px] font-extrabold text-orange-400">ACTIVO</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">{cName}</span>
                    <span className="block text-[10px] text-zinc-400 font-mono">{hex}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Packages & Transparent Pricing */}
      <section id="paquetes" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
            OPCIONES DE COMPRA
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Elige el Paquete Ideal para Protegerte
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Precios en pesos mexicanos (MXN). Pago único sin mensualidades ni cargos recurrentes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {packages.map((pkg) => {
            const isPopular = pkg.pkgId === 'pro';
            return (
              <div
                key={pkg.pkgId}
                className={`bg-[#14161A] border ${
                  isPopular ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-zinc-800'
                } rounded-2xl p-6 flex flex-col justify-between space-y-6 relative shadow-xl`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-black text-[11px] font-extrabold rounded-full uppercase tracking-wider shadow">
                    Más Vendido
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{pkg.specs}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">
                      ${Number(pkg.price)}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">MXN · Pago Único</span>
                  </div>

                  <div className="p-3 bg-[#0B0C0E] border border-zinc-800/80 rounded-xl space-y-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2 font-bold text-orange-400">
                      <span>✓</span>
                      <span>{Number(pkg.stickerCount || 1)} Sticker(s) NFC incluidos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400">✓</span>
                      <span>Personalizable por modelo y color</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400">✓</span>
                      <span>Ficha médica digital editable 24/7</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400">✓</span>
                      <span>Sin costos de mensualidad</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPackage(pkg.pkgId)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isPopular
                      ? 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  Personalizar y Comprar Este Paquete →
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Robust Infrastructure & Guarantee */}
      <section className="bg-[#14161A] border border-zinc-800 rounded-3xl p-6 sm:p-10 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
            SEGURIDAD Y ROBUSTEZ TÉCNICA
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Infraestructura Médica Digital de Alta Disponibilidad
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Diseñado para cumplir con las normas de privacidad en México y responder de inmediato
            desde cualquier navegador en situaciones de emergencia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="text-xl">🔐</div>
            <h3 className="text-sm font-bold text-white">Protección LFPDPPP</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cumplimiento total con la Ley Federal de Protección de Datos Personales. Tus datos
              jamás se venden ni se ceden para publicidad.
            </p>
          </div>

          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="text-xl">📡</div>
            <h3 className="text-sm font-bold text-white">Chip NTAG Original</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Frecuencia estándar 13.56 MHz según ISO/IEC 14443A. Máxima compatibilidad con el 100% de
              smartphones modernos.
            </p>
          </div>

          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="text-xl">💳</div>
            <h3 className="text-sm font-bold text-white">Pago Seguro SPEI</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Transferencia bancaria directa con tu CLABE interbancaria oficial y tu Folio único para
              evitar intermediarios sospechosos.
            </p>
          </div>

          <div className="bg-[#0B0C0E] border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="text-xl">🛵</div>
            <h3 className="text-sm font-bold text-white">Entrega Coordinada</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Entrega personal en CDMX y EdoMéx, o paquetería express a todo México con seguimiento
              directo vía WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FAQ Accordion */}
      <section id="faq" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="text-xs font-bold text-orange-500 uppercase tracking-wider">
              RESOLVEMOS TUS PREGUNTAS
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Preguntas Frecuentes</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Todo lo que necesitas saber antes de equipar tu casco con Biker Safe.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenFullQa}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-zinc-700 whitespace-nowrap self-start sm:self-auto"
          >
            Ver más preguntas (Q&amp;A Completo)
          </button>
        </div>

        <div className="space-y-3">
          {HOME_FAQ_ITEMS.map((item) => {
            const isExpanded = expandedFaqs.includes(item.id);
            return (
              <div
                key={item.id}
                className={`bg-[#14161A] border ${
                  isExpanded ? 'border-orange-500/60' : 'border-zinc-800'
                } rounded-2xl overflow-hidden transition-colors`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-zinc-900/60 transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-white">{item.question}</span>
                  <span className="w-7 h-7 rounded-lg bg-[#0B0C0E] border border-zinc-800 flex items-center justify-center text-orange-400 shrink-0 font-bold text-sm">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/80">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-black space-y-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="text-xs font-black uppercase tracking-widest text-black/80">
            PROTEGE TU VIDA Y A LOS TUYOS
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black leading-tight">
            No ruedes desprotegido. Configura tu Ficha Médica hoy mismo.
          </h2>
          <p className="text-sm sm:text-base text-black/90 font-medium leading-relaxed max-w-2xl">
            Toma menos de 2 minutos registrar tus datos vitales y elegir tu modelo de sticker. Dale a
            tu familia la tranquilidad de saber que en caso de accidente podrán comunicarse de
            inmediato.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onGoToApp}
              className="px-6 py-3.5 bg-black hover:bg-zinc-900 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
            >
              Comenzar Ahora →
            </button>
            <a
              href={waInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 bg-white/90 hover:bg-white text-black text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer shadow"
            >
              Preguntar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
