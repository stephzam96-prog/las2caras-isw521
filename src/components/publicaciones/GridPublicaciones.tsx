import type { View } from '../../types';
import TarjetaPublicacion from './TarjetaPublicacion';

interface GridPublicacionesProps {
  views: View[];
}

export default function GridPublicaciones({ views }: GridPublicacionesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {views.map((view) => (
        <TarjetaPublicacion key={view.id} view={view} />
      ))}
    </div>
  );
}
