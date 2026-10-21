/**
 * Couple hashtags (feature #31): "#Rahuti"-style blends of two first names.
 *
 * Responsibility: two labelled name fields and the blends core's `hashtagBlends` makes from
 * them (no model call), with a copy button. Boundary: weddings only; names stay in the
 * browser (Latin letters only, as in the original — other scripts give no blends).
 */
import { type ReactElement, useState } from 'react';
import { hashtagBlends } from '@intezaam/core/integrations';
import { MAX_HOST_NAME_CHARS } from '@intezaam/core/schemas';
import { CopyButton } from '../../ui/CopyButton';
import { PanelSection } from '../common/PanelSection';

export function HashtagMaker(): ReactElement {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const tags = hashtagBlends(first, second);
  return (
    <PanelSection
      id="ideas-hashtags"
      title="Wedding hashtags"
      lede="Type the couple’s first names."
    >
      <div className="hashtag-fields">
        <div className="field">
          <label htmlFor="hashtag-first">First name</label>
          <input
            id="hashtag-first"
            type="text"
            value={first}
            maxLength={MAX_HOST_NAME_CHARS}
            onChange={(event) => setFirst(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="hashtag-second">Partner’s first name</label>
          <input
            id="hashtag-second"
            type="text"
            value={second}
            maxLength={MAX_HOST_NAME_CHARS}
            onChange={(event) => setSecond(event.target.value)}
          />
        </div>
      </div>
      {tags.length === 0 ? null : (
        <>
          <ul className="plain-list ideas-themes" role="list" aria-label="Hashtag ideas">
            {tags.map((tag) => (
              <li key={tag} className="chip">
                {tag}
              </li>
            ))}
          </ul>
          <CopyButton
            text={tags.join(' ')}
            label="Copy the hashtags"
            copiedMessage="Hashtags copied."
          />
        </>
      )}
    </PanelSection>
  );
}
