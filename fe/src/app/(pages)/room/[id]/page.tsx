import '@/app/page.css';
import RoomPageClient from './client';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <RoomPageClient roomId={resolvedParams.id} />;
}
