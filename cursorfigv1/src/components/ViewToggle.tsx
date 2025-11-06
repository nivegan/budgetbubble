import { Users, User } from 'lucide-react';

interface ViewToggleProps {
  isPersonalView: boolean;
  onToggle: (isPersonal: boolean) => void;
}

export function ViewToggle({ isPersonalView, onToggle }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-[#34495e] rounded-lg p-1 border border-[#577189]">
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
          !isPersonalView
            ? 'bg-[#69d2bb] text-[#2c3e50] shadow-md'
            : 'text-[#c1d3e0] hover:text-white'
        }`}
      >
        <Users size={18} />
        <span>Household</span>
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
          isPersonalView
            ? 'bg-[#69d2bb] text-[#2c3e50] shadow-md'
            : 'text-[#c1d3e0] hover:text-white'
        }`}
      >
        <User size={18} />
        <span>Personal</span>
      </button>
    </div>
  );
}
