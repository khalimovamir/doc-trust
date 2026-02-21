# AI Lawyer — схема Supabase

Краткая шпаргалка по таблицам и тому, как их использует приложение.

---

## Цепочка «Документ → Анализ»

```
documents (карточка в History)
    ↓ owner_id = auth.uid()
document_versions (версия: paste / upload / scan + текст)
    ↓ document_id
analyses (результат анализа: score, summary, parties, …)
    ↓ analysis_id
analysis_issues (Red Flags: critical / warning / tip)
analysis_guidance_items (Guidance: чеклисты, is_done)
```

- **documents** — одна запись = один «документ» в списке History (owner_id, title, doc_type).
- **document_versions** — каждая версия текста (source: `paste` | `upload` | `scan`, text_content).
- **analyses** — один анализ на одну версию (score 0–100, summary, document_type, parties, contract_amount, payments, key_dates, счётчики).
- **analysis_issues** — пункты Red Flags (severity: `critical` | `warning` | `tip`, title, why_matters, what_to_do, order_index).
- **analysis_guidance_items** — пункты Guidance (priority: `high` | `medium` | `low`, text, is_done, order_index).

---

## Таблицы по назначению

| Таблица | Назначение | Кто пишет |
|--------|------------|-----------|
| **profiles** | Профиль пользователя (имя, язык, jurisdiction_code, аватар) | App (update) |
| **chats** | Чаты с AI Lawyer (title, context_type, context_title, context_data) | App |
| **chat_messages** | Сообщения в чате (role, content, context_ref) | App |
| **documents** | «Документы» в History | App (при сохранении анализа) |
| **document_versions** | Версии текста документа (paste/upload/scan) | App |
| **analyses** | Результаты анализа (score, summary, red flags count, …) | App |
| **analysis_issues** | Red Flags по анализу | App |
| **analysis_guidance_items** | Guidance по анализу (чекбоксы) | App |
| **user_subscriptions** | Подписка пользователя (tier, status) | Только backend/service_role |
| **subscription_products**, **subscription_offers**, **user_offer_states**, … | Подписки и офферы | Чтение из app, запись по необходимости |

---

## Ключевые поля (для памяти)

- **documents:** `owner_id`, `title`, `doc_type` (`other` | `freelance_contract` | `deal_contract` | `work_contract`).
- **document_versions:** `document_id`, `source` (`paste`|`upload`|`scan`), `text_content`.
- **analyses:** `document_version_id`, `score`, `summary`, `document_type`, `parties` (jsonb), `contract_amount` (text), `payments` (jsonb), `key_dates` (jsonb), `critical_count`, `warning_count`, `tip_count`, `risks_count`, `tips_count`.
- **analysis_issues:** `analysis_id`, `severity` (`critical`|`warning`|`tip`), `section`, `title`, `why_matters`, `what_to_do`, `order_index`.
- **analysis_guidance_items:** `analysis_id`, `priority` (`high`|`medium`|`low`), `section`, `text`, `is_done`, `order_index`.
- **chats:** `user_id`, `title`, `context_type`, `context_title`, `context_data` (jsonb).
- **chat_messages:** `chat_id`, `role` (`user`|`assistant`), `content`, `context_ref`.

---

## RLS (кто что видит)

- **documents, document_versions, analyses, analysis_issues, analysis_guidance_items** — только свои (через owner_id / document_id / analysis_id).
- **profiles** — только свой (id = auth.uid()).
- **chats, chat_messages** — только свои (user_id / chat_id).
- **user_subscriptions, user_offer_states** — только свои (user_id).
- **subscription_products, subscription_offers, feature_catalog, plan_feature_limits** — чтение для всех authenticated.

После изменений схемы всегда проверяй, что RLS включён и политики совпадают с этой логикой.
