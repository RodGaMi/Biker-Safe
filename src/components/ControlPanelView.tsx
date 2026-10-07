import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Check,
  Eye,
  Power,
  Wifi,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  EmergencyStickerRecord,
  ScanLogRecord,
  buildUniqueStickerUrl,
} from '../lib/firebase';

interface ControlPanelProps {
  stickers: EmergencyStickerRecord[];
  loading: boolean;
  selectedSticker: EmergencyStickerRecord | null;
  scanLogs: ScanLogRecord[];
  onSelectSticker: (sticker: EmergencyStickerRecord) => void;
  onEditSticker: (sticker: EmergencyStickerRecord) => void;
  onToggleActive: (sticker: EmergencyStickerRecord) => Promise<void>;
  onDeleteSticker: (tagId: string) => Promise<void>;
  onOpenParamedicView: (sticker: EmergencyStickerRecord) => void;
  onNewStickerClick: () => void;
}

export const ControlPanelView: React.FC<ControlPanelProps> = ({
  stickers,
  loading,
  selectedSticker,
  scanLogs,
  onSelectSticker,
  onEditSticker,
  onToggleActive,
  onDeleteSticker,
  onOpenParamedicView,
  onNewStickerClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [copiedTagId, setCopiedTagId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyTagId, setBusyTagId] = useState<string | null>(null);

  const filteredStickers = stickers.filter((s) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? s.isActive
        : !s.isActive;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesStatus;
    return (
      matchesStatus &&
      (s.fullName.toLowerCase().includes(q) ||
        s.tagId.toLowerCase().includes(q) ||
        s.bloodType.toLowerCase().includes(q) ||
        s.emergencyContactName.toLowerCase().includes(q))
    );
  });

  const handleCopyStickerUrl = async (sticker: EmergencyStickerRecord) => {
    const url = buildUniqueStickerUrl(sticker);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTagId(sticker.tagId);
      setTimeout(() => setCopiedTagId(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleToggle = async (sticker: EmergencyStickerRecord) => {
    setBusyTagId(sticker.tagId);
    try {
      await onToggleActive(sticker);
    } finally {
      setBusyTagId(null);
    }
  };

  const handleDelete = async (tagId: string) => {
    setBusyTagId(tagId);
    try {
      await onDeleteSticker(tagId);
      setConfirmDeleteId(null);
    } finally {
      setBusyTagId(null);
    }
  };

  const inspectedSticker = selectedSticker || filteredStickers[0] || null;
  const inspectedUrl = inspectedSticker ? buildUniqueStickerUrl(inspectedSticker) : '';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Base de Datos de Emergencia</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {stickers.length} {stickers.length === 1 ? 'sticker registrado' : 'stickers registrados'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {stickers.filter((s) => s.isActive).length} activos
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Panel de Control de Stickers NFC
          </h1>
        </div>

        <button
          type="button"
          onClick={onNewStickerClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Configurar Nuevo Sticker
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, ID de tag NFC o tipo de sangre..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Interactive segmented filter control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({stickers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activos ({stickers.filter((s) => s.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paused')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'paused'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pausados ({stickers.filter((s) => !s.isActive).length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 animate-pulse">
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      ) : filteredStickers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Wifi className="w-9 h-9 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            {stickers.length === 0
              ? 'Aún no tienes stickers NFC registrados en tu cuenta'
              : 'No se encontraron stickers con ese criterio de búsqueda'}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Registra los datos médicos críticos del motociclista para obtener una URL única vinculada a tu sticker físico NFC.
          </p>
          {stickers.length === 0 && (
            <button
              type="button"
              onClick={onNewStickerClick}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear Primer Sticker NFC
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: High-Density Data Table of Registered NFC Tags (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Motociclista / Tag ID</th>
                    <th className="py-3 px-3">Sangre</th>
                    <th className="py-3 px-3">Contacto de Emergencia</th>
                    <th className="py-3 px-3">Estado NFC</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredStickers.map((sticker) => {
                    const isSelected = inspectedSticker?.tagId === sticker.tagId;
                    return (
                      <tr
                        key={sticker.tagId}
                        onClick={() => onSelectSticker(sticker)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {sticker.fullName}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{sticker.tagId}</span>
                            {sticker.motorcycleDetails && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-sans truncate max-w-[160px]">
                                  {sticker.motorcycleDetails}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono tabular-nums font-bold text-red-600">
                          {sticker.bloodType}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-xs font-medium text-slate-900">
                            {sticker.emergencyContactName}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-slate-500">
                            {sticker.emergencyContactPhone}
                          </div>
                          {sticker.secondaryContactName && (
                            <div className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                              2°: {sticker.secondaryContactName}{' '}
                              {sticker.secondaryContactPhone && (
                                <span className="font-mono tabular-nums">
                                  ({sticker.secondaryContactPhone})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-xs font-semibold ${
                              sticker.isActive
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {sticker.isActive ? 'Activo' : 'Pausado'}
                          </span>
                        </td>
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {confirmDeleteId === sticker.tagId ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={busyTagId === sticker.tagId}
                                onClick={() => handleDelete(sticker.tagId)}
                                className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded hover:bg-slate-200 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Copiar URL única del Tag NFC"
                                onClick={() => handleCopyStickerUrl(sticker)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                {copiedTagId === sticker.tagId ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                title="Abrir Vista Paramédico"
                                onClick={() => onOpenParamedicView(sticker)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Editar datos médicos"
                                onClick={() => onEditSticker(sticker)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title={
                                  sticker.isActive
                                    ? 'Pausar Tag NFC'
                                    : 'Activar Tag NFC'
                                }
                                disabled={busyTagId === sticker.tagId}
                                onClick={() => handleToggle(sticker)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                title="Eliminar Sticker"
                                onClick={() => setConfirmDeleteId(sticker.tagId)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Selected Sticker Inspector & Scan History (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {inspectedSticker && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs text-slate-500 font-mono">
                      {inspectedSticker.tagId}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {inspectedSticker.fullName}
                    </h3>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <QRCodeSVG value={inspectedUrl} size={56} level="M" />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Alergias Conocidas:</span>
                    <span className="font-medium text-slate-900">
                      {inspectedSticker.allergies || 'Ninguna registrada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Condiciones / Medicación:
                    </span>
                    <span className="font-medium text-slate-900">
                      {inspectedSticker.medicalConditions || 'Ninguna registrada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">URL Única de Emergencia:</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={inspectedUrl}
                        className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyStickerUrl(inspectedSticker)}
                        className="px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded hover:bg-slate-800 shrink-0 cursor-pointer"
                      >
                        {copiedTagId === inspectedSticker.tagId ? 'Copiada' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenParamedicView(inspectedSticker)}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer"
                  >
                    Ver Ficha de Emergencia
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditSticker(inspectedSticker)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}

            {/* Audit Log of Emergency Reads for the Selected Sticker */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Historial de Escaneos NFC</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {scanLogs.length} eventos
                </span>
              </div>

              {scanLogs.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed py-2">
                  Aún no se registran lecturas de emergencia para este sticker. Puedes probar una lectura en el <strong>Simulador NFC</strong> o en la <strong>Vista Paramédico</strong>.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {scanLogs.map((log) => (
                    <div key={log.scanId} className="py-2.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {log.scannerLabel}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {log.scanMethod}
                        </span>
                      </div>
                      {log.locationNote && (
                        <p className="text-slate-600">{log.locationNote}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
