// modules/reservation/utils/reviewModeration.ts
//
// Sistema de moderación y validación para las reseñas de vehículos:
// 1. Detección de lenguaje ofensivo / vulgaridades (con normalización leetspeak).
// 2. Detección de datos de contacto / privacidad (teléfonos, correos, documentos, tarjetas).
// 3. Detección de enlaces y URLs / spam.
// 4. Validación de longitud y repetición de caracteres.

export interface ResultadoValidacion {
  valido: boolean;
  mensajeError?: string;
  tipo?: "profanity" | "privacy" | "links" | "length" | "spam";
}

// Lista de palabras ofensivas e insultos comunes (Español / Colombia / Latam / Inglés)
const PALABRAS_OFENSIVAS = [
  "mierda",
  "puta",
  "puto",
  "hijueputa",
  "hp",
  "gonorrea",
  "marica",
  "maricon",
  "pirobo",
  "malparido",
  "malparida",
  "carechimba",
  "chimba de mierda",
  "zorra",
  "perra",
  "estupido",
  "estupida",
  "idiota",
  "imbecil",
  "pendejo",
  "pendeja",
  "bastardo",
  "cabron",
  "culero",
  "verga",
  "coño",
  "joder",
  "fuck",
  "bitch",
  "shit",
  "asshole",
  "bastard",
  "cunt",
  "dick",
];

// Normaliza texto para atrapar intentos de evasión (leetspeak: p*ta, m1erda, etc.)
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/[@$*!#%&_.,\-\s]+/g, ""); // quita símbolos para juntar letras
}

export function validarComentarioResena(comentario: string): ResultadoValidacion {
  const limpio = comentario.trim();

  // Si está vacío es válido (el comentario de texto es opcional, solo las estrellas son obligatorias)
  if (limpio.length === 0) {
    return { valido: true };
  }

  // 1. Longitud máxima
  if (limpio.length > 500) {
    return {
      valido: false,
      tipo: "length",
      mensajeError: "El comentario no puede exceder los 500 caracteres.",
    };
  }

  // 2. Longitud mínima si decide escribir texto
  if (limpio.length < 8) {
    return {
      valido: false,
      tipo: "length",
      mensajeError: "El comentario debe tener al menos 8 caracteres.",
    };
  }

  // 3. Detección de URLs y enlaces
  const patronUrl = /(https?:\/\/|www\.|\.com|\.co|\.net|\.org|\.io|\.app|\.xyz)/i;
  if (patronUrl.test(limpio)) {
    return {
      valido: false,
      tipo: "links",
      mensajeError: "Por seguridad, no se permiten enlaces o páginas web en la reseña.",
    };
  }

  // 4. Detección de correos electrónicos
  const patronEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (patronEmail.test(limpio)) {
    return {
      valido: false,
      tipo: "privacy",
      mensajeError: "Por tu privacidad, no incluyas direcciones de correo electrónico.",
    };
  }

  // 5. Detección de números de teléfono / celular (secuencias de 7 o más dígitos)
  const soloNumeros = limpio.replace(/\D/g, "");
  if (soloNumeros.length >= 7) {
    const patronTelefono = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\b\d{7,12}\b/;
    if (patronTelefono.test(limpio)) {
      return {
        valido: false,
        tipo: "privacy",
        mensajeError: "Por tu seguridad, no incluyas números telefónicos ni de contacto.",
      };
    }
  }

  // 6. Detección de spam de caracteres repetidos (ej: "aaaaaaaaaa" o "buenooooooo")
  const patronRepeticion = /(.)\1{4,}/;
  if (patronRepeticion.test(limpio)) {
    return {
      valido: false,
      tipo: "spam",
      mensajeError: "Por favor evita la repetición excesiva de caracteres.",
    };
  }

  // 7. Detección de palabras ofensivas (leetspeak y coincidencia de palabras)
  const textoNormalizado = normalizarTexto(limpio);
  const palabrasSeparadas = limpio
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s,.;:!?()_/-]+/);

  for (const malaPalabra of PALABRAS_OFENSIVAS) {
    if (palabrasSeparadas.includes(malaPalabra) || (malaPalabra.length >= 4 && textoNormalizado.includes(malaPalabra))) {
      return {
        valido: false,
        tipo: "profanity",
        mensajeError: "Por favor mantén un lenguaje respetuoso y cordial en tu reseña.",
      };
    }
  }

  return { valido: true };
}
