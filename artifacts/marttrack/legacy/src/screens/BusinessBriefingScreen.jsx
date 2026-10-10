import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createBusinessBriefing } from "@workspace/api-client-react";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import {
  getFestivalHistoricalLift,
  getSalesTrend,
  getStockHealth,
  getTopAndBottomItems,
  getUpcomingFestivalWindow,
} from "../domain/analytics";
import { getSupplierRecommendations } from "../domain/suppliers";
import { formatCurrency } from "../utils/formatting";
import Card from "../components/Card";
import ScreenHeader from "../components/ScreenHeader";
import Button from "../components/Button";

const TREND_OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

export default function BusinessBriefingScreen({ onNavigate }) {
  const { state, colors } = useMartTrack();
  const [granularity, setGranularity] = useState("week");
  const [ownApiKey, setOwnApiKey] = useState("");
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [localError, setLocalError] = useState("");
  const [briefingState, setBriefingState] = useState({
    isPending: false,
    data: null,
    error: null,
  });
  const trend = useMemo(
    () => getSalesTrend(state, granularity).slice(-6),
    [state, granularity],
  );
  const ranking = useMemo(() => getTopAndBottomItems(state, 3), [state]);
  const stockHealth = useMemo(() => getStockHealth(state), [state]);
  const festival = useMemo(() => getUpcomingFestivalWindow(), []);
  const maxRevenue = Math.max(...trend.map(point => point.revenue), 1);
  const festivalLifts = festival
    ? ranking.topSellers.slice(0, 3).map(item => ({
      ...item,
      lift: getFestivalHistoricalLift(state, festival.name, item.itemId),
    }))
    : [];
  const selectedProvider = state.settings?.aiProvider || "anthropic";
  const canRequestBriefing = Boolean(ownApiKey.trim());

  useEffect(() => {
    SecureStore.getItemAsync("mt_own_api_key")
      .then(value => {
        setOwnApiKey(value || "");
        setKeyLoaded(true);
      })
      .catch(() => setKeyLoaded(true));
  }, []);

  const handleGetAiBriefing = () => {
    if (!canRequestBriefing) {
      setLocalError("Add your API key in Settings → AI Briefing to use this feature.");
      return;
    }
    if (!process.env.EXPO_PUBLIC_API_URL) {
      setLocalError("AI Briefing server isn't set up. Run the API server and set EXPO_PUBLIC_API_URL (see README).");
      return;
    }
    setLocalError("");
    setBriefingState({ isPending: true, data: null, error: null });
    createBusinessBriefing({
        provider: selectedProvider,
        userApiKey: ownApiKey.trim(),
        salesTrend: getSalesTrend(state, "week").slice(-6),
        topSellers: ranking.topSellers,
        slowMovers: ranking.slowMovers,
        stockHealth,
        upcomingFestival: festival,
        supplierRecommendations: getSupplierRecommendations(state),
      })
      .then(data => {
        if (!data || !Array.isArray(data.recommendations)) {
          throw new Error("Unexpected response from the briefing server. Check EXPO_PUBLIC_API_URL.");
        }
        setBriefingState({ isPending: false, data, error: null });
      })
      .catch(error => setBriefingState({ isPending: false, data: null, error }));
  };

  const providerError = briefingState.error?.data?.error
    || briefingState.error?.message
    || "The AI provider rejected the request. Check your key and try again.";

  return (
    <ScrollView contentContainerStyle={styles.screenPad} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Business Briefing" onBack={() => onNavigate("summary")} />
      <Text style={[styles.intro, { color: colors.textBody }]}>
        A quick read on what is selling, what is sitting, and what to prepare for next.
      </Text>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Sales trend</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Last 6 periods</Text>
      </View>
      <Card style={styles.cardPad}>
        <View style={styles.segmented}>
          {TREND_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              testID={`briefing-trend-${option.value}`}
              onPress={() => setGranularity(option.value)}
              style={[
                styles.segment,
                { borderColor: colors.border },
                granularity === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[
                styles.segmentText,
                { color: granularity === option.value ? colors.background : colors.textBody },
              ]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {trend.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textBody }]}>Record a sale to see your trend.</Text>
        ) : (
          <View style={styles.chart}>
            {trend.map(point => (
              <View key={point.period} style={styles.chartColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(8, (point.revenue / maxRevenue) * 72),
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.chartValue, { color: colors.textHeader }]}>
                  {formatCurrency(point.revenue)}
                </Text>
                <Text style={[styles.chartLabel, { color: colors.textMuted }]}>
                  {point.period.slice(granularity === "month" ? 0 : 5)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>What to pay attention to</Text>
      </View>
      <View style={styles.twoColumn}>
        <Card style={[styles.smallCard, { marginRight: 5 }]}>
          <Text style={[styles.cardKicker, { color: colors.secondary }]}>TOP SELLER</Text>
          <Text style={[styles.cardValue, { color: colors.textHeader }]}>
            {ranking.topSellers[0]?.itemName || "No sales yet"}
          </Text>
          {ranking.topSellers[0] && (
            <Text style={[styles.cardMeta, { color: colors.textBody }]}>
              {ranking.topSellers[0].unitsSold} sold · {formatCurrency(ranking.topSellers[0].profit)} profit
            </Text>
          )}
        </Card>
        <Card style={[styles.smallCard, { marginLeft: 5 }]}>
          <Text style={[styles.cardKicker, { color: colors.warning }]}>SLOW MOVER</Text>
          <Text style={[styles.cardValue, { color: colors.textHeader }]}>
            {ranking.slowMovers[0]?.itemName || "No sales yet"}
          </Text>
          {ranking.slowMovers[0] && (
            <Text style={[styles.cardMeta, { color: colors.textBody }]}>
              {ranking.slowMovers[0].unitsSold} sold · {formatCurrency(ranking.slowMovers[0].profit)} profit
            </Text>
          )}
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Stock health</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{stockHealth.length} stocked items</Text>
      </View>
      <Card style={styles.cardPad}>
        {stockHealth.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textBody }]}>Add stock to see which items need attention.</Text>
        ) : (
          stockHealth.slice(0, 5).map(item => (
            <View key={item.itemId} style={[styles.listRow, { borderBottomColor: colors.border }]}>
              <View style={styles.flex1}>
                <Text style={[styles.listTitle, { color: colors.textHeader }]}>{item.itemName}</Text>
                <Text style={[styles.listMeta, { color: colors.textBody }]}>
                  {item.stockOnHand} on hand · {item.daysInStock} day(s) in stock
                </Text>
              </View>
              <View style={[
                styles.statusPill,
                { backgroundColor: item.daysInStock > 30 ? colors.warning : colors.success },
              ]}>
                <Text style={styles.statusText}>{item.daysInStock > 30 ? "Review" : "Healthy"}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {festival && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Seasonal prep</Text>
          </View>
          <Card style={[styles.festivalCard, { borderColor: colors.secondary }]}>
            <Text style={[styles.cardKicker, { color: colors.secondary }]}>UP NEXT IN NIGERIA</Text>
            <Text style={[styles.festivalTitle, { color: colors.textHeader }]}>{festival.name}</Text>
            <Text style={[styles.festivalMeta, { color: colors.textBody }]}>
              {festival.date} · {festival.daysUntil === 0 ? "Today" : `${festival.daysUntil} day(s) away`}
            </Text>
            <Text style={[styles.festivalCopy, { color: colors.textBody }]}>
              Review your best-selling items before this festival window.
            </Text>
            {festivalLifts.map(item => (
              <View key={item.itemId} style={styles.listRow}>
                <Text style={[styles.listTitle, { color: colors.textHeader }]}>{item.itemName}</Text>
                <Text style={[styles.listMeta, { color: colors.textBody }]}>
                  {item.lift.unitsLastYear} sold last year
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>AI briefing</Text>
      </View>
      <Card style={styles.aiCard}>
        <Text style={[styles.aiTitle, { color: colors.textHeader }]}>Turn the numbers into next steps</Text>
        <Text style={[styles.aiCopy, { color: colors.textBody }]}>
          Uses your selected provider and your own API key. The key stays on this device and is sent only when you request a briefing.
        </Text>
        <Button
          title={briefingState.isPending ? "Thinking..." : "Get AI briefing"}
          onPress={handleGetAiBriefing}
          disabled={!canRequestBriefing || briefingState.isPending}
          loading={briefingState.isPending}
          style={styles.actionButton}
        />
        {!canRequestBriefing && keyLoaded && (
          <TouchableOpacity onPress={() => onNavigate("settings")} activeOpacity={0.8}>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              Add your API key in Settings → AI Briefing to use this feature.
            </Text>
          </TouchableOpacity>
        )}
        {localError && <Text style={[styles.errorText, { color: colors.danger }]}>{localError}</Text>}
        {briefingState.error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>{providerError}</Text>
        )}
        {briefingState.data && (
          <View style={[styles.aiResult, { borderTopColor: colors.border }]}>
            <Text style={[styles.aiSummary, { color: colors.textHeader }]}>{briefingState.data.summary}</Text>
            {(briefingState.data.recommendations ?? []).map((recommendation, index) => (
              <Text key={`${recommendation}-${index}`} style={[styles.recommendation, { color: colors.textBody }]}>
                • {recommendation}
              </Text>
            ))}
          </View>
        )}
      </Card>

      <Button
        title="Compare supplier quotes"
        onPress={() => onNavigate("suppliers")}
        color={COLORS.secondary}
        style={styles.actionButton}
        textStyle={{ color: colors.background }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionHint: { fontSize: 12 },
  cardPad: { padding: 14, marginBottom: 18 },
  segmented: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 8, alignItems: "center" },
  segmentText: { fontSize: 12, fontWeight: "700" },
  chart: { height: 130, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  chartColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barTrack: { height: 78, justifyContent: "flex-end" },
  bar: { width: 18, borderRadius: 6 },
  chartValue: { fontSize: 9, marginTop: 5 },
  chartLabel: { fontSize: 10, marginTop: 3 },
  emptyText: { fontSize: 13, lineHeight: 19 },
  twoColumn: { flexDirection: "row", marginBottom: 10 },
  smallCard: { flex: 1, padding: 14 },
  cardKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardValue: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  cardMeta: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  flex1: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: "700" },
  listMeta: { fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: COLORS.background, fontSize: 10, fontWeight: "800" },
  festivalCard: { padding: 16, borderWidth: 1 },
  festivalTitle: { fontSize: 22, fontWeight: "800", marginTop: 6 },
  festivalMeta: { fontSize: 13, marginTop: 3 },
  festivalCopy: { fontSize: 13, lineHeight: 19, marginVertical: 10 },
  actionButton: { marginTop: 2 },
  aiCard: { padding: 16, marginBottom: 18 },
  aiTitle: { fontSize: 16, fontWeight: "800" },
  aiCopy: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  aiResult: { borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  aiSummary: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  recommendation: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  errorText: { fontSize: 12, lineHeight: 18, marginTop: 8 },
});