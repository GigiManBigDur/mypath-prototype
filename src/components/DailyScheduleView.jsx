import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Pencil, Link2, Circle, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getEffectiveToday, toDateInputValue, realAddDays, realDaysBetween, formatDateWithYear,
} from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import { compileSuggestionProfile } from '../utils/profileCompiler';
import { requestScheduleSuggestion } from '../utils/dailyScheduleSuggestions';
import useRealTimeTick from '../hooks/useRealTimeTick';

function formatTimeLabel(hhmm) {
  const [hStr, m] = hhmm.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

// Daily Schedule: Google Calendar-Style Timeline (see CLAUDE.md) — the layout/interaction primitives
// the vertical timeline is built on. 1px === 1 minute at HOUR_HEIGHT=60, which is what makes every
// pixel<->time conversion below a plain integer operation with no separate scale factor to track.
const HOUR_HEIGHT = 60;
const TOTAL_MINUTES = 24 * 60;
const SNAP_MINUTES = 15;
const DEFAULT_DURATION_MINUTES = 60;
const MIN_DURATION_MINUTES = 15;
const MIN_BLOCK_PX = 20;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHourLabel(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function minutesToHHMM(mins) {
  const clamped = Math.max(0, Math.min(1439, Math.round(mins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function snapMinutes(mins) {
  const snapped = Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.max(0, Math.min(1439, snapped));
}

// Simple interval-graph-coloring layout so genuinely overlapping blocks render side-by-side
// (matching the same pattern a real calendar view uses) instead of stacking directly on top of
// each other, which would make both unclickable/unreadable. Purely a rendering-position concern —
// it never touches the blocks' own real startTime/endTime data, only computes a `col`/`cols` pair
// per block for this one render pass.
function layoutWithColumns(blocksWithMinutes) {
  const sorted = [...blocksWithMinutes].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const active = [];
  let currentGroup = [];
  const result = [];
  const closeGroup = () => {
    if (currentGroup.length === 0) return;
    const maxCol = Math.max(...currentGroup.map((b) => b.col)) + 1;
    currentGroup.forEach((b) => { b.cols = maxCol; });
    result.push(...currentGroup);
    currentGroup = [];
  };
  sorted.forEach((block) => {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endMin <= block.startMin) active.splice(i, 1);
    }
    if (active.length === 0) closeGroup();
    const usedCols = new Set(active.map((a) => a.col));
    let col = 0;
    while (usedCols.has(col)) col += 1;
    active.push({ endMin: block.endMin, col });
    currentGroup.push({ ...block, col, cols: 1 });
  });
  closeGroup();
  return result;
}

function defaultCreateMinutes(isViewingToday) {
  if (isViewingToday) return snapMinutes(new Date().getHours() * 60 + new Date().getMinutes());
  return 9 * 60;
}

// Add a Daily Schedule Feature (AI-Assisted + Fully Manual) (see CLAUDE.md) — the third Academic
// Plan view alongside the spatial "Roadmap" and the flat "This Week" digest, all three reachable
// from the same `.roadmap-view-toggle` (Roadmap.jsx). Unlike those two (which only ever deal with
// WHICH DAY something is due), this one deals with TIME OF DAY within one single day.
//
// Daily Schedule: Google Calendar-Style Timeline (see CLAUDE.md) redesigned the committed-schedule
// area from a flat list into a real vertical timeline — a familiar Google Calendar day-view
// pattern (all-hours-visible, click-to-create, drag-to-resize) — but this is deliberately a pure
// layout/interaction change: `state.dailySchedules`'s own shape, the AI-assist request/accept/
// reject flow, and the real-task-linkage mechanism (`linkedTaskId` -> `completedNodes`) are all
// completely untouched. Only HOW committed blocks are displayed and created changed.
//
// Receives `flatPlanItems`/`isDone`/`toggleDone`/`onOpenTask` from Roadmap.jsx (the exact same
// flattened spine+branch-steps array `digestGroups` already reads, and the exact same completion
// functions every other spine/digest item already shares) rather than recomputing its own copy —
// this is what guarantees Task 4's "same shared task data" requirement structurally, not just by
// convention. Otherwise self-contained: reads `useApp()` directly for its own state
// (`dailySchedules`/`pendingDailySchedule`) and owns its own local UI state (which day is being
// viewed, the timeline editor popover, the in-progress resize drag, the AI request's loading flag).
export default function DailyScheduleView({ flatPlanItems, isDone, toggleDone, onOpenTask }) {
  const { state, patch } = useApp();
  const todayDate = getEffectiveToday(state.dateOverride);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const dateKey = toDateInputValue(selectedDate);
  const isViewingToday = dateKey === toDateInputValue(todayDate);

  const [aiLoading, setAiLoading] = useState(false);
  const [editor, setEditor] = useState(null); // { id, isNew, title, startTime, endTime, linkedTaskId, anchorTop, popoverTop }
  const [resize, setResize] = useState(null); // { id, startMin, currentEndMin }
  const timelineRef = useRef(null);
  const initialScrollTargetRef = useRef(null);
  const editorPopoverRef = useRef(null);

  const dailySchedules = state.dailySchedules || {};
  const blocks = (dailySchedules[dateKey] || []).slice().sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const pending = state.pendingDailySchedule;
  const hasPendingForThisDay = pending && pending.date === dateKey;

  // Live "now" line — recomputed every 60s via the shared tick hook (Real-Time Tracking's own
  // established re-render-nudge convention), rather than a bespoke interval here.
  const tick = useRealTimeTick();
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [tick]);

  // Task 1 — real tasks/opportunities actually due THIS day, pulled from the exact same flattened
  // task data "This Week" already reads (`flatPlanItems`, passed down from Roadmap.jsx's own
  // `fullRoadmap`). Only incomplete ones (a completed task has nothing left to schedule, same
  // "don't show what's already done" convention the digest list already established) and only
  // ones not already linked to a block on this day (avoid an "add it again" duplicate prompt).
  const linkedIdsToday = new Set(blocks.map((b) => b.linkedTaskId).filter(Boolean));
  const dueToday = flatPlanItems.filter((item) => (
    realDaysBetween(item.date, selectedDate) === 0 && !isDone(item.id) && !linkedIdsToday.has(item.id)
  ));

  const laidOutBlocks = useMemo(() => {
    const withMinutes = blocks.map((b) => ({
      ...b, startMin: hhmmToMinutes(b.startTime), endMin: hhmmToMinutes(b.endTime),
    }));
    return layoutWithColumns(withMinutes);
  }, [blocks]);

  const goToDay = (offset) => { setSelectedDate((d) => realAddDays(d, offset)); setEditor(null); };
  const goToToday = () => { setSelectedDate(todayDate); setEditor(null); };

  // Task 1 (auto-scroll) — a fresh visit to a day scrolls near "now" if it's today (the same
  // reasonable default a real calendar day view starts at), or a plain 7 AM otherwise, so the
  // student doesn't land staring at midnight every time. Uses a real `scrollIntoView()` on a tiny
  // invisible marker (`initialScrollTargetRef`) positioned at the target minute, rather than
  // manually computing/setting a `scrollTop` on some specific ancestor — this timeline has no
  // scroll container of its own (see `.schedule-timeline-wrap`'s own comment for why: the floating
  // bottom panel occupies a fixed region of the real viewport that no amount of scrolling a NESTED
  // container could ever clear), so the actual scrolling ancestor is `.roadmap-digest-wrap`, and
  // `scrollIntoView()` walks up through however many real scrollable ancestors exist automatically
  // rather than this component needing to know which one that is.
  useEffect(() => {
    initialScrollTargetRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // Opening the editor (via a timeline click, or the pencil icon on an existing block) scrolls it
  // into view the same real way — same reasoning as above, plus this is what actually fixed a real,
  // confirmed bug: a manually-computed nested-scroll version of this left a just-created block's
  // own Save button permanently covered by the floating bottom panel whenever it landed in the
  // wrap's own bottom ~60-80px, no matter how far it was "scrolled" internally (confirmed directly
  // via Playwright: `locator.click()` timed out with `.roadmap-panel` reported as intercepting the
  // click, on every retry). Deliberately keyed on the editor's own id, not the whole object — the
  // popover doesn't move while its own fields are being typed into, so re-running this on every
  // keystroke would just fight any scrolling the student does while it stays open for the SAME
  // block.
  useEffect(() => {
    editorPopoverRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.id]);

  const isBlockDone = (block) => (block.linkedTaskId ? isDone(block.linkedTaskId) : !!block.completed);

  const toggleBlockDone = (block) => {
    if (block.linkedTaskId) {
      toggleDone(block.linkedTaskId);
      return;
    }
    const nextDayBlocks = (dailySchedules[dateKey] || []).map((b) => (b.id === block.id ? { ...b, completed: !b.completed } : b));
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: nextDayBlocks } });
  };

  const removeBlock = (id) => {
    const nextDayBlocks = (dailySchedules[dateKey] || []).filter((b) => b.id !== id);
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: nextDayBlocks } });
    setEditor((ed) => (ed && ed.id === id ? null : ed));
  };

  // Task 2 — click-to-create with a default 1-hour duration. Clicking the timeline's own
  // background (not an existing block, which stops propagation on its own click) immediately
  // commits a new real block starting at the exact clicked (snapped-to-15-min) time — matching
  // the task's own literal "clicking creates a block," not a draft awaiting a separate save step —
  // then opens the editor popover, pre-selected, so the student can rename it right away.
  const createBlockAt = (minutes, prefill = {}) => {
    const startTime = minutesToHHMM(minutes);
    const endTime = minutesToHHMM(Math.min(minutes + DEFAULT_DURATION_MINUTES, 1439));
    const newBlock = {
      id: makeTaskId('schedule-block'),
      title: prefill.title || 'New Block',
      startTime,
      endTime,
      linkedTaskId: prefill.linkedTaskId || null,
      completed: false,
    };
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: [...(dailySchedules[dateKey] || []), newBlock] } });
    setEditor({
      id: newBlock.id, isNew: true, title: newBlock.title, startTime, endTime,
      linkedTaskId: newBlock.linkedTaskId, anchorTop: minutes, popoverTop: hhmmToMinutes(endTime) + 6,
    });
  };

  const handleTimelineClick = (e) => {
    // A click while the editor is open just closes it (discarding any uncommitted local edits —
    // the block itself, already real, is untouched) rather than also creating a second block in
    // the same click; a later click can then create a new one.
    if (editor) { setEditor(null); return; }
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    createBlockAt(snapMinutes(y));
  };

  const openEditorFor = (block) => {
    setEditor({
      id: block.id, isNew: false, title: block.title, startTime: block.startTime, endTime: block.endTime,
      linkedTaskId: block.linkedTaskId,
      anchorTop: hhmmToMinutes(block.startTime),
      popoverTop: hhmmToMinutes(block.endTime) + 6,
    });
  };

  // Task 3 — adjustable duration after creation, two ways: (1) editing the end time (or start
  // time) directly in the popover below, or (2) dragging the block's own bottom edge.
  const saveEditor = () => {
    if (!editor) return;
    if (!editor.title.trim() || !editor.startTime || !editor.endTime || editor.endTime <= editor.startTime) return;
    const nextDayBlocks = (dailySchedules[dateKey] || []).map((b) => (b.id === editor.id
      ? { ...b, title: editor.title.trim(), startTime: editor.startTime, endTime: editor.endTime }
      : b));
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: nextDayBlocks } });
    setEditor(null);
  };
  const deleteEditorBlock = () => { if (editor) removeBlock(editor.id); };
  const closeEditor = () => setEditor(null);

  // Drag-to-resize the bottom edge. A dedicated handle (not the block body itself) can safely
  // call setPointerCapture immediately on pointerdown — unlike Roadmap.jsx's own canvas pan (which
  // has to defer capture past a drag threshold to avoid swallowing plain node clicks), this handle
  // has no OTHER click meaning to protect, so there's no ambiguity to resolve.
  const startResize = (e, block) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResize({ id: block.id, startMin: block.startMin, currentEndMin: block.endMin });
  };
  const onResizeMove = (e) => {
    if (!resize) return;
    e.stopPropagation();
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snapped = snapMinutes(y);
    const clamped = Math.max(resize.startMin + MIN_DURATION_MINUTES, Math.min(1439, snapped));
    setResize((r) => (r ? { ...r, currentEndMin: clamped } : r));
  };
  const onResizeEnd = (e) => {
    if (!resize) return;
    e.stopPropagation();
    const finalEndTime = minutesToHHMM(resize.currentEndMin);
    const nextDayBlocks = (dailySchedules[dateKey] || []).map((b) => (b.id === resize.id ? { ...b, endTime: finalEndTime } : b));
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: nextDayBlocks } });
    setResize(null);
  };

  // Task 2 — explicit, opt-in AI assist. Never fires automatically; only ever in direct response
  // to this button. `dueTasks` are sent with their real `id`/`title` so the server can set a
  // proposal block's own `linkedTaskId` to a REAL id, never an invented one (see
  // api/suggest-schedule.js's own validateProposal, which falls back to null for anything that
  // doesn't match one of these exact ids). Unchanged by the timeline redesign — still a flat,
  // directly-editable review list, since it's a temporary decision surface, not "the schedule."
  const askAiToPlan = () => {
    setAiLoading(true);
    const profileSummary = compileSuggestionProfile(state, null);
    const dueTasksForRequest = flatPlanItems
      .filter((item) => realDaysBetween(item.date, selectedDate) === 0 && !isDone(item.id))
      .map((item) => ({ id: item.id, title: item.title }));
    requestScheduleSuggestion(
      { date: dateKey, dueTasks: dueTasksForRequest, profileSummary },
      {
        onResult: (result) => {
          setAiLoading(false);
          if (!result || !Array.isArray(result.blocks) || result.blocks.length === 0) return;
          const blocksWithIds = result.blocks.map((b) => ({ id: makeTaskId('schedule-proposal'), ...b }));
          patch({ pendingDailySchedule: { date: dateKey, blocks: blocksWithIds } });
        },
        onError: () => setAiLoading(false),
      },
    );
  };

  const updateProposalBlock = (id, updates) => {
    patch({
      pendingDailySchedule: {
        ...pending,
        blocks: pending.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      },
    });
  };
  const removeProposalBlock = (id) => {
    patch({ pendingDailySchedule: { ...pending, blocks: pending.blocks.filter((b) => b.id !== id) } });
  };
  const rejectProposal = () => patch({ pendingDailySchedule: null });
  const acceptProposal = () => {
    const existing = dailySchedules[dateKey] || [];
    if (existing.length > 0 && !window.confirm('This will replace your existing schedule for this day. Continue?')) return;
    const realBlocks = pending.blocks.map((b) => ({
      id: makeTaskId('schedule-block'),
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      linkedTaskId: b.linkedTaskId || null,
      completed: false,
      ...(b.note ? { desc: b.note } : {}),
    }));
    patch({
      dailySchedules: { ...dailySchedules, [dateKey]: realBlocks },
      pendingDailySchedule: null,
    });
  };

  return (
    <div className="daily-schedule-wrap">
      <div className="daily-schedule-nav">
        <button type="button" className="daily-schedule-nav-btn" onClick={() => goToDay(-1)} aria-label="Previous day">
          <ChevronLeft size={16} />
        </button>
        <div className="daily-schedule-date">
          <div className="daily-schedule-date-main">{formatDateWithYear(selectedDate)}</div>
          {!isViewingToday && (
            <button type="button" className="daily-schedule-today-btn" onClick={goToToday}>Jump to today</button>
          )}
        </div>
        <button type="button" className="daily-schedule-nav-btn" onClick={() => goToDay(1)} aria-label="Next day">
          <ChevronRight size={16} />
        </button>
      </div>

      {hasPendingForThisDay ? (
        <div className="schedule-proposal">
          <div className="schedule-proposal-header">
            <Sparkles size={16} />
            <span>AI-proposed schedule — review, edit, then accept or reject</span>
          </div>
          <div className="schedule-proposal-list">
            {pending.blocks.map((block) => (
              <div className="schedule-proposal-block" key={block.id}>
                <div className="schedule-proposal-times">
                  <input
                    type="time"
                    value={block.startTime}
                    onChange={(e) => updateProposalBlock(block.id, { startTime: e.target.value })}
                  />
                  <span>–</span>
                  <input
                    type="time"
                    value={block.endTime}
                    onChange={(e) => updateProposalBlock(block.id, { endTime: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  className="schedule-proposal-title"
                  value={block.title}
                  onChange={(e) => updateProposalBlock(block.id, { title: e.target.value })}
                />
                {block.linkedTaskId && (
                  <span className="schedule-block-linked-tag" title="Linked to a real task on your plan">
                    <Link2 size={11} /> Linked
                  </span>
                )}
                <button type="button" className="remove-btn" onClick={() => removeProposalBlock(block.id)} aria-label="Remove this proposed block">
                  <Trash2 size={13} />
                </button>
                {block.note && <p className="schedule-block-note">{block.note}</p>}
              </div>
            ))}
          </div>
          <div className="schedule-proposal-actions">
            <button type="button" className="btn btn-ghost" onClick={rejectProposal}>Reject</button>
            <button type="button" className="btn btn-primary" onClick={acceptProposal} disabled={pending.blocks.length === 0}>
              Accept schedule
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="daily-schedule-ai-row">
            <button type="button" className="btn btn-outline" onClick={askAiToPlan} disabled={aiLoading}>
              <Sparkles size={14} /> {aiLoading ? 'Thinking…' : `Ask AI to help plan ${isViewingToday ? 'today' : 'this day'}`}
            </button>
          </div>

          {dueToday.length > 0 && (
            <div className="daily-schedule-due-section">
              <div className="daily-schedule-section-label">Tasks &amp; opportunities due this day</div>
              <div className="daily-schedule-due-list">
                {dueToday.map((item) => (
                  <div className="daily-schedule-due-chip" key={item.id}>
                    <span>{item.title}</span>
                    <button
                      type="button"
                      className="daily-schedule-due-add-btn"
                      onClick={() => createBlockAt(defaultCreateMinutes(isViewingToday), { title: item.title, linkedTaskId: item.id })}
                      title="Add a time block for this"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="schedule-timeline-wrap">
            <div
              className="schedule-timeline-inner"
              ref={timelineRef}
              style={{ height: TOTAL_MINUTES }}
              onClick={handleTimelineClick}
            >
              <div
                ref={initialScrollTargetRef}
                className="schedule-timeline-scroll-anchor"
                style={{ top: isViewingToday ? nowMinutes : 7 * HOUR_HEIGHT }}
              />
              {HOURS.map((h) => (
                <div key={h} className="schedule-timeline-hour-row" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                  <span className="schedule-timeline-hour-label">{formatHourLabel(h)}</span>
                </div>
              ))}
              {HOURS.map((h) => (
                <div key={`half-${h}`} className="schedule-timeline-halfhour-line" style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              ))}
              {isViewingToday && (
                <div className="schedule-timeline-now-line" style={{ top: nowMinutes }}>
                  <span className="schedule-timeline-now-dot" />
                </div>
              )}

              <div className="schedule-timeline-blocks-area">
                {laidOutBlocks.length === 0 && (
                  <p className="field-hint schedule-timeline-empty-hint">
                    No time blocks yet — click anywhere on the timeline to add one, or ask AI to help plan it.
                  </p>
                )}
                {laidOutBlocks.map((block) => {
                  const isResizing = resize && resize.id === block.id;
                  const endMin = isResizing ? resize.currentEndMin : block.endMin;
                  const heightPx = Math.max(endMin - block.startMin, MIN_BLOCK_PX);
                  const leftPct = (block.col / block.cols) * 100;
                  const widthPct = (1 / block.cols) * 100;
                  return (
                    <div
                      key={block.id}
                      className={`schedule-timeline-block${isBlockDone(block) ? ' done' : ''}${isResizing ? ' resizing' : ''}`}
                      style={{
                        top: block.startMin, height: heightPx,
                        left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (block.linkedTaskId) onOpenTask(block.linkedTaskId);
                        else openEditorFor(block);
                      }}
                    >
                      <div className="schedule-timeline-block-top">
                        <button
                          type="button"
                          className="schedule-timeline-block-checkbox"
                          onClick={(e) => { e.stopPropagation(); toggleBlockDone(block); }}
                          aria-label={isBlockDone(block) ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {isBlockDone(block) ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                        </button>
                        <span className="schedule-timeline-block-time">
                          {formatTimeLabel(block.startTime)}–{formatTimeLabel(minutesToHHMM(endMin))}
                        </span>
                        <div className="schedule-timeline-block-actions">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openEditorFor(block); }} aria-label="Edit block">
                            <Pencil size={11} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} aria-label="Remove block">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      <div className="schedule-timeline-block-title">
                        {block.title}
                        {block.linkedTaskId && <Link2 size={11} className="schedule-block-linked-icon" />}
                      </div>
                      <div
                        className="schedule-timeline-resize-handle"
                        onPointerDown={(e) => startResize(e, block)}
                        onPointerMove={onResizeMove}
                        onPointerUp={onResizeEnd}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </div>

              {editor && (
                <div ref={editorPopoverRef} className="schedule-editor-popover" style={{ top: editor.popoverTop }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    className="schedule-editor-title-input"
                    value={editor.title}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditor((ed) => ({ ...ed, title: e.target.value }))}
                    placeholder="Block title"
                  />
                  <div className="schedule-editor-row">
                    <input
                      type="time"
                      value={editor.startTime}
                      onChange={(e) => setEditor((ed) => ({ ...ed, startTime: e.target.value }))}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      value={editor.endTime}
                      onChange={(e) => setEditor((ed) => ({ ...ed, endTime: e.target.value }))}
                    />
                  </div>
                  {editor.linkedTaskId && (
                    <span className="schedule-block-linked-tag"><Link2 size={11} /> Linked to a real task</span>
                  )}
                  <div className="schedule-editor-actions">
                    <button type="button" className="remove-btn" onClick={deleteEditorBlock}>
                      <Trash2 size={13} /> Delete
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={closeEditor}>Close</button>
                    <button type="button" className="btn btn-primary" onClick={saveEditor}>Save</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost daily-schedule-add-btn"
            onClick={() => createBlockAt(defaultCreateMinutes(isViewingToday))}
          >
            <Plus size={14} /> Add Time Block
          </button>
        </>
      )}
    </div>
  );
}
