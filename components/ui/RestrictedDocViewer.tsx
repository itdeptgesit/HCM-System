import React, { useState } from 'react';
import { FileText, ExternalLink, ShieldCheck, AlertCircle, Eye, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RestrictedDocViewerProps {
  fileUrl: string;
  fileName?: string;
  categoryLabel?: string;
  targetEmail?: string;
  className?: string;
  isPhoto?: boolean;
  thumbnailUrl?: string;
}

export const RestrictedDocViewer: React.FC<RestrictedDocViewerProps> = ({
  fileUrl,
  fileName = 'Dokumen HCM',
  categoryLabel = 'Dokumen',
  targetEmail,
  className = '',
  isPhoto = false,
  thumbnailUrl
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const isGDrive = fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com');

  return (
    <div className={`rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2 text-xs ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isPhoto ? (
            <ImageIcon size={15} className="text-emerald-600 shrink-0" />
          ) : (
            <FileText size={15} className="text-emerald-600 shrink-0" />
          )}
          <span className="font-semibold text-foreground truncate">{fileName}</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0">
          <ShieldCheck size={11} className="mr-1 text-emerald-600" />
          {isGDrive ? 'Restricted Drive' : 'File Terlampir'}
        </Badge>
      </div>

      {/* Notice Akun Google Workspace */}
      {isGDrive && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-background/80 p-2 rounded-lg border border-border/40">
          <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            File dilindungi (Restricted). Silakan buka dengan akun Google terdaftar
            {targetEmail ? (
              <span className="font-bold text-foreground"> ({targetEmail})</span>
            ) : (
              ' perusahaan'
            )}.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          <span>Buka di Google Drive</span>
          <ExternalLink size={12} />
        </a>

        {isPhoto && thumbnailUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="text-xs h-7 gap-1"
          >
            <Eye size={12} />
            <span>Lihat Pratinjau</span>
          </Button>
        )}
      </div>

      {/* Photo Preview Modal if applicable */}
      {isPhoto && modalOpen && thumbnailUrl && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <ImageIcon size={16} className="text-emerald-600" />
                <span>{categoryLabel} - {fileName}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-xl overflow-hidden border border-border my-2 bg-muted/20 flex items-center justify-center p-2">
              <img
                src={thumbnailUrl}
                alt={fileName}
                className="max-h-[60vh] object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Pratinjau internal sesi aktif. File master disimpan secara Restricted di Google Drive perusahaan.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
