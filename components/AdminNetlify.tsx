// @ts-expect-error
import Cloudinary from 'netlify-cms-media-library-cloudinary';
import { useEffect, useState, useRef } from 'react';

import type { List, Map as ImMap } from 'immutable';
import type { PreviewTemplateComponentProps } from 'netlify-cms-core';

export function AdminNetlify() {
  const deps = useRef<{
    readonly GithubSlugger: typeof import('github-slugger');
    readonly CMS: typeof import('netlify-cms-app').default;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const GithubSlugger = import(/* webpackChunkName: "GithubSlugger" */ 'github-slugger');
    const Katex = import(/* webpackChunkName: "Katex" */ 'katex/dist/contrib/auto-render');
    const CMS = import(/* webpackChunkName: "CMS" */ 'netlify-cms-app');

    void Promise.all([GithubSlugger, Katex, CMS]).then(([GithubSlugger, Katex, CMS]) => {
      deps.current = { GithubSlugger: GithubSlugger.default, CMS: CMS.default };
      // @ts-expect-error
      window.Katex = Katex.default;
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!deps.current || isLoading) {
      return;
    }
    const { GithubSlugger, CMS } = deps.current;

    CMS.registerMediaLibrary(Cloudinary);
    CMS.registerPreviewTemplate('legacy_posts', PreviewComponent);
    CMS.registerPreviewTemplate('posts', PreviewComponent);
    CMS.registerPreviewTemplate('pages', PreviewComponent);
    CMS.registerPreviewTemplate('authors', HidePreview);

    CMS.registerEventListener({
      name: 'preSave',
      handler: ({ entry }) => {
        const collectionsWithPermalink = ['posts', 'pages', 'legacy_posts'];
        const collection = entry.get('collection');
        if (collectionsWithPermalink.includes(collection)) {
          const title = entry.getIn(['data', 'title']);
          return entry.setIn(['data', 'permalink'], GithubSlugger.slug(title));
        }
        if (collection === 'settings' && entry.get('slug') === 'authors') {
          /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- kill me */
          return entry.updateIn(['data', 'authors'], (value: any) =>
            value.map((v: any) =>
              v.set(
                'displayName',
                [v.getIn(['meta', 'first_name'], ''), v.getIn(['meta', 'last_name'], '')].filter(Boolean).join(' '),
              ),
            ),
          );
          /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        }
      },
    });

    CMS.init();
  }, [isLoading]);
  return (
    <div>
      <div id="nc-root" style={{ marginTop: '-4rem' }} />
    </div>
  );
}

function PreviewComponent({ collection, fields, widgetFor }: PreviewTemplateComponentProps) {
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('#preview-pane');
    if (!iframe || !iframe.contentDocument) {
      return;
    }

    const styles = document.querySelectorAll('style,link[rel="stylesheet"],script[src]');

    iframe.contentDocument.documentElement.className += ' fonts-loaded';
    iframe.contentDocument.body.style.backgroundColor = 'white';
    styles.forEach((s) => iframe.contentDocument?.body?.appendChild(s.cloneNode(true)));

    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- ok
    Katex(iframe.contentDocument.body, { strict: false });
  }, []);

  if (!collection || !fields) {
    return null;
  }

  const isVisible = (
    f: undefined | import('immutable').Map<string, unknown>,
  ): f is import('immutable').Map<string, unknown> => f?.get('widget') !== 'hidden';

  return (
    <div style={{ paddingTop: '2rem' }}>
      {fields.filter(isVisible).map((field) => {
        return (
          <div
            key={field?.get('name')}
            className={['body', 'title'].includes(field?.get('name')) ? 'prose prose-xl' : ''}
          >
            {widgetFor(field?.get('name'))}
          </div>
        );
      })}
    </div>
  );
}

function HidePreview() {
  useEffect(() => {
    const preview = document.querySelector('.Pane.vertical.Pane2');
    const hideBtn = document.querySelector<HTMLButtonElement>('[title="Toggle preview"]');
    if (preview && hideBtn) {
      hideBtn.click();
    }
  }, []);
  return null;
}
