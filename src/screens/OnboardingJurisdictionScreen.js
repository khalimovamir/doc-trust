/**
 * AI Lawyer - Onboarding Jurisdiction Screen
 * Shown after Onboarding "Get Started". User selects jurisdiction and taps Save;
 * selection is stored in OnboardingJurisdictionContext, then user goes to Get Started.
 * After auth, jurisdiction is synced to Supabase profile.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Search, Check } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import { useOnboardingJurisdiction } from '../context/OnboardingJurisdictionContext';
import { JURISDICTION_IDS } from '../lib/jurisdictions';
import PrimaryButton from '../components/PrimaryButton';
import { NativeHeaderButtonInfo } from '../components/NativeHeaderButton';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.xs, height: 56, gap: spacing.sm },
    searchInput: { flex: 1, fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, paddingVertical: 0 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xl, gap: spacing.sm },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondaryBackground, borderRadius: 20, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.tertiary },
    cardSelected: { borderColor: colors.primary },
    cardText: { flex: 1 },
    cardTitle: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.primaryText },
    cardSubtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, marginTop: spacing.xxs },
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.primaryBackground },
    saveButton: { marginHorizontal: 0, marginBottom: 0, borderRadius: 30 },
  };
}

export default function OnboardingJurisdictionScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { setPendingJurisdiction } = useOnboardingJurisdiction();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const jurisdictions = useMemo(
    () => JURISDICTION_IDS.map((j) => ({ ...j, name: t('jurisdictions.country' + j.id) })),
    [t]
  );

  const filtered = jurisdictions.filter(
    (j) => !search || j.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!selectedId) {
      Alert.alert(
        t('jurisdictions.selectRequiredTitle'),
        t('jurisdictions.selectRequiredMessage'),
        [{ text: t('common.close') }]
      );
      return;
    }
    setPendingJurisdiction(selectedId);
    navigation.replace('GetStarted');
  };

  const handleInfoPress = () => {
    Alert.alert(
      t('jurisdictions.infoDialogTitle'),
      t('jurisdictions.infoDialogMessage'),
      [{ text: t('common.close') }]
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, color: colors.primaryText },
      headerTintColor: colors.primaryText,
      ...(Platform.OS === 'ios'
        ? {
            unstable_headerRightItems: () => [
              {
                type: 'button',
                label: '',
                icon: { type: 'sfSymbol', name: 'info.circle' },
                onPress: handleInfoPress,
              },
            ],
          }
        : {
            headerRight: () => (
              <NativeHeaderButtonInfo onPress={handleInfoPress} iconSize={24} />
            ),
            headerRightContainerStyle: {
              width: 44,
              height: 44,
              maxWidth: 44,
              maxHeight: 44,
              flexGrow: 0,
              flexShrink: 0,
              justifyContent: 'center',
              alignItems: 'center',
              ...(Platform.OS === 'android' && { paddingRight: 16 }),
            },
          }),
    });
  }, [navigation, colors, t]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Search size={22} color={colors.secondaryText} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('jurisdictions.searchPlaceholder')}
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.legalSystem}</Text>
              </View>
              {isSelected && (
                <Check size={24} color={colors.primary} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={t('common.save')}
          onPress={handleSave}
          containerStyle={styles.saveButton}
        />
      </View>
    </View>
  );
}
