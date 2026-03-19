export const Spinner = ({ size = 10 }: { size?: number }) => (
  <div className="flex justify-center items-center py-12">
    <div className={`relative w-${size} h-${size}`}>
      <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
      <div className="absolute inset-[20%] rounded-full border border-purple-400/40 animate-spin-reverse" />
    </div>
  </div>
);
