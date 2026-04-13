interface PanicButtonProps {
  onPanic: () => void
}

export function PanicButton({ onPanic }: PanicButtonProps) {
  return (
    <button
      onClick={onPanic}
      className={`
        relative group
        px-4 py-1.5
        font-mono text-[10px] font-bold uppercase tracking-wider
        border-2 rounded-sm
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
        bg-red-600 border-red-500 text-white
        shadow-lg shadow-red-600/25
        hover:bg-red-500 hover:border-red-400
        active:bg-red-700 active:border-red-600 active:shadow-red-600/40
        focus:ring-red-500
        animate-pulse
        w-20
      `}
      aria-label="Panic - stop all sounds"
    >
      {/* Metallic shine effect */}
      <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-20 transition-opacity duration-200">
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-sm" />
      </div>
      
      {/* Inner bevel effect */}
      <div className="absolute inset-[2px] rounded-[1px] bg-red-700" />
      
      {/* Warning glow effect */}
      <div className="absolute inset-0 rounded-sm bg-red-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
      
      {/* Text content */}
      <span className="relative z-10">
        PANIC
      </span>
    </button>
  )
}