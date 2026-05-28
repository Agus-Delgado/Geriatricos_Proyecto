const FREQUENCY_PREFIX = 'Frecuencia: ';
const OBSERVATIONS_PREFIX = 'Observaciones: ';

export interface MedicationInstructionParts {
  frequency?: string;
  observations?: string;
}

export interface ParsedMedicationInstructions {
  frequency: string;
  observations: string;
  /** Texto que no coincide con el formato estructurado */
  legacyText: string;
}

export function formatMedicationInstructions(
  parts: MedicationInstructionParts
): string | null {
  const lines: string[] = [];
  const frequency = parts.frequency?.trim();
  const observations = parts.observations?.trim();

  if (frequency) {
    lines.push(`${FREQUENCY_PREFIX}${frequency}`);
  }
  if (observations) {
    lines.push(`${OBSERVATIONS_PREFIX}${observations}`);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

export function parseMedicationInstructions(
  instructions: string | null | undefined
): ParsedMedicationInstructions {
  if (!instructions?.trim()) {
    return { frequency: '', observations: '', legacyText: '' };
  }

  const lines = instructions.split('\n');
  let frequency = '';
  let observations = '';
  const legacyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(FREQUENCY_PREFIX)) {
      frequency = trimmed.slice(FREQUENCY_PREFIX.length).trim();
    } else if (trimmed.startsWith(OBSERVATIONS_PREFIX)) {
      observations = trimmed.slice(OBSERVATIONS_PREFIX.length).trim();
    } else if (trimmed) {
      legacyLines.push(trimmed);
    }
  }

  return {
    frequency,
    observations,
    legacyText: legacyLines.join('\n'),
  };
}
