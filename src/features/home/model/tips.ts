import { APP_NAME } from '@/shared/config/app';

export const TIPS: readonly string[] = [
  'Cooked, peeled vegetables are usually gentler than raw ones, especially during a flare.',
  'Small, regular meals are often easier on the gut than a few big ones.',
  '"Sugar-free" sweets often contain sorbitol or maltitol, which can cause bloating and loose stools.',
  'Some protein at every meal helps you stay full for longer.',
  'Drinks can hide a lot of sugar. A 330 ml can of cola has about 9 teaspoons.',
  'A simple food and symptom diary is the best way to find your personal triggers.',
  'Shorter ingredient lists usually mean less processed food.',
  'Sip water through the day, especially after loose stools.',
  'Fizzy drinks add gas. Still water or a herbal tea is a gentler choice.',
  `Add anything that bothers you as a personal trigger in your profile, and ${APP_NAME} will flag it.`,
  'Ginger and peppermint teas are soothing choices for many sensitive tummies.',
  'Eating slowly and chewing well gives your gut less work to do.',
];

/** The same tip all day, a different one tomorrow. */
export function tipOfTheDay(now = Date.now()): string {
  return TIPS[Math.floor(now / 86400000) % TIPS.length] ?? '';
}
