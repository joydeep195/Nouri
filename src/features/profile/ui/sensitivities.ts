import { Activity, Bean, Coffee, Flame, Milk, Wheat, type LucideIcon } from 'lucide-react';
import type { SensitivityKey } from '../model/profile';

export interface SensitivityOption {
  key: SensitivityKey;
  icon: LucideIcon;
  title: string;
  desc: string;
}

// Shared by onboarding and the profile screen.
export const SENSITIVITIES: readonly SensitivityOption[] = [
  { key: 'flare', icon: Activity, title: 'In a flare right now', desc: 'Stricter on fibre, fat and spice' },
  { key: 'lowFodmap', icon: Bean, title: 'Following low-FODMAP', desc: 'Flags onion, garlic, beans and some fruit' },
  { key: 'lactose', icon: Milk, title: 'Dairy / lactose', desc: 'Milk, cream, whey, cheese, paneer' },
  { key: 'gluten', icon: Wheat, title: 'Gluten / wheat', desc: 'Wheat, maida, barley, rye' },
  { key: 'spicy', icon: Flame, title: 'Spicy food', desc: 'Chilli and hot sauces' },
  { key: 'caffeine', icon: Coffee, title: 'Caffeine', desc: 'Coffee, cola, energy drinks' },
];
