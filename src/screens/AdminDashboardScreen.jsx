import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, CalendarClock, LibraryBig, Building2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeTaskId } from '../utils/ids';
import { ADMIN_ORGS, getAdminOrg } from '../data/adminOrgs';
import { resolveOrgProfile, getOrgInitials } from '../utils/adminOrgProfile';
import { getBloomAccentColor } from '../components/TrackVisuals';
import { CLASSROOM_DEMO_TEMPLATE } from '../data/classroomDemoData';
import { getEffectiveToday, realAddDays, toDateInputValue, formatDateWithYear } from '../utils/dates';
import SoundSettingsPopover from '../components/SoundSettingsPopover';
import AdminOverviewSection from '../components/AdminOverviewSection';
import AdminEventsSection from '../components/AdminEventsSection';
import AdminResourcesSection from '../components/AdminResourcesSection';
import AdminOrgProfileSection from '../components/AdminOrgProfileSection';
import AdminEventEditor from '../components/AdminEventEditor';
import AdminResourceDrawer from '../components/AdminResourceDrawer';

const NAV = [
  { key: 'overview', label: 'Overview', Icon: LayoutGrid },
  { key: 'events', label: 'Events & opportunities', Icon: CalendarClock },
  { key: 'resources', label: 'Resources', Icon: LibraryBig },
  { key: 'profile', label: 'Organization', Icon: Building2 },
];

// Implement New Admin Dashboard, Align Colors With the Menu Screen (see CLAUDE.md) — the org-scoped
// admin CONSOLE (Task 1), replacing the earlier org-scoped-but-still-single-page dashboard this
// screen used to be (Restructure Admin Panel: Org Selection + Per-Org Dashboard). This is now the
// one shell owning the real state — which section is showing, whether the org switcher/event
// editor/resource drawer are open — and routes to 4 small, focused section components, matching
// the attached Claude Design's own real structure: a left sidebar with an organization switcher,
// Overview/Home, Events & Opportunities, Resources, and Organization Profile & Branding. A "Team"
// section existed in the design too but is deliberately NOT built here — this app has "no backend,
// no database, no auth" as a hard constraint (see CLAUDE.md's own header), and a real per-user
// invite/role system would be genuinely fictional on top of that; every other section here has a
// real, honest backing (real opportunities/resources/branding actually stored in `state`), which a
// Team roster explicitly would not.
//
// Task 2 — every color in this whole console (the sidebar's dark surface, every accent, every
// status pill) is a real `--bloom-*` token — see AdminScreen.jsx's own header comment for the same
// reasoning applied to the login screen. The org's own `brandColorKey` (one of the 7 bloom accent
// tokens, admin-editable via the Organization section) is threaded through as `--org-accent` and
// used everywhere the attached design used its own per-org oklch() hue — primary buttons, the
// active nav highlight, the timeline, the live student-card preview.
export default function AdminDashboardScreen() {
  const { state, patch } = useApp();
  const org = getAdminOrg(state.adminOrgId);
  const today = getEffectiveToday(state.dateOverride);

  const [section, setSection] = useState('overview');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState('All');
  const [resourceKindFilter, setResourceKindFilter] = useState('All');
  const [editingOpportunity, setEditingOpportunity] = useState(null); // {} = new, or a real opp object
  const [drawerOpen, setDrawerOpen] = useState(false);
  const switcherRef = useRef(null);

  // Defensive: reached with no (or a no-longer-real) org selected — the same "defensive bounce to
  // a consistent return point" pattern several other screens in this app already use.
  useEffect(() => {
    if (!org) patch({ screen: 'admin' });
  }, [org]);

  // Click-outside closes the org switcher — the same real, if lightweight, expectation any
  // trigger-based dropdown in this app already gets (SoundSettingsPopover's own precedent).
  useEffect(() => {
    if (!switcherOpen) return undefined;
    const onPointerDown = (e) => { if (!switcherRef.current?.contains(e.target)) setSwitcherOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [switcherOpen]);

  if (!org) return null;

  const profile = resolveOrgProfile(org, state);
  const accent = getBloomAccentColor(profile.brandColorKey);

  const allOpportunities = state.adminOpportunities || [];
  const orgOpportunities = allOpportunities.filter((o) => o.orgId === org.id);
  const orgResourcesMap = state.adminOrgResources || {};
  const orgResources = orgResourcesMap[org.id] || [];
  const classroomDemoAssignments = state.classroomDemoAssignments || [];

  const switchOrg = (orgId) => {
    patch({ adminOrgId: orgId });
    setSwitcherOpen(false);
    setSection('overview');
  };

  const saveOpportunity = (draft, status) => {
    const withOrg = { ...draft, orgId: org.id, status };
    const isNew = !allOpportunities.some((o) => o.id === withOrg.id);
    patch({
      adminOpportunities: isNew
        ? [...allOpportunities, withOrg]
        : allOpportunities.map((o) => (o.id === withOrg.id ? withOrg : o)),
    });
    setEditingOpportunity(null);
    setSection('events');
  };
  const removeOpportunity = (id) => {
    patch({ adminOpportunities: allOpportunities.filter((o) => o.id !== id) });
  };

  const addResource = (resource) => {
    patch({ adminOrgResources: { ...orgResourcesMap, [org.id]: [...orgResources, resource] } });
    setDrawerOpen(false);
  };
  const removeResource = (id) => {
    patch({
      adminOrgResources: { ...orgResourcesMap, [org.id]: orgResources.filter((r) => r.id !== id) },
    });
  };

  const updateProfile = (patchFields) => {
    const profiles = state.adminOrgProfiles || {};
    patch({ adminOrgProfiles: { ...profiles, [org.id]: { ...profiles[org.id], ...patchFields } } });
  };

  const connectClassroom = () => {
    patch({
      classroomDemoAssignments: CLASSROOM_DEMO_TEMPLATE.map((entry) => {
        const date = realAddDays(today, entry.offsetDays);
        return {
          id: entry.id,
          title: `${entry.course} — ${entry.title}`,
          date: toDateInputValue(date),
          desc: `${entry.type} for ${entry.course}, due ${formatDateWithYear(date)}. This is mock data from the Google Classroom demo — not a real assignment.`,
        };
      }),
    });
  };
  const disconnectClassroom = () => patch({ classroomDemoAssignments: [] });

  const openNewEvent = () => setEditingOpportunity({});
  const openEvent = (opp) => setEditingOpportunity(opp);

  return (
    <div className="admin-console">
      <aside className="admin-sidebar">
        <div className="admin-switcher-wrap" ref={switcherRef}>
          <button
            type="button"
            className="admin-switcher-btn"
            onClick={() => setSwitcherOpen((v) => !v)}
            style={{ '--org-accent': accent }}
          >
            <span className="admin-switcher-icon">{getOrgInitials(profile.name)}</span>
            <span className="admin-switcher-body">
              <span className="admin-switcher-name">{profile.name}</span>
              <span className="admin-switcher-parent">{org.parent}</span>
            </span>
            <ChevronDown size={14} className="admin-switcher-caret" />
          </button>
          {switcherOpen && (
            <div className="admin-switcher-menu">
              <div className="admin-switcher-menu-label">Switch organization</div>
              {ADMIN_ORGS.map((o) => {
                const oProfile = resolveOrgProfile(o, state);
                const oAccent = getBloomAccentColor(oProfile.brandColorKey);
                const isCurrent = o.id === org.id;
                return (
                  <button
                    type="button"
                    key={o.id}
                    className="admin-switcher-item"
                    onClick={() => switchOrg(o.id)}
                    style={{ '--org-accent': oAccent }}
                  >
                    <span className="admin-switcher-item-icon">{getOrgInitials(oProfile.name)}</span>
                    <span className="admin-switcher-item-name">{oProfile.name}</span>
                    {isCurrent && <Check size={14} className="admin-switcher-item-check" />}
                  </button>
                );
              })}
              <div className="admin-switcher-divider" />
              <button type="button" className="admin-switcher-all" onClick={() => patch({ screen: 'admin' })}>
                All organizations
              </button>
            </div>
          )}
        </div>

        <div className="admin-nav-label">Manage</div>
        <nav className="admin-nav">
          {NAV.map((n) => {
            const active = section === n.key;
            const count = n.key === 'events' ? orgOpportunities.length
              : n.key === 'resources' ? orgResources.length : null;
            return (
              <button
                type="button"
                key={n.key}
                className={`admin-nav-item${active ? ' active' : ''}`}
                onClick={() => setSection(n.key)}
                style={active ? { '--org-accent': accent } : undefined}
              >
                <n.Icon size={15} />
                <span className="admin-nav-item-label">{n.label}</span>
                {count !== null && <span className="admin-nav-item-count">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-sidebar-foot-avatar">MP</div>
          <div className="admin-sidebar-foot-body">
            <div className="admin-sidebar-foot-name">Testing Admin</div>
            <div className="admin-sidebar-foot-role">Dev preview</div>
          </div>
          <SoundSettingsPopover buttonClassName="admin-sidebar-sound-btn" />
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-inner">
          {section === 'overview' && (
            <AdminOverviewSection
              profile={profile}
              accent={accent}
              opportunities={orgOpportunities}
              resources={orgResources}
              selectedOpportunityIds={state.selectedOpportunityIds || []}
              onNewEvent={openNewEvent}
              onAddResource={() => setDrawerOpen(true)}
              onOpenEvent={openEvent}
              onGoSection={setSection}
              classroomAssignments={classroomDemoAssignments}
              onConnectClassroom={connectClassroom}
              onDisconnectClassroom={disconnectClassroom}
            />
          )}
          {section === 'events' && (
            <AdminEventsSection
              accent={accent}
              opportunities={orgOpportunities}
              filter={eventFilter}
              onFilterChange={setEventFilter}
              onOpenEvent={openEvent}
              onNewEvent={openNewEvent}
              onRemoveEvent={removeOpportunity}
              selectedOpportunityIds={state.selectedOpportunityIds || []}
            />
          )}
          {section === 'resources' && (
            <AdminResourcesSection
              accent={accent}
              resources={orgResources}
              opportunities={orgOpportunities}
              kindFilter={resourceKindFilter}
              onKindFilterChange={setResourceKindFilter}
              onAddResource={() => setDrawerOpen(true)}
              onRemoveResource={removeResource}
            />
          )}
          {section === 'profile' && (
            <AdminOrgProfileSection
              org={org}
              profile={profile}
              accent={accent}
              onUpdateProfile={updateProfile}
              eventCount={orgOpportunities.length}
              resourceCount={orgResources.length}
            />
          )}
        </div>
      </main>

      {editingOpportunity !== null && (
        <AdminEventEditor
          org={org}
          profile={profile}
          accent={accent}
          initialOpportunity={editingOpportunity}
          onClose={() => setEditingOpportunity(null)}
          onSave={saveOpportunity}
          makeId={() => makeTaskId('admin-opportunity')}
          makeMilestoneId={() => makeTaskId('admin-milestone')}
        />
      )}

      {drawerOpen && (
        <AdminResourceDrawer
          accent={accent}
          orgOpportunities={orgOpportunities}
          onClose={() => setDrawerOpen(false)}
          onSave={addResource}
          makeId={() => makeTaskId('admin-resource')}
        />
      )}
    </div>
  );
}
