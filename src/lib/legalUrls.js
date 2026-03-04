/**
 * DocTrust legal document URLs. Used for in-app links to Privacy Policy and Terms of Use.
 */

import { Linking } from 'react-native';

export const PRIVACY_POLICY_URL = 'https://webnum.com/doctrust-privacy-policy/';
export const TERMS_OF_USE_URL = 'https://webnum.com/doctrust-terms-of-use/';

export function openPrivacyPolicy() {
  Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
}

export function openTermsOfUse() {
  Linking.openURL(TERMS_OF_USE_URL).catch(() => {});
}
