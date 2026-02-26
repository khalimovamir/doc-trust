-- Context is now at chat level (chats.context_data). Per-message context_ref is unused.
alter table public.chat_messages
  drop column if exists context_ref;
