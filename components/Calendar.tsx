"use client";

import { useMemo, useState } from "react";

export type CalendarEvent = {
  id: number;
  title: string;
  start: string;
  end: string;
  color: string;
};

type CalendarProps = {
  events: CalendarEvent[];
  onAddEvent: (event: {
    title: string;
    start: string;
    end: string;
    color: string;
  }) => void;
  onDeleteEvent: (id: number) => void;
};

const calendarWeekdays = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];

function formatDateLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const weekdays = ["su", "ma", "ti", "ke", "to", "pe", "la"];
  const day = weekdays[date.getDay()];
  const formatted = `${date.getDate()}.${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}.${date.getFullYear()}`;

  return `${day} ${formatted}`;
}

function getMonthGrid(monthDate: Date) {
  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1
  );
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      key: date.toISOString().slice(0, 10),
      date,
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Calendar({ events, onAddEvent, onDeleteEvent }: CalendarProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2026-09-12");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    start: "2026-09-12",
    end: "2026-09-12",
    color: "#7c6ad9",
  });

  const monthGrid = useMemo(() => getMonthGrid(new Date(2026, 8, 1)), []);

  const openComposer = (dateKey?: string) => {
    const nextDate = dateKey ?? selectedDate ?? "2026-09-12";
    setSelectedDate(nextDate);
    setDraft({
      title: "",
      start: nextDate,
      end: nextDate,
      color: "#7c6ad9",
    });
    setIsComposerOpen(true);
  };

  const getEventsForDay = (dateKey: string) =>
    events.filter((event) => {
      const currentDay = new Date(`${dateKey}T00:00:00`);
      const start = new Date(`${event.start}T00:00:00`);
      const end = new Date(`${event.end}T23:59:59`);

      return currentDay >= start && currentDay <= end;
    });

  const handleAddEvent = () => {
    const title = draft.title.trim();
    const start = draft.start || selectedDate;
    const end = draft.end || start;

    if (!title || !start || !end || start > end) {
      return;
    }

    onAddEvent({
      title,
      start,
      end,
      color: draft.color,
    });

    setIsComposerOpen(false);
    setDraft({
      title: "",
      start,
      end,
      color: draft.color,
    });
  };

  const selectedEvent =
    selectedEventId !== null
      ? events.find((event) => event.id === selectedEventId) ?? null
      : null;

  return (
    <section className="panel calendar-panel">
      <div className="panel-header">
        <h2>Kalenteri</h2>
        <button
          type="button"
          className="mini-button"
          onClick={() => openComposer(selectedDate)}
        >
          + Lisää
        </button>
      </div>

      <div className="month-header">
        <strong>Syyskuu 2026</strong>
      </div>

      <div className="weekday-row">
        {calendarWeekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="month-grid">
        {monthGrid.map((cell) => {
          const cellKey = toDateKey(cell.date);
          const dayEvents = getEventsForDay(cellKey);

          return (
            <button
              key={cell.key}
              type="button"
              className={`day-cell ${cell.inMonth ? "in-month" : "outside-month"}`}
              onClick={() => openComposer(cellKey)}
            >
              <span className="date-number">{cell.dayNumber}</span>

              <div className="day-events">
                {dayEvents.map((event) => (
                  <button
                    key={`${event.id}-${cellKey}`}
                    type="button"
                    className="day-event"
                    style={{ background: event.color }}
                    onClick={(eventClick) => {
                      eventClick.stopPropagation();
                      setSelectedEventId(event.id);
                    }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedEvent && (
        <div
          className="event-details-backdrop"
          onClick={() => setSelectedEventId(null)}
        >
          <div
            className="event-details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="event-details-header">
              <strong>{selectedEvent.title}</strong>
              <button
                type="button"
                className="close-button"
                aria-label="Sulje"
                onClick={() => setSelectedEventId(null)}
              >
                ×
              </button>
            </div>

            <p>
              {formatDateLabel(selectedEvent.start)} - {formatDateLabel(selectedEvent.end)}
            </p>

            <button
              type="button"
              className="delete-button"
              onClick={() => {
                onDeleteEvent(selectedEvent.id);
                setSelectedEventId(null);
              }}
              aria-label="Poista tapahtuma"
            >
              🗑
            </button>
          </div>
        </div>
      )}

      {isComposerOpen && (
        <div className="event-composer">
          <label>
            Nimi
            <input
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="esim. Mikko"
            />
          </label>

          <div className="event-composer-row">
            <label>
              Aloitus
              <input
                type="date"
                value={draft.start}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, start: event.target.value }))
                }
              />
            </label>

            <label>
              Loppu
              <input
                type="date"
                value={draft.end}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, end: event.target.value }))
                }
              />
            </label>

            <label>
              Väri
              <input
                type="color"
                value={draft.color}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, color: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="composer-actions">
            <button type="button" onClick={handleAddEvent}>
              Lisää tapahtuma
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsComposerOpen(false)}
            >
              Peruuta
            </button>
          </div>
        </div>
      )}

      <div className="agenda-card">
        <p className="agenda-label">Tänään</p>
        <h3>Keittiön siivous ja varusteiden järjestely</h3>
        <p>
          Varaa aika ennen 18:00, kun kaikki tavarat on luovutettu takaisin
          varastoon.
        </p>
      </div>
    </section>
  );
}
