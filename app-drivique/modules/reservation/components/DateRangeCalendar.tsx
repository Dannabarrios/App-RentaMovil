import React, { useMemo } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { getDisponibilidadVehiculo } from "@/modules/catalog/constants/catalog.constants";
import { COLOR_MARCA } from "../constants/reservation.constants";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ],
  monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  dayNames: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  dayNamesShort: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"],
  today: "Hoy",
};

LocaleConfig.locales["en"] = {
  monthNames: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],
  monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  dayNamesShort: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  today: "Today",
};

LocaleConfig.locales["pt"] = {
  monthNames: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ],
  monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  dayNames: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
  dayNamesShort: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
  today: "Hoje",
};

LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ],
  monthNamesShort: ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
  dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  dayNamesShort: ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"],
  today: "Aujourd'hui",
};

LocaleConfig.defaultLocale = "es";

interface Props {
  vehiculo: Vehiculo;
  fechaRetiro: string | null;
  fechaDevolucion: string | null;
  onCambiarFechas: (fechaRetiro: string | null, fechaDevolucion: string | null) => void;
}

const COLOR_DISPONIBLE = "#10B981";
const COLOR_RESERVADO = "#EF4444";
const COLOR_MANTENIMIENTO = "#64748B";
const COLOR_SELECCIONADO = COLOR_MARCA;

function getFechaHoyLocal(): string {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDiasEnRango(inicio: string, fin: string): string[] {
  const dias: string[] = [];
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  const cursor = new Date(y1, m1 - 1, d1);
  const finDate = new Date(y2, m2 - 1, d2);
  while (cursor <= finDate) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dias.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

interface MarcaDia {
  ocupado?: boolean;
  dotColor?: string;
  seleccionado?: boolean;
  inicioRango?: boolean;
  finRango?: boolean;
}

function DiaCalendario({
  date,
  state,
  marking,
  fechaRetiro,
  fechaDevolucion,
  onPress,
  c,
}: {
  date?: DateData;
  state?: string;
  marking?: MarcaDia;
  fechaRetiro: string | null;
  fechaDevolucion: string | null;
  onPress?: (date?: DateData) => void;
  c: ReturnType<typeof useTemaColores>;
}) {
  if (!date) return <View style={diaStyles.celda} />;

  const deshabilitado = state === "disabled";
  const hoy = state === "today";
  const seleccionado = !!marking?.seleccionado;
  const esInicio = !!marking?.inicioRango;
  const esFin = !!marking?.finRango;
  const enExtremoRango = esInicio || esFin;
  const esRangoContinuo = seleccionado && !enExtremoRango;

  const numero = (
    <Text
      style={[
        diaStyles.texto,
        { color: c.textPrimary },
        deshabilitado && [diaStyles.textoDeshabilitado, { color: c.textMuted }],
        hoy && !seleccionado && { color: COLOR_MARCA, fontWeight: "600" as const },
        enExtremoRango && diaStyles.textoExtremo,
        esRangoContinuo && diaStyles.textoContinuo,
      ]}
    >
      {date.day}
    </Text>
  );

  let colorPunto: string | null = null;
  if (marking?.ocupado) colorPunto = marking.dotColor ?? COLOR_RESERVADO;
  else if (!deshabilitado) colorPunto = COLOR_DISPONIBLE;

  let estiloCirculo: any = diaStyles.circulo;
  if (enExtremoRango) {
    estiloCirculo = diaStyles.circuloExtremo;
  } else if (hoy && !seleccionado) {
    estiloCirculo = [
      diaStyles.circuloHoy,
      { borderColor: c.oscuro ? "rgba(47, 78, 162, 0.45)" : "rgba(47, 78, 162, 0.28)" },
    ];
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={deshabilitado}
      onPress={() => onPress?.(date)}
      style={diaStyles.celda}
    >
      {/* Fondo continuo plano sin solapamientos para días intermedios */}
      {esRangoContinuo && (
        <View
          style={[
            diaStyles.fondoRango,
            { backgroundColor: c.oscuro ? "rgba(47, 78, 162, 0.22)" : "rgba(47, 78, 162, 0.08)" },
          ]}
        />
      )}

      <View style={estiloCirculo}>
        {numero}
        {colorPunto ? (
          <View
            style={[
              diaStyles.punto,
              { backgroundColor: enExtremoRango ? "#FFFFFF" : colorPunto },
            ]}
          />
        ) : (
          <View style={diaStyles.puntoVacio} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function CalendarioRango({
  vehiculo,
  fechaRetiro,
  fechaDevolucion,
  onCambiarFechas,
}: Props) {
  const c = useTemaColores();
  const { t, i18n } = useTranslation();

  const langKey = i18n.language?.startsWith("fr")
    ? "fr"
    : i18n.language?.startsWith("pt") || i18n.language?.startsWith("br")
    ? "pt"
    : i18n.language?.startsWith("en")
    ? "en"
    : "es";

  LocaleConfig.defaultLocale = langKey;

  const ocupados = useMemo(() => {
    const mapa = new Map<string, "reservado" | "mantenimiento">();
    getDisponibilidadVehiculo(vehiculo.id).ocupados.forEach((item) => {
      mapa.set(item.fecha, item.motivo);
    });
    return mapa;
  }, [vehiculo.id]);

  const hoy = getFechaHoyLocal();

  const mensajePorMotivo = (motivo: "reservado" | "mantenimiento") =>
    motivo === "mantenimiento"
      ? t("reserva.fechasLugar.vehiculoEnMantenimiento")
      : t("reserva.fechasLugar.vehiculoYaReservado");

  const alertarNoDisponible = (titulo: string, motivo: "reservado" | "mantenimiento") => {
    Alert.alert(titulo, mensajePorMotivo(motivo), [
      { text: t("reserva.fechasLugar.intentarDeNuevo"), style: "default" },
    ]);
  };

  const handleDayPress = (day: DateData) => {
    const fecha = day.dateString;
    const motivo = ocupados.get(fecha);

    if (motivo) {
      alertarNoDisponible(t("reserva.fechasLugar.fechaNoDisponibleTitulo"), motivo);
      return;
    }

    if (!fechaRetiro || (fechaRetiro && fechaDevolucion)) {
      onCambiarFechas(fecha, null);
      return;
    }

    if (fecha < fechaRetiro) {
      onCambiarFechas(fecha, null);
      return;
    }

    const rango = getDiasEnRango(fechaRetiro, fecha);
    const motivoEnMedio = rango.map((d) => ocupados.get(d)).find(Boolean);
    if (motivoEnMedio) {
      Alert.alert(
        t("reserva.fechasLugar.rangoNoDisponibleTitulo"),
        motivoEnMedio === "mantenimiento"
          ? t("reserva.fechasLugar.rangoConMantenimiento")
          : t("reserva.fechasLugar.rangoConReservas"),
        [{ text: t("reserva.fechasLugar.intentarDeNuevo"), style: "default" }]
      );
      onCambiarFechas(fecha, null);
      return;
    }

    onCambiarFechas(fechaRetiro, fecha);
  };

  const markedDates = useMemo(() => {
    const marcas: Record<string, MarcaDia> = {};

    ocupados.forEach((motivo, fecha) => {
      marcas[fecha] = {
        ocupado: true,
        dotColor: motivo === "mantenimiento" ? COLOR_MANTENIMIENTO : COLOR_RESERVADO,
      };
    });

    if (fechaRetiro && fechaDevolucion) {
      const rango = getDiasEnRango(fechaRetiro, fechaDevolucion);
      rango.forEach((fecha, i) => {
        marcas[fecha] = {
          ...marcas[fecha],
          seleccionado: true,
          inicioRango: i === 0,
          finRango: i === rango.length - 1,
        };
      });
    } else if (fechaRetiro) {
      marcas[fechaRetiro] = {
        ...marcas[fechaRetiro],
        seleccionado: true,
        inicioRango: true,
        finRango: true,
      };
    }

    return marcas;
  }, [ocupados, fechaRetiro, fechaDevolucion]);

  return (
    <View style={[styles.container, { borderColor: c.border, backgroundColor: c.bgCard }]}>
      <Calendar
        key={`${c.oscuro ? "dark" : "light"}_${langKey}`}
        current={hoy}
        minDate={hoy}
        markedDates={markedDates}
        firstDay={1}
        hideExtraDays={true}
        onDayPress={handleDayPress}
        dayComponent={(props: any) => (
          <DiaCalendario
            {...props}
            fechaRetiro={fechaRetiro}
            fechaDevolucion={fechaDevolucion}
            c={c}
            onPress={(d?: DateData) => {
              if (d) handleDayPress(d);
            }}
          />
        )}
        renderArrow={(direction: "left" | "right") => (
          <View style={[styles.arrowBtn, { backgroundColor: c.bgInput }]}>
            <Ionicons
              name={direction === "left" ? "chevron-back" : "chevron-forward"}
              size={14}
              color={c.textPrimary}
            />
          </View>
        )}
        theme={{
          calendarBackground: c.bgCard,
          dayTextColor: c.textPrimary,
          monthTextColor: c.textPrimary,
          textDisabledColor: c.textMuted,
          todayTextColor: COLOR_MARCA,
          arrowColor: c.textPrimary,
          textSectionTitleColor: c.textMuted,
          textDayFontSize: 12,
          textMonthFontSize: 14.5,
          textMonthFontWeight: "800",
          textDayHeaderFontSize: 9.5,
          textDayHeaderFontWeight: "600",
        }}
        style={[styles.calendar, { backgroundColor: c.bgCard }]}
      />

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <View style={styles.leyenda}>
        <View style={styles.leyendaItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_DISPONIBLE }]} />
          <Text style={[styles.leyendaText, { color: c.textSecondary }]}>
            {t("reserva.fechasLugar.leyendaDisponible", { defaultValue: "Disponible" })}
          </Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_RESERVADO }]} />
          <Text style={[styles.leyendaText, { color: c.textSecondary }]}>
            {t("reserva.fechasLugar.leyendaReservado", { defaultValue: "Reservado" })}
          </Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_MANTENIMIENTO }]} />
          <Text style={[styles.leyendaText, { color: c.textSecondary }]}>
            {t("reserva.fechasLugar.leyendaMantenimiento", { defaultValue: "Mantenimiento" })}
          </Text>
        </View>
        <View style={styles.leyendaItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_SELECCIONADO }]} />
          <Text style={[styles.leyendaText, { color: c.textSecondary }]}>
            {t("reserva.fechasLugar.leyendaSeleccionado", { defaultValue: "Seleccionado" })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const diaStyles = StyleSheet.create({
  celda: {
    width: "100%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  fondoRango: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 4,
    bottom: 4,
    zIndex: 1,
  },
  circulo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  circuloHoy: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  circuloExtremo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLOR_MARCA,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  texto: {
    fontSize: 12,
    fontWeight: "400",
  },
  textoExtremo: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11.5,
  },
  textoContinuo: {
    color: "#334155",
    fontWeight: "400",
  },
  textoDeshabilitado: {
    color: "#CBD5E1",
  },
  punto: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    marginTop: 2,
    zIndex: 3,
  },
  puntoVacio: {
    width: 2.5,
    height: 2.5,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    paddingBottom: 10,
  },
  calendar: {
    borderRadius: 12,
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#F1F5F9",
    marginTop: 6,
    marginBottom: 6,
  },
  leyenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 2,
    marginBottom: 2,
  },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 5.5, height: 5.5, borderRadius: 3 },
  leyendaText: { fontSize: 9.5, fontWeight: "500" },
});
