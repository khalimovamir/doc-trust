#!/usr/bin/env node
/**
 * Add missing translation keys to locale files. Uses en as reference.
 * Missing keys are filled with translations below (or fallback to en).
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');

function setNested(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in o)) o[p] = {};
    o = o[p];
  }
  o[parts[parts.length - 1]] = value;
}

const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'));

// Translations for missing keys: locale -> { dotPath -> value }
const TRANSLATIONS = {
  ru: {
    'aiLawyer.addNewChat': 'Добавить чат',
    'aiLawyer.deleteChat': 'Удалить чат',
    'aiLawyer.deleteChatTitle': 'Удалить чат?',
    'aiLawyer.deleteChatMessage': 'Этот чат будет удалён безвозвратно.',
    'aiLawyer.deleteChatConfirm': 'Удалить',
  },
  fr: {
    'aiLawyer.addNewChat': 'Nouveau chat',
    'aiLawyer.deleteChat': 'Supprimer le chat',
    'aiLawyer.deleteChatConfirm': 'Supprimer',
    'aiLawyer.deleteChatMessage': 'Ce chat sera définitivement supprimé.',
    'aiLawyer.deleteChatTitle': 'Supprimer le chat ?',
    'aiLawyer.docChatGreeting': 'J\'ai examiné votre {{type}}. Posez-moi des questions.',
    'aiLawyer.docChatGreetingIssue': 'J\'ai examiné ce point. Que voulez-vous savoir ?',
    'aiLawyer.docChatSuggestionDoc1': 'Quels sont les points clés ?',
    'aiLawyer.docChatSuggestionDoc2': 'Y a-t-il des risques ?',
    'aiLawyer.docChatSuggestionDoc3': 'À quoi dois-je faire attention ?',
    'aiLawyer.docChatSuggestionIssue1': 'Expliquez en termes simples',
    'aiLawyer.docChatSuggestionIssue2': 'Que dois-je faire ?',
    'aiLawyer.docChatSuggestionIssue3': 'Quelle est la gravité ?',
    'auth.continueWithApple': 'Continuer avec Apple',
    'auth.continueWithEmail': 'Continuer avec e-mail',
    'auth.continueWithGoogle': 'Continuer avec Google',
    'auth.createAccount': 'Créez votre compte',
    'auth.sendCode': 'Envoyer le code',
    'auth.signUpButton': 'S\'inscrire',
    'auth.signUpLink': 'S\'inscrire',
    'auth.verifyButton': 'Vérifier',
    'details.deleteFailed': 'Impossible de supprimer. Réessayez.',
    'scanner.textDetectionInCamera': 'La détection de texte apparaîtra ici.',
  },
  de: {
    'aiLawyer.addNewChat': 'Neuer Chat',
    'aiLawyer.deleteChat': 'Chat löschen',
    'aiLawyer.deleteChatConfirm': 'Löschen',
    'aiLawyer.deleteChatMessage': 'Dieser Chat wird dauerhaft gelöscht.',
    'aiLawyer.deleteChatTitle': 'Chat löschen?',
    'aiLawyer.docChatGreeting': 'Ich habe Ihr {{type}} geprüft. Fragen Sie mich etwas.',
    'aiLawyer.docChatGreetingIssue': 'Ich habe mir diesen Punkt angesehen. Was möchten Sie wissen?',
    'aiLawyer.docChatSuggestionDoc1': 'Was sind die wichtigsten Punkte?',
    'aiLawyer.docChatSuggestionDoc2': 'Gibt es Risiken?',
    'aiLawyer.docChatSuggestionDoc3': 'Worauf sollte ich achten?',
    'aiLawyer.docChatSuggestionIssue1': 'Erklären Sie das einfach',
    'aiLawyer.docChatSuggestionIssue2': 'Was soll ich tun?',
    'aiLawyer.docChatSuggestionIssue3': 'Wie schwerwiegend ist das?',
    'auth.createAccount': 'Konto erstellen',
    'auth.sendCode': 'Code senden',
    'auth.signUpButton': 'Registrieren',
    'auth.signUpLink': 'Registrieren',
    'auth.verifyButton': 'Bestätigen',
    'details.deleteFailed': 'Löschen fehlgeschlagen. Bitte erneut versuchen.',
    'scanner.textDetectionInCamera': 'Texterkennung wird hier angezeigt.',
  },
  es: {
    'aiLawyer.addNewChat': 'Nuevo chat',
    'aiLawyer.deleteChat': 'Eliminar chat',
    'aiLawyer.deleteChatConfirm': 'Eliminar',
    'aiLawyer.deleteChatMessage': 'Este chat se eliminará permanentemente.',
    'aiLawyer.deleteChatTitle': '¿Eliminar chat?',
    'aiLawyer.docChatGreeting': 'He revisado tu {{type}}. Pregúntame lo que quieras.',
    'aiLawyer.docChatGreetingIssue': 'He revisado este punto. ¿Qué te gustaría saber?',
    'aiLawyer.docChatSuggestionDoc1': '¿Cuáles son los puntos clave?',
    'aiLawyer.docChatSuggestionDoc2': '¿Hay riesgos?',
    'aiLawyer.docChatSuggestionDoc3': '¿Qué debo comprobar?',
    'aiLawyer.docChatSuggestionIssue1': 'Explícalo en términos simples',
    'aiLawyer.docChatSuggestionIssue2': '¿Qué debo hacer?',
    'aiLawyer.docChatSuggestionIssue3': '¿Qué tan grave es?',
    'auth.continueWithApple': 'Continuar con Apple',
    'auth.continueWithEmail': 'Continuar con email',
    'auth.continueWithGoogle': 'Continuar con Google',
    'auth.createAccount': 'Crea tu cuenta',
    'auth.sendCode': 'Enviar código',
    'auth.signUpButton': 'Registrarse',
    'auth.signUpLink': 'Registrarse',
    'auth.verifyButton': 'Verificar',
    'details.deleteFailed': 'No se pudo eliminar. Inténtalo de nuevo.',
    'scanner.textDetectionInCamera': 'La detección de texto aparecerá aquí.',
  },
  it: {
    'aiLawyer.addNewChat': 'Nuova chat',
    'aiLawyer.deleteChat': 'Elimina chat',
    'aiLawyer.deleteChatConfirm': 'Elimina',
    'aiLawyer.deleteChatMessage': 'Questa chat verrà eliminata definitivamente.',
    'aiLawyer.deleteChatTitle': 'Eliminare la chat?',
    'aiLawyer.docChatGreeting': 'Ho esaminato il tuo {{type}}. Chiedimi pure.',
    'aiLawyer.docChatGreetingIssue': 'Ho esaminato questo punto. Cosa vorresti sapere?',
    'aiLawyer.docChatSuggestionDoc1': 'Quali sono i punti chiave?',
    'aiLawyer.docChatSuggestionDoc2': 'Ci sono rischi?',
    'aiLawyer.docChatSuggestionDoc3': 'Cosa devo controllare?',
    'aiLawyer.docChatSuggestionIssue1': 'Spiega in parole semplici',
    'aiLawyer.docChatSuggestionIssue2': 'Cosa devo fare?',
    'aiLawyer.docChatSuggestionIssue3': 'Quanto è grave?',
    'auth.continueWithApple': 'Continua con Apple',
    'auth.continueWithEmail': 'Continua con email',
    'auth.continueWithGoogle': 'Continua con Google',
    'auth.createAccount': 'Crea il tuo account',
    'auth.sendCode': 'Invia codice',
    'auth.signUpButton': 'Registrati',
    'auth.signUpLink': 'Registrati',
    'auth.verifyButton': 'Verifica',
    'details.deleteFailed': 'Impossibile eliminare. Riprova.',
    'scanner.textDetectionInCamera': 'Il rilevamento del testo apparirà qui.',
  },
  nl: {
    'aiLawyer.addNewChat': 'Nieuwe chat',
    'aiLawyer.deleteChat': 'Chat verwijderen',
    'aiLawyer.deleteChatConfirm': 'Verwijderen',
    'aiLawyer.deleteChatMessage': 'Deze chat wordt permanent verwijderd.',
    'aiLawyer.deleteChatTitle': 'Chat verwijderen?',
    'aiLawyer.docChatGreeting': 'Ik heb je {{type}} bekeken. Vraag me gerust.',
    'aiLawyer.docChatGreetingIssue': 'Ik heb dit punt bekeken. Wat wil je weten?',
    'aiLawyer.docChatSuggestionDoc1': 'Wat zijn de belangrijkste punten?',
    'aiLawyer.docChatSuggestionDoc2': 'Zijn er risico\'s?',
    'aiLawyer.docChatSuggestionDoc3': 'Waar moet ik op letten?',
    'aiLawyer.docChatSuggestionIssue1': 'Leg uit in eenvoudige bewoordingen',
    'aiLawyer.docChatSuggestionIssue2': 'Wat moet ik doen?',
    'aiLawyer.docChatSuggestionIssue3': 'Hoe ernstig is dit?',
    'auth.continueWithApple': 'Doorgaan met Apple',
    'auth.continueWithEmail': 'Doorgaan met e-mail',
    'auth.continueWithGoogle': 'Doorgaan met Google',
    'auth.createAccount': 'Maak je account',
    'auth.sendCode': 'Code verzenden',
    'auth.signUpButton': 'Registreren',
    'auth.signUpLink': 'Registreren',
    'auth.verifyButton': 'Verifiëren',
    'details.deleteFailed': 'Verwijderen mislukt. Probeer het opnieuw.',
    'scanner.textDetectionInCamera': 'Tekstherkenning verschijnt hier.',
  },
  pt: {
    'aiLawyer.addNewChat': 'Novo chat',
    'aiLawyer.deleteChat': 'Eliminar chat',
    'aiLawyer.deleteChatConfirm': 'Eliminar',
    'aiLawyer.deleteChatMessage': 'Este chat será eliminado permanentemente.',
    'aiLawyer.deleteChatTitle': 'Eliminar chat?',
    'aiLawyer.docChatGreeting': 'Revivi o seu {{type}}. Pergunte o que quiser.',
    'aiLawyer.docChatGreetingIssue': 'Analisei este ponto. O que gostaria de saber?',
    'aiLawyer.docChatSuggestionDoc1': 'Quais são os pontos principais?',
    'aiLawyer.docChatSuggestionDoc2': 'Há riscos?',
    'aiLawyer.docChatSuggestionDoc3': 'O que devo verificar?',
    'aiLawyer.docChatSuggestionIssue1': 'Explique em termos simples',
    'aiLawyer.docChatSuggestionIssue2': 'O que devo fazer?',
    'aiLawyer.docChatSuggestionIssue3': 'Qual a gravidade?',
    'auth.continueWithApple': 'Continuar com Apple',
    'auth.continueWithEmail': 'Continuar com email',
    'auth.continueWithGoogle': 'Continuar com Google',
    'auth.createAccount': 'Crie a sua conta',
    'auth.sendCode': 'Enviar código',
    'auth.signUpButton': 'Registar',
    'auth.signUpLink': 'Registar',
    'auth.verifyButton': 'Verificar',
    'details.deleteFailed': 'Não foi possível eliminar. Tente novamente.',
    'scanner.textDetectionInCamera': 'A deteção de texto aparecerá aqui.',
  },
  ko: {
    'aiLawyer.addNewChat': '새 채팅',
    'aiLawyer.deleteChat': '채팅 삭제',
    'aiLawyer.deleteChatConfirm': '삭제',
    'aiLawyer.deleteChatMessage': '이 채팅은 영구적으로 삭제됩니다.',
    'aiLawyer.deleteChatTitle': '채팅을 삭제할까요?',
    'aiLawyer.docChatGreeting': '{{type}} 검토했습니다. 무엇이든 물어보세요.',
    'aiLawyer.docChatGreetingIssue': '이 항목을 확인했습니다. 무엇이 궁금하신가요?',
    'aiLawyer.docChatSuggestionDoc1': '핵심 내용은?',
    'aiLawyer.docChatSuggestionDoc2': '위험 요소가 있나요?',
    'aiLawyer.docChatSuggestionDoc3': '확인할 사항은?',
    'aiLawyer.docChatSuggestionIssue1': '쉽게 설명해 주세요',
    'aiLawyer.docChatSuggestionIssue2': '제가 무엇을 해야 하나요?',
    'aiLawyer.docChatSuggestionIssue3': '얼마나 심각한가요?',
    'auth.continueWithApple': 'Apple로 계속',
    'auth.continueWithEmail': '이메일로 계속',
    'auth.continueWithGoogle': 'Google로 계속',
    'auth.createAccount': '계정 만들기',
    'auth.sendCode': '코드 보내기',
    'auth.signUpButton': '가입',
    'auth.signUpLink': '가입',
    'auth.verifyButton': '확인',
    'details.deleteFailed': '삭제할 수 없습니다. 다시 시도하세요.',
    'scanner.textDetectionInCamera': '텍스트 감지가 여기에 표시됩니다.',
  },
  ar: {
    'aiLawyer.addNewChat': 'محادثة جديدة',
    'aiLawyer.deleteChat': 'حذف المحادثة',
    'aiLawyer.deleteChatConfirm': 'حذف',
    'aiLawyer.deleteChatMessage': 'سيتم حذف هذه المحادثة نهائياً.',
    'aiLawyer.deleteChatTitle': 'حذف المحادثة؟',
    'aiLawyer.docChatGreeting': 'راجعت {{type}}. اسألني أي شيء.',
    'aiLawyer.docChatGreetingIssue': 'اطلعت على هذه النقطة. ماذا تريد أن تعرف؟',
    'aiLawyer.docChatSuggestionDoc1': 'ما النقاط الرئيسية؟',
    'aiLawyer.docChatSuggestionDoc2': 'هل هناك مخاطر؟',
    'aiLawyer.docChatSuggestionDoc3': 'ما الذي يجب أن أتحققه؟',
    'aiLawyer.docChatSuggestionIssue1': 'اشرح ببساطة',
    'aiLawyer.docChatSuggestionIssue2': 'ماذا أفعل؟',
    'aiLawyer.docChatSuggestionIssue3': 'ما مدى خطورة ذلك؟',
    'auth.continueWithApple': 'المتابعة مع Apple',
    'auth.continueWithEmail': 'المتابعة بالبريد',
    'auth.continueWithGoogle': 'المتابعة مع Google',
    'auth.createAccount': 'إنشاء حسابك',
    'auth.sendCode': 'إرسال الرمز',
    'auth.signUpButton': 'التسجيل',
    'auth.signUpLink': 'التسجيل',
    'auth.verifyButton': 'تحقق',
    'details.deleteFailed': 'تعذر الحذف. يرجى المحاولة مرة أخرى.',
    'scanner.textDetectionInCamera': 'سيظهر التعرف على النص هنا.',
  },
};

function getByPath(obj, pathStr) {
  return pathStr.split('.').reduce((o, p) => o?.[p], obj);
}

for (const [locale, keysToAdd] of Object.entries(TRANSLATIONS)) {
  const filepath = path.join(LOCALES_DIR, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  for (const [keyPath, value] of Object.entries(keysToAdd)) {
    if (getByPath(data, keyPath) === undefined) {
      setNested(data, keyPath, value);
    }
  }
  fs.writeFileSync(filepath, JSON.stringify(data), 'utf8');
  console.log('Updated', locale + '.json');
}

console.log('Done.');
