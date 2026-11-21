import React from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { OFFICIAL_DOCUMENTS } from '../../domain/constants';

interface Props {
  compact?: boolean;
  className?: string;
}

export const OfficialDocumentsCard: React.FC<Props> = ({ compact = false, className = '' }) => {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4'} ${className}`}
      aria-label="Documents officiels BCECO / PDL-145T"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
            Documents officiels
          </h2>
          {!compact && (
            <p className="text-xs text-slate-500 mt-0.5">
              Formulaire RSE de collecte terrain et modèle Matrice Unique (21 colonnes) — versions de référence
              embarquées.
            </p>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {OFFICIAL_DOCUMENTS.map((doc) => {
          const Icon = doc.kind === 'XLSX' ? FileSpreadsheet : FileText;
          return (
            <li key={doc.id}>
              <a
                href={doc.href}
                download={doc.fileName}
                className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-[#0F2544] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 leading-snug">{doc.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{doc.description}</p>
                </div>
                <Download className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
