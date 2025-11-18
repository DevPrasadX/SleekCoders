import LayoutWrapper from '@/components/LayoutWrapper';

export default function StoreManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}

