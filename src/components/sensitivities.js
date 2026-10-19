import { Activity, Bean, Coffee, Flame, Milk, Wheat } from 'lucide-react';

// Shared by onboarding and the profile screen.
export const SENSITIVITIES = [
  { key: 'flare', icon: Activity, title: 'In a flare right now', desc: 'Stricter on fibre, fat and spice' },
  { key: 'lowFodmap', icon: Bean, title: 'Following low-FODMAP', desc: 'Flags onion, garlic, beans and some fruit' },
  { key: 'lactose', icon: Milk, title: 'Dairy / lactose', desc: 'Milk, cream, whey, cheese, paneer' },
  { key: 'gluten', icon: Wheat, title: 'Gluten / wheat', desc: 'Wheat, maida, barley, rye' },
  { key: 'spicy', icon: Flame, title: 'Spicy food', desc: 'Chilli and hot sauces' },
  { key: 'caffeine', icon: Coffee, title: 'Caffeine', desc: 'Coffee, cola, energy drinks' },
];

export const TIPS = [
  'Cooked, peeled vegetables are usually gentler than raw ones, especially during a flare.',
  'Small, regular meals are often easier on the gut than a few big ones.',
  '"Sugar-free" sweets often contain sorbitol or maltitol, which can cause bloating and loose stools.',
  'Some protein at every meal helps you stay full for longer.',
  'Drinks can hide a lot of sugar. A 330 ml can of cola has about 9 teaspoons.',
  'A simple food and symptom diary is the best way to find your personal triggers.',
  'Shorter ingredient lists usually mean less processed food.',
  'Sip water through the day, especially after loose stools.',
  'Fizzy drinks add gas. Still water or a herbal tea is a gentler choice.',
  'Add anything that bothers you as a personal trigger in your profile, and Nouri will flag it.',
  'Ginger and peppermint teas are soothing choices for many sensitive tummies.',
  'Eating slowly and chewing well gives your gut less work to do.',
];
