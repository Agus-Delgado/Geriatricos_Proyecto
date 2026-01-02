import type { CertificateType } from '../../types/certificates';

export function formatDateAR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatTimeAR(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

export function buildDefaultBodyText(args: {
  type: CertificateType;
  patientFullName: string;
  patientDni: string;
  issuedAt: Date;
}): string {
  const { type, patientFullName, patientDni, issuedAt } = args;
  const FECHA = formatDateAR(issuedAt);
  const HORA = formatTimeAR(issuedAt);

  switch (type) {
    case 'CONTROL_CLINICO':
      return (
`En la fecha se asistió a ${patientFullName}, DNI ${patientDni}, para control clínico de sus patologías de base, presentando trastornos de la movilidad que impiden la deambulación fuera del hogar.
Se expide la presente constancia para ser presentada ante quien corresponda.`
      );

    case 'OBITO':
      return (
`Siendo las ${HORA} hs del ${FECHA}, se constató óbito de ${patientFullName}, DNI ${patientDni}.
Se expide la presente constancia para ser presentada ante quien corresponda.`
      );

    case 'PRESENCIA':
      return (
`Se deja constancia que ${patientFullName}, DNI ${patientDni}, se encuentra en este establecimiento.
Se expide la presente constancia para ser presentada ante quien corresponda.`
      );

    default:
      return '';
  }
}
