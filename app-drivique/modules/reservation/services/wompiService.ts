import { sha256Hex, utf8ToBinaryString } from "./sha256";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

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
 * con todos los parámetros requeridos, incluida la firma de integridad
 * y el manejo seguro de redirección (reemplazando localhost por localtest.me
 * para evitar bloqueos del WAF/CloudFront de Wompi).
 */
export async function construirUrlCheckout({
  reference,
  amountInCents,
  redirectUrl,
}: ConstruirUrlCheckoutParams): Promise<string> {
  const currency = wompiConfig.currency;
  const montoEntero = Math.round(Number(amountInCents));
  const cleanRef = reference.trim().replace(/\s+/g, "_");
  const firma = await generarFirmaIntegridad(cleanRef, montoEntero, currency);

  const params = new URLSearchParams({
    "public-key": wompiConfig.publicKey,
    currency,
    "amount-in-cents": String(montoEntero),
    reference: cleanRef,
    "signature:integrity": firma,
  });

  // Validación estricta para evitar error "redirectUrl: URL inválida" en Wompi
  let targetRedirect = "https://localtest.me/respuesta";

  if (redirectUrl && typeof redirectUrl === "string" && redirectUrl.trim() !== "") {
    let clean = redirectUrl.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      if (clean.includes("localhost")) {
        clean = clean.replace(/localhost/g, "localtest.me");
      }
      if (clean.startsWith("http://")) {
        clean = clean.replace(/^http:\/\//, "https://");
      }
      targetRedirect = clean;
    } else {
      // Esquemas móviles como exp:// o rutas personalizadas se homologan a la URL HTTPS válida
      targetRedirect = "https://localtest.me/respuesta";
    }
  }

  params.set("redirect-url", targetRedirect);

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

/**
 * Abre el flujo de Web Checkout de Wompi de forma robusta con WebBrowser (Chrome Custom Tabs / Safari).
 * Evita bloqueos de Modal en React Native, soporta pasarelas bancarias PSE y retorna el resultado.
 */
export async function iniciarFlujoWompi({
  reference,
  amountInCents,
  redirectUrl = "https://localtest.me/respuesta",
}: {
  reference: string;
  amountInCents: number;
  redirectUrl?: string;
}): Promise<{ transactionId?: string | null; reference: string; cancelado?: boolean }> {
  const url = await construirUrlCheckout({
    reference,
    amountInCents,
    redirectUrl,
  });

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.href = url;
    return { reference, transactionId: null };
  }

  const res = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

  let txId: string | null = null;
  if (res.type === "success" && (res as any).url) {
    try {
      const parsed = Linking.parse((res as any).url);
      txId = (parsed.queryParams?.id as string) || null;
      if (!txId) {
        const match = (res as any).url.match(/[?&]id=([^&#]+)/);
        if (match && match[1]) txId = decodeURIComponent(match[1]);
      }
    } catch (e) {
      console.warn("[wompiService] Error parseando retorno de WebBrowser:", e);
    }
  }

  return { transactionId: txId, reference, cancelado: res.type === "cancel" || res.type === "dismiss" };
}
