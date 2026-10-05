# Debug: chat-image-receiver-stuck-loading

Status: **[OPEN]**
Data: 2026-10-05
SessionId: chat-image-receiver-stuck-loading
Symptoms: Receptor da imagem fica preso em "Carregando..." e nunca mostra a imagem. Expected: imagem aparece após download+decrypt.

---

## Passo 1 — Hipóteses (H1..H5)

- **H1 — StrictMode + startedRef race:** React 19 StrictMode roda effect twice. Primeira corrida seta `startedRef=true`, cleanup seta `cancelled=true`; segunda corrida vê `startedRef=true` e retorna cedo sem disparar o download. Resultado: loading para sempre. Muito provável.
- **H2 — Storage download retorna `{data: null, error: null}` e cai throw "Sem dados", mas o catch não seta estado porque `cancelled=true` no cleanup.**
- **H3 — `decryptBlob` lança (ex: chave/iv/mimetype incompatíveis) e catch falha por cancelled antes de setImageState.**
- **H4 — props.roomKey ou storageBucket estão errados/undefined em MessageBubble no receiver.**
- **H5 — Promise.then assíncrono do download cai mas `objectUrl` é undefined pois storage rejeitou sem erro.**

---

## Passo 2 — Instrumentação planejada

Adicionar network debug logs (via Debug Server) em:
- `message-bubble.tsx`: ponto de entrada do effect, startedRef antes/depois, valores iniciais de props, cada branch de resolução/rejeição.
- `resolveImageObjectUrl`: parâmetros recebidos, resultado de storage.download (data bytes length / error), resultado de decryptBlob (blob size).

Arquivos a instrumentar: 1 (message-bubble.tsx).

---

## Passo 3 — Reprodução & Coleta de Evidência

[aguardando logs]

---

## Passo 4 — Análise

[aguardando evidência]

---

## Passo 5 — Fix

[aguardando análise]

---

## Passo 6 — Verificação pós-fix e comparação pre/post

[aguardando execução]

---

## Passo 7 — Confirmação do usuário e Cleanup

[aguardando]
