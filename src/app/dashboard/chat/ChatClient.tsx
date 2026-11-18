'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface ChatMember {
  id: string
  name: string
}

export interface ChatMessage {
  id: string
  userId: string
  body: string
  createdAt: string
}

const ACCENT = '#c47c5a'

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? time : `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${time}`
}

export default function ChatClient({ orgId, userId, members, initialMessages }: {
  orgId: string
  userId: string
  members: ChatMember[]
  initialMessages: ChatMessage[]
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const supabaseRef = useRef(createClient())
  const bottomRef = useRef<HTMLDivElement>(null)
  const nameById = useMemo(() => new Map(members.map(m => [m.id, m.name])), [members])

  const addMessage = (m: ChatMessage) => {
    setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, m])
  }

  // Marca de lectura: al entrar al chat, y de nuevo cada vez que llega un
  // mensaje mientras la pantalla está abierta — así el badge del header no
  // queda marcando mensajes que la persona ya está viendo en vivo.
  const markRead = () => {
    supabaseRef.current.from('team_chat_reads')
      .upsert({ org_id: orgId, user_id: userId, last_read_at: new Date().toISOString() })
      .then(() => {})
  }

  useEffect(() => {
    markRead()
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`team_chat:${orgId}`)
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        addMessage(payload as ChatMessage)
        markRead()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const handleSend = async () => {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setBody('')
    const { data, error } = await supabaseRef.current
      .from('team_messages')
      .insert({ org_id: orgId, user_id: userId, body: text })
      .select('id, user_id, body, created_at')
      .single()
    setSending(false)
    if (error || !data) { setBody(text); return }
    const msg: ChatMessage = { id: data.id, userId: data.user_id, body: data.body, createdAt: data.created_at }
    addMessage(msg)
    supabaseRef.current.channel(`team_chat:${orgId}`).send({ type: 'broadcast', event: 'new_message', payload: msg })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col flex-grow min-h-0 border-[0.5px] border-border rounded-xl bg-bg-primary overflow-hidden">
      <div className="flex-grow min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          <p className="text-[14px] text-text-secondary text-center py-12">
            Todavía no hay mensajes. Escribí el primero.
          </p>
        ) : messages.map(m => {
          const mine = m.userId === userId
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="text-[11px] text-text-tertiary mb-1 px-1">
                {mine ? 'Vos' : (nameById.get(m.userId) ?? 'Integrante')} · {formatTimestamp(m.createdAt)}
              </span>
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2 text-[14px] whitespace-pre-wrap break-words ${mine ? 'text-white' : 'bg-bg-secondary text-text-primary'}`}
                style={mine ? { backgroundColor: ACCENT } : undefined}
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t-[0.5px] border-border p-3 flex gap-2 items-end">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje para el equipo..."
          rows={1}
          className="flex-grow resize-none bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent max-h-32"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="shrink-0 px-4 py-2.5 rounded-lg text-[14px] font-medium text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: ACCENT }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
