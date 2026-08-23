import { useState } from 'react';
import { getPasswordStrength, type PasswordStrength } from '../../utils/passwordStrength';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  showStrength?: boolean;
}

const STRENGTH_INFO: Record<PasswordStrength, { text: string; textClassName: string; barClassName: string }> = {
  weak: { text: 'Débil', textClassName: 'text-red-600 dark:text-red-400', barClassName: 'w-1/3 bg-red-500' },
  medium: { text: 'Media', textClassName: 'text-yellow-600 dark:text-yellow-400', barClassName: 'w-2/3 bg-yellow-500' },
  strong: { text: 'Fuerte', textClassName: 'text-green-600 dark:text-green-400', barClassName: 'w-full bg-green-500' },
};

// Reutilizado en los 3 campos de contraseña de la app (Login, y Password
// + Confirmar contraseña de Registro). El toggle mostrar/ocultar es
// puramente de UI -- type="button" para no disparar el submit del form,
// aria-label dinámico para el lector de pantalla. `showStrength` solo lo
// pasa el campo de password de Registro; Login y Confirmar no lo
// necesitan.
export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  showStrength = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength && value ? getPasswordStrength(value) : null;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400"
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
      {strength && (
        <div className="mt-1">
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div className={`h-1.5 rounded-full transition-all ${STRENGTH_INFO[strength].barClassName}`} />
          </div>
          <p className={`mt-1 text-xs ${STRENGTH_INFO[strength].textClassName}`}>
            Fortaleza: {STRENGTH_INFO[strength].text} · Mínimo 8 caracteres
          </p>
        </div>
      )}
    </div>
  );
}
