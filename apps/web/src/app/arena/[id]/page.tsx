import ArenaClient from './ArenaClient';

export default function ArenaPage({ params }: { params: { id: string } }) {
  return <ArenaClient roomId={params.id} />;
}
