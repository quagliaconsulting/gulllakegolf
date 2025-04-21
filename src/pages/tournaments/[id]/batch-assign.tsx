import { useRouter } from 'next/router';
import BatchAssignPage from '@/features/batchAssign/components/BatchAssignPage';

export default function BatchAssignPlayersPage() {
  const router = useRouter();
  const { id } = router.query;
  
  if (!id || typeof id !== 'string') {
    return <div className="p-8 text-center text-gray-600">Invalid tournament ID</div>;
  }
  
  return <BatchAssignPage tournamentId={id} />;
}