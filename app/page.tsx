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

type EventRow = {
  id: number;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  color?: string | null;
};

export default function Home() {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [notes, setNotes] = useState("");
  const [newMissingItem, setNewMissingItem] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    const hasSessionCookie = document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("ylane_session="));

    if (!hasSessionCookie) {
      window.location.href = "/login";
      return;
    }

    setIsAuthenticated(true);
  }, []);

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
          { data: eventData, error: eventError },
        ] = await Promise.all([
          supabase.from("checklist_items").select("*").order("id"),
          supabase.from("tasks").select("*").order("id"),
          supabase.from("notes").select("*").limit(1).maybeSingle(),
          supabase.from("events").select("*").order("id"),
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

        if (eventError) {
          console.warn(
            "Tapahtumien lataaminen epäonnistui:",
            eventError.message
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

        const eventRows = (eventData ?? []) as EventRow[];
        if (!eventError && eventRows.length) {
          setEvents(
            eventRows.map((event) => ({
              id: event.id,
              title: event.title,
              start: event.start_date ?? "",
              end: event.end_date ?? "",
              color: event.color ?? "#7c6ad9",
            }))
          );
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

  const handleAddEvent = async (input: {
    title: string;
    start: string;
    end: string;
    color: string;
  }) => {
    const optimisticId = Date.now();

    setEvents((current) => [
      ...current,
      {
        id: optimisticId,
        ...input,
      },
    ]);

    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("events").insert({
      title: input.title,
      start_date: input.start,
      end_date: input.end,
      color: input.color,
    });

    if (error) {
      console.error("Tapahtuman lisäys epäonnistui:", error.message);
      setEvents((current) => current.filter((event) => event.id !== optimisticId));
    }
  };

  const handleDeleteEvent = async (id: number) => {
    const target = events.find((event) => event.id === id);

    if (!target) {
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== id));

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Tapahtuman poisto epäonnistui:", error.message);
      setEvents((current) => [target, ...current]);
    }
  };

  const handleAddTask = async () => {
    const text = newTaskText.trim();

    if (!text) {
      return;
    }

    const taskToAdd: Task = {
      id: Date.now(),
      title: text,
      due: "Avoin",
      priority: "Keski",
      done: false,
    };

    setTasks((current) => [taskToAdd, ...current]);
    setNewTaskText("");

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .insert({
        title: text,
        due_date: null,
        priority: "Keski",
        done: false,
      });

    if (error) {
      console.error("Tehtävän lisäys epäonnistui:", error.message);
      setTasks((current) => current.filter((item) => item.id !== taskToAdd.id));
    }
  };

  const handleAddMissingItem = async () => {
    const text = newMissingItem.trim();

    if (!text) {
      return;
    }

    const itemToAdd: MissingItem = {
      id: Date.now(),
      text,
      done: false,
    };

    setMissingItems((current) => [...current, itemToAdd]);
    setNewMissingItem("");

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("checklist_items")
      .insert({ title: text, done: false });

    if (error) {
      console.error("Checklistin lisäys epäonnistui:", error.message);
      setMissingItems((current) => current.filter((item) => item.id !== itemToAdd.id));
    }
  };

  /*
   * Checklistin checkbox.
   *
   * Merkinnän tarkistaminen poistaa sen listasta kokonaan.
   */
  const toggleMissingItem = async (id: number) => {
    const item = missingItems.find((item) => item.id === id);

    if (!item) {
      return;
    }

    setMissingItems((current) => current.filter((item) => item.id !== id));

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Checklistin poisto epäonnistui:", error.message);
      setMissingItems((current) => [item, ...current]);
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

  const deleteTask = async (id: number) => {
    const target = tasks.find((task) => task.id === id);

    if (!target) {
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedTaskId(null);

    if (!supabase) {
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Tehtävän poisto epäonnistui:", error.message);
      setTasks((current) => [target, ...current]);
    }
  };

  /*
   * Muistion tallennus.
   *
   * Tallennetaan vasta kun textarea menettää fokuksen.
   */
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const saveNotes = async (nextNotes = notes) => {
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
            content: nextNotes,
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
            content: nextNotes,
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

  const noteEntries = notes
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const handleAddNote = async () => {
    const text = newNoteText.trim();

    if (!text) {
      return;
    }

    const nextNotes = [...noteEntries, text].join("\n");
    setNotes(nextNotes);
    setNewNoteText("");

    await saveNotes(nextNotes);
  };

  const handleRemoveNote = async (index: number) => {
    const nextEntries = noteEntries.filter((_, itemIndex) => itemIndex !== index);
    const nextNotes = nextEntries.join("\n");
    setNotes(nextNotes);

    await saveNotes(nextNotes);
  };

  const sortedTasks = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="page-shell px-5 py-12 md:px-6">
      <div className="page-container mx-auto flex max-w-6xl flex-col gap-6">
        <header className="hero-card flex items-center justify-between gap-4 rounded-[28px] p-5 md:p-7">
          <h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">Yläne</h1>

          <button
            type="button"
            className="mini-button inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold"
            onClick={handleLogout}
          >
            Kirjaudu ulos
          </button>
        </header>

        <Calendar
          events={events}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
        />

        <section className="panel checklist-panel">
          <div className="panel-header checklist-header">
            <h2>Mitä puuttuu</h2>
          </div>

          <div className="checklist-add">
            <input
              type="text"
              value={newMissingItem}
              onChange={(event) => setNewMissingItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAddMissingItem();
                }
              }}
              placeholder="Esim. kahvi, pyyhkeet, säilytyslaatikko..."
              aria-label="Lisää puuttuva asia"
            />
            <button type="button" onClick={() => void handleAddMissingItem()}>
              Lisää
            </button>
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
                    onChange={() => void toggleMissingItem(item.id)}
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

          <div className="task-add">
            <input
              type="text"
              value={newTaskText}
              onChange={(event) => setNewTaskText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAddTask();
                }
              }}
              placeholder="Esim. kerää ruuat autoon..."
              aria-label="Lisää tehtävä"
            />
            <button type="button" onClick={() => void handleAddTask()}>
              Lisää
            </button>
          </div>

          <div className="task-list">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                className={`task-item ${task.done ? "done" : ""}`}
                onClick={() => setSelectedTaskId(task.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedTaskId(task.id);
                  }
                }}
              >
                <div className="task-main">
                  <strong>{task.title}</strong>
                </div>

                <div className="task-actions" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className={`status-dot-button ${task.done ? "done" : "open"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleTask(task.id);
                    }}
                    aria-label={task.done ? "Merkitse avoimeksi" : "Merkitse valmiiksi"}
                    title={task.done ? "Valmis" : "Avoin"}
                  >
                    <span className={task.done ? "task-done-dot" : "task-open-dot"} />
                  </button>
                  <button
                    type="button"
                    className="list-delete-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteTask(task.id);
                    }}
                    aria-label={`Poista tehtävä ${task.title}`}
                  >
                    Poista
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedTaskId !== null && (() => {
          const task = tasks.find((item) => item.id === selectedTaskId);

          if (!task) {
            return null;
          }

          return (
            <div className="task-modal-backdrop" onClick={() => setSelectedTaskId(null)}>
              <div className="task-modal" onClick={(event) => event.stopPropagation()}>
                <div className="task-modal-header">
                  <strong>{task.title}</strong>
                  <button
                    type="button"
                    className="close-button"
                    aria-label="Sulje"
                    onClick={() => setSelectedTaskId(null)}
                  >
                    ×
                  </button>
                </div>

                <p className="task-modal-preview">
                  {task.title.length > 180 ? `${task.title.slice(0, 180)}...` : task.title}
                </p>

                <label className="task-modal-check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => {
                      void toggleTask(task.id);
                    }}
                  />
                  <span>{task.done ? "Merkitse avoimeksi" : "Merkitse valmiiksi"}</span>
                </label>

                <div className="task-modal-actions">
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => void deleteTask(task.id)}
                  >
                    🗑 Poista
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <section className="panel notes-panel">
          <div className="panel-header">
            <h2>Muita huomioita</h2>
            {isSavingNote && <span className="saving">Tallennetaan...</span>}
          </div>

          <div className="notes-add">
            <textarea
              value={newNoteText}
              rows={3}
              onChange={(event) => setNewNoteText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleAddNote();
                }
              }}
              placeholder="Lisää huomio..."
              aria-label="Lisää huomio"
            />
            <button type="button" onClick={() => void handleAddNote()}>
              Lisää
            </button>
          </div>

          <div className="notes-list">
            {noteEntries.length === 0 ? (
              <p className="empty-state">Ei huomioita.</p>
            ) : (
              noteEntries.map((note, index) => (
                <div key={`${note}-${index}`} className="note-item">
                  <span>{note}</span>
                  <button
                    type="button"
                    className="list-delete-button"
                    onClick={() => void handleRemoveNote(index)}
                    aria-label={`Poista huomio ${note}`}
                  >
                    Poista
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}