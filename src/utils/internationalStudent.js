// Real International Student Logic: Citizenship + Current Location Together (see CLAUDE.md) —
// international status is derived directly from `state.citizenship` (Sign-Up's own "What is your
// citizenship?" field), never a second, separately-answered yes/no question that could contradict
// it. This app only supports US schools, so any citizenship other than United States implies
// international status — a blank/unanswered citizenship (the field is optional) deliberately does
// NOT count as international, matching this codebase's own standing "don't guess" rule everywhere
// else a field can be left unset.
export function isInternationalStudent(state) {
  return !!state.citizenship && state.citizenship !== 'United States';
}
