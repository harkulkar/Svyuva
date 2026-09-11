import type { ReactNode } from 'react';
import { Breadcrumb, type Crumb } from '../../components/common/Breadcrumb';
import { PageBanner } from '../../components/common/PageBanner';
import { Seo } from '../../components/common/Seo';

type Props = {
  title: string;
  subtitle?: string;
  crumbs: Crumb[];
  path: string;
  description?: string;
  children: ReactNode;
};

export function PublicPage({ title, subtitle, crumbs, path, description, children }: Props) {
  return (
    <>
      <Seo title={title} description={description} path={path} />
      <main id="main-content">
        <PageBanner title={title} subtitle={subtitle} />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Breadcrumb items={crumbs} />
          {children}
        </div>
      </main>
    </>
  );
}
