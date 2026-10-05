# Especificação: Compartilhamento de Imagens no Chat (E2EE)

## Problema
Atualmente o chat do Orelhão suporta apenas mensagens de texto. Usuários desejam enviar imagens para enriquecer a comunicação, mantendo a mesma garantia E2EE (criptografia ponta-a-ponta AES-GCM) já existente no app.

## Usuários
- Qualquer participante de sala de chat que queira enviar ou visualizar imagens.

## Objetivos
1. Permitir que o usuário selecione um arquivo de imagem (PNG, JPG, etc.) e o envie na conversa.
2. Imagens devem ser criptografadas no cliente ANTES de serem enviadas (mesma chave AES-GCM da sala).
3. Destinatários devem poder visualizar a imagem descriptografada diretamente na bolha da mensagem.
4. Preservar a arquitetura existente: Supabase Realtime para broadcast + Supabase Storage para armazenamento de blobs criptografados.
5. Manter compatibilidade com mensagens de texto existentes.

## Não-objetivos
- Não implementar envio de vídeos, arquivos genéricos ou áudio (fora do escopo desta feature).
- Não implementar galeria de imagens ou histórico persistente de mensagens em banco (o Realtime continua em memória por sessão).
- Não alterar a forma de criação/entrada em salas.
- Não implementar recorte/edição de imagens no cliente.

## Requisitos Funcionais
### RF1 — Seleção de Arquivo
- O usuário deve poder acionar um seletor de arquivo nativo (input type=file) com filtro para imagens (`accept="image/*"`) através de um botão na barra de input do chat.
- Deve suportar no mínimo: JPEG, PNG, GIF, WEBP.
- Limite máximo de tamanho por imagem: 5 MB. Arquivos acima devem ser rejeitados com feedback claro ao usuário.

### RF2 — Criptografia e Upload
- Antes do upload, os bytes brutos da imagem devem ser criptografados com a mesma `CryptoKey` AES-GCM da sala (reutilizar `encrypt()` existente).
- O upload é feito para um bucket do Supabase Storage. O path do objeto deve seguir o padrão:
  `{roomCode}/{randomId}.enc`
  onde `randomId` é um ID aleatório (reutilizar `randomId()` existente).
- O IV gerado pela criptografia deve ser armazenado **na mensagem**, não no Storage, para garantir que o downloader só consiga descriptografar se tiver a chave e o IV correto.

### RF3 — Broadcast da Mensagem de Imagem
- Após upload bem-sucedido, uma mensagem de tipo `image` é enviada pelo canal Realtime (evento `message`, assim como texto).
- A mensagem deve carregar: `storageKey` (path completo no bucket), `iv`, `mimeType` original, `size` em bytes (original, não criptografado) e, opcionalmente, um `fileName` amigável.
- Todo o payload JSON da mensagem continua sendo criptografado por `encrypt()` antes do broadcast (camada padrão atual).

### RF4 — Recepção e Exibição
- Ao receber uma mensagem de tipo `image`:
  1. Baixar o blob criptografado do Storage via `supabase.storage.from(bucket).download(storageKey)`.
  2. Descriptografar os bytes usando a chave da sala e o `iv` da mensagem.
  3. Criar um `URL.createObjectURL(blob)` com os bytes descriptografados e o `mimeType` original.
  4. Renderizar a imagem na bolha, respeitando `mine` (própria vs. recebida).
- Enquanto a imagem baixa/descriptografa, exibir um estado de loading (spinner).
- Em caso de erro de download ou descriptografia, exibir um estado de erro amigável na bolha.
- Clicar na imagem deve abri-la em visualização ampliada (lightbox simples).

### RF5 — Compatibilidade com Mensagens de Texto
- A estrutura de `ChatPlainMessage` deve ser remodelada para uma união discriminada (discriminated union) com campo `type: "text" | "image"`.
- Mensagens antigas (que só tem `text`) devem continuar sendo renderizadas sem quebra.
- A validação no receptor deve discriminar por `type` antes de validar campos específicos.

### RF6 — Otimismo (Local Render)
- Ao enviar uma imagem, a bolha deve aparecer imediatamente (exibição otimista) usando um `URL.createObjectURL` do arquivo local ainda não enviado.
- Após confirmação do broadcast, a mensagem permanece (deduplicação por `id` via `seenRef`).
- Estado de progresso: durante upload, mostrar um indicador visual (ex: barra de progresso ou spinner) na bolha otimista.

## Requisitos Não-Funcionais
### RNF1 — E2EE Mantido
- Nenhuma imagem em claro deve sair do cliente. O objeto no Storage é sempre bytes criptografados (`.enc`).
- O IV por imagem é único e nunca reutilizado (função `encrypt()` já garante IV aleatório por chamada).

### RNF2 — Performance
- Imagens grandes (acima de ~2MB) devem ser opcionalmente comprimidas no cliente via Canvas antes da criptografia/upload, para reduzir tamanho e tempo de envio. Configurar para max ~1920px na maior dimensão, qualidade JPEG ~0.85 se aplicável.
- Download e descriptografia devem ocorrer de forma lazy (quando a mensagem entra em viewport ou imediatamente — começar por imediato por simplicidade).

### RNF3 — UX / UI
- Usar componentes Shadcn UI existentes (Button, etc.) + ícones Lucide (`ImagePlus`, `Loader2`, `AlertCircle`, `ZoomIn`).
- Estilo consistente com as bolhas existentes (cores de fundo próprias/recebidas, cantos arredondados, remetente + horário).
- Na barra de input, botão de anexar imagem ao lado esquerdo do Input, botão Enviar à direita.
- Layout Apple-like: limpo, simétrico, hierarquia clara. Imagens com borda arredondada interna, `object-cover` no preview em miniatura e tamanho controlado (max 280px largura na bolha).

### RNF4 — Tratamento de Erros
- Upload falhou: remover mensagem otimista / marcar como erro com opção de reenvio (começar simples: exibir erro).
- Download/decrypt falhou: bolha exibe "Falha ao carregar imagem" sem quebrar o restante da conversa.
- Tipos inválidos ou arquivo muito grande: toast / texto inline explicando o motivo.

## Restrições e Dependências
- **Supabase Storage**: Necessita de um bucket chamado `chat-images` criado previamente pelo usuário no painel do Supabase.
- **RLS do Storage**: Políticas de segurança para permitir `INSERT` e `SELECT` de objetos no bucket `chat-images`. Como o app não tem autenticação, as políticas devem permitir operações públicas (o conteúdo já é criptografado de qualquer forma).
- Nenhuma nova dependência npm é necessária; usar apenas APIs nativas do navegador (FileReader, Canvas, Blob, URL).

## Premissas
1. O usuário irá configurar manualmente o bucket `chat-images` e suas políticas RLS no painel do Supabase.
2. Navegadores modernos com suporte a `Blob`, `URL.createObjectURL`, Canvas 2D e `File`.
3. Mensagens transitam apenas em Realtime; sem persistência em tabela `messages` (como já é hoje).

## Perguntas Abertas
1. **Comprimir imagens automaticamente?** Sim, será feito cliente-side para reduzir uso de banda e Storage (ver RNF2).
2. **Lightbox/zoom?** Sim, simples (ver RF4).
3. **Arraste-e-solte (drag & drop)?** MVP não precisa; fica como melhoria futura.

---

## Critérios de Aceitação
### rule AC1 — Seleção e envio de imagem ≤5MB funciona
- Dado um usuário conectado a uma sala, quando ele clica no botão de anexar imagem e seleciona um JPG ≤5MB, então a imagem é criptografada, enviada para o Storage e broadcastada, aparecendo como bolha para ambos os lados.

### rule AC2 — Arquivo >5MB é rejeitado
- Quando o usuário seleciona uma imagem >5MB, então nenhum upload ocorre e um aviso claro (inline/toast) informa o limite.

### rule AC3 — Imagem descriptografada corretamente no receptor
- Quando a mensagem de imagem chega ao receptor, após download + decrypt, a imagem renderizada é idêntica (ou comprimida conforme RNF2) à enviada, e não há erros no console.

### rule AC4 — Bolha de imagem mantém estilo mine/outro
- Mensagens próprias aparecem alinhadas à direita com fundo `bg-neutral-50`; recebidas à esquerda com `bg-neutral-900/70`, idêntico ao texto. Ambas exibem nome + horário no topo.

### rule AC5 — Mensagens de texto continuam funcionando
- Envio e recebimento de texto após a mudança não apresenta regressão; validação, otimismo e rendering inalterados.

### rule AC6 — Nenhum byte em claro no Storage
- Ao inspecionar o objeto no bucket `chat-images`, os bytes são criptografados (não abrem como imagem).

### rubric AC7 — Qualidade visual e UX (escala 0-2, limite 1)
- `2`: Interação fluida, loading states presentes, lightbox funcional, sem layouts quebrados em telas de mobile e desktop.
- `1`: Funcional, mas ausência de loading em algum estado ou pequenos problemas de alinhamento visual.
- `0`: UI quebrada, imagens com tamanhos absurdos, sem feedback de progresso.
