/**
 * AI Lawyer - Done Screen
 * Success confirmation after password change
 * Design from Figma
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PartyPopper } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

const ICON_SIZE = 80;

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
    icon: { marginBottom: spacing.xl },
    title: { fontFamily, fontSize: 28, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginBottom: spacing.sm },
    description: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', lineHeight: 22 },
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    buttonFullWidth: { marginHorizontal: 0, borderRadius: 30 },
  };
}

export default function DoneScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { setPendingPasswordReset } = useAuth();

  const handleContinue = () => {
    setPendingPasswordReset(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <PartyPopper
          size={ICON_SIZE}
          color={colors.primary}
          strokeWidth={1.5}
          style={styles.icon}
        />
        <Text style={styles.title}>Password Changed!</Text>
        <Text style={styles.description}>
          Congratulations! You have successfully changed your password. You can now log in to your
          account.
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="Continue" onPress={handleContinue} containerStyle={styles.buttonFullWidth} />
      </View>
    </SafeAreaView>
  );
}

