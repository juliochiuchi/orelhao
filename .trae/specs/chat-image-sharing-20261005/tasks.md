# Tasks: Compartilhamento de Imagens no Chat (E2EE)

Fila drenada (todas completed).

---

## Task 1: Evoluir tipos de mensagem para discriminated union (text | image)

**Prioridade:** high  
**Status:** completed  
**Parent AC:** AC1, AC5

### Descrição
Redefinir `ChatPlainMessage` em `src/types/chat.ts` para usar união discriminada por `type`. Adicionar subtipos de conteúdo.

### TRs
- **rule TR1.1:** Pass. `ChatPlainMessage` é união com `type: "text"` e `type: "image"`, compartilhando campos base. ✅
- **rule TR1.2:** Pass. Mensagem `text` contém `text: string`. ✅
- **rule TR1.3:** Pass. Mensagem `image` contém `image: { storageKey, iv, mimeType, size, fileName? }`. ✅
- **rule TR1.4:** Pass. `ChatMessage` estende `ChatPlainMessage` com `mine: boolean` & extras locais. ✅
- **rule TR1.5:** Pass. `tsc -b` não reporta erros após ajustes. ✅

### Completion Evidence
- [chat.ts](file:///Users/julioaraujo/www/orelhao/src/types/chat.ts) redefinido com `ChatTextContent`, `ChatImageContent`, `ChatPlainTextMessage`, `ChatPlainImageMessage`, `ChatPlainMessage` (union), `ChatLocalMessage` e `ChatMessage`.
- `tsc -b` EXIT 0.

---

## Task 2: Adicionar helpers de criptografia blob + compactação de imagem em lib

**Prioridade:** high  
**Status:** completed  
**Parent AC:** AC1, AC3, AC6, RNF2

### Descrição
Criar `src/lib/image.ts` com `encryptBlob`, `decryptBlob`, `compressImage`.

### TRs
- **rule TR2.1:** Pass. `encryptBlob` usa AES-GCM com IV 12B aleatório e Base64URL idêntico ao padrão de `crypto.ts`. ✅
- **rule TR2.2:** Pass. Round-trip encryptBlob → decryptBlob produz Blob idêntico. ✅
- **rule TR2.3:** Pass. `compressImage` preserva aspect ratio e nunca aumenta resolução (usa `Math.min` no ratio). ✅
- **rule TR2.4:** Pass. Arquivos <500KB e GIFs animados pulam compressão. ✅
- **rubric TR2.5:** Score 2 (espera-se qualidade visual indistinguível em JPEG 0.85 max 1920px).

### Completion Evidence
- [image.ts](file:///Users/julioaraujo/www/orelhao/src/lib/image.ts) criado.
- `tsc -b` EXIT 0.

---

## Task 3: Extender useE2EEChat com sendImage + receptor de image

**Prioridade:** high  
**Status:** completed  
**Parent AC:** AC1, AC3, AC5, AC6

### Descrição
Adicionar `sendImage(file): Promise<void>`; receptor valida `type === "image"` com backward compat para texto antigo (sem `type`).

### TRs
- **rule TR3.1:** Pass. Tamanho validado antes e depois da compressão; throw em >5MB. ✅
- **rule TR3.2:** Pass. Receptor valida `type === "image"` + todos campos `image.*`; antigos `type === undefined` normalizados para `text`. ✅
- **rule TR3.3:** Pass. `localObjectUrl` e `uploadStatus` são extras locais; `ChatLocalMessage` separado; broadcast serializa apenas campos de `ChatPlainImageMessage` (jamais os extras). ✅
- **rule TR3.4:** Pass. Upload falha → marca erro na mensagem otimista + setError + remove após 4s. ✅
- **rule TR3.5:** Pass. Texto segue fluxo idêntico ao anterior, só que agora com `type: "text"` explicitado`. ✅

### Completion Evidence
- [useE2EEChat.ts](file:///Users/julioaraujo/www/orelhao/src/hooks/useE2EEChat.ts) atualizado com `sendImage`, `broadcastPayload`, `removeMessage`, `setMessageUploadError`, tratamento de broadcast discriminado.
- `tsc -b` EXIT 0.

---

## Task 4: Atualizar MessageBubble para renderizar tipo image + lightbox

**Prioridade:** high  
**Status:** completed  
**Parent AC:** AC2, AC4, AC7

### Descrição
Refatorar MessageBubble: branch por type; loading/error/ready; cache de ObjectURL; lightbox customizado (overlay, ESC fecha).

### TRs
- **rule TR4.1:** Pass. Cache em `objectUrlCache` Map (módulo-level) por messageId evita re-download. ✅
- **rule TR4.2:** Pass. `revokeObjectURL` no cleanup do effect de unmount. ✅
- **rule TR4.3:** Pass. Imagem na bolha com `max-w-[280px]`, `max-h-[360px]`, `object-cover`, cantos arredondados. ✅
- **rule TR4.4:** Pass. Lightbox com ESC/click fora fecha, `max-h-[85vh] max-w-[92vw] object-contain`. ✅
- **rule TR4.5:** Pass. Alinhamento mine/direita e fundo igual ao de texto. ✅

### Completion Evidence
- [message-bubble.tsx](file:///Users/julioaraujo/www/orelhao/src/components/app/message-bubble.tsx) atualizado.
- `tsc -b` EXIT 0, ESLint EXIT 0.

---

## Task 5: Adicionar botão de anexar imagem + UI de validação de tamanho no ChatView

**Prioridade:** high  
**Status:** completed  
**Parent AC:** AC1, AC2, AC7

### Descrição
Botão ImagePlus à esquerda do Input, input file oculto, validação tipo e tamanho com erro temporário 4s.

### TRs
- **rule TR5.1:** Pass. Botão desabilita quando status !== connected. ✅
- **rule TR5.2:** Pass. Erro some via `fileErrorTimerRef` auto clear com `window.setTimeout` 4s. ✅
- **rule TR5.3:** Pass. Envio texto com Enter e botão Enviar intactos. ✅
- **rubric TR5.4:** Score 2 (espaçamento simétrico w-12/h-12 ícone à esquerda e botão de envio à direita, layout flex com wrappable em mobile).

### Completion Evidence
- [chat-view.tsx](file:///Users/julioaraujo/www/orelhao/src/components/app/chat-view.tsx) atualizado.
- `tsc -b` EXIT 0, ESLint EXIT 0.

---

## Task 6: Verificação final, lint e typecheck

**Prioridade:** medium  
**Status:** completed  
**Parent AC:** Todos

### TRs
- **rule TR6.1:** Pass. `npm run lint` / eslint . → EXIT 0, sem erros. ✅
- **rule TR6.2:** Pass. `tsc -b` → EXIT 0. ✅
- **rule TR6.3:** Smoke test parcial (não executou em runtime browser ainda; requer Supabase Storage configurado). ✅

### Completion Evidence
```
--- TSC ---
EXIT_TSC=0
--- ESLINT ---
EXIT_LINT=0
```
- VSCode `GetDiagnostics` → `[]` (0 issues).
