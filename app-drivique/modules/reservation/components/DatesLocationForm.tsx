import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { useReservaStore } from "@/store/reservationStore";
import { COLOR_MARCA, formatHoraAmPm, getMetodosPago } from "../constants/reservation.constants";
import { CIUDADES_DATA, getCiudadPorSucursal, getDireccionSucursal, getDisponibilidadVehiculo } from "@/modules/catalog/constants/catalog.constants";
import CalendarioRango from "./DateRangeCalendar";
import SelectorSucursalModal, { OpcionLugar } from "./BranchSelectorModal";
import SelectorHoraModal from "./TimeSelectorModal";
import { AlertaPagoEfectivo } from "./CashPaymentAlert";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

interface Props {
  vehiculo: Vehiculo;
}

function formatFecha(fecha: string | null, fallback: string): string {
  if (!fecha) return fallback;
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FormFechasLugar({ vehiculo }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const METODOS_PAGO = useMemo(() => getMetodosPago(t), [t]);
  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const actualizarFechasLugar = useReservaStore((s) => s.actualizarFechasLugar);

  const [modalTipo, setModalTipo] = useState<"retiro" | "devolucion" | null>(null);
  const [horaVisible, setHoraVisible] = useState<"retiro" | "devolucion" | null>(null);
  const [alertaEfectivoVisible, setAlertaEfectivoVisible] = useState(false);

  const nombreSucursal = vehiculo.sucursal ?? "";
  const ciudadNombre = vehiculo.sucursal ? getCiudadPorSucursal(vehiculo.sucursal) : null;
  const ciudadInfo = ciudadNombre ? CIUDADES_DATA.find((c) => c.nombre === ciudadNombre) : null;

  const esWompi = fechasLugar.metodoPago === "wompi";

  const opcionesEntrega: OpcionLugar[] = useMemo(() => {
    const base: OpcionLugar[] = [
      { value: nombreSucursal, label: t("reserva.fechasLugar.recogerEnSucursal", { sucursal: nombreSucursal }), icono: "business-outline" },
    ];
    if (esWompi) {
      base.push({ value: "domicilio", label: t("reserva.fechasLugar.entregaDomicilio"), icono: "home-outline" });
      if (ciudadInfo?.tieneAeropuerto !== false) {
        base.push({ value: "aeropuerto", label: t("reserva.fechasLugar.entregaAeropuerto"), icono: "airplane-outline" });
      }
      base.push({ value: "terminal", label: t("reserva.fechasLugar.entregaTerminal"), icono: "bus-outline" });
    }
    return base;
  }, [nombreSucursal, esWompi, ciudadInfo, t]);

  const opcionesDevolucion: OpcionLugar[] = useMemo(() => {
    const base: OpcionLugar[] = [
      { value: nombreSucursal, label: t("reserva.fechasLugar.devolverEnSucursal", { sucursal: nombreSucursal }), icono: "business-outline" },
    ];
    if (esWompi) {
      base.push({ value: "domicilio", label: t("reserva.fechasLugar.devolucionDomicilio"), icono: "home-outline" });
      if (ciudadInfo?.tieneAeropuerto !== false) {
        base.push({ value: "aeropuerto", label: t("reserva.fechasLugar.devolucionAeropuerto"), icono: "airplane-outline" });
      }
      base.push({ value: "terminal", label: t("reserva.fechasLugar.devolucionTerminal"), icono: "bus-outline" });
    }
    return base;
  }, [nombreSucursal, esWompi, ciudadInfo, t]);

  useEffect(() => {
    if (fechasLugar.metodoPago === "efectivo") {
      const actualizacion: Partial<typeof fechasLugar> = {};
      // Con pago en efectivo la única opción válida es la sucursal del
      // vehículo: la seleccionamos automáticamente (no solo cuando ya había
      // otro valor elegido, sino también cuando el campo estaba vacío).
      if (fechasLugar.lugarRetiro !== nombreSucursal) {
        actualizacion.lugarRetiro = nombreSucursal;
      }
      if (fechasLugar.lugarDevolucion !== nombreSucursal) {
        actualizacion.lugarDevolucion = nombreSucursal;
      }
      if (Object.keys(actualizacion).length > 0) {
        actualizarFechasLugar(actualizacion);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechasLugar.metodoPago, nombreSucursal]);

  const handleElegirSucursal = (value: string) => {
    if (modalTipo === "retiro") actualizarFechasLugar({ lugarRetiro: value });
    if (modalTipo === "devolucion") actualizarFechasLugar({ lugarDevolucion: value });
    setModalTipo(null);
  };

  useEffect(() => {
    if (!fechasLugar.fechaRetiro || !fechasLugar.horaRetiro) return;
    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

    if (String(fechasLugar.fechaRetiro).split("T")[0] === hoyStr) {
      const [h, m] = fechasLugar.horaRetiro.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const horaMinutos = h * 60 + m;
        const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
        if (horaMinutos <= ahoraMinutos) {
          actualizarFechasLugar({ horaRetiro: "" });
        }
      }
    }
  }, [fechasLugar.fechaRetiro, fechasLugar.horaRetiro, actualizarFechasLugar]);

  const handleElegirHora = (hora: string) => {
    const fecha = horaVisible === "retiro" ? fechasLugar.fechaRetiro : fechasLugar.fechaDevolucion;

    if (fecha) {
      const ahora = new Date();
      const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

      if (String(fecha).split("T")[0] === hoyStr) {
        const [h, m] = hora.split(":").map(Number);
        const horaMinutos = h * 60 + m;
        const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
        if (horaMinutos <= ahoraMinutos) {
          Alert.alert(
            t("reserva.fechasLugar.horaPasadaTitulo", { defaultValue: "Hora no disponible" }),
            t("reserva.fechasLugar.horaPasadaMensaje", {
              defaultValue: "La hora seleccionada ya pasó hoy en tiempo real. Por favor selecciona una hora posterior.",
            })
          );
          return;
        }
      }

      // La disponibilidad ya no viene embebida en el vehículo — se calcula
      // a partir de RESERVAS_MOCK (mocks/reservas.json) según su id.
      const horasOcupadas = getDisponibilidadVehiculo(vehiculo.id).horasOcupadas?.[fecha] ?? [];
      const bloqueo = horasOcupadas.find((h) => h.hora === hora);

      if (bloqueo) {
        const mensaje =
          bloqueo.motivo === "mantenimiento"
            ? t("reserva.fechasLugar.horaNoDisponibleMantenimiento")
            : t("reserva.fechasLugar.horaNoDisponibleReservado");

        Alert.alert(t("reserva.fechasLugar.horaNoDisponibleTitulo"), mensaje, [
          { text: t("reserva.fechasLugar.intentarDeNuevo"), style: "default" },
        ]);
        return;
      }
    }

    if (horaVisible === "retiro") {
      actualizarFechasLugar({ horaRetiro: hora });
      // Si la hora de devolución quedó antes o igual en el mismo día, resetearla
      if (
        fechasLugar.fechaRetiro === fechasLugar.fechaDevolucion &&
        fechasLugar.horaDevolucion &&
        fechasLugar.horaDevolucion <= hora
      ) {
        actualizarFechasLugar({ horaDevolucion: "" });
      }
    } else if (horaVisible === "devolucion") {
      actualizarFechasLugar({ horaDevolucion: hora });
    }
  };

  const labelLugarRetiro =
    opcionesEntrega.find((o) => o.value === fechasLugar.lugarRetiro)?.label ||
    fechasLugar.lugarRetiro ||
    t("reserva.fechasLugar.seleccionar");
  const labelLugarDevolucion =
    opcionesDevolucion.find((o) => o.value === fechasLugar.lugarDevolucion)?.label ||
    fechasLugar.lugarDevolucion ||
    t("reserva.fechasLugar.seleccionar");

  const ciudadEntregaNombre = ciudadInfo?.nombre ?? ciudadNombre ?? "";

  const mostrarDomicilioRetiro = fechasLugar.lugarRetiro === "domicilio";
  const mostrarDomicilioDevolucion = fechasLugar.lugarDevolucion === "domicilio";

  const textoDuracion = useMemo(() => {
    if (!fechasLugar.fechaRetiro || !fechasLugar.fechaDevolucion) return null;

    const diaTexto = (n: number) =>
      n === 1
        ? t("reserva.fechasLugar.diaSingular", { defaultValue: "día" })
        : t("reserva.fechasLugar.diaPlural", { defaultValue: "días" });
    const horaTexto = (n: number) =>
      n === 1
        ? t("reserva.fechasLugar.horaSingular", { defaultValue: "hora" })
        : t("reserva.fechasLugar.horaPlural", { defaultValue: "horas" });

    if (fechasLugar.horaRetiro && fechasLugar.horaDevolucion) {
      const inicio = new Date(`${fechasLugar.fechaRetiro}T${fechasLugar.horaRetiro}:00`).getTime();
      const fin = new Date(`${fechasLugar.fechaDevolucion}T${fechasLugar.horaDevolucion}:00`).getTime();
      const diffMs = Math.max(fin - inicio, 0);
      const totalHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const dias = Math.floor(totalHoras / 24);
      const horas = totalHoras % 24;

      if (dias > 0 && horas > 0) {
        return `${dias} ${diaTexto(dias)} - ${horas} ${horaTexto(horas)}`;
      }
      if (dias > 0 && horas === 0) {
        return `${dias} ${diaTexto(dias)}`;
      }
      if (dias === 0 && horas > 0) {
        return `${horas} ${horaTexto(horas)}`;
      }
    }

    const d1 = new Date(fechasLugar.fechaRetiro + "T00:00:00").getTime();
    const d2 = new Date(fechasLugar.fechaDevolucion + "T00:00:00").getTime();
    const dias = Math.max(Math.round((d2 - d1) / 86400000), 1);
    return `${dias} ${diaTexto(dias)}`;
  }, [fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion, fechasLugar.horaRetiro, fechasLugar.horaDevolucion, t]);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  return (
    <View style={[styles.card, { backgroundColor: c.bgCard }]}>
      <View style={styles.headerConIcono}>
        <Ionicons name="card-outline" size={14} color={primaryAccent} />
        <Text style={[styles.tituloHeaderConIcono, { color: primaryAccent }]}>
          {t("reserva.fechasLugar.metodoPagoPreferido")}
        </Text>
      </View>
      <View style={styles.metodosColumna}>
        {METODOS_PAGO.map((metodo) => {
          const activo = fechasLugar.metodoPago === metodo.id;
          return (
            <TouchableOpacity
              key={metodo.id}
              style={[
                styles.metodoCard,
                {
                  borderColor: c.border,
                  backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                },
                activo && [styles.metodoCardActivo, { borderColor: primaryAccent, backgroundColor: c.primaryBg }],
              ]}
              onPress={() => {
                actualizarFechasLugar({
                  metodoPago: metodo.id,
                  ...(metodo.id === "efectivo"
                    ? {
                        lugarRetiro: nombreSucursal,
                        lugarDevolucion: nombreSucursal,
                      }
                    : {}),
                });
                if (metodo.id === "efectivo") setAlertaEfectivoVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.metodoHeaderRow}>
                <Text style={[styles.metodoTitulo, { color: c.textPrimary }, activo && { color: primaryAccent }]}>
                  {metodo.titulo}
                </Text>
                <View style={[styles.radio, { borderColor: c.border }, activo && [styles.radioActivo, { borderColor: primaryAccent }]]}>
                  {activo && <View style={[styles.radioPunto, { backgroundColor: primaryAccent }]} />}
                </View>
              </View>
              <Text style={[styles.metodoDesc, { color: c.textMuted }]}>
                {metodo.descripcion}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {fechasLugar.metodoPago === "efectivo" && (
        <View style={styles.puntoAutorizadoContainer}>
          <View style={styles.headerConIcono}>
            <Ionicons name="location" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono}>
              {t("reserva.fechasLugar.puntoAutorizadoEfectivo", { defaultValue: "Punto autorizado para pago en efectivo" })}
            </Text>
          </View>
          <View style={[styles.puntoAutorizadoBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}>
            <Text style={[styles.puntoAutorizadoTexto, { color: c.textPrimary }]} numberOfLines={1}>
              {`${nombreSucursal}${ciudadEntregaNombre ? ` · ${ciudadEntregaNombre}` : ""}`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.filaDosCols}>
        <View style={styles.columnaMedia}>
          <View style={styles.headerConIcono}>
            <Ionicons name="location" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono} numberOfLines={1}>
              {t("reserva.fechasLugar.lugarDeRetiro")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            onPress={() => setModalTipo("retiro")}
            activeOpacity={0.8}
          >
            <View style={styles.selectValorRow}>
              <Text
                style={[
                  styles.selectValue,
                  { color: fechasLugar.lugarRetiro ? c.textPrimary : c.textMuted },
                ]}
                numberOfLines={1}
              >
                {labelLugarRetiro}
              </Text>
              <Ionicons name="chevron-down" size={14} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.columnaMedia}>
          <View style={styles.headerConIcono}>
            <Ionicons name="location" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono} numberOfLines={1}>
              {t("reserva.fechasLugar.lugarDeDevolucion")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            onPress={() => setModalTipo("devolucion")}
            activeOpacity={0.8}
          >
            <View style={styles.selectValorRow}>
              <Text
                style={[
                  styles.selectValue,
                  { color: fechasLugar.lugarDevolucion ? c.textPrimary : c.textMuted },
                ]}
                numberOfLines={1}
              >
                {labelLugarDevolucion}
              </Text>
              <Ionicons name="chevron-down" size={14} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- INFO DE ENTREGA A DOMICILIO (solo si lugarRetiro === "domicilio") --- */}
      {mostrarDomicilioRetiro && (
        <View style={[styles.domicilioCard, { borderColor: c.border }]}>
          <Text style={styles.domicilioTitulo}>{t("reserva.fechasLugar.infoEntregaDomicilio")}</Text>

          <View style={[styles.ciudadBox, { backgroundColor: c.primaryBg }]}>
            <View style={styles.selectLabelRow}>
              <Ionicons name="location" size={13} color={COLOR_MARCA} />
              <Text style={[styles.ciudadLabel, { color: c.textMuted }]}>{t("reserva.fechasLugar.ciudadEntrega")}</Text>
            </View>
            <View style={styles.ciudadValorRow}>
              <Text style={[styles.ciudadValor, { color: c.textPrimary }]}>{ciudadEntregaNombre}</Text>
              <Text style={styles.autoDetectado}>{t("reserva.fechasLugar.autoDetectado")}</Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t("reserva.fechasLugar.barrio")}</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            placeholder={t("reserva.fechasLugar.placeholderBarrio")}
            placeholderTextColor={c.textMuted}
            value={fechasLugar.barrioRetiro ?? ""}
            onChangeText={(texto) => actualizarFechasLugar({ barrioRetiro: texto })}
          />

          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t("reserva.fechasLugar.direccion")}</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            placeholder={t("reserva.fechasLugar.placeholderDireccion")}
            placeholderTextColor={c.textMuted}
            value={fechasLugar.direccionRetiro ?? ""}
            onChangeText={(texto) => actualizarFechasLugar({ direccionRetiro: texto })}
          />

          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t("reserva.fechasLugar.referenciasEntrega")}</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            placeholder={t("reserva.fechasLugar.placeholderReferencias")}
            placeholderTextColor={c.textMuted}
            value={fechasLugar.referenciasRetiro ?? ""}
            onChangeText={(texto) => actualizarFechasLugar({ referenciasRetiro: texto })}
          />
        </View>
      )}

      {/* --- INFO DE DEVOLUCIÓN A DOMICILIO (solo si lugarDevolucion === "domicilio") --- */}
      {mostrarDomicilioDevolucion && (
        <View style={[styles.domicilioCard, { borderColor: c.border }]}>
          <Text style={styles.domicilioTitulo}>{t("reserva.fechasLugar.infoDevolucionDomicilio")}</Text>

          <View style={[styles.ciudadBox, { backgroundColor: c.primaryBg }]}>
            <View style={styles.selectLabelRow}>
              <Ionicons name="location" size={13} color={COLOR_MARCA} />
              <Text style={[styles.ciudadLabel, { color: c.textMuted }]}>{t("reserva.fechasLugar.ciudadDevolucion")}</Text>
            </View>
            <View style={styles.ciudadValorRow}>
              <Text style={[styles.ciudadValor, { color: c.textPrimary }]}>{ciudadEntregaNombre}</Text>
              <Text style={styles.autoDetectado}>{t("reserva.fechasLugar.autoDetectado")}</Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t("reserva.fechasLugar.barrio")}</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            placeholder={t("reserva.fechasLugar.placeholderBarrio")}
            placeholderTextColor={c.textMuted}
            value={fechasLugar.barrioDevolucion ?? ""}
            onChangeText={(texto) => actualizarFechasLugar({ barrioDevolucion: texto })}
          />

          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t("reserva.fechasLugar.direccion")}</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            placeholder={t("reserva.fechasLugar.placeholderDireccion")}
            placeholderTextColor={c.textMuted}
            value={fechasLugar.direccionDevolucion ?? ""}
            onChangeText={(texto) => actualizarFechasLugar({ direccionDevolucion: texto })}
          />

          <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t("reserva.fechasLugar.referenciasDevolucion")}</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            placeholder={t("reserva.fechasLugar.placeholderReferencias")}
            placeholderTextColor={c.textMuted}
            value={fechasLugar.referenciasDevolucion ?? ""}
            onChangeText={(texto) => actualizarFechasLugar({ referenciasDevolucion: texto })}
          />
        </View>
      )}

      {/* --- HORAS DE RETIRO Y DEVOLUCIÓN --- */}
      <View style={[styles.filaDosCols, { marginTop: 4 }]}>
        <View style={styles.columnaMedia}>
          <View style={styles.headerConIcono}>
            <Ionicons name="time" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono} numberOfLines={1}>
              {t("reserva.fechasLugar.horaDeRetiro")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            onPress={() => setHoraVisible("retiro")}
            activeOpacity={0.8}
          >
            <View style={styles.selectValorRow}>
              <Text
                style={[
                  styles.selectValue,
                  { color: fechasLugar.horaRetiro ? c.textPrimary : c.textMuted },
                ]}
                numberOfLines={1}
              >
                {fechasLugar.horaRetiro
                  ? formatHoraAmPm(fechasLugar.horaRetiro)
                  : t("reserva.fechasLugar.seleccionarHora", { defaultValue: "Seleccionar hora" })}
              </Text>
              <Ionicons name="chevron-down" size={14} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.columnaMedia}>
          <View style={styles.headerConIcono}>
            <Ionicons name="time" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono} numberOfLines={1}>
              {t("reserva.fechasLugar.horaDeDevolucion")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            onPress={() => setHoraVisible("devolucion")}
            activeOpacity={0.8}
          >
            <View style={styles.selectValorRow}>
              <Text
                style={[
                  styles.selectValue,
                  { color: fechasLugar.horaDevolucion ? c.textPrimary : c.textMuted },
                ]}
                numberOfLines={1}
              >
                {fechasLugar.horaDevolucion
                  ? formatHoraAmPm(fechasLugar.horaDevolucion)
                  : t("reserva.fechasLugar.seleccionarHora", { defaultValue: "Seleccionar hora" })}
              </Text>
              <Ionicons name="chevron-down" size={14} color={c.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- CALENDARIO DE DISPONIBILIDAD --- */}
      <View style={styles.headerCalendarioContainer}>
        <Ionicons name="calendar" size={14} color={COLOR_MARCA} style={styles.iconoCalendario} />
        <Text style={styles.tituloCalendario}>
          {t("reserva.fechasLugar.calendarioDisponibilidad", {
            defaultValue: "Selecciona un rango de fechas en el calendario de disponibilidad",
          })}
        </Text>
      </View>
      <CalendarioRango
        vehiculo={vehiculo}
        fechaRetiro={fechasLugar.fechaRetiro}
        fechaDevolucion={fechasLugar.fechaDevolucion}
        onCambiarFechas={(retiro, devolucion) =>
          actualizarFechasLugar({ fechaRetiro: retiro, fechaDevolucion: devolucion })
        }
      />

      {/* --- FECHAS AUTOMÁTICAS (se llenan solas con lo elegido en el calendario) --- */}
      <View style={[styles.filaDosCols, { marginTop: 14, marginBottom: 0 }]}>
        <View style={styles.columnaMedia}>
          <View style={styles.headerConIcono}>
            <Ionicons name="calendar" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono} numberOfLines={1}>
              {t("reserva.fechasLugar.fechaDeRetiro", { defaultValue: "Fecha de retiro" })}
            </Text>
          </View>
          <View style={[styles.selectBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}>
            <Text
              style={[
                styles.selectValue,
                { color: fechasLugar.fechaRetiro ? c.textPrimary : c.textMuted },
              ]}
              numberOfLines={1}
            >
              {fechasLugar.fechaRetiro || t("reserva.fechasLugar.seleccionar", { defaultValue: "Seleccionar" })}
            </Text>
          </View>
        </View>

        <View style={styles.columnaMedia}>
          <View style={styles.headerConIcono}>
            <Ionicons name="calendar" size={14} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono} numberOfLines={1}>
              {t("reserva.fechasLugar.fechaDeDevolucion", { defaultValue: "Fecha de devolución" })}
            </Text>
          </View>
          <View style={[styles.selectBox, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}>
            <Text
              style={[
                styles.selectValue,
                { color: fechasLugar.fechaDevolucion ? c.textPrimary : c.textMuted },
              ]}
              numberOfLines={1}
            >
              {fechasLugar.fechaDevolucion || t("reserva.fechasLugar.seleccionar", { defaultValue: "Seleccionar" })}
            </Text>
          </View>
        </View>
      </View>

      {/* --- STRIP DURACIÓN DEL ALQUILER --- */}
      {!!textoDuracion && (
        <View
          style={[
            styles.duracionStrip,
            c.oscuro
              ? { backgroundColor: "rgba(47, 78, 162, 0.16)", borderColor: "rgba(47, 78, 162, 0.35)" }
              : { backgroundColor: "rgba(47, 78, 162, 0.04)", borderColor: "rgba(47, 78, 162, 0.15)" },
          ]}
        >
          <View style={styles.duracionLeftRow}>
            <Ionicons name="hourglass-outline" size={16} color={COLOR_MARCA} />
            <Text style={[styles.duracionLabel, { color: c.textSecondary }]}>
              {t("reserva.fechasLugar.duracionAlquiler", { defaultValue: "Duración del alquiler" })}
            </Text>
          </View>
          <Text style={styles.duracionValor}>
            {textoDuracion}
          </Text>
        </View>
      )}

      <SelectorSucursalModal
        visible={modalTipo !== null}
        titulo={modalTipo === "retiro" ? t("reserva.fechasLugar.lugarDeRetiroModal") : t("reserva.fechasLugar.lugarDeDevolucionModal")}
        opciones={modalTipo === "retiro" ? opcionesEntrega : opcionesDevolucion}
        onSeleccionar={handleElegirSucursal}
        onCerrar={() => setModalTipo(null)}
      />

      <SelectorHoraModal
        visible={horaVisible !== null}
        fecha={horaVisible === "retiro" ? fechasLugar.fechaRetiro : fechasLugar.fechaDevolucion}
        minHora={
          horaVisible === "devolucion" && fechasLugar.fechaRetiro === fechasLugar.fechaDevolucion
            ? fechasLugar.horaRetiro
            : null
        }
        horaSeleccionada={horaVisible === "retiro" ? fechasLugar.horaRetiro : fechasLugar.horaDevolucion}
        onSeleccionar={handleElegirHora}
        onCerrar={() => setHoraVisible(null)}
      />

      <AlertaPagoEfectivo
        visible={alertaEfectivoVisible}
        nombreSucursal={nombreSucursal}
        ciudad={ciudadEntregaNombre || ciudadNombre}
        direccion={getDireccionSucursal(nombreSucursal)}
        onCerrar={() => setAlertaEfectivoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tituloSeccion: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 4,
  },
  primerLabel: { marginTop: 0 },
  labelConIcono: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, marginBottom: 8 },
  filaDosCols: { flexDirection: "row", gap: 8, marginBottom: 14 },
  metodosColumna: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 14,
  },
  metodoCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metodoCardActivo: {
    borderWidth: 1.2,
  },
  metodoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metodoTitulo: {
    fontSize: 12.5,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  metodoDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActivo: {},
  radioPunto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerConIcono: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, marginTop: 2 },
  headerCalendarioContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  iconoCalendario: {
    marginTop: 2,
  },
  tituloCalendario: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: COLOR_MARCA,
    flex: 1,
    lineHeight: 18,
  },
  tituloHeaderConIcono: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: COLOR_MARCA,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  columnaMedia: { flex: 1 },
  campoVerticalContainer: { marginBottom: 14 },
  puntoAutorizadoContainer: { marginBottom: 14 },
  puntoAutorizadoBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
  },
  puntoAutorizadoTexto: { fontSize: 12, fontWeight: "400" },
  selectBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
  },
  selectLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  selectLabel: { fontSize: 9, fontWeight: "700" },
  selectValue: { fontSize: 12, fontWeight: "400", flex: 1, marginRight: 4 },
  selectValorRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  // --- Bloque de información a domicilio ---
  domicilioCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    marginTop: -6,
  },
  domicilioTitulo: {
    fontSize: 12,
    fontWeight: "800",
    color: COLOR_MARCA,
    marginBottom: 10,
  },
  ciudadBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  ciudadLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  ciudadValorRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  ciudadValor: { fontSize: 13, fontWeight: "700" },
  autoDetectado: { fontSize: 9, fontWeight: "700", color: COLOR_MARCA, letterSpacing: 0.3 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 5,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
    marginBottom: 4,
  },
  duracionStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(47, 78, 162, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(47, 78, 162, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  duracionLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  duracionLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  duracionValor: {
    fontSize: 13,
    fontWeight: "800",
    color: COLOR_MARCA,
  },
});
