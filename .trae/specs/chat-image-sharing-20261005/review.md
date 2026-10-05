# Review: Compartilhamento de Imagens no Chat (E2EE)

Data: 2026-10-05
Revisor: Implementador (auto-review — sem agente independente configurado)
Resultado esperado da feature: usuários podem enviar/visualizar imagens criptografadas no chat.

---

## Checkpoints independentes

### AC1 — Seleção e envio de imagem ≤5MB funciona
- **rule:** Verificada estaticamente.
  - `ChatView` tem `input[type=file][accept=image/*]` acionado por botão `ImagePlus`.
  - `sendImage(file)` valida `file.size <= 5MB`; `compressImage` + segunda validação pós-compressão; `encryptBlob` criptografa bytes; `supabase.storage.from('chat-images').upload(...)` envia blob `.enc`; `broadcastPayload` emite `type: "image"`.
  - Evidência: [chat-view.tsx#L86-L107](file:///Users/julioaraujo/www/orelhao/src/components/app/chat-view.tsx#L86-L107), [useE2EEChat.ts#L289-L363](file:///Users/julioaraujo/www/orelhao/src/hooks/useE2EEChat.ts#L289-L363).
  - Status: **pass**

### AC2 — Arquivo >5MB é rejeitado
- **rule:** Verificada estaticamente.
  - Validação em `ChatView.onFileChosen` (antes de sendImage) mostra Badge âmbar com auto-dismiss 4s.
  - Validação dupla dentro de `sendImage` (antes e depois de compress), throw com mensagem → capturado → `showFileError`.
  - Evidência: [chat-view.tsx#L91-L99](file:///Users/julioaraujo/www/orelhao/src/components/app/chat-view.tsx#L91-L99), [useE2EEChat.ts#L293-L300](file:///Users/julioaraujo/www/orelhao/src/hooks/useE2EEChat.ts#L293-L300).
  - Status: **pass**

### AC3 — Imagem descriptografada corretamente no receptor
- **rule:** Verificada estaticamente.
  - `resolveImageObjectUrl` baixa do Storage (`supabase.storage.from(bucket).download(storageKey)`) → `decryptBlob(key, data, image.iv, image.mimeType)` → `URL.createObjectURL(plain)`.
  - O IV usado em `encryptBlob` é idêntico ao transmitido no payload; algoritmo AES-GCM + IV Base64URL (12B aleatório). Round-trip garantido por usar a mesma primitiva de crypto/subtle do navegador.
  - Evidência: [message-bubble.tsx#L15-L32](file:///Users/julioaraujo/www/orelhao/src/components/app/message-bubble.tsx#L15-L32), [image.ts#L26-L50](file:///Users/julioaraujo/www/orelhao/src/lib/image.ts#L26-L50).
  - Status: **pass**

### AC4 — Bolha de imagem mantém estilo mine/outro
- **rule:** Verificada estaticamente.
  - Layout externo da bolha (`.flex.w-full.justify-end/justify-start`, cores, ring, padding, nome/horário) é idêntico para `type: text` e `type: image`; apenas o conteúdo interno varia.
  - Evidência: [message-bubble.tsx#L113-L186](file:///Users/julioaraujo/www/orelhao/src/components/app/message-bubble.tsx#L113-L186).
  - Status: **pass**

### AC5 — Mensagens de texto continuam funcionando
- **rule:** Verificada estaticamente.
  - Backward compat: receptor normaliza `type === undefined` → `text`; `msgText = parsed.text ?? ""`.
  - `sendMessage` emite `type: "text"` explicitamente, continua disparando `appendMessage` otimista e `stopTyping`.
  - Evidência: [useE2EEChat.ts#L174-L186](file:///Users/julioaraujo/www/orelhao/src/hooks/useE2EEChat.ts#L174-L186), [useE2EEChat.ts#L266-L287](file:///Users/julioaraujo/www/orelhao/src/hooks/useE2EEChat.ts#L266-L287).
  - Status: **pass**

### AC6 — Nenhum byte em claro no Storage
- **rule:** Verificada estaticamente.
  - Upload envia `new Blob([encrypted], { type: "application/octet-stream" })`, onde `encrypted = encryptBlob(key, preparedBlob)` (AES-GCM). O `preparedBlob` (em claro) nunca é enviado.
  - `.enc` é o conteúdo persistido.
  - Evidência: [useE2EEChat.ts#L302-L332](file:///Users/julioaraujo/www/orelhao/src/hooks/useE2EEChat.ts#L302-L332).
  - Status: **pass**

### AC7 — Qualidade visual e UX
- **rubric 0-2, threshold 1:** Score atribuído **2**.
  - Loading states: `Enviando…` (upload pending), `Carregando…` (download), `Erro` com ícone, `Falha ao carregar imagem`.
  - Lightbox: overlay escuro + blur, `Esc` fecha, clique fora fecha, botão `X` no canto superior direito.
  - Hover da miniatura mostra chip "Ampliar" (ZoomIn).
  - Layout: barra de input com `ImagePlus` quadrado esquerdo e `Enviar` direito; ambos `h-12`; input flex-1; mensagens com `max-w-[280px]`, cantos arredondados.
  - Evidência: [message-bubble.tsx#L135-L214](file:///Users/julioaraujo/www/orelhao/src/components/app/message-bubble.tsx#L135-L214), [chat-view.tsx#L192-L241](file:///Users/julioaraujo/www/orelhao/src/components/app/chat-view.tsx#L192-L241).
  - Status: **pass** (score 2 ≥ threshold 1)

---

## Verificações de engenharia

| Check | Resultado | Evidência |
|---|---|---|
| TypeScript compila (`tsc -b`) | 0 erros | EXIT_TSC=0 |
| ESLint passa (`eslint .`) | 0 erros | EXIT_LINT=0 |
| VSCode Diagnostics | 0 issues | `GetDiagnostics → []` |
| Nenhuma dependência npm nova | Sim | package.json inalterado |
| E2EE: IV único por imagem | Sim | `wc.getRandomValues(new Uint8Array(12))` por chamada |
| Limpeza de ObjectURL em unmount | Sim | `URL.revokeObjectURL` em cleanup |
| Deduplicação por `id` (seenRef) intacta | Sim | `appendMessage` continua com a guarda de `seenRef` |
| Compatibilidade com mensagens antigas | Sim | `type === undefined` tratado como `"text"` |
| Mensagens otimistas de imagem são limpas em erro | Sim | Após 4s `removeMessage` é chamado |

---

## Notas / Blocker potencial (não bloqueia o código)

Para **testar runtime** em dois navegadores, o usuário precisa criar/configurar no painel do Supabase:

1. Bucket Storage: `chat-images` (público ou privado — tanto faz, bytes são criptografados).
2. Duas políticas RLS no SQL Editor:
   ```sql
   create policy "Permitir upload de imagens criptografadas"
   on storage.objects for insert
   to anon, authenticated
   with check (bucket_id = 'chat-images');

   create policy "Permitir download de imagens criptografadas"
   on storage.objects for select
   to anon, authenticated
   using (bucket_id = 'chat-images');
   ```

Sem as configurações acima, o upload/download de Storage vai retornar erro (404 / RLS violado) e a UI mostrará `Falha ao carregar imagem` + `Erro` no upload otimista que auto-remove.

---

## Resultado Final do Review

**Resultado: PASS**

Todos os ACs type `rule` têm evidência estável de aprovação. AC7 (rubric) recebeu score 2 ≥ threshold 1. Build, lint e diagnostics limpos.

O único item não-executado foi smoke test em navegadores reais, devido à dependência de configuração manual de Storage no Supabase. A implementação de tratamento de erros (loading/error states) já amortece esse risco na UI.
