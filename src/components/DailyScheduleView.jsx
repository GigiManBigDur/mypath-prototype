import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Pencil, Link2, Circle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getEffectiveToday, toDateInputValue, realAddDays, realDaysBetween, formatDateWithYear,
} from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import { compileSuggestionProfile } from '../utils/profileCompiler';
import { requestScheduleSuggestion } from '../utils/dailyScheduleSuggestions';

function formatTimeLabel(hhmm) {
  const [hStr, m] = hhmm.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

// Add a Daily Schedule Feature (AI-Assisted + Fully Manual) (see CLAUDE.md) — the third Academic
// Plan view alongside the spatial "Roadmap" and the flat "This Week" digest, all three reachable
// from the same `.roadmap-view-toggle` (Roadmap.jsx). Unlike those two (which only ever deal with
// WHICH DAY something is due), this one deals with TIME OF DAY within one single day — a genuinely
// new dimension, rendered as a plain sorted list of time blocks (Task 1's own "a list of time
// slots... rather than the spatial spine/branch visual").
//
// Receives `flatPlanItems`/`isDone`/`toggleDone`/`onOpenTask` from Roadmap.jsx (the exact same
// flattened spine+branch-steps array `digestGroups` already reads, and the exact same completion
// functions every other spine/digest item already shares) rather than recomputing its own copy —
// this is what guarantees Task 4's "same shared task data" requirement structurally, not just by
// convention. Otherwise self-contained: reads `useApp()` directly for its own state
// (`dailySchedules`/`pendingDailySchedule`) and owns its own local UI state (which day is being
// viewed, the manual add/edit forms, the AI request's loading flag).
export default function DailyScheduleView({ flatPlanItems, isDone, toggleDone, onOpenTask }) {
  const { state, patch } = useApp();
  const todayDate = getEffectiveToday(state.dateOverride);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const dateKey = toDateInputValue(selectedDate);
  const isViewingToday = dateKey === toDateInputValue(todayDate);

  const [aiLoading, setAiLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState({ title: '', startTime: '', endTime: '', linkedTaskId: null });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: '', startTime: '', endTime: '' });

  const dailySchedules = state.dailySchedules || {};
  const blocks = (dailySchedules[dateKey] || []).slice().sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const pending = state.pendingDailySchedule;
  const hasPendingForThisDay = pending && pending.date === dateKey;

  // Task 1 — real tasks/opportunities actually due THIS day, pulled from the exact same flattened
  // task data "This Week" already reads (`flatPlanItems`, passed down from Roadmap.jsx's own
  // `fullRoadmap`). Only incomplete ones (a completed task has nothing left to schedule, same
  // "don't show what's already done" convention the digest list already established) and only
  // ones not already linked to a block on this day (avoid an "add it again" duplicate prompt).
  const linkedIdsToday = new Set(blocks.map((b) => b.linkedTaskId).filter(Boolean));
  const dueToday = flatPlanItems.filter((item) => (
    realDaysBetween(item.date, selectedDate) === 0 && !isDone(item.id) && !linkedIdsToday.has(item.id)
  ));

  const goToDay = (offset) => setSelectedDate((d) => realAddDays(d, offset));
  const goToToday = () => setSelectedDate(todayDate);

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
  };

  const startEdit = (block) => {
    setEditingId(block.id);
    setEditDraft({ title: block.title, startTime: block.startTime, endTime: block.endTime });
  };
  const saveEdit = () => {
    if (!editDraft.title.trim() || !editDraft.startTime || !editDraft.endTime) return;
    const nextDayBlocks = (dailySchedules[dateKey] || []).map((b) => (b.id === editingId
      ? { ...b, title: editDraft.title.trim(), startTime: editDraft.startTime, endTime: editDraft.endTime }
      : b));
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: nextDayBlocks } });
    setEditingId(null);
  };

  // Task 3 — fully manual, independent of AI. `openAddForm` is called two ways: blank (the "+ Add
  // Time Block" button) or pre-filled from a real due-task reference (Task 1's own "starting
  // reference," which doubles as the easiest way to create a real Task 4 linkage).
  const openAddForm = (prefill) => {
    setDraft(prefill || { title: '', startTime: '', endTime: '', linkedTaskId: null });
    setShowAddForm(true);
  };
  const submitAdd = () => {
    if (!draft.title.trim() || !draft.startTime || !draft.endTime) return;
    const newBlock = {
      id: makeTaskId('schedule-block'),
      title: draft.title.trim(),
      startTime: draft.startTime,
      endTime: draft.endTime,
      linkedTaskId: draft.linkedTaskId || null,
      completed: false,
    };
    patch({ dailySchedules: { ...dailySchedules, [dateKey]: [...(dailySchedules[dateKey] || []), newBlock] } });
    setShowAddForm(false);
    setDraft({ title: '', startTime: '', endTime: '', linkedTaskId: null });
  };

  // Task 2 — explicit, opt-in AI assist. Never fires automatically; only ever in direct response
  // to this button. `dueTasks` are sent with their real `id`/`title` so the server can set a
  // proposal block's own `linkedTaskId` to a REAL id, never an invented one (see
  // api/suggest-schedule.js's own validateProposal, which falls back to null for anything that
  // doesn't match one of these exact ids).
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
                      onClick={() => openAddForm({ title: item.title, startTime: '', endTime: '', linkedTaskId: item.id })}
                      title="Add a time block for this"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="daily-schedule-list">
            {blocks.length === 0 && !showAddForm && (
              <p className="field-hint" style={{ margin: '8px 0 16px' }}>
                No time blocks yet for this day — add one manually below, or ask AI to help plan it.
              </p>
            )}
            {blocks.map((block) => (
              <div className={`daily-schedule-block${isBlockDone(block) ? ' done' : ''}`} key={block.id}>
                {editingId === block.id ? (
                  <div className="schedule-block-edit-row">
                    <input
                      type="time"
                      value={editDraft.startTime}
                      onChange={(e) => setEditDraft((d) => ({ ...d, startTime: e.target.value }))}
                    />
                    <input
                      type="time"
                      value={editDraft.endTime}
                      onChange={(e) => setEditDraft((d) => ({ ...d, endTime: e.target.value }))}
                    />
                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                    <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={saveEdit}>Save</button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="daily-schedule-block-checkbox"
                      onClick={() => toggleBlockDone(block)}
                      aria-label={isBlockDone(block) ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {isBlockDone(block) ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="daily-schedule-block-time">
                      {formatTimeLabel(block.startTime)}–{formatTimeLabel(block.endTime)}
                    </div>
                    <button
                      type="button"
                      className="daily-schedule-block-title"
                      onClick={() => (block.linkedTaskId ? onOpenTask(block.linkedTaskId) : null)}
                      disabled={!block.linkedTaskId}
                    >
                      {block.title}
                      {block.linkedTaskId && <Link2 size={12} className="schedule-block-linked-icon" />}
                    </button>
                    <div className="daily-schedule-block-actions">
                      <button type="button" className="prior-exp-edit-btn" onClick={() => startEdit(block)} aria-label="Edit">
                        <Pencil size={13} />
                      </button>
                      <button type="button" className="remove-btn" onClick={() => removeBlock(block.id)} aria-label="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="schedule-add-form">
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              />
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              />
              <input
                type="text"
                placeholder="e.g. Robotics Club"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={submitAdd}>Add block</button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost daily-schedule-add-btn" onClick={() => openAddForm(null)}>
              <Plus size={14} /> Add Time Block
            </button>
          )}
        </>
      )}
    </div>
  );
}
