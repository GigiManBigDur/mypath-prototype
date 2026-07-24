import { useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getEffectiveToday, toDateInputValue, startOfWeekSunday, realAddDays, realDaysBetween, parseDateInputValue,
} from '../utils/dates';
import { makeTaskId } from '../utils/ids';
import { compileSuggestionProfile } from '../utils/profileCompiler';
import { requestWeeklySuggestions } from '../utils/weeklyDigestSuggestions';
import { relativeLabel } from './DigestList';

// AI-Generated Weekly Task Suggestions in the Digest View (see CLAUDE.md) — a small, self-
// contained, non-blocking side panel rendered as a sibling of the roadmap canvas inside
// `.roadmap-fullscreen-root` (Roadmap.jsx), the same "new element added ALONGSIDE the roadmap, not
// a modification to it" boundary `MapChatWidget.jsx` already established (Task 2's own explicit
// "same non-blocking pattern already used for the Map 2 chat widget"). Fully self-contained (reads
// `useApp()` directly, no props from Roadmap.jsx) — it owns both the once-per-week trigger AND the
// accept/dismiss decisions for whatever it proposes.
//
// Task 1 — trigger once per real calendar week, not every visit. `weeklyTriggerFiredRef` guards
// against React 18 StrictMode's dev-only double-effect invocation (the same "a ref persists across
// the double-invoke of the SAME component instance, a plain state comparison alone can't reliably
// prevent this" pattern this codebase has already needed for other one-shot mount effects) —
// `state.weeklyDigestSuggestionWeekOf` (a real, PERSISTED 'YYYY-MM-DD' string) is the one that
// actually prevents re-triggering across SEPARATE visits/reloads within the same week.
//
// Anchor Weekly Task Generation to Sunday (see CLAUDE.md) — the stored value is now the SUNDAY
// that starts the current week (`startOfWeekSunday()`, utils/dates.js), not the old Monday. This
// is what makes the whole "generate on Sunday, or on the next login after Sunday if it was
// missed, whichever comes first — never again until the FOLLOWING Sunday" rule fall out of the
// exact same simple comparison this trigger already used: opening the app ON Sunday itself
// resolves `thisWeekSunday` to today, which won't match whatever the PRIOR week's Sunday was
// stored as, so it fires (generating the full week ahead — see api/suggest-weekly.js's own
// `daysUntilEndOfWeek`, which now treats Sunday as the FIRST day, 7 remaining); skipping Sunday
// and next opening the app on, say, Tuesday still resolves to that SAME Sunday (Tuesday's own
// week start), so it still fires then — generating only Tuesday through Saturday, never
// retroactively for the already-passed Sunday/Monday, matching the previous fix's own "anchor at
// today" date-assignment logic exactly. Once fired for a given Sunday, reopening any later day
// that same week resolves to the identical stored value and correctly does not re-trigger, all
// the way until the FOLLOWING Sunday's own week begins.
export default function WeeklyTaskSuggestionPanel() {
  const { state, patch } = useApp();
  const weeklyTriggerFiredRef = useRef(false);
  const todayDate = getEffectiveToday(state.dateOverride);

  useEffect(() => {
    if (weeklyTriggerFiredRef.current) return;
    // A student who hasn't even completed the Survey yet has no real profile to ground a
    // suggestion in — genuinely unreachable in practice (Academic Plan itself is hub-gated behind
    // real program selections, which require a completed survey), but a cheap, honest guard
    // rather than assuming.
    if (!state.educationLevel) return;

    const thisWeekSunday = toDateInputValue(startOfWeekSunday(todayDate));
    if (state.weeklyDigestSuggestionWeekOf === thisWeekSunday) return;

    // Set BEFORE the async request starts, synchronously — the same "guard set before the async
    // work begins, not after it resolves" precedent Stage 2's own `suggestionSourceTaskIds` already
    // established, so this can never double-fire regardless of timing.
    weeklyTriggerFiredRef.current = true;
    patch({ weeklyDigestSuggestionWeekOf: thisWeekSunday });

    const profileSummary = compileSuggestionProfile(state, null);
    requestWeeklySuggestions(
      { today: toDateInputValue(todayDate), profileSummary },
      {
        onResult: (result) => {
          if (!result || !Array.isArray(result.tasks) || result.tasks.length === 0) return;
          // Fix: Weekly Suggestions Generating Already-Passed Days (see CLAUDE.md) — supersedes
          // the immediately-prior fix's own "task[i] = Monday-of-this-week + i" assignment, which
          // always spanned the WHOLE Monday-Sunday week regardless of what day "today" actually
          // is — a student opening this mid-week saw earlier-in-the-week tasks already marked
          // overdue on first sight. Task dates are now anchored at TODAY, not Monday: task[i]'s
          // real date is `today + i` days, so index 0 always lands on today itself and the set
          // only ever reaches forward through the rest of the current week, never backward into
          // already-passed days. `api/suggest-weekly.js`'s own schema now enforces EXACTLY
          // `daysUntilEndOfWeek(today)` tasks server-side (rejecting any other count before it
          // ever reaches here) — the same real day-of-week math the server independently computes
          // from the identical `today` string this request already sends, so the two can never
          // disagree about how many days remain. `result.tasks.length` (not a hardcoded 7) is
          // used directly as the loop bound — correct for both the ordinary case (today is Monday,
          // still the full 7) and every shorter remaining-week case alike, with no separate
          // "how many days are left" computation duplicated on the client.
          const withDates = result.tasks.map((task, i) => ({
            id: makeTaskId('weekly-suggestion'),
            title: task.title,
            rationale: task.rationale,
            date: toDateInputValue(realAddDays(todayDate, i)),
          }));
          patch({ pendingWeeklyDigestSuggestions: withDates });
        },
        // Graceful, silent no-op otherwise — matching every other AI-suggestion feature's own
        // established "a failed request never surfaces an error, it just means nothing shows up
        // this time" posture.
      },
    );
    // Mount-only, matching this file's own established pattern for a one-shot trigger effect —
    // intentionally not re-run on every state change (that's exactly the "not every visit" rule
    // Task 1 asks for).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = state.pendingWeeklyDigestSuggestions || [];

  // Task 2 — fully optional and dismissible: rendering nothing at all (not an empty shell) is
  // both the correct default before the trigger has fired and the correct end state once every
  // suggestion has been decided or the panel was dismissed outright.
  if (pending.length === 0) return null;

  const acceptSuggestion = (suggestion) => {
    patch({
      pendingWeeklyDigestSuggestions: pending.filter((s) => s.id !== suggestion.id),
      // Fix: Weekly AI Suggestions Missing from the Roadmap (see CLAUDE.md) — an accepted
      // suggestion is committed straight to `aiSuggestedTasks`, the SAME shared array Stage 2's
      // own single-task suggestions already use. `roadmapGenerator.js`'s existing
      // `buildAiSuggestedItems()` already turns every entry here into a real spine item with the
      // 'ai-suggested' visual marker — no separate digest-only array, no special-casing, so this
      // task appears correctly on both the "This Week" digest list and the spatial roadmap, and
      // automatically participates in the existing Date-Cluster feature if another task (weekly
      // or otherwise) happens to share its exact date.
      aiSuggestedTasks: [
        ...(state.aiSuggestedTasks || []),
        { id: suggestion.id, title: suggestion.title, date: suggestion.date, desc: suggestion.rationale },
      ],
    });
  };

  const dismissSuggestion = (suggestion) => {
    patch({ pendingWeeklyDigestSuggestions: pending.filter((s) => s.id !== suggestion.id) });
  };

  // Task 2's own "dismissible" — a single action clearing every still-undecided suggestion at
  // once, not just hiding the panel (which would just reappear on the next visit this same week
  // showing the identical, stale set) — a real, decisive dismissal.
  const dismissAll = () => patch({ pendingWeeklyDigestSuggestions: [] });

  return (
    <div className="weekly-suggestion-panel">
      <div className="weekly-suggestion-header">
        <Sparkles size={16} />
        <span className="weekly-suggestion-title">This Week's Suggestions</span>
        <button
          type="button"
          className="weekly-suggestion-dismiss-all"
          onClick={dismissAll}
          aria-label="Dismiss all suggestions"
          title="Dismiss all"
        >
          <X size={14} />
        </button>
      </div>
      <p className="weekly-suggestion-subtitle">
        Small, ongoing tasks to fill the gaps between your bigger deadlines.
      </p>
      <div className="weekly-suggestion-list">
        {pending.map((suggestion) => {
          const daysUntil = realDaysBetween(parseDateInputValue(suggestion.date), todayDate);
          return (
            <div className="weekly-suggestion-card" key={suggestion.id}>
              <div className="weekly-suggestion-card-title">{suggestion.title}</div>
              <p className="weekly-suggestion-card-rationale">{suggestion.rationale}</p>
              <div className="weekly-suggestion-card-meta">{relativeLabel(daysUntil)}</div>
              <div className="weekly-suggestion-card-actions">
                <button type="button" className="btn btn-ghost" onClick={() => dismissSuggestion(suggestion)}>
                  Dismiss
                </button>
                <button type="button" className="btn btn-primary" onClick={() => acceptSuggestion(suggestion)}>
                  Accept
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
