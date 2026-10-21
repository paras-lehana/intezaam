/**
 * The workspace's lazily loaded panels and tools.
 *
 * Responsibility: one table of code-split chunks — seven tab panels and the two tools —
 * each a named export taking PanelProps. Boundary: Overview is not here; it is the first
 * thing a new plan shows, so it ships with the workspace itself.
 */
import { type ComponentType, type LazyExoticComponent, lazy } from 'react';
import type { PanelProps, WorkspaceTab } from '../panel-props';
import type { WorkspaceTool } from './use-workspace-hash';

type LazyPanel = LazyExoticComponent<ComponentType<PanelProps>>;

// Efficiency: every tab after Overview is its own chunk, fetched the first time the tab
// opens, so the first plan paints with only the verdict and summary code loaded.
export const LAZY_TAB_PANELS: Readonly<Record<Exclude<WorkspaceTab, 'overview'>, LazyPanel>> = {
  money: lazy(async () => ({ default: (await import('../money/MoneyPanel')).MoneyPanel })),
  timeline: lazy(async () => ({
    default: (await import('../timeline/TimelinePanel')).TimelinePanel,
  })),
  vendors: lazy(async () => ({ default: (await import('../vendors/VendorsPanel')).VendorsPanel })),
  people: lazy(async () => ({ default: (await import('../people/PeoplePanel')).PeoplePanel })),
  ideas: lazy(async () => ({ default: (await import('../ideas/IdeasPanel')).IdeasPanel })),
  safety: lazy(async () => ({ default: (await import('../safety/SafetyPanel')).SafetyPanel })),
  share: lazy(async () => ({ default: (await import('../share/SharePanel')).SharePanel })),
};

// Efficiency: the What-if simulator and the Ask chat load only when first opened.
export const LAZY_TOOLS: Readonly<Record<WorkspaceTool, LazyPanel>> = {
  'what-if': lazy(async () => ({
    default: (await import('../what-if/WhatIfDrawer')).WhatIfDrawer,
  })),
  ask: lazy(async () => ({ default: (await import('../ask/AskDrawer')).AskDrawer })),
};
