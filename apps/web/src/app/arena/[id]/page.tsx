'use client';

import { useParams } from 'next/navigation';
import ArenaClient from './ArenaClient';

export default function ArenaPage() {
  const params = useParams();
  const roomId = params?.id as string;
  if (!roomId) return null;
  return <ArenaClient roomId={roomId} />;
}
