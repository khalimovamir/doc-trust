/**
 * AI Lawyer - Jurisdiction Screen
 * Reads/writes jurisdiction from App State (JurisdictionContext).
 * For authenticated users also saves to Supabase profile.
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
  Alert,
  Platform,
} from 'react-native';
import { Search, Check } from 'lucide-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useJurisdiction } from '../context/JurisdictionContext';
import { updateProfile } from '../lib/profile';
import { JURISDICTION_IDS } from '../lib/jurisdictions';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondaryBackground, borderRadius: 20, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.xs, height: 56, gap: spacing.sm },
    searchInput: { flex: 1, fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, paddingVertical: 0 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: spacing.xxl, gap: spacing.sm },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondaryBackground, borderRadius: 20, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.tertiary },
    cardSelected: { borderColor: colors.primary },
    cardText: { flex: 1 },
    cardTitle: { fontFamily, fontSize: 16, fontWeight: '500', color: colors.primaryText },
    cardSubtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, marginTop: spacing.xxs },
  };
}

export default function JurisdictionScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const { jurisdictionCode, setJurisdictionCode } = useJurisdiction();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedId = jurisdictionCode || 'US';

  const jurisdictions = useMemo(
    () => JURISDICTION_IDS.map((j) => ({ ...j, name: t('jurisdictions.country' + j.id) })),
    [t]
  );

  const filtered = jurisdictions.filter(
    (j) => !search || j.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleBack = () => navigation.goBack();

  const handleSelect = async (id) => {
    if (selectedId === id) return;
    setJurisdictionCode(id);
    setSaving(true);
    try {
      if (user?.id) {
        await updateProfile(user.id, { jurisdiction_code: id });
        await refreshProfile();
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save jurisdiction.');
    } finally {
      setSaving(false);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { fontSize: 20, fontWeight: Platform.OS === 'android' ? '800' : '600', marginTop: 4, color: colors.primaryText },
      headerTintColor: colors.primaryText,
    });
  }, [navigation, colors]);

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
              onPress={() => handleSelect(item.id)}
              disabled={saving}
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
    </View>
  );
}

