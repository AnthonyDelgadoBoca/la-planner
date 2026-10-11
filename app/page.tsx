'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Heart,
  Link as LinkIcon,
  LockKeyhole,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
  Pencil,
  Plane,
} from 'lucide-react';

type Plan = {
  id: string;
  date: string;
  title: string;
  description: string | null;
  time: string | null;
  location: string | null;
  link: string | null;
  image_url: string | null;
  notes: string | null;
  created_at?: string;
};

type Draft = {
  date: string;
  title: string;
  description: string;
  time: string;
  location: string;
  link: string;
  image_url: string;
  notes: string;
};

const START = '2026-10-23';
const END = '2026-11-01';

const emptyDraft = (date: string): Draft => ({
  date,
  title: '',
  description: '',
  time: '',
  location: '',
  link: '',
  image_url: '',
  notes: '',
});

function dateRange() {
  const days: {
    iso: string;
    day: string;
    weekday: string;
    month: string;
  }[] = [];

  const current = new Date(`${START}T12:00:00`);
  const end = new Date(`${END}T12:00:00`);

  while (current <= end) {
    days.push({
      iso: current.toISOString().slice(0, 10),
      day: String(current.getDate()).padStart(2, '0'),
      weekday: current.toLocaleDateString('en-US', {
        weekday: 'long',
      }),
      month: current.toLocaleDateString('en-US', {
        month: 'long',
      }),
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

const days = dateRange();

/**
 * Converts a photo selected from the camera roll or computer
 * into a compressed image string for the existing image_url field.
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error('Could not open this photo. Try a JPG or PNG.')
      );
    };

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let maxDimension = 1000;
      let quality = 0.72;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const scale = Math.min(
          1,
          maxDimension /
            Math.max(image.naturalWidth, image.naturalHeight)
        );

        const canvas = document.createElement('canvas');

        canvas.width = Math.max(
          1,
          Math.round(image.naturalWidth * scale)
        );

        canvas.height = Math.max(
          1,
          Math.round(image.naturalHeight * scale)
        );

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Could not process this photo.'));
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Keep the image small enough for our existing API.
        if (dataUrl.length <= 1_400_000) {
          resolve(dataUrl);
          return;
        }

        if (quality > 0.42) {
          quality = Math.max(0.42, quality - 0.1);
        } else {
          maxDimension = Math.round(maxDimension * 0.75);
        }
      }

      reject(
        new Error(
          'This photo is too large to save. Please choose a smaller photo.'
        )
      );
    };

    image.src = objectUrl;
  });
}

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(START));
  const [saving, setSaving] = useState(false);
  const [expandedDates, setExpandedDates] = useState<string[]>([START]);
  const [search, setSearch] = useState('');
  const [installHelp, setInstallHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  const loadPlans = useCallback(async () => {
    try {
      const response = await fetch('/api/plans', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load your plans.');
      }

      setPlans(data.plans ?? []);
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load plans.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, [loadPlans]);

  const count = plans.length;
  const heroImages = useMemo(
    () =>
      Array.from(
        new Set(
          plans
            .map((plan) => plan.image_url)
            .filter((image): image is string => Boolean(image))
        )
      ),
    [plans]
  );

  const heroImageCount = heroImages.length;

  useEffect(() => {
    if (heroImageCount < 2) {
      setHeroImageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % heroImageCount);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroImageCount]);

  const activeHeroImage =
    heroImageCount > 0
      ? heroImages[heroImageIndex % heroImageCount]
      : null;

    const visiblePlans = useMemo(
      () =>
        plans.filter((plan) =>
          `${plan.title} ${plan.description ?? ''} ${
            plan.location ?? ''
          }`
            .toLowerCase()
            .includes(search.toLowerCase())
        ),
      [plans, search]
    );

  function openNew(date: string) {
    setEditingId(null);
    setDraft(emptyDraft(date));
    setEditorOpen(true);
    setMessage('');
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id);

    setDraft({
      date: plan.date,
      title: plan.title,
      description: plan.description ?? '',
      time: plan.time ?? '',
      location: plan.location ?? '',
      link: plan.link ?? '',
      image_url: plan.image_url ?? '',
      notes: plan.notes ?? '',
    });

    setEditorOpen(true);
    setMessage('');
  }

  function change<K extends keyof Draft>(
    key: K,
    value: Draft[K]
  ) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function savePlan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(
        editingId ? `/api/plans/${editingId}` : '/api/plans',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(draft),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not save this plan.'
        );
      }

      setEditorOpen(false);
      await loadPlans();

      setExpandedDates((previous) =>
        previous.includes(draft.date)
          ? previous
          : [...previous, draft.date]
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save this plan.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: string) {
    if (
      !window.confirm(
        'Remove this plan from your little itinerary?'
      )
    ) {
      return;
    }

    const response = await fetch(`/api/plans/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || 'Could not delete plan.');
      return;
    }

    await loadPlans();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function toggleDate(date: string) {
    setExpandedDates((previous) =>
      previous.includes(date)
        ? previous.filter((item) => item !== date)
        : [...previous, date]
    );
  }

  async function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    // Allow selecting the same file again later.
    input.value = '';

    if (!file) return;

    setMessage('');

    try {
      const imageData = await compressImage(file);
      change('image_url', imageData);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load this photo.'
      );
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a href="#top" className="brand">
          <span className="brand-mark">
            <Heart size={18} fill="currentColor" />
          </span>
          <span>
            our little <em>LA guide</em>
          </span>
        </a>

        <div className="top-actions">
          <span className="private-tag">
            <LockKeyhole size={12} /> just us
          </span>

          <button
            className="icon-button"
            aria-label="Lock planner"
            onClick={logout}
          >
            <LockKeyhole size={17} />
          </button>
        </div>
      </header>

      <section id="top" className="hero-panel">
        <div
          className="hero-image"
          role="img"
          aria-label="Photos from our Los Angeles itinerary"
          style={
            activeHeroImage
              ? {
                  backgroundImage: `linear-gradient(0deg, rgba(36,27,25,.35), transparent 70%), url("${activeHeroImage.replace(/"/g, '%22')}")`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                }
              : undefined
          }
        >
          <div className="hero-image-top">
            <span>THE LITTLE TRIP PLANNER</span>
            <Sparkles size={17} />
          </div>

          <div className="hero-image-bottom">
            <span>
              somewhere happy, <em>with you</em>
            </span>
            <span className="hero-number">01 — 10</span>
          </div>
        </div>

        <div className="hero-content">
          <p className="eyebrow">
            <Plane size={13} /> OUR UPCOMING ADVENTURE
          </p>

          <h1>
            Los Angeles,
            <br />
            <em>this halloween</em>
          </h1>

          <p className="hero-intro">
            A flexible little plan for good places, cute stuff,
            and having fun
          </p>

          <div className="trip-dates">
            <CalendarDays size={17} />
            <span>
              OCT 23 <i>—</i> NOV 1, 2026
            </span>
            <span className="trip-dot">♡</span>
          </div>

          <div className="hero-stats">
            <div>
              <strong>{days.length}</strong>
              <span>days together-ish</span>
            </div>

            <div>
              <strong>{count}</strong>
              <span>little plans saved</span>
            </div>

            <button
              className="primary-button add-top"
              onClick={() => openNew(START)}
            >
              <Plus size={16} /> Add a plan
            </button>
          </div>
        </div>
      </section>

      <section className="intro-strip">
        <div>
          <p className="eyebrow">A NOTE TO US</p>
          <p>
            Nothing has to be perfectly planned. This is just a
            place to save the things we want to do, places we want
            to see, and ideas we don&apos;t want to forget.
          </p>
        </div>
        <span className="scribble-heart">♡</span>
      </section>

      <section className="itinerary-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">THE ITINERARY</p>
            <h2>
              Our days, <em>our way.</em>
            </h2>
            <p className="section-sub">
              Tap a date to open it. Add plans whenever inspiration
              strikes.
            </p>
          </div>

          <button
            className="outline-button"
            onClick={() => setInstallHelp(true)}
          >
            <Sparkles size={15} /> Add to Home Screen
          </button>
        </div>

        <div className="search-wrap">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a plan, place, or idea…"
            aria-label="Search plans"
          />
          <span>
            {visiblePlans.length}{' '}
            {visiblePlans.length === 1 ? 'plan' : 'plans'}
          </span>
        </div>

        {message && (
          <div className="notice" role="alert">
            {message}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loader-heart">♡</div>
            <p>Gathering our little plans…</p>
          </div>
        ) : (
          <div className="date-list">
            {days.map((day, index) => {
              const datePlans = visiblePlans.filter(
                (plan) => plan.date === day.iso
              );

              const expanded =
                expandedDates.includes(day.iso) || search.length > 0;

              return (
                <article
                  className={`date-row ${
                    expanded ? 'is-open' : ''
                  }`}
                  key={day.iso}
                >
                  <button
                    className="date-heading"
                    onClick={() => toggleDate(day.iso)}
                    aria-expanded={expanded}
                  >
                    <div className="date-badge">
                      <span>
                        {day.month.slice(0, 3).toUpperCase()}
                      </span>
                      <strong>{day.day}</strong>
                    </div>

                    <div className="date-meta">
                      <span className="date-weekday">
                        {day.weekday}
                        {index === 0
                          ? ' · ARRIVAL WINDOW'
                          : index === days.length - 1
                            ? ' · LAST DAY'
                            : ''}
                      </span>

                      <strong>
                        {datePlans.length
                          ? `${datePlans.length} ${
                              datePlans.length === 1
                                ? 'plan'
                                : 'plans'
                            } saved`
                          : 'A day full of possibilities'}
                      </strong>
                    </div>

                    <span className="date-heart">
                      {datePlans.length ? '♥' : '♡'}
                    </span>
                    <ChevronDown className="chevron" size={18} />
                  </button>

                  {expanded && (
                    <div className="day-content">
                      {datePlans.length === 0 ? (
                        <div className="empty-day">
                          <span className="empty-flower">✳</span>
                          <div>
                            <strong>
                              Nothing on the agenda yet.
                            </strong>
                            <p>
                              Keep this day open, or add a little
                              idea.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="plan-grid">
                          {datePlans.map((plan) => (
                            <article
                              className="plan-card"
                              key={plan.id}
                            >
                              <div
                                className="plan-photo"
                                style={
                                  plan.image_url
                                    ? {
                                        backgroundImage: `linear-gradient(0deg, rgba(36,27,25,.35), transparent 70%), url("${plan.image_url.replace(/"/g, '%22')}")`,
                                      }
                                    : undefined
                                }
                              >
                                {!plan.image_url && (
                                  <div className="photo-placeholder">
                                    <Camera size={28} />
                                    <span>
                                      A little memory
                                      <br />
                                      waiting to happen
                                    </span>
                                  </div>
                                )}

                                {plan.time && (
                                  <span className="time-chip">
                                    <Clock3 size={12} />
                                    {plan.time}
                                  </span>
                                )}

                                <button
                                  className="edit-float"
                                  onClick={() => openEdit(plan)}
                                  aria-label={`Edit ${plan.title}`}
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>

                              <div className="plan-card-content">
                                <div className="plan-card-kicker">
                                  A LITTLE PLAN <span>♡</span>
                                </div>

                                <h3>{plan.title}</h3>

                                {plan.description && (
                                  <p className="plan-description">
                                    {plan.description}
                                  </p>
                                )}

                                {plan.location && (
                                  <p className="plan-detail">
                                    <MapPin size={14} />
                                    {plan.location}
                                  </p>
                                )}

                                {plan.notes && (
                                  <p className="plan-notes">
                                    “{plan.notes}”
                                  </p>
                                )}

                                <div className="plan-card-footer">
                                  {plan.link ? (
                                    <a
                                      href={plan.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-link"
                                    >
                                      <LinkIcon size={13} /> Open link
                                      <ArrowUpRight size={13} />
                                    </a>
                                  ) : (
                                    <span className="tiny-heart">
                                      saved with love ♡
                                    </span>
                                  )}

                                  <button
                                    className="delete-button"
                                    onClick={() =>
                                      void deletePlan(plan.id)
                                    }
                                    aria-label={`Delete ${plan.title}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}

                      <button
                        className="add-day-button"
                        onClick={() => openNew(day.iso)}
                      >
                        <span className="plus-circle">
                          <Plus size={16} />
                        </span>
                        <span>
                          Add something to {day.weekday}
                        </span>
                        <span className="add-arrow">↗</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="app-footer">
        <div className="footer-heart">♡</div>
        <p>
          Not a perfect itinerary. Just{' '}
          <em>a little time together.</em>
        </p>
        <span>MADE WITH A LITTLE CODE &amp; A LITTLE CRUSH</span>
      </footer>

      {editorOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditorOpen(false);
            }
          }}
        >
          <section
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">
                  {editingId ? 'A LITTLE UPDATE' : 'SAVE A LITTLE IDEA'}
                </p>
                <h2 id="editor-title">
                  {editingId ? 'Edit the plan.' : 'What should we do?'}
                </h2>
              </div>

              <button
                className="icon-button close-button"
                onClick={() => setEditorOpen(false)}
                aria-label="Close editor"
              >
                <X size={19} />
              </button>
            </div>

            <form className="plan-form" onSubmit={savePlan}>
              <label>
                Date
                <select
                  value={draft.date}
                  onChange={(event) =>
                    change('date', event.target.value)
                  }
                >
                  {days.map((day) => (
                    <option key={day.iso} value={day.iso}>
                      {day.weekday}, {day.month} {day.day}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Plan name *
                <input
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(event) =>
                    change('title', event.target.value)
                  }
                  placeholder="e.g. Little Tokyo & lunch"
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={draft.description}
                  onChange={(event) =>
                    change('description', event.target.value)
                  }
                  placeholder="What's the idea? Why does it sound fun?"
                />
              </label>

              <div className="form-two">
                <label>
                  Time (optional)
                  <input
                    value={draft.time}
                    onChange={(event) =>
                      change('time', event.target.value)
                    }
                    placeholder="e.g. 2:30 PM"
                  />
                </label>

                <label>
                  Location (optional)
                  <input
                    value={draft.location}
                    onChange={(event) =>
                      change('location', event.target.value)
                    }
                    placeholder="Address or place name"
                  />
                </label>
              </div>

              <label>
                Link (optional)
                <span className="field-hint">
                  A place, ticket, map, menu, or anything useful.
                </span>
                <input
                  type="url"
                  value={draft.link}
                  onChange={(event) =>
                    change('link', event.target.value)
                  }
                  placeholder="https://…"
                />
              </label>

              <label>
                Photo (optional)
                <span className="field-hint">
                  Choose a picture from your phone's camera roll or
                  computer. It will be resized before saving.
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </label>

              {draft.image_url && (
                <>
                  <div
                    className="image-preview"
                    style={{
                      backgroundImage: `url("${draft.image_url.replace(/"/g, '%22')}")`,
                    }}
                  >
                    <span>PHOTO PREVIEW</span>
                  </div>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => change('image_url', '')}
                  >
                    Remove photo
                  </button>
                </>
              )}

              <label>
                Little note (optional)
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={draft.notes}
                  onChange={(event) =>
                    change('notes', event.target.value)
                  }
                  placeholder="A reminder, a thought, or a tiny inside joke…"
                />
              </label>

              {message && (
                <p className="form-error" role="alert">
                  {message}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    'Saving…'
                  ) : (
                    <>
                      <Check size={16} />
                      {editingId ? 'Save changes' : 'Save this plan ♡'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {installHelp && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setInstallHelp(false);
            }
          }}
        >
          <section
            className="install-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
          >
            <button
              className="icon-button close-button"
              onClick={() => setInstallHelp(false)}
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <div className="install-icon">
              <Heart size={28} fill="currentColor" />
            </div>

            <p className="eyebrow">TAKE US WITH YOU</p>
            <h2 id="install-title">A little app on your phone.</h2>

            {isIos ? (
              <ol>
                <li>
                  Open this website in <strong>Safari</strong> on your
                  iPhone.
                </li>
                <li>
                  Tap the <strong>Share</strong> button (the square
                  with an arrow).
                </li>
                <li>
                  Scroll down and choose{' '}
                  <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> — and that's it. ♡
                </li>
              </ol>
            ) : (
              <ol>
                <li>Open this website in your phone's browser.</li>
                <li>Open the browser menu.</li>
                <li>
                  Choose <strong>Add to Home Screen</strong> or{' '}
                  <strong>Install app</strong>.
                </li>
              </ol>
            )}

            <p className="install-note">
              You'll need to do this after the site is deployed to
              its own web address.
            </p>

            <button
              className="primary-button install-done"
              onClick={() => setInstallHelp(false)}
            >
              Got it ♡
            </button>
          </section>
        </div>
      )}
    </main>
  );
}