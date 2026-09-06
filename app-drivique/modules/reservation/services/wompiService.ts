// modules/reserva/services/wompiService.ts
//
// Réplica de la integración de Wompi Web Checkout que ya existe en la web
// (src/services/wompiService.js). Mismas llaves de Sandbox, mismo orden de
// concatenación para la firma y misma URL de checkout (checkout.wompi.co/p/).
import { sha256Hex, utf8ToBinaryString } from "./sha256";

/**
 * Llaves de Sandbox (pub_test_ / test_integrity_) — son las mismas que usa
 * la web, exactamente como pidió el negocio ("las llaves y todo es igual").
 * Al ser llaves de PRUEBA públicas de Wompi no hay problema en que vivan en
 * el cliente; en producción esto se movería a variables de entorno / backend.
 */
export const wompiConfig = {
  ambiente: "sandbox" as const,
  publicKey: "pub_test_Xq9JLHZllsreCdWcFQoubBvUZUQ61sFC",
  integrityKey: "test_integrity_atd8mLC87VadjQvpBEZASMdr9HfUTyP7",
  currency: "COP" as const,
};

/**
 * TODO: MIGRAR A BACKEND
 * La firma de integridad nunca debe generarse en el cliente ni exponer el
 * integrityKey en producción. Esto es exclusivamente para el entorno
 * Sandbox de pruebas (igual que en la web). En producción este cálculo
 * debe vivir en un endpoint propio que devuelva solo el hash.
 *
 * Formato verificado contra el ejemplo oficial de Wompi (docs.wompi.co,
 * "Generate an integrity signature"): el orden es SIEMPRE
 *   referencia + monto_en_centavos + moneda + secreto_de_integridad
 * concatenados sin separadores.
 */
export async function generarFirmaIntegridad(
  referencia: string,
  montoCentavos: number,
  moneda: string
): Promise<string> {
  if (!Number.isInteger(montoCentavos)) {
    console.warn(
      "[Wompi] montoCentavos no es un entero exacto, esto puede invalidar la firma:",
      montoCentavos
    );
  }
  const cadena = `${referencia}${montoCentavos}${moneda}${wompiConfig.integrityKey}`;
  return sha256Hex(utf8ToBinaryString(cadena));
}

/**
 * Referencia alfanumérica única para la transacción. Solo usa letras,
 * números, guiones y guiones bajos (evita espacios, acentos, "+", "/" que
 * podrían romper la URL o la validación de Wompi).
 */
export function generarReferenciaUnica(): string {
  return (
    "RES-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 9).toUpperCase()
  );
}

/**
 * Convierte el total en pesos (COP) al entero en centavos que exige Wompi.
 * Es el único lugar donde se hace esta conversión; el mismo valor se
 * reutiliza tal cual tanto para firmar como para el parámetro de la URL,
 * para que nunca puedan desincronizarse.
 */
export function aCentavos(totalCop: number): number {
  return Math.round(Number(totalCop) * 100);
}

interface ConstruirUrlCheckoutParams {
  reference: string;
  amountInCents: number;
  redirectUrl?: string;
}

/**
 * Construye la URL del Web Checkout de Wompi (redirección directa a /p/)
 * con todos los parámetros requeridos, incluida la firma de integridad.
 */
export async function construirUrlCheckout({
  reference,
  amountInCents,
  redirectUrl,
}: ConstruirUrlCheckoutParams): Promise<string> {
  const currency = wompiConfig.currency;
  const firma = await generarFirmaIntegridad(reference, amountInCents, currency);

  const params = new URLSearchParams({
    "public-key": wompiConfig.publicKey,
    currency,
    "amount-in-cents": String(amountInCents),
    reference,
    "signature:integrity": firma,
  });

  if (redirectUrl) {
    params.set("redirect-url", redirectUrl);
  }

  return `https://checkout.wompi.co/p/?${params.toString()}`;
}

export interface WompiTransactionResponse {
  id: string;
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string;
  payment_method?: {
    type?: string;
    extra?: {
      name?: string;
      brand?: string;
      last_four?: string;
      async_payment_url?: string;
      business_agreement_code?: string;
      payment_reference?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Consulta el estado y los detalles de una transacción en Wompi API
 */
export async function consultarTransaccionWompi(transactionId: string): Promise<WompiTransactionResponse | null> {
  try {
    const res = await fetch(`https://sandbox.wompi.co/v1/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${wompiConfig.publicKey}`,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch (error) {
    console.warn("[wompiService] Error consultando transaccion:", error);
    return null;
  }
}
