interface SectionDividerProps {
  imageSrc?: string;
  alt?: string;
}

const SectionDivider = () => {
  return (
    <div className="w-full flex items-center justify-center py-8">
      <div className="w-full h-px bg-black max-w-6xl" />
    </div>
  );
};

export default SectionDivider;
