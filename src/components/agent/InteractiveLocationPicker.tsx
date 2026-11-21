import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Crosshair,
  ExternalLink,
  Layers,
  MapPin,
  Navigation,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export interface InteractiveLocationPickerProps {
  lat: string;
  lng: string;
  accuracy?: number;
  capturedAt?: string;
  referenceCoords?: { lat: number; lng: number };
  projectName?: string;
  matrixNumber?: string;
  locality?: string;
  province?: string;
  territory?: string;
  onChange: (coords: { lat: string; lng: string; confirmed: boolean }) => void;
  onCaptureGps?: () => void;
  gpsLoading?: boolean;
  disabled?: boolean;
}

/** Fallback centre RDC si aucune coordonnée n’est encore disponible. */
const DRC_FALLBACK = { lat: -4.0383, lng: 21.7587 };

function parseValidCoord(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === '') return null;
  const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistanceFr(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Google Maps embed (no API key) — recentre sur le point de collecte / ouvrage.
 * t=m plan · t=k satellite
 */
function buildGoogleMapsEmbedUrl(
  lat: number,
  lng: number,
  zoom: number,
  satellite: boolean
): string {
  const params = new URLSearchParams({
    q: `${lat},${lng}`,
    z: String(zoom),
    hl: 'fr',
    output: 'embed',
  });
  // maptype: m = roadmap, k = satellite
  params.set('t', satellite ? 'k' : 'm');
  return `https://maps.google.com/maps?${params.toString()}`;
}

function buildGoogleMapsOpenUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&hl=fr&z=17`;
}

export const InteractiveLocationPicker: React.FC<InteractiveLocationPickerProps> = ({
  lat,
  lng,
  accuracy,
  referenceCoords,
  projectName,
  matrixNumber,
  onChange,
  onCaptureGps,
  gpsLoading = false,
  disabled = false,
}) => {
  const [satellite, setSatellite] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'collected' | 'reference'>('collected');

  const parsedLat = parseValidCoord(lat);
  const parsedLng = parseValidCoord(lng);
  const hasValidCollectedCoords = parsedLat !== null && parsedLng !== null;

  const refLat = referenceCoords ? parseValidCoord(referenceCoords.lat) : null;
  const refLng = referenceCoords ? parseValidCoord(referenceCoords.lng) : null;
  const hasValidReferenceCoords = refLat !== null && refLng !== null;

  const viewLat =
    focusTarget === 'reference' && hasValidReferenceCoords
      ? refLat!
      : hasValidCollectedCoords
        ? parsedLat!
        : hasValidReferenceCoords
          ? refLat!
          : DRC_FALLBACK.lat;
  const viewLng =
    focusTarget === 'reference' && hasValidReferenceCoords
      ? refLng!
      : hasValidCollectedCoords
        ? parsedLng!
        : hasValidReferenceCoords
          ? refLng!
          : DRC_FALLBACK.lng;

  const zoom = hasValidCollectedCoords || hasValidReferenceCoords ? 16 : 6;

  const embedUrl = useMemo(
    () => buildGoogleMapsEmbedUrl(viewLat, viewLng, zoom, satellite),
    [viewLat, viewLng, zoom, satellite]
  );

  const distanceToRefMeters =
    hasValidCollectedCoords && hasValidReferenceCoords
      ? calculateDistanceMeters(parsedLat!, parsedLng!, refLat!, refLng!)
      : null;

  const distanceAssessment =
    distanceToRefMeters !== null
      ? distanceToRefMeters <= 80
        ? {
            level: 'CONFORME' as const,
            text: `Emplacement exact (écart : ${formatDistanceFr(distanceToRefMeters)})`,
          }
        : distanceToRefMeters <= 500
          ? {
              level: 'PERIMETRE' as const,
              text: `Périmètre immédiat du chantier (écart : ${formatDistanceFr(distanceToRefMeters)})`,
            }
          : distanceToRefMeters <= 2000
            ? {
                level: 'ATTENTION' as const,
                text: `Écart modéré avec l’ouvrage contractuel (${formatDistanceFr(distanceToRefMeters)})`,
              }
            : {
                level: 'ALERTE' as const,
                text: `Écart très important avec l’ouvrage (${formatDistanceFr(distanceToRefMeters)}) — Vérifiez la position`,
              }
      : null;

  const nudge = (dLat: number, dLng: number) => {
    if (disabled) return;
    const baseLat = hasValidCollectedCoords ? parsedLat! : hasValidReferenceCoords ? refLat! : DRC_FALLBACK.lat;
    const baseLng = hasValidCollectedCoords ? parsedLng! : hasValidReferenceCoords ? refLng! : DRC_FALLBACK.lng;
    setIsConfirmed(false);
    setFocusTarget('collected');
    onChange({
      lat: (baseLat + dLat).toFixed(6),
      lng: (baseLng + dLng).toFixed(6),
      confirmed: false,
    });
  };

  const handleAlignWithContract = () => {
    if (!hasValidReferenceCoords || disabled) return;
    setIsConfirmed(true);
    setFocusTarget('reference');
    onChange({
      lat: refLat!.toFixed(6),
      lng: refLng!.toFixed(6),
      confirmed: true,
    });
  };

  const handleConfirmPoint = () => {
    if (!hasValidCollectedCoords) return;
    setIsConfirmed(true);
    onChange({
      lat: parsedLat!.toFixed(6),
      lng: parsedLng!.toFixed(6),
      confirmed: true,
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Confirmation Cartographique Interactive du Point de Collecte
            </h3>
            <p className="text-[11px] text-slate-500">
              Carte Google Maps centrée sur le point GPS. Affinez via GPS appareil, alignement
              ouvrage, ou micro-ajustements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {hasValidCollectedCoords && (
            <button
              type="button"
              onClick={() => setFocusTarget('collected')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border min-h-[34px] ${
                focusTarget === 'collected'
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-white text-emerald-800 border-slate-300 hover:bg-emerald-50'
              }`}
              title="Centrer la carte sur le point de collecte GPS"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Point GPS</span>
            </button>
          )}
          {hasValidReferenceCoords && (
            <button
              type="button"
              onClick={() => setFocusTarget('reference')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border min-h-[34px] ${
                focusTarget === 'reference'
                  ? 'bg-[#0F2544] text-white border-[#0F2544]'
                  : 'bg-white text-blue-900 border-slate-300 hover:bg-blue-50'
              }`}
              title="Centrer la carte sur la position contractuelle de l’ouvrage"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Ouvrage</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSatellite((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 min-h-[34px]"
            title="Basculer plan / satellite"
          >
            <Layers className="w-3.5 h-3.5 text-blue-700" />
            <span>{satellite ? 'Vue Plan' : 'Vue Satellite'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              window.open(buildGoogleMapsOpenUrl(viewLat, viewLng), '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 min-h-[34px]"
            title="Ouvrir dans Google Maps (nouvel onglet)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ouvrir</span>
          </button>
        </div>
      </div>

      <div className="rounded-md border border-slate-300 overflow-hidden shadow-inner bg-slate-200">
        <iframe
          key={`${focusTarget}-${satellite}-${viewLat.toFixed(6)}-${viewLng.toFixed(6)}`}
          title={`Carte Google Maps — ${matrixNumber || projectName || 'point de collecte'}`}
          src={embedUrl}
          width="100%"
          height="450"
          style={{ border: 0, display: 'block', minHeight: '16rem' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full pointer-events-auto"
        />
      </div>
      <p className="text-[11px] text-slate-500">
        Carte centrée sur{' '}
        <strong className="text-slate-700">
          {focusTarget === 'reference' ? 'ouvrage (réf.)' : 'point GPS'}
        </strong>
        {' · '}
        {viewLat.toFixed(5)}, {viewLng.toFixed(5)}
      </p>

      {/* Micro-ajustements (± ~11 m à l’équateur pour 0.0001°) */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Ajuster le point :</span>
          <button
            type="button"
            onClick={() => nudge(0.0001, 0)}
            className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-medium"
          >
            Nord
          </button>
          <button
            type="button"
            onClick={() => nudge(-0.0001, 0)}
            className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-medium"
          >
            Sud
          </button>
          <button
            type="button"
            onClick={() => nudge(0, -0.0001)}
            className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-medium"
          >
            Ouest
          </button>
          <button
            type="button"
            onClick={() => nudge(0, 0.0001)}
            className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-medium"
          >
            Est
          </button>
          <span className="text-slate-400">(~11 m par clic)</span>
        </div>
      )}

      {distanceAssessment && (
        <div
          className={`p-3 rounded-md border text-xs flex flex-wrap items-center justify-between gap-2.5 ${
            distanceAssessment.level === 'CONFORME'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : distanceAssessment.level === 'PERIMETRE'
                ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                : distanceAssessment.level === 'ATTENTION'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-red-50/80 border-red-200 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {distanceAssessment.level === 'CONFORME' || distanceAssessment.level === 'PERIMETRE' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            )}
            <span className="font-semibold">{distanceAssessment.text}</span>
          </div>

          {hasValidReferenceCoords && distanceToRefMeters !== null && distanceToRefMeters > 30 && (
            <button
              type="button"
              onClick={handleAlignWithContract}
              disabled={disabled}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded text-slate-800 hover:bg-slate-50 min-h-[30px]"
            >
              Aligner sur l’ouvrage ({refLat!.toFixed(5)}, {refLng!.toFixed(5)})
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {hasValidCollectedCoords ? (
            <>
              <span className="font-semibold text-slate-800">Coordonnées :</span>
              <span className="font-mono bg-white px-2 py-1 rounded border border-slate-300 text-slate-900">
                Lat: {parsedLat!.toFixed(6)} · Lng: {parsedLng!.toFixed(6)}
              </span>
              {accuracy ? (
                <span className="text-slate-500 font-mono text-[11px]">
                  (Précision ±{Math.round(accuracy)} m)
                </span>
              ) : null}
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Point validé
                </span>
              ) : (
                <span className="text-amber-800 text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Confirmation recommandée
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-500 italic">
              Capturez le GPS ou alignez sur l’ouvrage pour placer le point sur Google Maps.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCaptureGps && (
            <button
              type="button"
              onClick={onCaptureGps}
              disabled={gpsLoading || disabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-md hover:bg-slate-50 min-h-[40px]"
            >
              <Crosshair className={`w-4 h-4 text-blue-700 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'Acquisition…' : 'Capturer via GPS'}</span>
            </button>
          )}

          {hasValidCollectedCoords && (
            <button
              type="button"
              onClick={handleConfirmPoint}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md min-h-[40px] ${
                isConfirmed
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isConfirmed ? 'Point confirmé' : 'Confirmer ce point'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
