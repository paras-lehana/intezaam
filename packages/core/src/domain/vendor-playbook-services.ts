/**
 * Vendor playbook, part 3: invitations, gifts, travel, stay, planner and community
 * services (VEN-03).
 *
 * Responsibility: the questions, written commitments and red flags for these vendors,
 * drawing on the kids'-party guide (04 §5.2), GST on rooms (04 §7), planner fee ranges
 * (04 §1.1) and the NDMA crowd guide (04 §6.3). Boundary: a "planner checklist";
 * merged in vendor-playbook.ts.
 */
import type { PlaybookEntry, ServiceVendor } from './vendor-playbook-types.js';

export const SERVICES_PLAYBOOK: Readonly<Record<ServiceVendor, PlaybookEntry>> = {
  invitations: {
    questions: ['What do printed cards and e-invites each cost?', 'Do we approve a proof first?'],
    getInWriting: ['Quantity, proof and delivery date'],
    redFlags: ['Printing without an approved proof'],
    sourceIds: ['S-MANYAVAR-2024'],
  },
  return_gifts: {
    questions: [
      'Can you supply 10–15% extra for unexpected guests?',
      'Can you deliver at least 10–14 days before the event?',
    ],
    getInWriting: ['Quantity, price per piece and delivery date'],
    redFlags: ['Buying close to the date, when pieces cost 30–40% more'],
    sourceIds: ['S-CHARMBOX-2026'],
  },
  transport: {
    questions: [
      'How many vehicles, and are fuel, tolls and driver allowance included?',
      'Is there a backup vehicle?',
    ],
    getInWriting: ['Vehicles, hours and the pickup schedule'],
    redFlags: ['Vehicles without a commercial permit'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  hotel: {
    questions: [
      'What is the room-block rate, and is GST 5% (rooms up to ₹7,500 a night)?',
      'When do unused rooms go back to the hotel?',
    ],
    getInWriting: ['Rooms, nights and the release date'],
    redFlags: ['Paying for unused rooms after the release date'],
    sourceIds: ['S-HNA-2025'],
  },
  planner: {
    questions: [
      'Is the fee fixed or a share of the budget (planners charge 5–10%)?',
      'Do vendors pay you a commission?',
    ],
    getInWriting: ['Scope, fee and payment schedule'],
    redFlags: ['Undisclosed commissions from vendors'],
    sourceIds: ['S-VK-2026'],
  },
  security: {
    questions: [
      'How many guards, in high-visibility uniform?',
      'Will they coordinate with the local police?',
    ],
    getInWriting: ['Guards, hours and posts'],
    redFlags: ['No briefing plan before the event'],
    sourceIds: ['S-NDMA-2014'],
  },
  sanitation: {
    questions: [
      'How many mobile toilets, and how often are they cleaned?',
      'Is wet and dry waste collected separately?',
    ],
    getInWriting: ['Units and the cleaning schedule'],
    redFlags: ['No waste pickup plan'],
    sourceIds: ['S-NOBROKERHOOD-ND'],
  },
  first_aid: {
    questions: [
      'Is a trained first-aider on site for the whole event?',
      'Is an ambulance on standby for a large crowd?',
    ],
    getInWriting: ['Hours, staff and equipment'],
    redFlags: ['No clear ambulance route'],
    sourceIds: ['S-NDMA-2014'],
  },
};
