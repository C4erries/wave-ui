import type { PropsWithChildren } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content">
        <Topbar />
        {children}
      </div>
    </div>
  );
}
