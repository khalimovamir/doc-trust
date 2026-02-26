/**
 * AI Lawyer - Initial message and suggestions for document-linked chats.
 * Short, clear greeting and 3 example questions based on document/analysis or issue.
 */

/**
 * @param {Object} analysis - { documentType }
 * @param {Object|null} issueItem - optional issue from red flags
 * @param {(key: string, opts?: object) => string} t - i18n
 * @returns {{ initial_message: string, initial_suggestions: string[] }}
 */
export function getDocumentChatInitial(analysis, issueItem, t) {
  if (issueItem) {
    return {
      initial_message: t('aiLawyer.docChatGreetingIssue'),
      initial_suggestions: [
        t('aiLawyer.docChatSuggestionIssue1'),
        t('aiLawyer.docChatSuggestionIssue2'),
        t('aiLawyer.docChatSuggestionIssue3'),
      ],
    };
  }
  const type = analysis?.documentType || t('home.document');
  return {
    initial_message: t('aiLawyer.docChatGreeting', { type }),
    initial_suggestions: [
      t('aiLawyer.docChatSuggestionDoc1'),
      t('aiLawyer.docChatSuggestionDoc2'),
      t('aiLawyer.docChatSuggestionDoc3'),
    ],
  };
}
