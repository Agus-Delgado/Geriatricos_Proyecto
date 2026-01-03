import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ReleaseNotes } from '../../config/releaseNotes';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ReleaseNotes;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  onClose,
  notes,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={notes.title} size="lg">
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Versión {notes.version} · {notes.date}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">Resumen</div>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            {notes.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>

        {notes.details && notes.details.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">Detalle</div>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {notes.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2">
          <Button onClick={onClose} fullWidth>
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
};
