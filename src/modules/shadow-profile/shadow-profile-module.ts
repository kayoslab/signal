import { collectSnapshot } from '../../signals/snapshot';
import { checkPermissions } from '../../permissions/permissions-adapter';
import { applyInferenceRules } from './inference-rules';
import {
  createShadowProfileCard,
  createShadowProfileCardList,
} from '../../ui/shadow-profile-card';

export async function renderShadowProfileModule(): Promise<HTMLElement> {
  const section = document.createElement('section');
  section.className = 'shadow-profile';

  const h2 = document.createElement('h2');
  h2.textContent = 'Shadow Profile';
  section.appendChild(h2);

  const snapshot = collectSnapshot();

  let permissions;
  try {
    permissions = await checkPermissions();
  } catch {
    // Permissions API may be unavailable
  }

  const inferences = applyInferenceRules({ snapshot, permissions });

  if (inferences.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'shadow-profile-empty';
    emptyMsg.textContent =
      'No inferences could be drawn from the current browser signals.';
    section.appendChild(emptyMsg);
    return section;
  }

  const cards = inferences.map((inf) => createShadowProfileCard(inf));
  section.appendChild(createShadowProfileCardList(cards));

  return section;
}
