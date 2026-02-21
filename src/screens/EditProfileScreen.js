/**
 * AI Lawyer - Edit Profile Screen
 * Loads profile from Supabase, saves updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Pencil } from 'lucide-react-native';
import { fontFamily, spacing, borderRadius, useTheme } from '../theme';
import IconButton from '../components/IconButton';
import { SkeletonForm } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { updateProfile, uploadAvatar } from '../lib/profile';
import { isValidEmail } from '../lib/validation';

const DEFAULT_AVATAR_LIGHT = require('../../assets/default-avatar.png');
const DEFAULT_AVATAR_DARK = require('../../assets/default-avatar-dark.png');

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const defaultAvatar = isDarkMode ? DEFAULT_AVATAR_DARK : DEFAULT_AVATAR_LIGHT;
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || user?.email || '');
      setAge(profile.age != null ? String(profile.age) : '');
    }
    setLoading(profile !== undefined);
  }, [profile, user?.email]);

  const avatarUri = pendingAvatarUri || profile?.avatar_url || null;

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('editProfile.permissionNeeded'), t('editProfile.allowPhotos'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setPendingAvatarUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = t('editProfile.errorEmailRequired');
    else if (!isValidEmail(email.trim())) nextErrors.email = t('editProfile.errorEmailInvalid');
    const ageNum = age.trim() ? parseInt(age, 10) : null;
    if (age.trim() && (isNaN(ageNum) || ageNum < 1 || ageNum > 150)) {
      nextErrors.age = t('editProfile.errorAgeRange');
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const updates = {
        full_name: fullName.trim() || null,
        email: email.trim(),
        age: ageNum,
      };
      if (pendingAvatarUri) {
        updates.avatar_url = await uploadAvatar(user.id, pendingAvatarUri);
        setPendingAvatarUri(null);
      }
      await updateProfile(user.id, updates);
      await refreshProfile();
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || t('editProfile.errorSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigation.goBack();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <IconButton icon={ChevronLeft} onPress={handleBack} size={36} iconSize={22} />
      ),
    });
  }, [navigation]);

  if (loading && profile === undefined) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonForm avatarSize={100} fieldCount={3} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatarCard]}>
                <Image source={defaultAvatar} style={styles.avatarImage} resizeMode="contain" />
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarBtn}
              activeOpacity={0.8}
              onPress={handlePickAvatar}
            >
              <Pencil size={16} color={colors.secondaryBackground} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('editProfile.fullNameLabel')}</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={fullName}
              onChangeText={(val) => { setFullName(val); setErrors((e) => ({ ...e, fullName: '' })); }}
              placeholder={t('editProfile.fullNamePlaceholder')}
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="words"
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('editProfile.emailLabel')}</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={(val) => { setEmail(val); setErrors((e) => ({ ...e, email: '' })); }}
              placeholder={t('editProfile.emailPlaceholder')}
              placeholderTextColor={colors.secondaryText}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('editProfile.ageLabel')}</Text>
            <TextInput
              style={[styles.input, errors.age && styles.inputError]}
              value={age}
              onChangeText={(val) => { setAge(val.replace(/\D/g, '').slice(0, 3)); setErrors((e) => ({ ...e, age: '' })); }}
              placeholder={t('editProfile.agePlaceholder')}
              placeholderTextColor={colors.secondaryText}
              keyboardType="number-pad"
            />
            {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{saving ? t('editProfile.saving') : t('editProfile.save')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primaryBackground,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
      paddingTop: spacing.sm,
      backgroundColor: colors.primaryBackground,
    },
    avatarSection: {
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: spacing.xl,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    defaultAvatarCard: {
      backgroundColor: colors.alternate,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
    },
    editAvatarBtn: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primaryBackground,
    },
    form: {
      gap: spacing.md,
    },
    field: {},
    label: {
      fontFamily,
      fontSize: 14,
      fontWeight: '500',
      color: colors.primaryText,
      marginBottom: 14,
    },
    input: {
      fontFamily,
      fontSize: 16,
      fontWeight: '400',
      color: colors.primaryText,
      backgroundColor: colors.secondaryBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.tertiary,
      paddingHorizontal: spacing.md,
      height: 56,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      fontFamily,
      fontSize: 12,
      color: colors.error,
      marginTop: 10,
      marginLeft: 16,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 30,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      fontFamily,
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
  };
}
