import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useNotificationStore, Notificacion } from "@/store/notificationStore";
import { useMonedaStore } from "@/store/currencyStore";
import { formatCurrency } from "@/utils/currencyUtils";
import { VEHICULOS_MOCK } from "@/modules/catalog/constants/catalog.constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  VEHICULO_PROMOS_DUMMY,
  CouponDummy,
} from "@/modules/notifications/constants/notifications.dummy";
import CUPONES_DEMO from "@/mocks/cuponesDemo.json";


export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const primaryAccent = c.oscuro ? "#60A5FA" : "#1D4ED8";

  const { notificaciones, marcarComoLeida, marcarTodasComoLeidas } = useNotificationStore();
  const monedaActual = useMonedaStore((s) => s.monedaActual);
  const tasaUSD = useMonedaStore((s) => s.tasaUSD);

  const [activeTab, setActiveTab] = useState<"general" | "promocion">("general");
  const [appliedCoupons, setAppliedCoupons] = useState<string[]>([]);

  // Modal states
  const [selectedConditionsCoupon, setSelectedConditionsCoupon] = useState<CouponDummy | null>(null);
  const [activeAppliedCoupon, setActiveAppliedCoupon] = useState<CouponDummy | null>(null);
  const [activePendingCoupon, setActivePendingCoupon] = useState<CouponDummy | null>(null);

  /** Filtra items cuya fecha de expiracion ya paso */
  const isExpired = (expiracion?: string) => {
    if (!expiracion) return false;
    return new Date(expiracion) < new Date();
  };

  // Notificaciones generales sin expiradas
  const generalNotifications = useMemo(
    () =>
      notificaciones.filter(
        (n) => n.tipo === "general" && !isExpired(n.expiracion)
      ),
    [notificaciones]
  );

  // Cupones activos (no expirados), desde dummy JSON
  const cupones = useMemo(
    () => (CUPONES_DEMO as unknown as CouponDummy[]).filter((c) => !isExpired(c.fechaExpiracion || c.expiracion)),
    []
  );

  // Promos de vehiculos activas (no expiradas), imagen resuelta desde VEHICULOS_MOCK
  const vehiculoPromos = useMemo(() => {
    return VEHICULO_PROMOS_DUMMY.filter((vp) => !isExpired(vp.expiracion)).map((vp) => {
      const vehiculo = VEHICULOS_MOCK.find((v) => v.id === vp.vehiculoId) ?? VEHICULOS_MOCK[0];
      return {
        ...vp,
        imagen: vehiculo.imagen || (vehiculo.imagenes && vehiculo.imagenes[0]) || "",
        marcaModelo: `${vehiculo.marca} ${vehiculo.modelo}`,
      };
    });
  }, []);


  const handleApplyCoupon = (coupon: CouponDummy) => {
    if (appliedCoupons.includes(coupon.codigo)) return;
    setActivePendingCoupon(coupon);
  };

  const confirmApplyCoupon = () => {
    if (!activePendingCoupon) return;
    setAppliedCoupons([...appliedCoupons, activePendingCoupon.codigo]);
    setActiveAppliedCoupon(activePendingCoupon);
    setActivePendingCoupon(null);
  };

  const handleGeneralPress = (id: string) => {
    marcarComoLeida(id);
  };

  // Helper: resolve vehicle images from VEHICULOS_MOCK (always returns 3 images)
  const getCouponVehicleImages = (cpx: any): string[] => {
    const vehId = cpx.reglas?.vehiculoId;
    if (vehId) {
      const specificCar = VEHICULOS_MOCK.find((v) => v.id === vehId);
      if (specificCar) {
        const carImgs = (specificCar.imagenes || []).filter(Boolean);
        if (carImgs.length >= 3) return carImgs.slice(0, 3);
        if (specificCar.imagen && !carImgs.includes(specificCar.imagen)) {
          carImgs.unshift(specificCar.imagen);
        }
        if (carImgs.length >= 3) return carImgs.slice(0, 3);
        const catCars = VEHICULOS_MOCK.filter((v) => v.categoria === specificCar.categoria && v.id !== specificCar.id);
        for (const v of catCars) {
          const img = (v.imagenes && v.imagenes[0]) || v.imagen;
          if (img && !carImgs.includes(img)) carImgs.push(img);
          if (carImgs.length >= 3) break;
        }
        return carImgs.slice(0, 3);
      }
    }

    const cat = cpx.reglas?.categoriasValidas?.[0];
    const imgs: string[] = [];

    if (cat && cat.toLowerCase() !== "todos") {
      const matchingCars = VEHICULOS_MOCK.filter((v) => v.categoria.toLowerCase() === cat.toLowerCase());
      for (const v of matchingCars) {
        const img = (v.imagenes && v.imagenes[0]) || v.imagen;
        if (img && !imgs.includes(img)) imgs.push(img);
        if (imgs.length >= 3) break;
      }
    }

    for (const v of VEHICULOS_MOCK) {
      const img = (v.imagenes && v.imagenes[0]) || v.imagen;
      if (img && !imgs.includes(img)) imgs.push(img);
      if (imgs.length >= 3) break;
    }

    return imgs.slice(0, 3);
  };

  // Helper: Format ISO date -> human readable date + time
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Helper: format only date for coupons (shorter)
  const formatDateShort = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Helper: days until expiry
  const daysUntilExpiry = (expiracion?: string) => {
    if (!expiracion) return null;
    const diff = new Date(expiracion).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const renderGeneralItem = ({ item }: { item: Notificacion }) => {
    const isUnread = !item.leido;
    // Use item.icono if present, fallback by keyword detection
    const iconName = item.icono ||
      (item.titulo.toLowerCase().includes("pago") ? "card-outline" :
       item.titulo.toLowerCase().includes("documento") ? "document-text-outline" :
       item.titulo.toLowerCase().includes("soporte") ? "chatbubble-ellipses-outline" :
       item.titulo.toLowerCase().includes("cancel") ? "close-circle-outline" :
       item.titulo.toLowerCase().includes("vencer") ? "time-outline" :
       "notifications-outline");
    const iconColor = item.icono === "card-outline" ? "#3B82F6" :
      item.icono === "time-outline" ? "#F59E0B" :
      item.icono === "document-text-outline" ? "#10B981" :
      item.icono === "chatbubble-ellipses-outline" ? "#8B5CF6" :
      "#2563EB";
    const dias = daysUntilExpiry(item.expiracion);

    return (
      <TouchableOpacity
        style={[
          styles.generalCard,
          {
            backgroundColor: c.bgCard,
            borderColor: c.border,
          },
          isUnread && { borderLeftColor: "#2563EB", borderLeftWidth: 4 },
        ]}
        onPress={() => handleGeneralPress(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: c.bgInput }]}>
            <Ionicons name={iconName as any} size={22} color={iconColor} />
          </View>
          <View style={styles.contentWrapper}>
            <Text style={[styles.title, { color: c.textPrimary }, isUnread && styles.unreadText]}>
              {t(item.titulo, { defaultValue: item.titulo })}
            </Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={11} color={c.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.time, { color: c.textMuted }]}>
                {formatDateTime(item.fecha)}
              </Text>
            </View>
            {dias !== null && dias > 0 && (
              <View style={[
                styles.expiryPill,
                { backgroundColor: dias <= 2 ? "#FEF2F2" : "#FFFBEB", borderColor: dias <= 2 ? "#FECACA" : "#FDE68A" },
              ]}>
                <Ionicons
                  name="hourglass-outline"
                  size={10}
                  color={dias <= 2 ? "#DC2626" : "#D97706"}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.expiryPillText, { color: dias <= 2 ? "#DC2626" : "#D97706" }]}>
                  {dias === 1 ? "Vence hoy" : `Vence en ${dias} días`}
                </Text>
              </View>
            )}
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          {t(item.mensaje, { defaultValue: item.mensaje })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={["#1e3a8a", "#2563eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("tabs.notificaciones")}</Text>
        {activeTab === "general" ? (
          <TouchableOpacity style={styles.readAllBtn} onPress={marcarTodasComoLeidas}>
            <Ionicons name="checkmark-done-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: c.bgCard, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "general" && styles.activeTabButton]}
          onPress={() => setActiveTab("general")}
        >
          <Text style={[styles.tabText, activeTab === "general" ? styles.activeTabText : { color: c.textSecondary }]}>
            {t("tabs.generales")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "promocion" && styles.activeTabButton]}
          onPress={() => setActiveTab("promocion")}
        >
          <Text style={[styles.tabText, activeTab === "promocion" ? styles.activeTabText : { color: c.textSecondary }]}>
            {t("tabs.promociones")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === "general" ? (
        <FlatList
          data={generalNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderGeneralItem}
          contentContainerStyle={styles.generalList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {t("tabs.sinNotificacionesGenerales")}
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView style={styles.promosScroll} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Section 1: Coupons Panel */}
          <Text style={[styles.promoSectionTitle, { color: c.textPrimary }]}>
            {t("tabs.masCuponesGeniales", "Más cupones geniales")}
          </Text>

          {cupones.map((cpx) => {
            const isApplied = appliedCoupons.includes(cpx.codigo);
            const carImages = getCouponVehicleImages(cpx);


            // Calculate coupon text dynamically
            const discountLabel =
              cpx.descuentoTexto === "VALOR_FIJO"
                ? `${formatCurrency(cpx.valorFijo ?? 0, monedaActual, tasaUSD)} OFF`
                : cpx.descuentoTexto;

            const ruleLabel = cpx.regla || "";

            return (
              <View key={cpx.id} style={styles.ticketWrapper}>
                {/* Ticket card */}
                <View style={[styles.couponCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>

                  {/* OUTER notches (left + right edges) */}
                  <View style={[styles.notchLeft, { backgroundColor: c.bg }]} />
                  <View style={[styles.notchRight, { backgroundColor: c.bg }]} />

                  {/* Left Side */}
                  <View style={styles.couponLeft}>
                    {/* Title row */}
                    <View style={styles.couponTitleRow}>
                      <Ionicons name="ticket-outline" size={14} color={primaryAccent} style={{ marginRight: 4, marginTop: 1 }} />
                      <Text style={[styles.couponTitlePremio, { color: c.textPrimary }]} numberOfLines={2}>
                        {t(cpx.tituloPremio, { defaultValue: cpx.tituloPremio })}
                      </Text>
                    </View>

                    {/* Real vehicle photos - bigger */}
                    <View style={styles.couponImagesRow}>
                      {carImages.map((imgUrl, idx) => (
                        <View key={idx} style={[styles.couponCarMiniWrapper, { backgroundColor: c.bgInput }]}>
                          {imgUrl ? (
                            <Image source={{ uri: imgUrl }} style={styles.couponCarMiniImage} resizeMode="cover" />
                          ) : (
                            <Ionicons name="car-outline" size={22} color={c.textMuted} />
                          )}
                        </View>
                      ))}
                    </View>

                    {/* Bottom: date + conditions */}
                    <View style={styles.couponConditionRow}>
                      <View style={{ flex: 1 }}>
                        {cpx.agotandose && (
                          <Text style={styles.expiringText}>¡Por agotarse!</Text>
                        )}
                        <Text style={[styles.couponDateText, { color: c.textMuted }]}>
                          {formatDateShort(cpx.fechaOtorgado)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedConditionsCoupon(cpx)}>
                        <Text style={styles.conditionsLink}>Condiciones</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Dotted Separator with INNER notches (top + bottom of separator) */}
                  <View style={styles.separatorContainer}>
                    <View style={[styles.innerNotchTop, { backgroundColor: c.bg }]} />
                    <View style={[styles.dashedSeparator, { borderColor: c.border }]} />
                    <View style={[styles.innerNotchBottom, { backgroundColor: c.bg }]} />
                  </View>

                  {/* Right Side */}
                  <View style={[styles.couponRight, { backgroundColor: c.oscuro ? "#1e3a8a22" : "#EFF6FF" }]}>
                    <Text style={[styles.couponDiscount, { color: "#1D4ED8" }]}>
                      {discountLabel}
                    </Text>
                    <Text style={[styles.couponRule, { color: c.textMuted }]}>
                      {ruleLabel}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.couponApplyBtn,
                        isApplied && { backgroundColor: c.bgInput },
                      ]}
                      onPress={() => handleApplyCoupon(cpx)}
                      disabled={isApplied}
                    >
                      <Text style={[styles.couponApplyBtnText, { color: isApplied ? c.textMuted : "#FFFFFF" }]}>
                        {isApplied ? "✓ Aplicado" : "Aplicar"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Section 2: Specific Car Promos */}
          <Text style={[styles.promoSectionTitle, { color: c.textPrimary, marginTop: 24 }]}>
            Promociones destacadas
          </Text>

          {vehiculoPromos.map((vp) => (
            <TouchableOpacity
              key={vp.id}
              style={[styles.vehiculoPromoCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
              onPress={() => {
                const pctMatch = vp.descuentoBadge ? vp.descuentoBadge.match(/\d+/) : null;
                const pct = pctMatch ? pctMatch[0] : "10";
                router.push({
                  pathname: "/vehicle/[id]",
                  params: {
                    id: vp.vehiculoId.toString(),
                    descuentoPorcentaje: pct,
                  },
                } as any);
              }}
              activeOpacity={0.88}
            >
              <View style={[styles.vehiculoPromoImageWrapper, { backgroundColor: c.bgInput }]}>
                <Image source={{ uri: vp.imagen }} style={styles.vehiculoPromoImage} resizeMode="cover" />
              </View>
              <View style={styles.vehiculoPromoContent}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <Text style={[styles.vehiculoPromoTitle, { color: c.textPrimary, flex: 1 }]} numberOfLines={2}>
                    {t(vp.titulo, { defaultValue: vp.titulo })}
                  </Text>
                  {vp.descuentoBadge ? (
                    <View style={[styles.descuentoBadge, { backgroundColor: c.oscuro ? "#78350f" : "#FEF3C7", borderColor: c.oscuro ? "#b45309" : "#FDE68A" }]}>
                      <Text style={[styles.descuentoBadgeText, { color: c.oscuro ? "#fbbf24" : "#B45309" }]}>{vp.descuentoBadge}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.vehiculoPromoModelo, { color: primaryAccent }]} numberOfLines={1}>
                  {vp.marcaModelo}
                </Text>

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={11} color={c.textMuted} style={{ marginRight: 3 }} />
                  <Text style={[styles.time, { color: c.textMuted }]}>
                    {formatDateTime(vp.fechaPublicacion)}
                  </Text>
                </View>
                {(() => {
                  const d = daysUntilExpiry(vp.expiracion);
                  if (d === null || d <= 0) return null;
                  return (
                    <View style={[
                      styles.expiryPill,
                      { backgroundColor: d <= 2 ? (c.oscuro ? "#450a0a" : "#FEF2F2") : (c.oscuro ? "#451a03" : "#FFFBEB"), borderColor: d <= 2 ? (c.oscuro ? "#7f1d1d" : "#FECACA") : (c.oscuro ? "#78350f" : "#FDE68A") },
                    ]}>
                      <Ionicons
                        name="hourglass-outline"
                        size={10}
                        color={d <= 2 ? "#EF4444" : "#F59E0B"}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.expiryPillText, { color: d <= 2 ? (c.oscuro ? "#f87171" : "#DC2626") : (c.oscuro ? "#fbbf24" : "#D97706") }]}>
                        {d === 1 ? "Vence hoy" : `Vence en ${d} días`}
                      </Text>
                    </View>
                  );
                })()}
                <Text style={[styles.vehiculoPromoDesc, { color: c.textSecondary, marginTop: 4 }]} numberOfLines={2}>
                  {t(vp.descripcion, { defaultValue: vp.descripcion })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* 1. Modal: Terms & Conditions */}
      <Modal
        visible={selectedConditionsCoupon !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedConditionsCoupon(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                {t("coupon.conditionsTitle", "Condiciones del Cupón")}
              </Text>
              <TouchableOpacity onPress={() => setSelectedConditionsCoupon(null)}>
                <Ionicons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {selectedConditionsCoupon && (
              <ScrollView style={styles.modalScroll}>
                <Text style={[styles.modalSubtitle, { color: primaryAccent, fontWeight: "800", fontSize: 16, marginBottom: 4 }]}>
                  {t(selectedConditionsCoupon.tituloPremio, { defaultValue: selectedConditionsCoupon.tituloPremio })}
                </Text>

                <Text style={[styles.modalDescription, { color: c.textSecondary, lineHeight: 20, marginBottom: 12 }]}>
                  {t(selectedConditionsCoupon.recompensaDetalle, { defaultValue: selectedConditionsCoupon.recompensaDetalle })}
                </Text>
                
                <View style={[styles.infoDivider, { backgroundColor: c.border, marginVertical: 12 }]} />

                <Text style={[styles.modalTitle, { color: c.textPrimary, fontSize: 14, marginBottom: 8 }]}>
                  {t("coupon.termsTitle", "Términos y condiciones:")}
                </Text>
                <Text style={[styles.conditionText, { color: c.textSecondary, lineHeight: 20 }]}>
                  • Código: {selectedConditionsCoupon.codigo}{"\n"}
                  {t("coupon.term1", "• Válido para pagos digitales e iniciales.")}{"\n"}
                  {t("coupon.term2", "• No transferible a otros usuarios.")}{"\n"}
                  {t("coupon.term3", "• Solo se puede aplicar un cupón por reserva.")}
                  {selectedConditionsCoupon.condicionesDetalladas ? `\n• ${t(selectedConditionsCoupon.condicionesDetalladas, { defaultValue: selectedConditionsCoupon.condicionesDetalladas })}` : ''}
                  {selectedConditionsCoupon.minimoValor ? `\n• ${t("reserva.resumen.montoMinimo", "Monto mínimo:")} ${formatCurrency(selectedConditionsCoupon.minimoValor, monedaActual, tasaUSD)}` : ''}
                  {selectedConditionsCoupon.expiracion ? `\n• ${t("coupon.expires", "Vence:")} ${formatDateShort(selectedConditionsCoupon.expiracion)}` : `\n• ${t("coupon.validAllMonth", "Válido durante todo el mes.")}`}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: primaryAccent, marginTop: 16 }]}
              onPress={() => setSelectedConditionsCoupon(null)}
            >
              <Text style={styles.modalCloseBtnText}>{t("coupon.understoodBtn", "Entendido")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2.5 Modal: Confirm Apply Coupon */}
      <Modal
        visible={activePendingCoupon !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActivePendingCoupon(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgCard, borderColor: c.border, alignItems: "center" }]}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 12, right: 12, padding: 8 }} 
              onPress={() => setActivePendingCoupon(null)}
            >
              <Ionicons name="close" size={24} color={c.textMuted} />
            </TouchableOpacity>
            
            <Ionicons name="ticket-outline" size={54} color={primaryAccent} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: c.textPrimary, textAlign: "center" }]}>
              {t("promoCoupons.confirmTitle", "Confirmar Activación")}
            </Text>
            
            {activePendingCoupon && (
              <View style={{ width: "100%", alignItems: "center" }}>
                <Text style={[styles.couponRewardEarnedDesc, { color: c.textSecondary, textAlign: "center", marginVertical: 10 }]}>
                  {t("promoCoupons.confirmDesc", "¿Deseas desbloquear este cupón y usarlo en tu próxima reserva?")}
                </Text>

                <View style={[styles.codeBox, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                  <Text style={[styles.codeText, { color: c.textPrimary }]}>
                    {t(activePendingCoupon.codigo, { defaultValue: activePendingCoupon.codigo })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
                  <TouchableOpacity
                    style={[
                      styles.modalCloseBtn, 
                      { 
                        flex: 1, 
                        backgroundColor: c.bgInput, 
                        borderWidth: 1, 
                        borderColor: c.border 
                      }
                    ]}
                    onPress={() => setActivePendingCoupon(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modalBtnText, { color: c.textSecondary, fontWeight: "700" }]}>
                      {t("coupon.cancelBtn", "Cancelar")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalCloseBtn, { flex: 1, backgroundColor: primaryAccent }]}
                    onPress={confirmApplyCoupon}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalBtnText, { color: "#FFFFFF", fontWeight: "800" }]}>
                      {t("coupon.applyAction", "Aplicar")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. Modal: Coupon Code Applied Success */}
      <Modal
        visible={activeAppliedCoupon !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveAppliedCoupon(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bgCard, borderColor: c.border, alignItems: "center" }]}>
            <Ionicons name="checkmark-circle" size={54} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: c.textPrimary, textAlign: "center" }]}>
              {t("promoCoupons.modalTitle", "¡Cupón Activado con Éxito!")}
            </Text>
            
            {activeAppliedCoupon && (
              <View style={{ width: "100%", alignItems: "center" }}>
                <Text style={[styles.couponRewardEarnedDesc, { color: c.textSecondary, textAlign: "center", marginVertical: 10 }]}>
                  {t("promoCoupons.modalSubtitle", "Has desbloqueado el cupón de recompensa por tus logros en Drivique.")}
                </Text>

                <View style={[styles.codeBox, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                  <Text style={[styles.codeText, { color: c.textPrimary }]}>
                    {t(activeAppliedCoupon.codigo, { defaultValue: activeAppliedCoupon.codigo })}
                  </Text>
                </View>

                <Text style={[styles.modalInstruction, { color: c.textMuted }]}>
                {t("promoCoupons.modalInstruction", "Usa este código en el resumen de reserva para obtener tu descuento.")}
              </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalCloseBtn, { width: "100%", marginTop: 20 }]}
              onPress={() => setActiveAppliedCoupon(null)}
            >
              <Text style={styles.modalBtnText}>{t("promoCoupons.modalBtn", "¡Excelente!")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  readAllBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#1D4ED8",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#1D4ED8",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  expiryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 5,
  },
  expiryPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  generalList: {
    padding: 16,
    gap: 12,
  },
  generalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  unreadText: {
    fontWeight: "800",
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    paddingLeft: 52,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  promosScroll: {
    flex: 1,
    padding: 16,
  },
  promoSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  ticketWrapper: {
    marginBottom: 18,
    // Ticket scallop effect on outer container
  },
  couponCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    height: 155,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notchLeft: {
    position: "absolute",
    left: -11,
    top: "50%",
    marginTop: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    zIndex: 20,
  },
  notchRight: {
    position: "absolute",
    right: -11,
    top: "50%",
    marginTop: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    zIndex: 20,
  },
  couponLeft: {
    flex: 3.2,
    padding: 12,
    justifyContent: "space-between",
  },
  couponTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  couponTitlePremio: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    flex: 1,
  },
  couponImagesRow: {
    flexDirection: "row",
    gap: 5,
    marginVertical: 6,
  },
  couponCarMiniWrapper: {
    width: 52,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  couponCarMiniImage: {
    width: "100%",
    height: "100%",
  },
  couponConditionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiringText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "700",
  },
  conditionsLink: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "700",
  },
  separatorContainer: {
    width: 1,
    alignSelf: "stretch",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  innerNotchTop: {
    position: "absolute",
    top: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 20,
  },
  innerNotchBottom: {
    position: "absolute",
    bottom: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 20,
  },
  dashedSeparator: {
    height: "100%",
    borderStyle: "dashed",
    borderWidth: 1,
  },
  couponRight: {
    flex: 1.9,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  couponDiscount: {
    fontSize: 16,
    fontWeight: "800",
  },
  couponRule: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 8,
  },
  couponApplyBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    width: "90%",
    alignItems: "center",
  },
  couponApplyBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  couponDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  couponExpBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 4,
    textAlign: "center",
  },
  vehiculoPromoCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "flex-start",
    ...Platform.select({

      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  vehiculoPromoImageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  vehiculoPromoImage: {
    width: "100%",
    height: "100%",
  },
  vehiculoPromoContent: {
    flex: 1,
    marginLeft: 14,
  },
  vehiculoPromoTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehiculoPromoTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    flex: 1,
  },
  vehiculoPromoModelo: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 4,
  },
  descuentoBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  descuentoBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  vehiculoPromoTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  vehiculoPromoDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "90%",
    maxHeight: "75%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalScroll: {
    marginVertical: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    marginVertical: 14,
  },
  conditionSectionHeader: {
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  modalBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalInstruction: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 12,
  },
  promoDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  couponRewardEarnedDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  codeBox: {
    width: "100%",
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 10,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  codeText: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
