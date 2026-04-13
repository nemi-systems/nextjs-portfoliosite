interface PowerButtonProps {
  isOn: boolean
  onToggle: () => void
}

export function PowerButton({ isOn, onToggle }: PowerButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        relative group
        px-4 py-1.5
        font-mono text-[10px] font-bold uppercase tracking-wider
        border-2 rounded-sm
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
        w-20
        ${
          isOn
            ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-600/25 hover:bg-green-500 hover:border-green-400 focus:ring-green-500'
            : 'bg-gray-700 border-gray-600 text-gray-400 animate-button-flash-blue hover:bg-gray-600 hover:text-white focus:ring-gray-500'
        }
      `}
      aria-label={isOn ? "Power on" : "Initialize audio"}
    >
      {/* Metallic shine effect */}
      <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-20 transition-opacity duration-200">
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-sm" />
      </div>
      
      {/* Inner bevel effect */}
      <div className={`
        absolute inset-[2px] rounded-[1px]
        transition-all duration-200
        ${isOn ? 'bg-green-700' : 'bg-gray-900'}
      `} />
      
      {/* Text content */}
      <span className="relative z-10">
        {isOn ? 'ON' : 'INIT'}
      </span>
    </button>
  )
}