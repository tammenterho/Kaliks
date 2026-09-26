"use client";
import { useEffect, useMemo, useState } from "react";
import Calendar, { type CalendarEvent } from "@/components/Calendar";
import { supabase } from "@/lib/supabase";

type MissingItem = {
  id: number;
  text: string;
  done: boolean;
};

type Task = {
  id: number;
  title: string;
  due: string;
  priority: "Korkea" | "Keski" | "Matala";
  done: boolean;
};

type ChecklistRow = {
  id: number;
  title: string;
  done?: boolean | null;
};

type TaskRow = {
  id: number;
  title: string;
  due_date?: string | null;
  priority?: "Korkea" | "Keski" | "Matala" | null;
  done?: boolean | null;
};

type NoteRow = {
  id: number;
  content?: string | null;
};

const initialMissingItems: MissingItem[] = [
  { id: 1, text: "Lämmityslämmitin testattu", done: true },
  { id: 2, text: "Kesämökkiin puhdistuskausi valmis", done: false },
  { id: 3, text: "Kylpyhuoneen tiivistys tarkastettu", done: false },
  { id: 4, text: "Käynnistyslista sähköjärjestelmälle", done: true },
];

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Pyykinpesu ja kuivatus",
    due: "Su 09:00",
    priority: "Korkea",
    done: false,
  },
  {
    id: 2,
    title: "Rantasaunan siivous",
    due: "Ma 16:30",
    priority: "Keski",
    done: false,
  },
  {
    id: 3,
    title: "Puutarhan kastelu",
    due: "Ti 18:00",
    priority: "Matala",
    done: true,
  },
  {
    id: 4,
    title: "Uimapukujen tarkistus",
    due: "Ke 10:00",
    priority: "Keski",
    done: false,
  },
];

const initialNotes =
  "Muista tarkistaa mökin ovien lukot ennen lähtöä. Saatavilla olevan veden määrä on kohtuullinen, mutta varaa lisävesikannuja jos vieraat tulevat.";

const initialCalendarEvents: CalendarEvent[] = [
  {
    id: 1,
    title: "Paikalla",
    start: "2026-09-12",
    end: "2026-09-15",
    color: "#5a8f5b",
  },
  {
    id: 2,
    title: "Paikalla",
    start: "2026-09-17",
    end: "2026-09-19",
    color: "#5a7cc9",
  },
  {
    id: 3,
    title: "Työmaa",
    start: "2026-09-21",
    end: "2026-09-23",
    color: "#c67a4f",
  },
];

export default function Home() {
  const [missingItems, setMissingItems] =
    useState<MissingItem[]>(initialMissingItems);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [events, setEvents] = useState<CalendarEvent[]>(initialCalendarEvents);

  const [notes, setNotes] = useState(initialNotes);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);

  /*
   * Ladataan data Supabasesta.
   */
  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const [
          { data: checklistData, error: checklistError },
          { data: taskData, error: taskError },
          { data: noteData, error: noteError },
        ] = await Promise.all([
          supabase.from("checklist_items").select("*").order("id"),
          supabase.from("tasks").select("*").order("id"),
          supabase.from("notes").select("*").limit(1).maybeSingle(),
        ]);

        if (checklistError) {
          console.warn(
            "Checklistin lataaminen epäonnistui:",
            checklistError.message
          );
        }

        if (taskError) {
          console.warn(
            "Tehtävien lataaminen epäonnistui:",
            taskError.message
          );
        }

        if (noteError) {
          console.warn(
            "Muistion lataaminen epäonnistui:",
            noteError.message
          );
        }

        const checklistRows = (checklistData ?? []) as ChecklistRow[];
        if (!checklistError && checklistRows.length) {
          setMissingItems(
            checklistRows.map((item) => ({
              id: item.id,
              text: item.title,
              done: Boolean(item.done),
            }))
          );
        }

        const taskRows = (taskData ?? []) as TaskRow[];
        if (!taskError && taskRows.length) {
          setTasks(
            taskRows.map((item) => ({
              id: item.id,
              title: item.title,
              due: item.due_date ?? "Ei aikaa",
              priority: item.priority ?? "Keski",
              done: Boolean(item.done),
            }))
          );
        }

        const noteRow = (noteData ?? null) as NoteRow | null;
        if (!noteError && noteRow?.content) {
          setNotes(noteRow.content);
        }
      } catch (error) {
        console.warn("Supabase ei ole vielä valmis:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  /*
   * Kuinka monta checklist-kohtaa on valmis.
   */
  const completedCount = useMemo(
    () => missingItems.filter((item) => item.done).length,
    [missingItems]
  );

  /*
   * Kuinka monta tehtävää on valmis.
   */
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks]
  );

  const handleAddEvent = (input: {
    title: string;
    start: string;
    end: string;
    color: string;
  }) => {
    setEvents((current) => [
      ...current,
      {
        id: Date.now(),
        ...input,
      },
    ]);
  };

  const handleDeleteEvent = (id: number) => {
    setEvents((current) => current.filter((event) => event.id !== id));
  };

  /*
   * Checklistin checkbox.
   *
   * Päivittää ensin käyttöliittymän ja sen jälkeen
   * tallentaa muutoksen Supabaseen.
   */
  const toggleMissingItem = async (id: number) => {
    const item = missingItems.find((item) => item.id === id);

    if (!item || !supabase) {
      return;
    }

    const newDone = !item.done;

    setMissingItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: newDone } : item
      )
    );

    const { error } = await supabase
      .from("checklist_items")
      .update({ done: newDone })
      .eq("id", id);

    if (error) {
      console.error(
        "Checklistin tallennus epäonnistui:",
        error.message
      );

      setMissingItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, done: !newDone } : item
        )
      );
    }
  };

  /*
   * Tehtävän valmis / avoin.
   */
  const toggleTask = async (id: number) => {
    const task = tasks.find((task) => task.id === id);

    if (!task || !supabase) {
      return;
    }

    const newDone = !task.done;

    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: newDone } : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ done: newDone })
      .eq("id", id);

    if (error) {
      console.error(
        "Tehtävän tallennus epäonnistui:",
        error.message
      );

      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, done: !newDone } : task
        )
      );
    }
  };

  /*
   * Muistion tallennus.
   *
   * Tallennetaan vasta kun textarea menettää fokuksen.
   */
  const saveNotes = async () => {
    if (!supabase) {
      return;
    }

    setIsSavingNote(true);

    try {
      const { data: existingNote } = await supabase
        .from("notes")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existingNote) {
        const { error } = await supabase
          .from("notes")
          .update({
            content: notes,
          })
          .eq("id", existingNote.id);

        if (error) {
          console.error(
            "Muistion tallennus epäonnistui:",
            error.message
          );
        }
      } else {
        const { error } = await supabase
          .from("notes")
          .insert({
            content: notes,
          });

        if (error) {
          console.error(
            "Muistion luonti epäonnistui:",
            error.message
          );
        }
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-container">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Mökki & lomailu</p>
            <h1>Yläne</h1>
            <p className="hero-description">
              Kaikki mökin tärkeät asiat yhdessä paikassa.
            </p>
          </div>

          <div className="status-pill">
            {completedCount}/{missingItems.length} valmista
          </div>
        </header>

        <Calendar
          events={events}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
        />

        <section className="panel">
          <div className="panel-header">
            <h2>Mitä puuttuu</h2>
            <span className="counter">
              {completedCount}/{missingItems.length}
            </span>
          </div>

          <div className="checklist">
            {isLoading ? (
              <p className="empty-state">Ladataan listaa...</p>
            ) : (
              missingItems.map((item) => (
                <label
                  key={item.id}
                  className={`check-item ${item.done ? "checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleMissingItem(item.id)}
                  />
                  <span>{item.text}</span>
                </label>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Tehtävät</h2>
            <span className="counter">
              {completedTasks}/{tasks.length}
            </span>
          </div>

          <div className="task-list">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`task-item ${task.done ? "done" : ""}`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="task-main">
                  <span className={`priority ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <strong>{task.title}</strong>
                </div>

                <div className="task-meta">
                  <span>{task.due}</span>
                  <span>{task.done ? "Valmis" : "Avoin"}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel notes-panel">
          <div className="panel-header">
            <h2>Muita huomioita</h2>
            {isSavingNote && <span className="saving">Tallennetaan...</span>}
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={saveNotes}
            placeholder="Kirjoita huomioita, muistutuksia tai toiveita..."
            aria-label="Muita huomioita"
          />
        </section>
      </div>
    </main>
  );
}