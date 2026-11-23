import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../api';
import { Rich } from '../components/Rich';
import { IconCopy, IconDoc, IconFolder, IconScales, IconSend, IconSettings, IconSpark, IconStop, Logo } from '../components/Icons';
import { useT } from '../i18n';

type Props = {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  onSaveToCase: (message: ChatMessage) => void;
  onOpenSettings: () => void;
  countryName: string;
  model: string;
};

const quickKeys = [
  { title: 'chat.quick1Title', text: 'chat.quick1Text' },
  { title: 'chat.quick2Title', text: 'chat.quick2Text' },
  { title: 'chat.quick3Title', text: 'chat.quick3Text' },
  { title: 'chat.quick4Title', text: 'chat.quick4Text' }
] as const;

export default function ChatView({ messages, busy, onSend, onStop, onClear, onSaveToCase, onOpenSettings, countryName, model }: Props) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    const area = scrollRef.current;
    if (!area) return;
    const isDemo = messages.some((message) => message.id.startsWith('demo'));
    if (isDemo) {
      countRef.current = messages.length;
      area.scrollTo({ top: 0 });
      return;
    }
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
      return;
    }
    area.scrollTop = area.scrollHeight;
  }, [messages]);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft('');
    if (areaRef.current) areaRef.current.style.height = 'auto';
  };

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="badge"><IconSpark size={11} /> {t('chat.badge')}</span>
            <h2>
              {t('chat.heroA')} <span>{t('chat.heroAccent')}</span>
              {t('chat.heroB')}
            </h2>
            <p>{t('chat.heroText')}</p>
            <div className="quick-grid">
              {quickKeys.map((item) => (
                <button key={item.title} className="quick-card" onClick={() => onSend(t(item.text))}>
                  <b>{t(item.title)}</b>
                  <span>{t(item.text)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`msg ${message.role}`}>
              <div className="avatar">{message.role === 'assistant' ? <Logo size={20} /> : t('chat.me')}</div>
              <div style={{ minWidth: 0 }}>
                <div className="bubble">
                  {message.pending && !message.text ? (
                    <span className="dim">
                      {t('chat.thinking')} <span className="caret" />
                    </span>
                  ) : message.role === 'assistant' ? (
                    <Rich text={message.text} />
                  ) : (
                    message.text
                  )}
                  {message.pending && message.text && <span className="caret" />}

                  {message.sources && message.sources.length > 0 && (
                    <div className="sources">
                      <div className="sources-title">{t('chat.sources')}</div>
                      {message.sources.map((source, index) => (
                        <div className="source-row" key={source.id}>
                          <span className="source-idx">[{index + 1}]</span>
                          <span>
                            <b>{source.code}, {source.number}</b> — {source.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {message.error && (
                    <div className="hint-line" style={{ marginTop: 10 }}>
                      {t('chat.modelError', { error: message.error })}
                    </div>
                  )}
                </div>

                <div className="msg-foot">
                  {message.role === 'assistant' && message.mode && (
                    <span className={`badge ${message.mode === 'ai' ? 'ok' : 'warn'}`}>
                      {message.mode === 'ai' ? t('chat.modeAi') : t('chat.modeOffline')}
                    </span>
                  )}
                  <div className="msg-actions">
                    <button className="mini-btn" onClick={() => navigator.clipboard?.writeText(message.text)}>
                      <IconCopy size={13} /> {t('chat.copy')}
                    </button>
                    {message.role === 'assistant' && (
                      <button className="mini-btn" onClick={() => onSaveToCase(message)}>
                        <IconFolder size={13} /> {t('chat.saveToCase')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <div className="composer-box">
          <textarea
            ref={areaRef}
            value={draft}
            placeholder={t('chat.placeholder')}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <div className="composer-row">
            <button className="chip" onClick={onOpenSettings}>
              <IconSettings size={12} /> {model || t('app.noModel')}
            </button>
            <button className="chip" onClick={onOpenSettings}>
              <IconScales size={12} /> {countryName}
            </button>
            {messages.length > 0 && (
              <button className="mini-btn" onClick={onClear}>
                {t('chat.clear')}
              </button>
            )}
            <span className="spacer" />
            {busy ? (
              <button className="send-btn" onClick={onStop} title={t('chat.stop')}>
                <IconStop size={16} />
              </button>
            ) : (
              <button className="send-btn" onClick={submit} disabled={!draft.trim()} title={t('chat.send')}>
                <IconSend size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="hint-line" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <IconDoc size={12} />
          {t('chat.hint')}
        </div>
      </div>
    </div>
  );
}
