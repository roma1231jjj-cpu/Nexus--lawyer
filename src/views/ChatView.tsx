import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../api';
import { Rich } from '../components/Rich';
import { IconCopy, IconDoc, IconFolder, IconScales, IconSend, IconSettings, IconSpark, IconStop, Logo } from '../components/Icons';

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

const quick = [
  { title: 'Вернули товар с браком', text: 'Купил телефон, через 3 недели перестал заряжаться. Магазин отказывает в возврате, ссылается на «технически сложный товар». Что делать и на что ссылаться?' },
  { title: 'Задержали зарплату', text: 'Работодатель задерживает зарплату на 45 дней, договор официальный. Какие компенсации я могу требовать и куда жаловаться?' },
  { title: 'Аренда и депозит', text: 'Арендодатель не возвращает депозит после выезда, квартиру принял без замечаний. Как взыскать и какие нормы применить?' },
  { title: 'Сосед залил квартиру', text: 'Сосед сверху залил кухню, акт о заливе есть. Как правильно оформить требование о возмещении ремонта и морального вреда?' }
];

export default function ChatView({ messages, busy, onSend, onStop, onClear, onSaveToCase, onOpenSettings, countryName, model }: Props) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const isDemo = messages.some((message) => message.id.startsWith('demo'));
    if (isDemo) {
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
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
            <span className="badge"><IconSpark size={11} /> правовой помощник</span>
            <h2>
              Разберите ситуацию <span>по нормам</span>, а не по слухам
            </h2>
            <p>
              Опишите, что произошло: кто, когда, какие документы есть. Ответ придёт со ссылками на статьи из локальной базы
              {' '}— Конституция, ГК, ТК, УК, КоАП, процессуальные кодексы и законы 15 стран.
            </p>
            <div className="quick-grid">
              {quick.map((item) => (
                <button key={item.title} className="quick-card" onClick={() => onSend(item.text)}>
                  <b>{item.title}</b>
                  <span>{item.text.slice(0, 96)}…</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`msg ${message.role}`}>
              <div className="avatar">{message.role === 'assistant' ? <Logo size={20} /> : 'Я'}</div>
              <div style={{ minWidth: 0 }}>
                <div className="bubble">
                  {message.pending && !message.text ? (
                    <span className="dim">
                      Анализирую нормы… <span className="caret" />
                    </span>
                  ) : message.role === 'assistant' ? (
                    <Rich text={message.text} />
                  ) : (
                    message.text
                  )}
                  {message.pending && message.text && <span className="caret" />}

                  {message.sources && message.sources.length > 0 && (
                    <div className="sources">
                      <div className="sources-title">Нормы в ответе</div>
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
                      Модель недоступна: {message.error}. Ответ собран по базе.
                    </div>
                  )}
                </div>

                <div className="msg-foot">
                  {message.role === 'assistant' && message.mode && (
                    <span className={`badge ${message.mode === 'ai' ? 'ok' : 'warn'}`}>
                      {message.mode === 'ai' ? 'ИИ + база' : 'справочный режим'}
                    </span>
                  )}
                  <div className="msg-actions">
                    <button className="mini-btn" onClick={() => navigator.clipboard?.writeText(message.text)}>
                      <IconCopy size={13} /> копировать
                    </button>
                    {message.role === 'assistant' && (
                      <button className="mini-btn" onClick={() => onSaveToCase(message)}>
                        <IconFolder size={13} /> в дело
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="composer">
        <div className="composer-box">
          <textarea
            ref={areaRef}
            value={draft}
            placeholder="Опишите ситуацию: что случилось, какие документы есть, чего хотите добиться…"
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
              <IconSettings size={12} /> {model || 'модель'}
            </button>
            <button className="chip" onClick={onOpenSettings}>
              <IconScales size={12} /> {countryName}
            </button>
            {messages.length > 0 && (
              <button className="mini-btn" onClick={onClear}>
                очистить
              </button>
            )}
            <span className="spacer" />
            {busy ? (
              <button className="send-btn" onClick={onStop} title="Остановить">
                <IconStop size={16} />
              </button>
            ) : (
              <button className="send-btn" onClick={submit} disabled={!draft.trim()} title="Отправить">
                <IconSend size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="hint-line" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <IconDoc size={12} />
          Ответ справочный: сверяйте редакцию нормы и проверяйте сроки. Enter — отправить, Shift+Enter — перенос строки.
        </div>
      </div>
    </div>
  );
}
