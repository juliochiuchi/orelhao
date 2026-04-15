import { useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, MessageCircleMore, Sparkles } from "lucide-react"
import { useForm } from "react-hook-form"

import { CopyField } from "@/components/app/copy-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import * as roomsController from "@/controllers/rooms.controller"
import { cn } from "@/lib/utils"

const CreateSchema = z.object({
  name: z.string().trim().min(2, "Digite um nome com pelo menos 2 caracteres.").max(30),
  expireInHours: z.number().int().min(0).max(168),
})

const JoinSchema = z.object({
  name: z.string().trim().min(2, "Digite um nome com pelo menos 2 caracteres.").max(30),
  invite: z.string().trim().min(5, "Cole o código de acesso da sala."),
})

type CreateForm = z.infer<typeof CreateSchema>
type JoinForm = z.infer<typeof JoinSchema>

export function Home(props: {
  onConnected: (session: {
    roomCode: string
    myName: string
    key: CryptoKey
    invite?: string
  }) => void
}) {
  const [tab, setTab] = useState<"create" | "join">("create")
  const [invite, setInvite] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createForm = useForm<CreateForm, undefined, CreateForm>({
    resolver: zodResolver<CreateForm, undefined, CreateForm>(CreateSchema),
    defaultValues: { name: "", expireInHours: 24 },
  })
  const joinForm = useForm<JoinForm, undefined, JoinForm>({
    resolver: zodResolver<JoinForm, undefined, JoinForm>(JoinSchema),
    defaultValues: { name: "", invite: "" },
  })

  const subtitle = useMemo(
    () => "Chat em tempo real com criptografia ponta-a-ponta. Nada é salvo — só a sala.",
    [],
  )

  async function handleCreate(values: CreateForm) {
    setBusy(true)
    setError(null)
    try {
      const res = await roomsController.createRoom({
        expireInHours: values.expireInHours && values.expireInHours > 0 ? values.expireInHours : null,
      })
      setInvite(res.invite)
      props.onConnected({ roomCode: res.roomCode, myName: values.name, key: res.key, invite: res.invite })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar sala")
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(values: JoinForm) {
    setBusy(true)
    setError(null)
    try {
      const res = await roomsController.joinRoom({ invite: values.invite })
      if (!res.ok) {
        if (res.reason === "INVALID_INVITE")
          setError("Código de acesso inválido. Use o formato ROOMCODE.SECRET (ou cole exatamente como recebeu).")
        if (res.reason === "ROOM_NOT_FOUND") setError("Sala não encontrada.")
        if (res.reason === "ROOM_EXPIRED") setError("Essa sala expirou.")
        if (res.reason === "INVALID_SECRET") setError("Código de acesso inválido.")
        return
      }
      props.onConnected({ roomCode: res.roomCode, myName: values.name, key: res.key, invite: values.invite })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar na sala")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-white/10 bg-neutral-950/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MessageCircleMore className="size-5 text-sky-300" />
            Orelhão E2EE
          </CardTitle>
          <CardDescription className="text-neutral-300">{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-white/10 p-2">
                <KeyRound className="size-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Criptografia ponta-a-ponta (AES-GCM)</div>
                <div className="mt-1 text-sm text-neutral-300">
                  O servidor só retransmite mensagens cifradas via Broadcast. A chave fica no seu navegador.
                </div>
              </div>
            </div>
          </div>

          {invite ? (
            <div className="space-y-2">
              <Label>Código de acesso para compartilhar</Label>
              <CopyField value={invite} />
              <div className="text-xs text-neutral-400">
                Quem tiver esse código entra na sala. Não compartilhe em público.
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-neutral-950/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-fuchsia-300" />
            Começar
          </CardTitle>
          <CardDescription className="text-neutral-300">
            Crie uma sala efêmera ou entre com um código de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tab === "create" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => setTab("create")}
            >
              Criar sala
            </Button>
            <Button
              type="button"
              variant={tab === "join" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => setTab("join")}
            >
              Entrar
            </Button>
          </div>

          <Separator className="my-6 bg-white/10" />

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {tab === "create" ? (
            <form
              className="space-y-4"
              onSubmit={createForm.handleSubmit(v => handleCreate(v).catch(() => undefined))}
            >
              <div className="space-y-2">
                <Label>Como você quer ser chamado?</Label>
                <Input
                  placeholder="Ex: Júlio"
                  autoComplete="nickname"
                  {...createForm.register("name")}
                />
                {createForm.formState.errors.name ? (
                  <div className="text-xs text-red-200">{createForm.formState.errors.name.message}</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Expiração da sala (horas)</Label>
                <Input
                  type="number"
                  min={0}
                  max={168}
                  step={1}
                  {...createForm.register("expireInHours", { valueAsNumber: true })}
                />
                <div className="text-xs text-neutral-400">
                  Use 0 para não expirar. Sugestão: 24.
                </div>
              </div>

              <Button type="submit" className={cn("w-full", busy && "opacity-70")} disabled={busy}>
                Criar e entrar
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={joinForm.handleSubmit(v => handleJoin(v).catch(() => undefined))}
            >
              <div className="space-y-2">
                <Label>Como você quer ser chamado?</Label>
                <Input placeholder="Ex: Ana" autoComplete="nickname" {...joinForm.register("name")} />
                {joinForm.formState.errors.name ? (
                  <div className="text-xs text-red-200">{joinForm.formState.errors.name.message}</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Código de acesso</Label>
                <Input placeholder="EX: ABCD1234.XYZ..." {...joinForm.register("invite")} />
                {joinForm.formState.errors.invite ? (
                  <div className="text-xs text-red-200">{joinForm.formState.errors.invite.message}</div>
                ) : null}
              </div>

              <Button type="submit" className={cn("w-full", busy && "opacity-70")} disabled={busy}>
                Entrar na sala
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
