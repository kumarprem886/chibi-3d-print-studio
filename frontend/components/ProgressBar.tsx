type Props = { value: number; label?: string };

export default function ProgressBar({ value, label }: Props) {
  return (
    <div className="w-full">
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
