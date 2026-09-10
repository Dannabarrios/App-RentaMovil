import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";

const GOOGLE_LOGO_URI =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTIgMjNjMi45NyAwIDUuNDYtLjk4IDcuMjgtMi42NmwtMy41Ny0yLjc3Yy0uOTguNjYtMi4yMyAxLjA2LTMuNzEgMS4wNi0yLjg2IDAtNS4yOS0xLjkzLTYuMTYtNC41M0gyLjE4djIuODRDMy45OSAyMC41MyA3LjcgMjMgMTIgMjN6IiBmaWxsPSIjMzRBODUzIi8+PHBhdGggZD0iTTUuODQgMTQuMDljLS4yMi0uNjYtLjM1LTEuMzYtLjM1LTIuMDlzLjEzLTEuNDMuMzUtMi4wOVY3LjA3SDIuMThDMS40MyA4LjU1IDEgMTAuMjIgMSAxMnMuNDMgMy40NSAxLjE4IDQuOTNsMi44NS0yLjIyLjgxLS42MnoiIGZpbGw9IiNGQkJDMDUiLz48cGF0aCBkPSJNMTIgNS4zOGMxLjYyIDAgMy4wNi41NiA0LjIxIDEuNjRsMy4xNS0zLjE1QzE3LjQ1IDIuMDkgMTQuOTcgMSAxMiAxIDcuNyAxIDMuOTkgMy40NyAyLjE4IDcuMDdsMy42NiAyLjg0Yy44Ny0yLjYgMy4zLTQuNTMgNi4xNi00LjUzeiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==";

const FACEBOOK_LOGO_URI =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTI0IDEyLjA3M0MyNCA1LjQwNSAxOC42MjcgMCAxMiAwUzAgNS40MDUgMCAxMi4wNzNDMCAxOC4xIDQuMzg4IDIzLjA5NCAxMC4xMjUgMjR2LTguNDM3SDcuMDc4di0zLjQ5aDMuMDQ3di0yLjY2YzAtMy4wMjUgMS43OTItNC42OTcgNC41MzMtNC42OTcgMS4zMTIgMCAyLjY4Ni4yMzYgMi42ODYuMjM2djIuOTdoLTEuNTE0Yy0xLjQ5MSAwLTEuOTU2LjkzLTEuOTU2IDEuODg2djIuMjY1aDMuMzI4bC0uNTMyIDMuNDloLTIuNzk2VjI0QzE5LjYxMiAyMy4wOTQgMjQgMTguMSAyNCAxMi4wNzN6IiBmaWxsPSIjMTg3N0YyIi8+PHBhdGggZD0iTTE2LjY3MSAxNS41NjNsLjUzMi0zLjQ5aC0zLjMyOHYtMi4yNjVjMC0uOTU2LjQ2NS0xLjg4NiAxLjk1Ni0xLjg4NmgxLjUxNHYtMi45N3MtMS4zNzQtLjIzNi0yLjY4Ni0uMjM2Yy0yLjc0MSAwLTQuNTMzIDEuNjcyLTQuNTMzIDQuNjk3djIuNjZINy4wNzh2My40OWgzLjA0N1YyNGExMi4xNCAxMi4xNCAwIDAwMy43NSAwdi04LjQzN2gyLjc5NnoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=";

interface Props {
  onGoogle: () => void;
  onFacebook: () => void;
  cargandoGoogle?: boolean;
  cargandoFacebook?: boolean;
}

export function SocialAuthButtons({
  onGoogle,
  onFacebook,
  cargandoGoogle = false,
  cargandoFacebook = false,
}: Props) {
  const { t } = useTranslation();
  const c = useTemaColores();
  const deshabilitado = cargandoGoogle || cargandoFacebook;

  return (
    <View style={s.wrap}>
      {/* Botón Google */}
      <TouchableOpacity
        style={[
          s.btn,
          { backgroundColor: c.bgCard, borderColor: c.border },
          Platform.OS === "ios" ? s.shadowIos : s.shadowAndroid,
        ]}
        onPress={onGoogle}
        activeOpacity={0.85}
        disabled={deshabilitado}
      >
        {cargandoGoogle ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <>
            <View style={[s.iconCircle, s.iconCircleGoogle, c.oscuro && { backgroundColor: "#FFFFFF" }]}>
              <Image
                source={{ uri: GOOGLE_LOGO_URI }}
                style={s.googleLogo}
                contentFit="contain"
              />
            </View>
            <Text style={[s.btnTexto, { color: c.textPrimary }]}>
              {t("auth.social.google")}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Botón Facebook */}
      <TouchableOpacity
        style={[
          s.btn,
          { backgroundColor: c.bgCard, borderColor: c.border },
          Platform.OS === "ios" ? s.shadowIos : s.shadowAndroid,
        ]}
        onPress={onFacebook}
        activeOpacity={0.85}
        disabled={deshabilitado}
      >
        {cargandoFacebook ? (
          <ActivityIndicator size="small" color="#1877F2" />
        ) : (
          <>
            <View style={s.iconCircle}>
              <Image
                source={{ uri: FACEBOOK_LOGO_URI }}
                style={s.fbLogo}
                contentFit="contain"
              />
            </View>
            <Text style={[s.btnTextoFb, { color: c.oscuro ? c.textPrimary : "#1877F2" }]}>{t("auth.social.facebook")}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1.5,
  },
  shadowIos: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  shadowAndroid: {
    elevation: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleGoogle: {
    borderRadius: 16,
    backgroundColor: "#F1F3F4",
  },
  googleLogo: {
    width: 32,
    height: 32,
  },
  fbLogo: {
    width: 32,
    height: 32,
  },
  btnTexto: {
    fontSize: 15,
    fontWeight: "600",
  },
  btnTextoFb: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1877F2",
  },
});