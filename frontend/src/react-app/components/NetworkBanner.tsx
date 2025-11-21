import { useNetworkStore } from '../stores/useNetworkStore';

export default function NetworkBanner() {
  const { isOnline, message } = useNetworkStore();

  if (isOnline) return null;

  return (
    <div className="w-full bg-red-900 border border-red-700 text-white text-center text-sm px-4 py-2">
      <strong>Conexão perdida.</strong> {message ?? 'Verifique sua rede ou reinicie a aplicação.'}
    </div>
  );
}
