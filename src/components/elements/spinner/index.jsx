
const Spinner = ({ children }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent" />
        <p className="text-primary-foreground font-medium">Loading...</p>
        {children}
      </div>
    </div>
  );
};

export default Spinner;